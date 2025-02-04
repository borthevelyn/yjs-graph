import * as Y from 'yjs';
import { MarkerType, XYPosition } from "@xyflow/react";
import { id, FlowNode, FlowEdge, EdgeId, ObjectYMap, EventEmitter, splitEdgeId, EdgeDirection } from "../Types";
import { WeaklyConnectedGraphWithFixedRoot } from "./Graph";
import assert from 'assert';

function xor(a: boolean, b: boolean): boolean {
    return (a && !b) || (!a && b);
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
    // [the following comment seems to not be true: there are no duplicates of this kind by construction]
    // to deduplicate paths of kind [[1, 2], [2, 1]] (since they are equivalent for this purpose)
    // only paths whose first node is smaller than the last node (lexically) [this only works when all duplicates are contained]
    // problem: cycles. Handled above
    //.filter(path => (splitEdgeId(path[0].item.edgeId)[0] === 'root' ? '0' : splitEdgeId(path[0].item.edgeId)[0]).localeCompare(splitEdgeId(path[path.length - 1].item.edgeId)[1] === 'root' ? '0' : splitEdgeId(path[path.length - 1].item.edgeId)[1]) < 0)
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
        .filter(x => x.edges.length > 0)
        .map<RestorablePath>(path => {
            return {
                finalEdge: path.finalEdge,
                edges: path.edges.map(edge => {
                    const node = graphElements.find((x): x is { type: 'edgeWithNode', item: EdgeInformationForRemovedEdgesWithNode } => 
                        x.type === 'edgeWithNode' && x.item.nodeId === edge.nodeId)!

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
            }
        })
    )
}

function mergeComponents(connectedComponents: Set<Set<id>>, comp1: Set<id>, comp2: Set<id>): Set<Set<id>> {
    connectedComponents.delete(comp1);
    connectedComponents.delete(comp2);
    connectedComponents.add(new Set([...comp1, ...comp2]));
    return connectedComponents;
}

type EdgeInformation = {
    label: string
}
type NodeInformation = ObjectYMap<{
    flowNode: FlowNode
    // This map may contain dangling edges because of Yjs synchronization
    // Reading from this map should always takes this into account
    edgeInformation: Y.Map<EdgeInformation>
    incomingNodes: Y.Map<EdgeInformation>
}>

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

export class FixedRootWeaklyConnectedGraph implements WeaklyConnectedGraphWithFixedRoot {
    private yMatrix: AdjacencyMapGraph;
    private rootId: id = 'root';
    private yRemovedGraphElements: Y.Array<RemovedGraphElement>;

    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;
    private eventEmitter: EventEmitter | undefined;

    constructor(yMatrix: AdjacencyMapGraph, yRemovedGraphElements: Y.Array<RemovedGraphElement>, makeRoot: boolean, eventEmitter?: EventEmitter) {
        this.yMatrix = yMatrix;
        
        if (makeRoot) {
            const root = this.makeNodeInformation({ 
                id: this.rootId, 
                data : { label: 'root' }, 
                position: { x: 0, y: 0 }, 
                deletable: false, 
                // type: 'editNodeLabel',
            }, 
            new Y.Map<EdgeInformation>(),
            new Y.Map<EdgeInformation>());
            this.yMatrix.set(this.rootId, root);
        }

        this.yRemovedGraphElements = yRemovedGraphElements;
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
        this.eventEmitter = eventEmitter;
        if (this.eventEmitter !== undefined) {
            this.yMatrix.observeDeep(() => this.eventEmitter?.fire());
        }
    }

    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda)
    }

    private makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>, incomingNodes: Y.Map<EdgeInformation>) {
        const res = new Y.Map() as NodeInformation;
        res.set('flowNode', node);
        res.set('edgeInformation', edges);
        res.set('incomingNodes', incomingNodes);
        return res
    }

    // removes edges or edges with a node that were added to the graph
    private removeYEdge(edgeId: EdgeId) {
        this.yRemovedGraphElements.doc!.transact(() => {
            let nodeIndex;
            do {
                nodeIndex = this.yRemovedGraphElements.toArray().findIndex(x => x.item.edgeId === edgeId);  
                if (nodeIndex !== -1)
                    this.yRemovedGraphElements.delete(nodeIndex);   
            } while(nodeIndex >= 0);
        });
    }
    private getDanglingEdges(): Array<RemovedGraphElement> {
        const danglingEdges = new Array<RemovedGraphElement>()
        for (const source of this.yMatrix.keys()) {
            for (const target of this.yMatrix.get(source)!.get('edgeInformation').keys()) {
                if (this.yMatrix.get(target) !== undefined) 
                    continue;
                const edgeAsRemovedGraphElement: RemovedGraphElement = {
                    type: 'edge',
                    item: { edgeId: `${source}+${target}`, edgeLabel: this.yMatrix.get(source)!.get('edgeInformation').get(target)!.label }
                }
                danglingEdges.push(edgeAsRemovedGraphElement)
                
            }

            for (const target of this.yMatrix.get(source)!.get('incomingNodes').keys()) {
                if (this.yMatrix.get(target) !== undefined) 
                    continue;
                const edgeAsRemovedGraphElement: RemovedGraphElement = {
                    type: 'edge',
                    item: { edgeId: `${target}+${source}`, edgeLabel: this.yMatrix.get(source)!.get('incomingNodes').get(target)!.label }
                }
                danglingEdges.push(edgeAsRemovedGraphElement)   
            }
            
        }
        return danglingEdges
    }
    private removeDanglingEdges(): void {
        this.yMatrix.doc!.transact(() => {
            for (const source of this.yMatrix.values()) {
                for (const target of source.get('edgeInformation').keys()) {
                    if (this.yMatrix.get(target) !== undefined)
                        continue;

                    const edgeId: EdgeId = `${source.get('flowNode').id}+${target}`;
                    // Removes the edge and the corresponding incoming node
                    this.removeEdge(source.get('flowNode').id, target);
                    this.selectedEdges.delete(edgeId);
                }
                // Removes dangling incoming nodes
                for (const [incomingNode, edgeInformation] of source.get('incomingNodes').entries()) {
                    if (this.yMatrix.get(incomingNode) !== undefined)
                        continue;
    
                    source.get('incomingNodes').delete(incomingNode);
                    this.yRemovedGraphElements.push([
                        { type: 'edge', 
                            item: { 
                                edgeId: `${incomingNode}+${source.get('flowNode').id}`, 
                                edgeLabel: edgeInformation.label } 
                        }]);
                }
            }
        });
    }
    private dfsVisitedNodes(nodeId: id, excludedEdges: Set<EdgeId> = new Set<EdgeId>()): Set<id> {
        const visited = new Set<string>();

        const dfs = (nodeId: id) => {
            visited.add(nodeId);
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist (dfsVisitedNodes)', nodeId)
                visited.delete(nodeId);
                return
            }

            const edges = nodeInfo.get('edgeInformation');
            edges.forEach((_, neighborId) => {
                if (!visited.has(neighborId) && (!excludedEdges.has(`${nodeId}+${neighborId}`))) {
                    dfs(neighborId);
                }
            });
            const incomingEdges = nodeInfo.get('incomingNodes');
            console.log('incomingEdges for node', Array.from(incomingEdges.keys()), nodeId);
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
        for (const nodeId of this.yMatrix.keys()) {
            console.log('getConnectedComponents for nodeId', nodeId);
            if (visited.has(nodeId))
                continue;
            
            let component = this.dfsVisitedNodes(nodeId);
            console.log('component', component);
            console.log('visited', visited);
            visited = new Set([...visited, ...component]);
            connectedComponents.add(component);
        }
        return connectedComponents;
    }
    public isWeaklyConnected(): boolean {
        return this.getConnectedComponents().size === 1;
    }
    private findPath(source: id, target: id, excludedEdge: Set<EdgeId>): ReadonlyArray<id> {
        if(this.yMatrix.get(source) === undefined || this.yMatrix.get(target) === undefined)
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

            const nodeInfo = this.yMatrix.get(node);
            for (const [successorNode,] of nodeInfo!.get('edgeInformation')) {
                if (excludedEdge.has(`${node}+${successorNode}`))
                    continue

                if (dfs(successorNode))
                    return true
            }

            for (const [predecessorNode,] of nodeInfo!.get('incomingNodes')) {
                if (excludedEdge.has(`${predecessorNode}+${node}`))
                    continue

                if (dfs(predecessorNode))
                    return true
            }

            path.pop();
            return false
        }
        return dfs(source) ? path : []
    }
    private isConnectedAfterEdgeRemoval(source: id, target: id): boolean {
        const excludedEdge = new Set<EdgeId>([`${source}+${target}`, `${target}+${source}`]);
        const edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        const edgeReversed = this.yMatrix.get(target)?.get('edgeInformation').get(source);
        if ((edge !== undefined) && (edgeReversed !== undefined)) 
            return true;

        const sourceToRootPath = this.findPath(source, this.rootId, excludedEdge);
        const targetToRootPath = this.findPath(target, this.rootId, excludedEdge);
        console.log('source, target in isConnectedAfterEdgeRemoval', source, target);
        console.log('sourceToRootPath', sourceToRootPath);
        console.log('targetToRootPath', targetToRootPath);
        return sourceToRootPath.length !== 0 && targetToRootPath.length !== 0;
    }
    private computePathConnectingComponents(connectedComponents: Set<Set<id>>, allPathsInGraph: Set<RestorablePath>, danglingEdges: Set<RemovedGraphElement>): [RestorablePath, Set<RemovedGraphElement>, Set<Set<id>>] | undefined {
        const pathCost = (path: RestorablePath): BigInt => {
            let cost = 0n;
            const sortedDanglingEdges = Array.from(danglingEdges).sort((a, b) => a.item.edgeId.localeCompare(b.item.edgeId));
            const allGraphElements = this.yRemovedGraphElements.toArray().concat(sortedDanglingEdges);	
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
        const allPathsSorted =  Array.from(allPathsInGraph).map<[RestorablePath, BigInt]>(x => [x, pathCost(x)]).sort((a, b) => a[1] < b[1] ? -1 : 1);

        for (const [path, cost] of allPathsSorted) {
            const first = begin(path)!
            const last = end(path)!
            for (const component of connectedComponents) {
                for (const otherComponent of connectedComponents) {
                    if (component === otherComponent)
                        continue
                    if ((component.has(first) && otherComponent.has(last)) || 
                        (otherComponent.has(first) && component.has(last)) 
                    ) {
                        const usedRemovedElements = path.edges.reduce((s, n) => s.union(n.edgePayload.usedRemovedElements), path.finalEdge.edgePayload.usedRemovedElements)
                        // TODO: also check dangling edges not directly contained in the path
                        const danglingEdgesInPath = usedRemovedElements.intersection(danglingEdges)
                        return [path, danglingEdgesInPath, mergeComponents(connectedComponents, component, otherComponent)];
                    }
                }
            }
        }
        return undefined
    }
    private getGraphElementIdxAndMergedComponents(connectedComponents: Set<Set<id>>): [number, Set<Set<id>>] | undefined {
        for (const [reversedGraphElementIndex, graphElement] of this.yRemovedGraphElements.toArray().toReversed().entries()) {  
            for (const component of connectedComponents) {
                for (const otherConnectedComponent of connectedComponents) {
                    if (component === otherConnectedComponent)
                        continue;
                    switch (graphElement.type) {
                        case 'edgeWithNode': {
                            const [source, target] = splitEdgeId(graphElement.item.edgeId);
                            if (this.yMatrix.get(source) === undefined && this.yMatrix.get(target) === undefined) 
                                continue;

                            const incomingSourceNodes = new Set(graphElement.item.incomingNodes.map(x => splitEdgeId(x.edgeId)[0]));
                            const targetNodes = new Set (graphElement.item.edgeInformation.map(x => splitEdgeId(x.edgeId)[1]));
                            console.log('graphElement', graphElement);
                            console.log('incomingSourceNodes', incomingSourceNodes);
                            console.log('targetNodes', targetNodes);
                            // Check if the connecting node is connected via a dangling edge to a component
                            const componentDanglingEdgeToConnectionNode = 
                                Array.from(component)
                                .filter(x => 
                                    (this.yMatrix.get(x)?.get('incomingNodes').get(graphElement.item.nodeId) !== undefined) || 
                                    (this.yMatrix.get(x)?.get('edgeInformation').get(graphElement.item.nodeId) !== undefined))
                                .length > 0;
                            const otherComponentDanglingEdgeToConnectionNode =
                                Array.from(otherConnectedComponent)
                                .filter(x => 
                                    (this.yMatrix.get(x)?.get('incomingNodes').get(graphElement.item.nodeId) !== undefined) || 
                                    (this.yMatrix.get(x)?.get('edgeInformation').get(graphElement.item.nodeId) !== undefined))
                                .length > 0;
                            
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
                                const mergedComponents = mergeComponents(connectedComponents, component, otherConnectedComponent);
                                const nodeIndex = this.yRemovedGraphElements.length - 1 - reversedGraphElementIndex
                                return [nodeIndex, mergedComponents];
                            }
                            break;
                        }
                        case 'edge': {
                            const [source, target] = splitEdgeId(graphElement.item.edgeId);
                            if ((component.has(source) && otherConnectedComponent.has(target)) || (otherConnectedComponent.has(source) && component.has(target))) {
                                const mergedComponents = mergeComponents(connectedComponents, component, otherConnectedComponent);
                                const edgeIndex = this.yRemovedGraphElements.length - 1 - reversedGraphElementIndex
                                return [edgeIndex, mergedComponents];
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
        console.log('addYRemovedNodeWithEdges', edgeWithNode);
        this.yMatrix.doc!.transact(() => {
            // Add dangling edge or dangling incoming node information to the removed graph element
            let danglingIncomingNodesToNode: Y.Map<EdgeInformation> = new Y.Map<EdgeInformation>();
            let danglingEdgesToNode: Y.Map<EdgeInformation> = new Y.Map<EdgeInformation>();
            console.log('danglingEdges', danglingToNode);
            Array.from(danglingToNode.values()).forEach(x => {
                if (splitEdgeId(x.item.edgeId)[1] === edgeWithNode.nodeId) 
                    danglingIncomingNodesToNode.set(splitEdgeId(x.item.edgeId)[0], { label: x.item.edgeLabel });
                if (splitEdgeId(x.item.edgeId)[0] === edgeWithNode.nodeId) 
                    danglingEdgesToNode.set(splitEdgeId(x.item.edgeId)[1], { label: x.item.edgeLabel });
                });
            console.log('edgeWithNode', edgeWithNode);
            console.log('danglingIncomingNodes (addYRemovedEdgeWithNode)', danglingIncomingNodesToNode);
            console.log('danglingEdges (addYRemovedEdgeWithNode)', danglingEdgesToNode);    
            const innerMap = this.makeNodeInformation({ 
                id: edgeWithNode.nodeId, 
                data : { label: edgeWithNode.nodeLabel }, 
                position: edgeWithNode.nodePosition, 
                deletable: false, 
                // type: 'editNodeLabel',
            }, 
            danglingEdgesToNode,
            danglingIncomingNodesToNode);
            this.yMatrix.set(edgeWithNode.nodeId, innerMap);
            for (const edge of edgeWithNode.edgeInformation) {
                const [source, target] = splitEdgeId(edge.edgeId);
                if (this.yMatrix.get(source) === undefined || this.yMatrix.get(target) === undefined) {
                    console.warn('Edge cannot be added (addYRemovedNodeWithEdges)', source, this.yMatrix.get(source), target, this.yMatrix.get(target));
                    continue;
                }
                this.addEdge(source, target, edge.edgeLabel);
            }
            for (const edge of edgeWithNode.incomingNodes) {
                const [source, target] = splitEdgeId(edge.edgeId);
                if (this.yMatrix.get(source) === undefined || this.yMatrix.get(target) === undefined) {
                    console.warn('Incoming edge cannot be added (addYRemovedNodeWithEdges), source, target', source, this.yMatrix.get(source), target, this.yMatrix.get(target));
                    continue;
                }
                this.addEdge(source, target, edge.edgeLabel);
            }
        });
    }
    private addYRemovedPath(path: RestorablePath, danglingEdgesInPath: Set<RemovedGraphElement>): void {
        this.yMatrix.doc!.transact(() => {
            for (const edge of path.edges) {
                const [source, target] = splitEdgeId(edge.edgeId)
                const [edgeDirection, otherNode]: [EdgeDirection, id] = 
                    source === edge.nodeId 
                    ? ['->', target]
                    : ['<-', source]

                this.addNodeWithEdge(edge.nodeId, edgeDirection, otherNode, edge.nodePayload.label, edge.nodePayload.position, edge.edgePayload.label)
                const outgoingDanglingEdges = [...danglingEdgesInPath].filter(x => splitEdgeId(x.item.edgeId)[0] === edge.nodeId)
                const incomingDanglingEdges = [...danglingEdgesInPath].filter(x => splitEdgeId(x.item.edgeId)[1] === edge.nodeId)
                const thisNode = this.yMatrix.get(edge.nodeId)!
                for (const outgoing of outgoingDanglingEdges) {
                    const target = splitEdgeId(outgoing.item.edgeId)[1]
                    thisNode.get('edgeInformation').set(target, { label: outgoing.item.edgeLabel })
                }
                for (const incoming of incomingDanglingEdges) {
                    const source = splitEdgeId(incoming.item.edgeId)[0]
                    thisNode.get('incomingNodes').set(source, { label: incoming.item.edgeLabel })
                }
            }

            // add final edge
            {
                const [source, target] = splitEdgeId(path.finalEdge.id)
                this.addEdge(source, target, path.finalEdge.edgePayload.label)
            }
        });
    }
    public makeGraphWeaklyConnected(): void {
        this.yRemovedGraphElements.doc!.transact(() => {
        let danglingEdges = new Set(this.getDanglingEdges());
        console.log('danglingEdges', danglingEdges);
        let connectedComponents = this.getConnectedComponents();
        console.log('connected components', connectedComponents, connectedComponents.size);
        while (connectedComponents.size > 1) {
            const tryToConnectComponentsWithGraphElement = this.getGraphElementIdxAndMergedComponents(connectedComponents);
            if (tryToConnectComponentsWithGraphElement === undefined) 
                break;

            const [graphElementIdxConnectingTwoComponents, mergedComponents] = tryToConnectComponentsWithGraphElement;
            const graphElementConnectingTwoComponents = this.yRemovedGraphElements.get(graphElementIdxConnectingTwoComponents);

            switch (graphElementConnectingTwoComponents.type) {
                case 'edgeWithNode': {
                    const nodeConnectingTwoComponents = graphElementConnectingTwoComponents.item;

                    const danglingEdgesToNode = 
                      new Set(
                        Array.from(danglingEdges).filter(x => splitEdgeId(x.item.edgeId)[1] === nodeConnectingTwoComponents.nodeId || splitEdgeId(x.item.edgeId)[0] === nodeConnectingTwoComponents.nodeId)
                      );
                    console.log('danglingEdgesToNode', danglingEdgesToNode);
                    this.addYRemovedEdgeWithNode(nodeConnectingTwoComponents, danglingEdgesToNode);
                    danglingEdges = danglingEdges.difference(danglingEdgesToNode);
                    break;
                }
                case 'edge': {
                    const edgeConnectingTwoComponents = graphElementConnectingTwoComponents.item;
                    const [source, target] = splitEdgeId(edgeConnectingTwoComponents.edgeId);
                    const edgeLabel = edgeConnectingTwoComponents.edgeLabel;
                    // Added edge is removed from the removed edges list in addEdge
                    this.addEdge(source, target, edgeLabel);
                    break;
                }
            }
            
            connectedComponents = mergedComponents;
        }

        
        let allPathsInGraph: Set<RestorablePath> = 
            connectedComponents.size > 1 
            ? findAllPathsInGraphElements(this.yRemovedGraphElements.toArray().concat(Array.from(danglingEdges)))
            : new Set();

        while (connectedComponents.size > 1) {
            console.log('try to connect components with path')
            //console.log('allPathsInGraph', allPathsInGraph);
            const tryToConnectComponentsWithPath = this.computePathConnectingComponents(connectedComponents, allPathsInGraph, danglingEdges);
            console.log('tryToConnectComponentsWithPath', tryToConnectComponentsWithPath);
            if (tryToConnectComponentsWithPath !== undefined) {
                const [path, danglingEdgesInPath, mergedComponents] = tryToConnectComponentsWithPath;
                this.addYRemovedPath(path, danglingEdgesInPath);
                connectedComponents = mergedComponents;
                danglingEdges = danglingEdges.difference(danglingEdgesInPath);
                allPathsInGraph = allPathsInGraph.difference(new Set([path]));
            }
            
            assert(tryToConnectComponentsWithPath !== undefined, 'Could not connect components');
        }

        this.removeDanglingEdges();
        });
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
    addNodeWithEdge(nodeId: id, edgeDirection: EdgeDirection, otherNodeId: id, nodeLabel: string, nodePosition: XYPosition, edgeLabel: string): void {
        this.yMatrix.doc!.transact(() => {
            const [source, target] = [edgeDirection === '->' ? nodeId : otherNodeId, edgeDirection === '<-' ? nodeId : otherNodeId];
            if (nodeId === this.rootId) {
                console.warn('Cannot add a node with the same id as the root node (addNodeWithEdge)');
                return;
            }

            if ((this.yMatrix.size === 1) && (!xor((source === this.rootId),(target === this.rootId)))) {
                console.log('source, target, rootId', source, target, this.rootId);
                console.warn('Cannot add this edge with node, because it is not connected to the root node (addNodeWithEdge)');
                return;
            }

            if (!xor(this.yMatrix.get(source) !== undefined, this.yMatrix.get(target) !== undefined)) {
                console.warn('Cannot add this edge, as it is not connected to the graph', source);
                return; 
            }

            const nodeToBeAdded = this.makeNodeInformation({ 
                id: nodeId, 
                data: { label: nodeLabel },
                position: nodePosition, 
                deletable: false }, 
                new Y.Map<EdgeInformation>(), 
                new Y.Map<EdgeInformation>()
            );
            

            this.yMatrix.set(nodeId, nodeToBeAdded);
            this.addEdge(source, target, edgeLabel);
        })
    }

    addEdge(source: id, target: id, label: string): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.yMatrix.get(source);
            const nodeInfo2 = this.yMatrix.get(target);
            if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
                console.warn('one of the edge nodes does not exist', source, target)
                return 
            }
            // 1. Add the edge from the source node to the target node
            // 2. Add the reversed edge to the incoming nodes
            // 3. Remove the edge from the removed edges list
            nodeInfo1.get('edgeInformation').set(target, {label});
            nodeInfo2.get('incomingNodes').set(source, {label});
            this.removeYEdge(`${source}+${target}`);
            console.log('added edge with label, edges', label, nodeInfo1.get('edgeInformation').get(target));
            console.log('added edge with label, incoming edges', label, nodeInfo2.get('incomingNodes').get(source));
        });
    }

    removeEdge(source: id, target: id): void {
        function isEdgeRemovingANode(nodeInfo1: NodeInformation, nodeInfo2: NodeInformation): NodeInformation | undefined {
            const hasNodeSelfLoop = (nodeInfo: NodeInformation) => nodeInfo.get('edgeInformation').has(nodeInfo.get('flowNode').id);

            // Compute the number of adjacent edges for each node without self loops
            const edgesForNode1 = nodeInfo1.get('edgeInformation').size + nodeInfo1.get('incomingNodes').size - (hasNodeSelfLoop(nodeInfo1) ? 2 : 0);
            const edgesForNode2 = nodeInfo2.get('edgeInformation').size + nodeInfo2.get('incomingNodes').size - (hasNodeSelfLoop(nodeInfo2) ? 2 : 0);
            console.log('edgesForNode1, edgesForNode2', edgesForNode1, edgesForNode2);
            console.log('nodeInfo1 has target', nodeInfo1.get('edgeInformation').has(target));
            
            
            if (nodeInfo1.get('flowNode').id === 'root' && edgesForNode2 === 1) 
                return nodeInfo2;
            
            if (nodeInfo2.get('flowNode').id === 'root' && edgesForNode1 === 1)
                return nodeInfo1;

            if (nodeInfo1.get('flowNode').id === 'root' || nodeInfo2.get('flowNode').id === 'root')
                return undefined;
            
            if (nodeInfo1.get('edgeInformation').has(target) && nodeInfo2.get('incomingNodes').has(source) && edgesForNode2 === 1) 
                return nodeInfo2;
            
            if (nodeInfo1.get('edgeInformation').has(target) && nodeInfo2.get('incomingNodes').has(source) && edgesForNode1 === 1) 
                return nodeInfo1;
            
            return undefined;
        }
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.yMatrix.get(source);
            const nodeInfo2 = this.yMatrix.get(target);
            let nodeRemovedWithEdge = undefined;
            console.log('try to remove edge', source, target);

            if (nodeInfo1 !== undefined && nodeInfo2 !== undefined) {
                // If the edge is connected to a node that has at most one incoming or outgoing edge and a self loop
                // then removing this edge would also remove the node. The graph would not be disconnected in this case.
                console.log('nodeInfo1 edgeInformation', Array.from(nodeInfo1.get('edgeInformation').entries()));
                console.log('nodeInfo1 incomingNodes', Array.from(nodeInfo1.get('incomingNodes').entries()));
                console.log('nodeInfo2 edgeInformation', Array.from(nodeInfo2.get('edgeInformation').entries()));
                console.log('nodeInfo2 incomingNodes', Array.from(nodeInfo2.get('incomingNodes').entries()));
                const isEdgeInGraph = nodeInfo1.get('edgeInformation').has(target) && nodeInfo2.get('incomingNodes').has(source);
                nodeRemovedWithEdge = isEdgeInGraph ?isEdgeRemovingANode(nodeInfo1, nodeInfo2): undefined;
                console.log('nodeRemovedWithEdge', nodeRemovedWithEdge);

                if (nodeRemovedWithEdge === undefined && !this.isConnectedAfterEdgeRemoval(source, target)) {
                    console.warn('Removing this edge would disconnect the graph');
                    return
                }
            }
   
            // This method is designed to handle dangling edges, i.e. one of the two nodes could no longer
            // exist. This method is robust against this case. If both nodes exist, the edge will be also
            // deleted normally, if the edge does not exist (i.e. is not stored in any of the two maps),
            // no action can be taken
            const edgeId: EdgeId = `${source}+${target}`;
            const node1EdgeInfo = nodeInfo1?.get('edgeInformation')
            const node2Incoming = nodeInfo2?.get('incomingNodes')
            const edgeLabel = node1EdgeInfo?.get(target)?.label ?? node2Incoming?.get(source)?.label;

            // the edge does not exist in any way
            if (edgeLabel === undefined)
                return

            if (nodeRemovedWithEdge !== undefined) {
                console.log('nodeRemovedWithEdge edgeinformation', Array.from(nodeRemovedWithEdge.get('edgeInformation').entries()))
                console.log('nodeRemovedWithEdge incomingNodes', Array.from(nodeRemovedWithEdge.get('incomingNodes').entries()))
            }
            const removedGraphElement: RemovedGraphElement = (nodeRemovedWithEdge !== undefined) ? ({ 
                type: 'edgeWithNode', 
                item: { 
                    nodeId: nodeRemovedWithEdge.get('flowNode').id,
                    nodeLabel: nodeRemovedWithEdge.get('flowNode').data.label,
                    nodePosition: nodeRemovedWithEdge.get('flowNode').position,
                    edgeInformation: 
                        Array.from(nodeRemovedWithEdge.get('edgeInformation').entries())
                        .map<EdgeInformationForRemovedEdges>(([target, {label}]) => ({ edgeId: `${nodeRemovedWithEdge.get('flowNode').id}+${target}`, edgeLabel: label}))
                        .concat(this.yRemovedGraphElements
                            .toArray()
                            .filter(x => (x.type === 'edge'))
                            .filter(x => splitEdgeId(x.item.edgeId)[0] === nodeRemovedWithEdge.get('flowNode').id)
                            .map(x => x.item)),
                    incomingNodes: 
                        Array.from(nodeRemovedWithEdge.get('incomingNodes').entries())
                        .map<EdgeInformationForRemovedEdges>(([source, {label}]) => ({ edgeId: `${source}+${nodeRemovedWithEdge.get('flowNode').id}`, edgeLabel: label}))
                        .concat(this.yRemovedGraphElements
                            .toArray()
                            .filter(x => (x.type === 'edge'))
                            .filter(x => splitEdgeId(x.item.edgeId)[1] === nodeRemovedWithEdge.get('flowNode').id)
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
                console.log('fid', nodeRemovedWithEdge.get('flowNode').id);
                this.yMatrix.delete(nodeRemovedWithEdge.get('flowNode').id);
            }

            console.log('removedGraphElement in remove Edge', removedGraphElement);
            // 4. Add removed edge to the removed edges list
            this.yRemovedGraphElements.push([removedGraphElement]);

            // 5. Remove it from selected edges
            this.selectedEdges.delete(edgeId);

            console.log('removed edge', source, target);
        });
    }
    
    changeNodePosition(nodeId: id, position: XYPosition): void {
        throw new Error("Method not implemented.");
    }
    changeNodeDimension(nodeId: id, dimensions: { width: number; height: number; }): void {
        throw new Error("Method not implemented.");
    }
    changeNodeSelection(nodeId: id, selected: boolean): void {
        throw new Error("Method not implemented.");
    }
    changeEdgeSelection(edgeId: EdgeId, selected: boolean): void {
        throw new Error("Method not implemented.");
    }
    nodesAsFlow(): FlowNode[] {
        if (this.yMatrix === undefined)
            console.log('this', this);
        return Array.from(this.yMatrix.values()).map(x => {
            const flowNode = x.get('flowNode');
            console.log('node is selected', this.selectedNodes.has(flowNode.id), this.selectedNodes);
            return {
                ...flowNode,
                selected: this.selectedNodes.has(flowNode.id)
            }
        })
    }
    edgesAsFlow(): FlowEdge[] {
        this.removeDanglingEdges();

        const nestedEdges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode, {label}]) => {
                    if (this.yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained');
                    return {
                        id: `${sourceNode}+${targetNode}`,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        data: { label },
                        label,
                        selected: this.selectedEdges.has(`${sourceNode}+${targetNode}`),
                    }
                })
            )

        return nestedEdges.flat()
    }
    getNode(nodeId: id): FlowNode | undefined {
        return this.yMatrix.get(nodeId)?.get('flowNode');
    }
    getEdge(source: id, target: id): FlowEdge | undefined {
        this.removeDanglingEdges();
        let edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        if (edge === undefined)
            return undefined 
        return { 
                id: `${source}+${target}`, 
                source, 
                target, 
                deletable: true, 
                markerEnd: {type: MarkerType.Arrow}, 
                data: {label: edge.label }, 
                selected: this.selectedEdges.has(`${source}+${target}`), 
        }
    }
    getYRemovedGraphElementsAsJson(): string {
        return JSON.stringify(this.yRemovedGraphElements.toArray());
    }
    getEdgesAsJson(): string {
        this.removeDanglingEdges();
        let edges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode,]) => {
                    if (this.yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained');
                    return [sourceNode + '+' + targetNode]
                })).flat()
        return JSON.stringify(edges.sort());
    }
    getIncomingNodesAsJson(): string {
        let edges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('incomingNodes')).map(([targetNode,]) => {
                    if (this.yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained'); 
                    return [sourceNode + '+' + targetNode]
                })).flat()
        return JSON.stringify(edges.sort());
    }
    isNodeSelected(nodeId: id): boolean {
        return this.selectedNodes.has(nodeId);
    }
    isEdgeSelected(source: id, target: id): boolean {
        return this.selectedEdges.has(`${source}+${target}`);
    }
    get nodeCount(): number {
        return this.yMatrix.size;
    }
    get edgeCount(): number {
        return Array.from(this.yMatrix.values()).reduce((acc, x) => acc + x.get('edgeInformation').size, 0);
    }
    get selectedNodesCount(): number {
        return this.selectedNodes.size;
    }
    get selectedEdgesCount(): number {
        return this.selectedEdges.size;
    }

}