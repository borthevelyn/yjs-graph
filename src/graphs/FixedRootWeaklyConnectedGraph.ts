import * as Y from 'yjs';
import { XYPosition } from "@xyflow/react";
import { id, EdgeId, ObjectYMap, splitEdgeId, EdgeDirection } from "../Types";

import assert from 'assert';


function xor(a: boolean, b: boolean): boolean {
    return (a && !b) || (!a && b);
}

type BenchmarkData = {
    danglingEdges: number,
    connectedComponents: number,
    paths: number,
    restoredNodesWithEdges: number,
    restoredEdges: number,
    restoredPaths: number,
}

// encodes a path as an ordered collection of nodes and edges like (edge - node)* - edge
type Path<NodePayload, EdgePayload> = {
    // (edge - node)*
    edges: {
        edgePayload: EdgePayload,
        edgeId: EdgeId,
        nodePayload: NodePayload,
        nodeId: id,
    }[],
    // - edge
    finalEdge: {
        id: EdgeId,
        edgePayload: EdgePayload
    }
}

/**
 * Only defined on paths with at least one stored node.
 */
function begin(path: Path<any, any>): id | undefined {
    if (path.edges.length === 0)
        return undefined

    const [source, target] = splitEdgeId(path.edges[0].edgeId)
    if (source === path.edges[0].nodeId)
        return target
    if (target === path.edges[0].nodeId)
        return source
}
/**
 * Only defined on paths with at least one stored node.
 */
function end(path: Path<any, any>): id | undefined {
    if (path.edges.length === 0)
        return undefined

    const [source, target] = splitEdgeId(path.finalEdge.id)
    const lastNodeStored = path.edges[path.edges.length - 1].nodeId
    if (source === lastNodeStored)
        return target
    if (target === lastNodeStored)
        return source
}

type PathWithoutNodes = Path<undefined, { label: string, usedRemovedElements: Set<RemovedGraphElement> }>
type RestorablePath = Path<{ label: string, position: XYPosition }, { label: string, usedRemovedElements: Set<RemovedGraphElement> }>


/**
 * Calculates a complete list of paths with length m + 1, where items has also m set of paths.
 * @param paths The list of already calculated and complete paths. Assumes that at every index i, the paths of length i + 1 are stored.
 */
function findPathsOfLengthPlusOne(hops: RemovedGraphElement[], paths: Array<PathWithoutNodes>): Array<PathWithoutNodes> {
    function tryAppendToPath(item: RemovedGraphElement, path: PathWithoutNodes): PathWithoutNodes | undefined {
        const newNodes = new Set(splitEdgeId(item.item.edgeId))
        const oldNodes = new Set(splitEdgeId(path.finalEdge.id))
        const commons = newNodes.intersection(oldNodes)
        if (commons.size !== 1)
            return undefined
    
        const commonNode = commons.values().next().value!
        
        return {
            edges:
                [...path.edges, {
                    edgePayload: path.finalEdge.edgePayload,
                    edgeId: path.finalEdge.id,
                    nodePayload: undefined,
                    nodeId: commonNode
                }],
            finalEdge: {
                id: item.item.edgeId,
                edgePayload: { 
                    label: item.item.edgeLabel,
                    usedRemovedElements: new Set([item])
                }
            }
        }
    }

    if (paths.length === 0)
        // nothing useful can be done
        return []
    
    
    // the combination of all paths with first and last will have length m + 1, and will also be complete
    return paths.flatMap(longPath => 
        // for each path of length m, calculate all combinations with paths of length 1
        // try to combine `path` with all items in `first` - may return an empty array, if no combination can be built
        hops.flatMap(hop => {
            // do not create cycles
            if (longPath.edges.some(x => x.edgeId === hop.item.edgeId) || longPath.finalEdge.id === hop.item.edgeId)
                return []

            const possiblePath = tryAppendToPath(hop, longPath)
            if (possiblePath === undefined)
                return []
            else
                return [possiblePath]
        })
    )
}

function findAllPathsInGraphElements(graphElements: Array<RemovedGraphElement>): Set<RestorablePath> {
    // index i in result stores all paths of length i + 1
    const result: PathWithoutNodes[][] = [graphElements.map(x => {
        return {
            edges: [],
            finalEdge: {
                id: x.item.edgeId,
                edgePayload: {
                    label: x.item.edgeLabel,
                    usedRemovedElements: new Set([x])
                }
            },
        }
    })]
    
    // first, calculate paths of length 2
    let toAppend = findPathsOfLengthPlusOne(graphElements, result[0])
    while (toAppend.length > 0) {
        // append if they exist
        result.push(toAppend)
        // find paths of length +1
        // repeat until none is found
        toAppend = findPathsOfLengthPlusOne(graphElements, result[result.length - 1])
    }
    
    // all paths have been found
    return new Set(
        result
        .flat()
        .map<RestorablePath | undefined>(path => {
            const mappedEdges = path.edges.map(edge => {
                const node = graphElements.find((x): x is { type: 'edgeWithNode', item: EdgeInformationForRemovedEdgesWithNode } => 
                    x.type === 'edgeWithNode' && x.item.nodeId === edge.nodeId)

                if (node === undefined)
                    return undefined

                return {
                    edgeId: edge.edgeId,
                    nodeId: edge.nodeId,
                    edgePayload: {
                        usedRemovedElements: edge.edgePayload.usedRemovedElements.union(new Set([node])),
                        label: edge.edgePayload.label
                    },
                    nodePayload: {
                        label: node.item.nodeLabel,
                        position: node.item.nodePosition
                    }
                }
            })

            const cleaned = mappedEdges.filter(x => x !== undefined)
            if (cleaned.length < mappedEdges.length)
                return undefined
            else
                return {
                    finalEdge: path.finalEdge,
                    edges: cleaned
                }
        })
        .filter(x => x !== undefined)
    )
}
/**
 * 
 * @param connectedComponents Holds all connected components in the graph. The union of all connected components is the whole graph.
 * @param componentsToBeMerged Components to be merged
 * @param connectingNodes Nodes used to connect the two components
 * @returns Connected components with comp1, comp2 and connectingNodes merged. 
 */
function mergeComponents(connectedComponents: Set<Set<id>>, componentsToBeMerged: Set<Set<id>>, connectingNodes: Set<id> = new Set()): Set<Set<id>> {
    let mergedComponents = new Set<string>();
    let componentsSet = new Set(connectedComponents)

    for (const componentToBeMerged of componentsToBeMerged) {
        componentsSet = componentsSet.difference(new Set([componentToBeMerged]));
        mergedComponents = mergedComponents.union(componentToBeMerged);
    }

    return componentsSet.union(new Set([mergedComponents.union(connectingNodes)]));
}

type EdgeInformation = {
    label: string
}
type NodeData = {
    id: string,
    label: string,
    position: { x: number; y: number }
    selected: boolean
}
type NodeInformation = {
    nodeData: ObjectYMap<NodeData>
    // This map may contain dangling edges because of Yjs synchronization
    // Reading from this map should always takes this into account
    edgeInformation: Y.Map<EdgeInformation>
    incomingNodes: Y.Map<EdgeInformation>
}

type EdgeInformationForRemovedEdges = {
    edgeId: EdgeId
    edgeLabel: string
}
type EdgeInformationForRemovedEdgesWithNode = {
    nodeId: id
    nodeLabel: string
    nodePosition: XYPosition
    edgeInformation: Array<EdgeInformationForRemovedEdges>
    incomingNodes: Array<EdgeInformationForRemovedEdges>
} & EdgeInformationForRemovedEdges


type RemovedGraphElement = 
    | { type: 'edge', item: EdgeInformationForRemovedEdges } 
    | { type: 'edgeWithNode', item: EdgeInformationForRemovedEdgesWithNode }

export type AdjacencyMapGraph = Y.Map<NodeInformation>


export class FixedRootWeaklyConnectedGraph {
    /**
     * Everything is stored in this Y.Doc. It shall not be used by any other code directly such that this document is only used
     * by instances of this class. All data of this graph is stored at specific keys for this document (`this.yDoc.get(key)`).
     */
    private yDoc: Y.Doc

    readonly rootId = 'root'

    readonly nodeIdStr = 'nodenames'
    private nodeIds: Y.Map<true>

    readonly removedGraphElementsStr = 'removedelems'
    private removedGraphElements: Y.Array<RemovedGraphElement>

    // removes edges or edges with a node that were added to the graph
    private filterRemovedGraphElementsEdge(edgeId: EdgeId) {
        this.yDoc.transact(() => {
            let nodeIndex;
            do {
                nodeIndex = this.removedGraphElements.toArray().findIndex(x => x.item.edgeId === edgeId);  
                if (nodeIndex !== -1)
                    this.removedGraphElements.delete(nodeIndex);   
            } while(nodeIndex >= 0);
        });
    }

    readonly nodeOutgoing = (id: id) => `node_outgoing_${id}`
    readonly nodeIncoming = (id: id) => `node_incoming_${id}`
    readonly nodeData = (id: id) => `node_data_${id}`

    private uncheckedNodeMap(id: id): NodeInformation {
        return {
            incomingNodes: this.yDoc.getMap(this.nodeIncoming(id)) as NodeInformation['incomingNodes'],
            edgeInformation: this.yDoc.getMap(this.nodeOutgoing(id)) as NodeInformation['edgeInformation'],
            nodeData: this.yDoc.getMap(this.nodeData(id)) as NodeInformation['nodeData']
        }
    }
    private nodeMap(id: id): NodeInformation | undefined {
        if (this.nodeIds.get(id) === undefined)
            return undefined
        
        return {
            incomingNodes: this.yDoc.getMap(this.nodeIncoming(id)) as NodeInformation['incomingNodes'],
            edgeInformation: this.yDoc.getMap(this.nodeOutgoing(id)) as NodeInformation['edgeInformation'],
            nodeData: this.yDoc.getMap(this.nodeData(id)) as NodeInformation['nodeData']
        }
    }

    constructor (doc: Y.Doc) {
        this.yDoc = doc

        this.nodeIds = this.yDoc.getMap<true>(this.nodeIdStr)
        this.removedGraphElements = this.yDoc.getArray(this.removedGraphElementsStr)

        // this operation does not have to succeed: another graph may already have
        // added a root node
        this.addNode(this.rootId, {
            id: this.rootId,
            label: this.rootId,
            position: { x: 0, y: 0},
            selected: false
        })
    }

    private addNode(id: id, data: NodeData): boolean {
        if (this.nodeIds.get(id))
            return false

        this.uncheckedNodeMap(id).edgeInformation.clear()
        this.uncheckedNodeMap(id).nodeData.clear()
        this.uncheckedNodeMap(id).incomingNodes.clear()

        this.nodeIds.set(id, true)

        this.uncheckedNodeMap(id).nodeData.set('id', data.id)
        this.uncheckedNodeMap(id).nodeData.set('label', data.label)
        this.uncheckedNodeMap(id).nodeData.set('position', data.position)
        this.uncheckedNodeMap(id).nodeData.set('selected', data.selected)

        return true
    }

    /**
     * This method adds a node with an edge to the graph, but only if the new edge connects the new node to the graph.
     * @param nodeId {id} First node of the edge, also the added node
     * @param edgeDirection Edge direction describes whether the edge is directed from nodeId to otherNodeId or vice versa, i.e. '->' or '<-' 
     * @param otherNodeId Other node of the edge
     * @param nodeLabel 
     * @param nodePosition 
     * @param edgeLabel 
     */
    public addNodeWithEdge(nodeId: id, edgeDirection: EdgeDirection, otherNodeId: id, nodeLabel: string, nodePosition: XYPosition, edgeLabel: string): boolean {
        return this.yDoc.transact(() => {

            assert(this.nodeIds.get(nodeId) === undefined, 'Node already exists');

            const [source, target] = [edgeDirection === '->' ? nodeId : otherNodeId, edgeDirection === '<-' ? nodeId : otherNodeId];

            if (nodeId === this.rootId) {
                console.warn('Cannot add a node with the same id as the root node (addNodeWithEdge)');
                return false
            }

            if ((this.nodeIds.size === 1) && (!xor((source === this.rootId),(target === this.rootId)))) {
                console.log('source, target, rootId', source, target, this.rootId);
                console.warn('Cannot add this edge with node, because it is not connected to the root node (addNodeWithEdge)');
                return false
            }

            if (this.nodeIds.get(otherNodeId) === undefined) {
                console.warn('Cannot add this edge, as it is not connected to the graph', source, target);
                return false
            }

            assert(
                this.addNode(nodeId, { 
                    id: nodeId, 
                    label: nodeLabel,
                    position: nodePosition, 
                    selected: false, 
                }),
                'Could not add node'
            )

            assert(
                this.addEdge(source, target, edgeLabel),
                'Could not add edge'
            )

            return true
        })
    }

    private removeNode(id: id): boolean {
        if (!this.nodeIds.get(id))
            return false

        this.nodeIds.delete(id)
        return true
    }

    public hasNode(id: id): boolean {
        return this.nodeIds.get(id) !== undefined
    }

    public addEdge(source: id, target: id, label: string) {
        const sourceInfo = this.nodeMap(source)
        const targetInfo = this.nodeMap(target)

        if (sourceInfo === undefined || targetInfo === undefined)
            return false

        sourceInfo.edgeInformation.set(target, { label })
        targetInfo.incomingNodes.set(source, { label })
        this.filterRemovedGraphElementsEdge(`${source}+${target}`)

        return true
    }

    public hasEdge(source: id, target: id): string | undefined {
        const sourceInfo = this.nodeMap(source)
        const targetInfo = this.nodeMap(target)

        if (sourceInfo === undefined || targetInfo === undefined)
            return undefined

        const labelFromSource = sourceInfo.edgeInformation.get(target)?.label
        const labelFromTarget = targetInfo.incomingNodes.get(source)?.label

        assert(labelFromSource === labelFromTarget, 'Not the same label was stored')
        
        return labelFromSource
    }


    /**
     * This method removes an edge, even if one of the nodes is dangling
     * @param source Source node of the edge
     * @param target Target node of the edge
     */
    public removeEdge(source: id, target: id): boolean {
        function isEdgeRemovingANode(nodeInfo1: NodeInformation, nodeInfo2: NodeInformation): NodeInformation | undefined {
            // it is assumed that nodeInfo1 and nodeInfo2 are different and connected via an edge
            // when the nodes are the same, the node will never be deleted after deleting a self-loop if the graph was correct before
            if (nodeInfo1.nodeData.get('id') === nodeInfo2.nodeData.get('id'))
                return undefined

            if (!nodeInfo1.edgeInformation.has(target) || !nodeInfo2.incomingNodes.has(source))
                return undefined

            const hasNodeSelfLoop = (nodeInfo: NodeInformation) => nodeInfo.edgeInformation.has(nodeInfo.nodeData.get('id'));

            // Compute the number of adjacent edges for each node without self loops
            const edgesForNode1 = nodeInfo1.edgeInformation.size + nodeInfo1.incomingNodes.size - (hasNodeSelfLoop(nodeInfo1) ? 2 : 0);
            const edgesForNode2 = nodeInfo2.edgeInformation.size + nodeInfo2.incomingNodes.size - (hasNodeSelfLoop(nodeInfo2) ? 2 : 0);
            
            if (nodeInfo1.nodeData.get('id') === 'root' && edgesForNode2 === 1) 
                return nodeInfo2;
            
            if (nodeInfo2.nodeData.get('id') === 'root' && edgesForNode1 === 1)
                return nodeInfo1;

            if (nodeInfo1.nodeData.get('id') === 'root' || nodeInfo2.nodeData.get('id') === 'root')
                return undefined;
            
            if (edgesForNode2 === 1) 
                return nodeInfo2;
            
            if (edgesForNode1 === 1) 
                return nodeInfo1;
            
            return undefined;
        }
        return this.yDoc.transact(() => {
            const nodeInfo1 = this.nodeMap(source);
            const nodeInfo2 = this.nodeMap(target);

            let nodeRemovedWithEdge = undefined;

            if (nodeInfo1 !== undefined && nodeInfo2 !== undefined) {
                // If the edge is connected to a node that has at most one incoming or outgoing edge and a self loop
                // then removing this edge would also remove the node. The graph would not be disconnected in this case.
                nodeRemovedWithEdge = isEdgeRemovingANode(nodeInfo1, nodeInfo2);

                if (nodeRemovedWithEdge === undefined && !this.isConnectedAfterEdgeRemoval(source, target)) {
                    console.warn('Removing this edge would disconnect the graph');
                    return false
                }
            }
   
            // This method is designed to handle dangling edges, i.e. one of the two nodes could no longer
            // exist. This method is robust against this case. If both nodes exist, the edge will be also
            // deleted normally, if the edge does not exist (i.e. is not stored in any of the two maps),
            // no action can be taken
            const edgeId: EdgeId = `${source}+${target}`;
            const node1EdgeInfo = nodeInfo1?.edgeInformation
            const node2Incoming = nodeInfo2?.incomingNodes
            const edgeLabel = node1EdgeInfo?.get(target)?.label ?? node2Incoming?.get(source)?.label;

            // the edge does not exist in any way
            if (edgeLabel === undefined)
                return false

            const removedGraphElement: RemovedGraphElement = (nodeRemovedWithEdge !== undefined) ? ({ 
                type: 'edgeWithNode', 
                item: { 
                    nodeId: nodeRemovedWithEdge.nodeData.get('id'),
                    nodeLabel: nodeRemovedWithEdge.nodeData.get('label'),
                    nodePosition: nodeRemovedWithEdge.nodeData.get('position'),
                    edgeInformation: 
                        Array.from(nodeRemovedWithEdge.edgeInformation.entries())
                        .map<EdgeInformationForRemovedEdges>(([target, {label}]) => ({ edgeId: `${nodeRemovedWithEdge.nodeData.get('id')}+${target}`, edgeLabel: label}))
                        .concat(this.removedGraphElements
                            .toArray()
                            .filter(x => (x.type === 'edge'))
                            .filter(x => splitEdgeId(x.item.edgeId)[0] === nodeRemovedWithEdge.nodeData.get('id'))
                            .map(x => x.item)),
                    incomingNodes: 
                        Array.from(nodeRemovedWithEdge.incomingNodes.entries())
                        .map<EdgeInformationForRemovedEdges>(([source, {label}]) => ({ edgeId: `${source}+${nodeRemovedWithEdge.nodeData.get('id')}`, edgeLabel: label}))
                        .concat(this.removedGraphElements
                            .toArray()
                            .filter(x => (x.type === 'edge'))
                            .filter(x => splitEdgeId(x.item.edgeId)[1] === nodeRemovedWithEdge.nodeData.get('id'))
                            .map(x => x.item)),
                    edgeId, 
                    edgeLabel 
                    }
                })
                :
                ({ type: 'edge', item: { edgeId, edgeLabel } });

            // 1. Remove the edge from the source node to the target node
            node1EdgeInfo?.delete(target);

            // 2. Remove the reversed edge from incoming nodes
            node2Incoming?.delete(source);
            
            // 3. If a node should be removed with the edge, it is removed here
            if (nodeRemovedWithEdge !== undefined) {
                this.removeNode(nodeRemovedWithEdge.nodeData.get('id'));
            }

            // 4. Add removed edge to the removed edges list
            this.removedGraphElements.push([removedGraphElement]);

            // 5. Remove it from selected edges
            // TODO SELECTED
            // this.selectedEdges.delete(edgeId);

            return true
        });
    }

    /**
     * Calculates all danginling edges.
     * @returns This does not return an actual removed graph element, but only is in the format.
     */
    private getDanglingEdges(): Array<RemovedGraphElement & { type: 'edge' }> {
        const danglingEdges = new Array<RemovedGraphElement & { type: 'edge' }>()
        for (const source of this.nodeIds.keys()) {
            const sourceInfo = this.nodeMap(source)!

            for (const target of sourceInfo.edgeInformation.keys()) {
                if (this.nodeIds.get(target) !== undefined) 
                    continue;
                
                danglingEdges.push({
                    type: 'edge',
                    item: { edgeId: `${source}+${target}`, edgeLabel: sourceInfo.edgeInformation.get(target)!.label }
                })
                
            }

            for (const target of sourceInfo.incomingNodes.keys()) {
                if (this.nodeIds.get(target) !== undefined) 
                    continue;

                danglingEdges.push({
                    type: 'edge',
                    item: { edgeId: `${target}+${source}`, edgeLabel: sourceInfo.incomingNodes.get(target)!.label }
                })   
            }
            
        }
        return danglingEdges
    }


    /**
     * @param danglingEdges Set of removed graph element edges that are dangling
     */
    private removeRemainingDanglingEdges(danglingEdges: Set<RemovedGraphElement & { type: 'edge' }>): void {
        this.yDoc.transact(() => {
            for (const danglingEdge of danglingEdges) {
                const [source, target] = splitEdgeId(danglingEdge.item.edgeId);

                // Check if edge is not dangling anymore
                assert(!(this.nodeIds.get(source) !== undefined && this.nodeIds.get(target) !== undefined), 'edge is not dangling, should not happen here');

                // Delete the dangling edge
                // TODO dangling
                if (this.nodeMap(source)?.edgeInformation.has(target)) {
                    this.removeEdge(source, target);
                    continue;
                }
                if (this.nodeMap(target)?.incomingNodes.has(source)) {
                    this.uncheckedNodeMap(target).incomingNodes.delete(source);
                    continue;
                }
                assert(false, 'Dangling edge could not be removed');
            }
        });
    }

    private dfsVisitedNodes(nodeId: id, excludedEdges: Set<EdgeId> = new Set<EdgeId>()): Set<id> {
        const visited = new Set<string>();

        const dfs = (nodeId: id) => {
            visited.add(nodeId);
            const info = this.nodeMap(nodeId)
            if (info === undefined) {
                // console.warn('Node does not exist (dfsVisitedNodes)', nodeId)
                visited.delete(nodeId);
                return
            }

            const edges = info.edgeInformation
            edges.forEach((_, neighborId) => {
                if (!visited.has(neighborId) && (!excludedEdges.has(`${nodeId}+${neighborId}`))) {
                    dfs(neighborId);
                }
            });
            const incomingEdges = info.incomingNodes

            incomingEdges.forEach((_, neighborId) => {
                if (!visited.has(neighborId) && (!excludedEdges.has(`${neighborId}+${nodeId}`))) 
                    dfs(neighborId);
            });
        }
        dfs(nodeId);
        return visited;
    }

    private getConnectedComponents(): Set<Set<id>> {
        let connectedComponents = new Set<Set<id>>();
        let visited = new Set<id>();
        for (const nodeId of this.nodeIds.keys()) {
            if (visited.has(nodeId))
                continue;
            
            let component = this.dfsVisitedNodes(nodeId);
            visited = new Set([...visited, ...component]);
            connectedComponents.add(component);
        }
        return connectedComponents;
    }
    public isWeaklyConnected(): boolean {
        return this.getConnectedComponents().size === 1;
    }
    private findPath(source: id, target: id, excludedEdge: Set<EdgeId>): ReadonlyArray<id> {
        if(this.nodeIds.get(source) === undefined || this.nodeIds.get(target) === undefined)
            return []

        const visited = new Set<id>();
        const path: id[] = [];

        const dfs = (node: id): boolean => {
            if (visited.has(node))
                return false;

            visited.add(node);
            path.push(node);

            if (node === target)
                return true

            const nodeInfo = this.nodeMap(node)!
            for (const [successorNode,] of nodeInfo.edgeInformation) {
                if (excludedEdge.has(`${node}+${successorNode}`))
                    continue

                if (dfs(successorNode))
                    return true
            }

            for (const [predecessorNode,] of nodeInfo.incomingNodes) {
                if (excludedEdge.has(`${predecessorNode}+${node}`))
                    continue

                if (dfs(predecessorNode))
                    return true
            }

            visited.delete(node);
            path.pop();
            return false
        }
        return dfs(source) ? path : []
    }


    private isConnectedAfterEdgeRemoval(source: id, target: id): boolean {
        const excludedEdge = new Set<EdgeId>([`${source}+${target}`, `${target}+${source}`]);

        // If the edge to be removed exists reversed, then the graph is still connected
        const forward = this.nodeMap(source)?.edgeInformation.get(target);
        const backward = this.nodeMap(target)?.edgeInformation.get(source);
        if (forward !== undefined && backward !== undefined)
            return true;

        const sourceToRootPath = this.findPath(source, this.rootId, excludedEdge);
        const targetToRootPath = this.findPath(target, this.rootId, excludedEdge);

        return sourceToRootPath.length !== 0 && targetToRootPath.length !== 0;
    }

    private computePathConnectingComponents(connectedComponents: Set<Set<id>>, allPathsWithCostInGraph: Set<[RestorablePath, BigInt]>, danglingEdges: Set<RemovedGraphElement>): [RestorablePath, Set<RemovedGraphElement>, Set<Set<id>>,  Set<[RestorablePath, BigInt]>] | undefined {
        const allPathsSorted =  Array.from(allPathsWithCostInGraph).sort((a, b) => a[1] < b[1] ? -1 : 1);
        for (const [path, ] of allPathsSorted) {
            const first = begin(path)!
            const last = end(path)!
            for (const component of connectedComponents) {
                for (const otherComponent of connectedComponents) {
                    if (component === otherComponent)
                        continue
                    if ((component.has(first) && otherComponent.has(last)) || 
                        (otherComponent.has(first) && component.has(last)) 
                    ) {
                        const pathNodes = new Set(path.edges.map(x => x.nodeId));
                        const danglingEdgesInPath = 
                            new Set(
                                Array.from(danglingEdges)
                                .filter(x => splitEdgeId(x.item.edgeId).some(y => pathNodes.has(y)))
                            );
                        const danglingEdgeNodesToBeRestored = new Set([...danglingEdgesInPath].map(x => splitEdgeId(x.item.edgeId)).flat());

                        const componentsToBeMerged = 
                            new Set(
                                Array.from(connectedComponents)
                                .filter(x => x.intersection(danglingEdgeNodesToBeRestored).size > 0)
                            ).union(new Set([component, otherComponent]))
                        
                        const mergedComponents = mergeComponents(connectedComponents, componentsToBeMerged, pathNodes)

                        const pathsContainedInConnectedComponents =
                            new Set(
                                allPathsSorted
                                .filter(x => mergedComponents.isSupersetOf(new Set(x[0].edges.map(y => y.nodeId).concat(splitEdgeId(x[0].finalEdge.id)))))
                            );

                        return [path, danglingEdgesInPath, mergedComponents, pathsContainedInConnectedComponents];
                    }
                }
            }
        }
        return undefined
    }


    private getGraphElementIdxAndMergedComponents(connectedComponents: Set<Set<id>>, danglingEdges: Set<RemovedGraphElement>): [number, Set<Set<id>>, Set<RemovedGraphElement>] | undefined {
        for (const [reversedGraphElementIndex, graphElement] of this.removedGraphElements.toArray().toReversed().entries()) {  
            for (const component of connectedComponents) {
                for (const otherConnectedComponent of connectedComponents) {
                    if (component === otherConnectedComponent)
                        continue;
                    switch (graphElement.type) {
                        case 'edgeWithNode': {
                            const [source, target] = splitEdgeId(graphElement.item.edgeId);
                            if (this.nodeIds.get(source) === undefined && this.nodeIds.get(target) === undefined) 
                                continue;

                            // If the deleted node is in the graph, try to merge components with only the deleted edge
                            if ((this.nodeIds.get(graphElement.item.nodeId) !== undefined) && 
                                ((component.has(source) && otherConnectedComponent.has(target)) || 
                                (component.has(target) && otherConnectedComponent.has(source)))) {

                                const mergedComponents = mergeComponents(connectedComponents, new Set([component, otherConnectedComponent]));
                                const edgeIndex = this.removedGraphElements.length - 1 - reversedGraphElementIndex;

                                return [edgeIndex, mergedComponents, new Set()];
                            }

                            const incomingSourceNodes = new Set (graphElement.item.incomingNodes.map(x => splitEdgeId(x.edgeId)[0]));
                            const targetNodes = new Set (graphElement.item.edgeInformation.map(x => splitEdgeId(x.edgeId)[1]));

                            // Check if the connecting node is connected via a dangling edge to a component
                            const componentDanglingEdgeToConnectionNode = 
                                Array.from(component)
                                .filter(x => [...danglingEdges]
                                                .find(y => 
                                                    (y.item.edgeId === `${x}+${graphElement.item.nodeId}`) || 
                                                    (y.item.edgeId === `${graphElement.item.nodeId}+${x}`)) 
                                                !== undefined).length > 0;

                            const otherComponentDanglingEdgeToConnectionNode =
                                Array.from(otherConnectedComponent)
                                .filter(x => [...danglingEdges]
                                    .find(y => 
                                        (y.item.edgeId === `${x}+${graphElement.item.nodeId}`) || 
                                        (y.item.edgeId === `${graphElement.item.nodeId}+${x}`)) 
                                    !== undefined).length > 0;
                            
                            const compAndSourceNodesIntersetion = component.intersection(incomingSourceNodes).size > 0;
                            const compAndTargetNodesIntersetion = component.intersection(targetNodes).size > 0;
                            const otherCompAndSourceNodesIntersetion = otherConnectedComponent.intersection(incomingSourceNodes).size > 0;
                            const otherCompAndTargetNodesIntersetion = otherConnectedComponent.intersection(targetNodes).size > 0;

                            if ((componentDanglingEdgeToConnectionNode && otherComponentDanglingEdgeToConnectionNode) ||
                                (componentDanglingEdgeToConnectionNode && otherCompAndSourceNodesIntersetion) ||
                                (componentDanglingEdgeToConnectionNode && otherCompAndTargetNodesIntersetion) ||
                                (otherComponentDanglingEdgeToConnectionNode && compAndSourceNodesIntersetion) ||
                                (otherComponentDanglingEdgeToConnectionNode && compAndTargetNodesIntersetion) ||
                                (compAndSourceNodesIntersetion && otherCompAndSourceNodesIntersetion) || 
                                (compAndSourceNodesIntersetion && otherCompAndTargetNodesIntersetion) || 
                                (compAndTargetNodesIntersetion && otherCompAndSourceNodesIntersetion) || 
                                (compAndTargetNodesIntersetion && otherCompAndTargetNodesIntersetion)) 
                                {

                                const danglingEdgesToRepair =
                                    new Set(
                                        Array.from(danglingEdges).filter(x => 
                                            splitEdgeId(x.item.edgeId)[1] === graphElement.item.nodeId || 
                                            splitEdgeId(x.item.edgeId)[0] === graphElement.item.nodeId)
                                    );

                                const nodesInDanglingEdgesToRepair = new Set([...danglingEdgesToRepair].map(x => splitEdgeId(x.item.edgeId)).flat());

                                const nodesToBeMerged = 
                                    nodesInDanglingEdgesToRepair
                                    .union(incomingSourceNodes)
                                    .union(targetNodes);
                                
                                const componentsToBeMerged =
                                    new Set(
                                        Array.from(connectedComponents)
                                        .filter(x => x.intersection(nodesToBeMerged).size > 0)
                                    )
                                    
                                const mergedComponents = mergeComponents(connectedComponents, componentsToBeMerged, new Set([graphElement.item.nodeId]));
                                const nodeIndex = this.removedGraphElements.length - 1 - reversedGraphElementIndex;
                                return [nodeIndex, mergedComponents, danglingEdgesToRepair];
                            }
                            break;
                        }
                        case 'edge': {
                            const [source, target] = splitEdgeId(graphElement.item.edgeId);
                            if ((component.has(source) && otherConnectedComponent.has(target)) || (otherConnectedComponent.has(source) && component.has(target))) {
                                const mergedComponents = mergeComponents(connectedComponents, new Set([component, otherConnectedComponent]));
                                const edgeIndex = this.removedGraphElements.length - 1 - reversedGraphElementIndex
                                return [edgeIndex, mergedComponents, new Set()];
                            }
                            break;
                        }
                    }

                }
            }
        }
        return undefined;
    }

    private addYRemovedEdgeWithNode(edgeWithNode: EdgeInformationForRemovedEdgesWithNode, danglingToNode: Set<RemovedGraphElement>): void {
        this.yDoc.transact(() => {

            // If the node is already in the graph, restore only the edge
            if (this.nodeIds.get(edgeWithNode.nodeId) !== undefined) {
                const [source, target] = splitEdgeId(edgeWithNode.edgeId);
                assert(this.nodeIds.get(source) !== undefined && this.nodeIds.get(target) !== undefined, 'Edge cannot be added (addYRemovedEdgeWithNode)');
                this.addEdge(source, target, edgeWithNode.edgeLabel);
                return;
            }
            
            const addedNodeInfo = this.uncheckedNodeMap(edgeWithNode.nodeId)
            // TODO maybe this information cleared here can be reused?
            addedNodeInfo.edgeInformation.clear()
            addedNodeInfo.incomingNodes.clear()
            addedNodeInfo.nodeData.clear()

            this.addNode(edgeWithNode.nodeId, {
                id: edgeWithNode.nodeId,
                label: edgeWithNode.nodeLabel,
                position: edgeWithNode.nodePosition,
                selected: false
            })

            // Add dangling edge or dangling incoming node information to the removed graph element
            Array.from(danglingToNode.values()).forEach(x => {
                if (splitEdgeId(x.item.edgeId)[1] === edgeWithNode.nodeId) 
                    addedNodeInfo.incomingNodes.set(splitEdgeId(x.item.edgeId)[0], { label: x.item.edgeLabel });
                if (splitEdgeId(x.item.edgeId)[0] === edgeWithNode.nodeId) 
                    addedNodeInfo.edgeInformation.set(splitEdgeId(x.item.edgeId)[1], { label: x.item.edgeLabel });
            });
            
            for (const edge of edgeWithNode.edgeInformation) {
                const [source, target] = splitEdgeId(edge.edgeId);
                if (this.nodeIds.get(source) === undefined || this.nodeIds.get(target) === undefined) {
                    console.warn('Edge cannot be added (addYRemovedNodeWithEdges)', source, this.nodeIds.get(source), target, this.nodeIds.get(target));
                    continue;
                }
                this.addEdge(source, target, edge.edgeLabel);
            }
            for (const edge of edgeWithNode.incomingNodes) {
                const [source, target] = splitEdgeId(edge.edgeId);
                if (this.nodeIds.get(source) === undefined || this.nodeIds.get(target) === undefined) {
                    console.warn('Incoming edge cannot be added (addYRemovedNodeWithEdges), source, target', source, this.nodeIds.get(source), target, this.nodeIds.get(target));
                    continue;
                }
                this.addEdge(source, target, edge.edgeLabel);
            }
        });
    }

    private addYRemovedPath(path: RestorablePath, danglingEdgesInPath: Set<RemovedGraphElement>): void {
        this.yDoc.transact(() => {
            for (const edge of path.edges) {
                const [source, target] = splitEdgeId(edge.edgeId)
                const [edgeDirection, otherNode]: [EdgeDirection, id] = 
                    source === edge.nodeId 
                    ? ['->', target]
                    : ['<-', source]

                this.addNodeWithEdge(edge.nodeId, edgeDirection, otherNode, edge.nodePayload.label, edge.nodePayload.position, edge.edgePayload.label)
                const outgoingDanglingEdges = [...danglingEdgesInPath].filter(x => splitEdgeId(x.item.edgeId)[0] === edge.nodeId)
                const incomingDanglingEdges = [...danglingEdgesInPath].filter(x => splitEdgeId(x.item.edgeId)[1] === edge.nodeId)
                const thisNode = this.nodeMap(edge.nodeId)!
                for (const outgoing of outgoingDanglingEdges) {
                    const target = splitEdgeId(outgoing.item.edgeId)[1]
                    thisNode.edgeInformation.set(target, { label: outgoing.item.edgeLabel })
                }
                for (const incoming of incomingDanglingEdges) {
                    const source = splitEdgeId(incoming.item.edgeId)[0]
                    thisNode.incomingNodes.set(source, { label: incoming.item.edgeLabel })
                }
            }

            // add final edge
            {
                const [source, target] = splitEdgeId(path.finalEdge.id)
                this.addEdge(source, target, path.finalEdge.edgePayload.label)
            }
        });
    }

    public benchmarkData: BenchmarkData = {
        danglingEdges: 0,
        connectedComponents: 0,
        paths: 0,
        restoredNodesWithEdges: 0,
        restoredEdges: 0,
        restoredPaths: 0,
    }

    private i = 0;
    public makeGraphWeaklyConnected(): void {
        this.yDoc.transact(() => {
            this.i++;
            this.benchmarkData = {
                danglingEdges: 0,
                connectedComponents: 0,
                paths: 0,
                restoredNodesWithEdges: 0,
                restoredEdges: 0,
                restoredPaths: 0,
            }

            let danglingEdges = new Set(this.getDanglingEdges());
            this.benchmarkData.danglingEdges = danglingEdges.size;
            let connectedComponents = this.getConnectedComponents();
            this.benchmarkData.connectedComponents = connectedComponents.size;
            while (connectedComponents.size > 1) {
                const tryToConnectComponentsWithGraphElement = this.getGraphElementIdxAndMergedComponents(connectedComponents, danglingEdges);
                if (tryToConnectComponentsWithGraphElement === undefined) 
                    break;

                const [graphElementIdxConnectingTwoComponents, mergedComponents, danglingEdgesToRepair] = tryToConnectComponentsWithGraphElement;
                const graphElementConnectingTwoComponents = this.removedGraphElements.get(graphElementIdxConnectingTwoComponents);
                
                switch (graphElementConnectingTwoComponents.type) {
                    case 'edgeWithNode': {
                        const nodeConnectingTwoComponents = graphElementConnectingTwoComponents.item;
                        this.addYRemovedEdgeWithNode(nodeConnectingTwoComponents, danglingEdgesToRepair);
                        danglingEdges = danglingEdges.difference(danglingEdgesToRepair);
                        this.benchmarkData.restoredNodesWithEdges++;
                        break;
                    }
                    case 'edge': {
                        const edgeConnectingTwoComponents = graphElementConnectingTwoComponents.item;
                        const [source, target] = splitEdgeId(edgeConnectingTwoComponents.edgeId);
                        const edgeLabel = edgeConnectingTwoComponents.edgeLabel;
                        // Added edge is removed from the removed edges list in addEdge
                        this.addEdge(source, target, edgeLabel);
                        this.benchmarkData.restoredEdges++;
                        break;
                    }
                }
                
                connectedComponents = mergedComponents;
            }

            const pathCost = (path: RestorablePath): BigInt => {
                let cost = 0n;
                const sortedDanglingEdges = Array.from(danglingEdges).sort((a, b) => a.item.edgeId.localeCompare(b.item.edgeId));
                const allGraphElements = this.removedGraphElements.toArray().concat(sortedDanglingEdges);	
                const usedRemovedElements = path.edges.reduce((s, n) => s.union(n.edgePayload.usedRemovedElements), path.finalEdge.edgePayload.usedRemovedElements)
                for (const elem of usedRemovedElements) {
                    const indexReversed = allGraphElements.toReversed().findIndex(x => elem === x);

                    if (indexReversed === -1) {
                        console.warn('Element does not exist in the removed graph elements list (computePathConnectingComponents)', elem);
                    }
                    cost = cost + (1n << BigInt(indexReversed));
                }
                return cost;
            }
            
            let allPathsWithCostInGraph: Set<[RestorablePath, BigInt]> = 
                connectedComponents.size > 1 
                ? new Set(
                    Array.from(
                        findAllPathsInGraphElements(this.removedGraphElements.toArray().concat(Array.from(danglingEdges))))
                        .map(x => [x, pathCost(x)])
                )
                : new Set();
            
            this.benchmarkData.paths = allPathsWithCostInGraph.size;

            while (connectedComponents.size > 1) {
                const tryToConnectComponentsWithPath = this.computePathConnectingComponents(connectedComponents, allPathsWithCostInGraph, danglingEdges);
                if (tryToConnectComponentsWithPath !== undefined) {
                    const [path, danglingEdgesInPath, mergedComponents, pathsContainedInConnectedComponents] = tryToConnectComponentsWithPath;
                    this.addYRemovedPath(path, danglingEdgesInPath);
                    connectedComponents = mergedComponents;
                    danglingEdges = danglingEdges.difference(danglingEdgesInPath);
                    allPathsWithCostInGraph = allPathsWithCostInGraph.difference(pathsContainedInConnectedComponents)
                    this.benchmarkData.restoredPaths++;
                }

                assert(tryToConnectComponentsWithPath !== undefined, 'Could not connect components');
            }

            // Remove remaining dangling edges which were not used to connect components
            this.removeRemainingDanglingEdges(danglingEdges);

            assert(this.getDanglingEdges().length === 0, 'Dangling edges should be removed');

        });
    }

    get nodeCount() {
        return this.nodeIds.size
    }
    get edgeCount() {
        return Array.from(this.nodeIds.keys()).reduce((acc, x) => acc + this.nodeMap(x)!.edgeInformation.size, 0);
    }

    getYRemovedGraphElementsAsJson(): string {
        return JSON.stringify(this.removedGraphElements.toArray());
    }
    getNodesAsJson(): string {
        return JSON.stringify(Array.from(this.nodeIds.keys()).sort());
    }
    getEdgesAsJson(): string {
        let edges = 
            Array.from(this.nodeIds.keys()).map(sourceNode =>
                Array.from(this.nodeMap(sourceNode)!.edgeInformation).map(([targetNode]) => {
                    //assert(this.nodeIds.get(targetNode) !== undefined, 'target node still dangling and contained')
                    return [sourceNode + '+' + targetNode]
                })).flat()
        return JSON.stringify(edges.sort());
    }

    getNodes(): string[] {
        return Array.from(this.nodeIds.keys());
    }
}