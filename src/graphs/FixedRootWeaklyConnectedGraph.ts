import * as Y from 'yjs';
import { XYPosition } from "@xyflow/react";
import { id, EdgeId, ObjectYMap, splitEdgeId, EdgeDirection } from "../Types";
import assert from 'assert';
import { syncDefault, syncPUSPromAll } from './SynchronizationMethods';
import { RemovedGraphElementDirected, clock, EdgeInformationForRemovedEdges, RestorablePathDirected, EdgeInformationForRemovedEdgesWithNodeDirected, findAllPaths, mergeComponents, computePathConnectingComponentsVar2, computePathConnectingComponentsVar1, computePathConnectingComponentsVar3, computeAdjacencyMapGraphFromRemovedGraphElements, removeDuplicatesInRemovedGraphElements, BenchmarkData } from './ConnectedHelper';


function xor(a: boolean, b: boolean): boolean {
    return (a && !b) || (!a && b);
}




type EdgeInformation = {
    label: string
}
type NodeData = {
    id: string,
    label: string,
    position: XYPosition,
}
type NodeInformation = {
    nodeData: ObjectYMap<NodeData>
    // This map may contain dangling edges because of Yjs synchronization
    // Reading from this map should always takes this into account
    edgeInformation: Y.Map<EdgeInformation>
    incomingNodes: Y.Map<EdgeInformation>
}




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
    private removedGraphElements: Y.Array<RemovedGraphElementDirected>

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

    // O(1)
    private uncheckedNodeMap(id: id): NodeInformation {
        return {
            incomingNodes: this.yDoc.getMap(this.nodeIncoming(id)) as NodeInformation['incomingNodes'],
            edgeInformation: this.yDoc.getMap(this.nodeOutgoing(id)) as NodeInformation['edgeInformation'],
            nodeData: this.yDoc.getMap(this.nodeData(id)) as NodeInformation['nodeData']
        }
    }
    // O(1)
    private nodeMap(id: id): NodeInformation | undefined {
        if (this.nodeIds.get(id) === undefined)
            return undefined
        
        return {
            incomingNodes: this.yDoc.getMap(this.nodeIncoming(id)) as NodeInformation['incomingNodes'],
            edgeInformation: this.yDoc.getMap(this.nodeOutgoing(id)) as NodeInformation['edgeInformation'],
            nodeData: this.yDoc.getMap(this.nodeData(id)) as NodeInformation['nodeData']
        }
    }

    // O(1)
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
        })
    }

    // O(1)
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
    // O(removedGraphElements + 1)
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

    // O(1)
    private removeNode(id: id): boolean {
        if (!this.nodeIds.get(id))
            return false

        this.nodeIds.delete(id)
        return true
    }

    // O(1)
    public hasNode(id: id): boolean {
        return this.nodeIds.get(id) !== undefined
    }

    //(removedGraphElements)
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

    // O(1)
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
    // O(V + E), O(1) for dangling edges
    // isConnectedAfterEdgeRemoval O(V + E), isEdgeRemovingANode O(1)
    public removeEdge(source: id, target: id, vec?: clock): boolean {
        // O(1)
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

            const vecToUse = vec ?? Object.fromEntries(Y.decodeStateVector(Y.encodeStateVector(this.yDoc)));
            const removedGraphElement: RemovedGraphElementDirected = (nodeRemovedWithEdge !== undefined) ? ({ 
                type: 'edgeWithNode', 
                item: { 
                    vectorclock: vecToUse,
                    nodeId: nodeRemovedWithEdge.nodeData.get('id'),
                    nodeLabel: nodeRemovedWithEdge.nodeData.get('label'),
                    nodePosition: nodeRemovedWithEdge.nodeData.get('position'),
                    edgeInformation: 
                        Array.from(nodeRemovedWithEdge.edgeInformation.entries())
                        .map<EdgeInformationForRemovedEdges>(([target, {label}]) => ({ edgeId: `${nodeRemovedWithEdge.nodeData.get('id')}+${target}`, edgeLabel: label, vectorclock: vecToUse })),
                    incomingNodes: 
                        Array.from(nodeRemovedWithEdge.incomingNodes.entries())
                        .map<EdgeInformationForRemovedEdges>(([source, {label}]) => ({ edgeId: `${source}+${nodeRemovedWithEdge.nodeData.get('id')}`, edgeLabel: label, vectorclock: vecToUse })),
                    edgeId, 
                    edgeLabel 
                    }
                })
                :
                ({ type: 'edge', item: { edgeId, edgeLabel, vectorclock: vecToUse } });


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

            return true
        });
    }

    /**
     * Calculates all danginling edges.
     * @returns This does not return an actual removed graph element, but only is in the format.
     */
    // O(V + E)
    private getDanglingEdges(): Array<RemovedGraphElementDirected & { type: 'edge' }> {
        const danglingEdges = new Array<RemovedGraphElementDirected & { type: 'edge' }>()
        for (const source of this.nodeIds.keys()) {
            const sourceInfo = this.nodeMap(source)!

            for (const target of sourceInfo.edgeInformation.keys()) {
                if (this.nodeIds.get(target) !== undefined) 
                    continue;
                
                // Special case: dangling edges have no vector clock for deletion
                // Dangling edge vcs should be ignored when comparing path vcs
                danglingEdges.push({
                    type: 'edge',
                    item: { edgeId: `${source}+${target}`, edgeLabel: sourceInfo.edgeInformation.get(target)!.label, vectorclock: {} }
                })
                
            }

            for (const target of sourceInfo.incomingNodes.keys()) {
                if (this.nodeIds.get(target) !== undefined) 
                    continue;

                danglingEdges.push({
                    type: 'edge',
                    item: { edgeId: `${target}+${source}`, edgeLabel: sourceInfo.incomingNodes.get(target)!.label, vectorclock: {} }
                })   
            }
            
        }
        return danglingEdges
    }

    private makeConsistent() {
        this.nodeIds.forEach((_, id) => {
            this.uncheckedNodeMap(id).edgeInformation.forEach((ei, target) => 
                this.nodeMap(target)?.incomingNodes.get(id) ?? this.nodeMap(target)?.incomingNodes.set(id, ei))
            this.uncheckedNodeMap(id).incomingNodes.forEach((ei, target) => 
                this.nodeMap(target)?.edgeInformation.get(id) ?? this.nodeMap(target)?.edgeInformation.set(id, ei))
        })
    }

    /**
     * @param danglingEdges Set of removed graph element edges that are dangling
     */
    // O(DanglingEdges)
    private removeRemainingDanglingEdges(danglingEdges: Set<RemovedGraphElementDirected & { type: 'edge' }>, clock?: clock): void {
        this.yDoc.transact(() => {
            // This sorting is not necessarily important, but without it, the iteration order of 
            // different clients might be different: Then, the insertion order into the removed
            // graph elements array is also different and this might not be desired: After a sync that 
            // would be resolved and all invariants still hold, but it may be rightfully expected
            // that after a sync, all values, also the order of the removed graph elements
            // is identical
            for (const danglingEdge of Array.from(danglingEdges).toSorted((a, b) => a.item.edgeId.localeCompare(b.item.edgeId))) {
                const [source, target] = splitEdgeId(danglingEdge.item.edgeId);

                // Check if edge is not dangling anymore
                assert(!(this.nodeIds.get(source) !== undefined && this.nodeIds.get(target) !== undefined), 'edge is not dangling, should not happen here');

                // Delete the dangling edge
                // TODO dangling
                if (this.nodeMap(source)?.edgeInformation.has(target)) {
                    this.removeEdge(source, target, clock);
                    continue;
                }
                if (this.nodeMap(target)?.incomingNodes.has(source)) {
                    this.uncheckedNodeMap(target).incomingNodes.delete(source);
                    this.removedGraphElements.push([danglingEdge])
                    continue;
                }
                assert(false, 'Dangling edge could not be removed');
            }
        });
    }

    // O(V + E)
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

    // O(V + E)
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

    // O(V + E)
    public isWeaklyConnected(): boolean {
        return this.getConnectedComponents().size === 1;
    }

    // O(V + E) 
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

    // O(V + E)
    private isConnectedAfterEdgeRemoval(source: id, target: id): boolean {
        const excludedEdge = new Set<EdgeId>([`${source}+${target}`]);

        // If the edge to be removed exists reversed, then the graph is still connected
        const forward = this.nodeMap(source)?.edgeInformation.get(target);
        const backward = this.nodeMap(target)?.edgeInformation.get(source);
        if (forward !== undefined && backward !== undefined)
            return true;

        return this.findPath(source, target, excludedEdge).length !== 0
    }




    // O(removedGraphElements * components^2 + max((componentsize * danglingEdges + components * nodesInDanglingEdgesToRepair + components^2), 1)
    // => O(removedGraphElements * components^2 + (componentsize * danglingEdges + components * nodesInDanglingEdgesToRepair)
    private getGraphElementIdxAndMergedComponents(connectedComponents: Set<Set<id>>, danglingEdges: Set<RemovedGraphElementDirected>): [number, Set<Set<id>>, Set<RemovedGraphElementDirected>] | undefined {
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

                                // O(1) because number of merge components is 2
                                const mergedComponents = mergeComponents(connectedComponents, new Set([component, otherConnectedComponent]));
                                const edgeIndex = this.removedGraphElements.length - 1 - reversedGraphElementIndex;

                                return [edgeIndex, mergedComponents, new Set()];
                            }

                            const incomingSourceNodes = new Set (graphElement.item.incomingNodes.map(x => splitEdgeId(x.edgeId)[0]));
                            const targetNodes = new Set (graphElement.item.edgeInformation.map(x => splitEdgeId(x.edgeId)[1]));

                            // Check if the connecting node is connected via a dangling edge to a component
                            // O(componentsize * danglingEdges)
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

                                // O(nodesInDanglingEdgesToRepair + 1)
                                const nodesToBeMerged = 
                                    nodesInDanglingEdgesToRepair
                                    .union(incomingSourceNodes)
                                    .union(targetNodes);
                                
                                // O(components * nodesInDanglingEdgesToRepair)
                                const componentsToBeMerged =
                                    new Set(
                                        Array.from(connectedComponents)
                                        .filter(x => x.intersection(nodesToBeMerged).size > 0)
                                    )
                                
                                // O(components^2)
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

    // O(removedGraphElements + danglingEdgesToNode)
    private addYRemovedEdgeWithNode(edgeWithNode: EdgeInformationForRemovedEdgesWithNodeDirected, danglingToNode: Set<RemovedGraphElementDirected>): void {
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
                position: edgeWithNode.nodePosition
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

    // O(pathLength * (removedGraphElements + danglingEdgesToPath))
    private addYRemovedPath(path: RestorablePathDirected, danglingEdgesInPath: Set<RemovedGraphElementDirected>): void {
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

    public benchmarkData: Omit<BenchmarkData, 'totalTime'> = {
        danglingEdges: 0,
        connectedComponents: 0,
        paths: 0,
        restoredNodesWithEdges: 0,
        restoredEdges: 0,
        restoredPaths: [],
        removedGraphElementsCount: 0,
        resolveInvalidEdgesTime: 0,
        pathInitalizationTime: 0,
        restoreSingleGraphElementsTime: 0
    }

    private i = 0;
    // getDanglingEdges: O(V + E)
    // getConnectedComponents: O(V + E)
    // getGraphElementIdxAndMergedComponents: O(removedGraphElements * components^2 + (componentsize * danglingEdges + components * nodesInDanglingEdgesToRepair)
    // addYRemovedEdgeWithNode: O(removedGraphElements + danglingEdgesToNode)
    // addEdge: removedGraphElements
    // findAllPathsInGraphElements: O(removedGraphElements!)
    // computePathConnectingComponents: O(PathsInRemovedGraphElements * V^2 + (danglingEdges + V^2 + pathsInRemovedGraphElements)) 
    // addYRemovedPath: O(pathEdges * (removedGraphElements + danglingEdgesToPath))
    // removeRemainingDanglingEdges: O(DanglingEdges)
    //----------------------------------------------------------------------------------------------------------------------------------------------------------------
    // getDanglingEdges + getConnectedComponents +
    // connectedComponents * (getGraphElementIdxAndMergedComponents + max(addYRemovedEdgeWithNode, addEdge)) +
    // findAllPathsInGraphElements + connectedComponents * (computePathConnectingComponents + addYRemovedPath) 
    // + removeRemainingDanglingEdges

    // O(V * E + V + E + components * (removedGraphElements! * ((danglingEdges + components * V) + log(removedGraphElements!)) + V^2 + danglingEdgesToPath))

    // O(V * E)
    // + O(V + E)
    // + O(components * (removedGraphElements * components^2 + danglingEdges  * (componentsize + components)))
    // + O(danglingEdges * log(danglingEdges))
    // + O(removedGraphElements! * (removedGraphElements + danglingEdges))
    // + O(components * (removedGraphElements! * ((danglingEdges + components * V) + log(removedGraphElements!)) + V^2 + danglingEdgesToPath))
    // + O(danglingEdges) x
    // = O(V * E)
    // + O(R * C^3 + C * DE * (CS + C) + C * R! * (DE + C * V + log(R!)) + V^2 + DE)
    // + O(DE * log(DE))
    // + O(R! * DE)
    // = O(V * E)
    // + O(R * C^3 + C * DE * (CS + C) + C * R! * (DE + C * V + log(R!)) + V^2)
    // + O(DE * log(DE))
    // = O(V * E + V^2 + DE * log(DE) + C * (R * C^2 + DE * (CS + C) + R! * (DE + C * V + log(R!))))

    // cost if the graph is already correct:
    // O(V * E)
    public makeGraphWeaklyConnected(useVirtualGraph: boolean = true, usePathVariant2: boolean = false): BenchmarkData {
        const clock = Object.fromEntries(Y.decodeStateVector(Y.encodeStateVector(this.yDoc)));
        return this.yDoc.transact(() => {
            this.i++;
            this.benchmarkData = {
                danglingEdges: 0,
                connectedComponents: 0,
                paths: 0,
                restoredNodesWithEdges: 0,
                restoredEdges: 0,
                restoredPaths: [],
                pathInitalizationTime: 0,
                removedGraphElementsCount: 0,
                resolveInvalidEdgesTime: 0,
                restoreSingleGraphElementsTime: 0
            }

            const start = performance.now()

            // make consistent
            const startResolveInvalidEdges = performance.now()
            this.makeConsistent();
            let danglingEdges = new Set(this.getDanglingEdges());
            const elapsedResolveInvalidEdgesTime =  performance.now() - startResolveInvalidEdges;


            removeDuplicatesInRemovedGraphElements(true, this.removedGraphElements)

            this.benchmarkData.removedGraphElementsCount = this.removedGraphElements.length

            this.benchmarkData.danglingEdges = danglingEdges.size;
            let connectedComponents = this.getConnectedComponents();
            this.benchmarkData.connectedComponents = connectedComponents.size;

            if (connectedComponents.size === 1 && danglingEdges.size === 0) 
                return { ...this.benchmarkData, totalTime: performance.now() - start }

            // O(components * (removedGraphElements * components^2 + danglingEdges * (componentsize + components)))
            // + O(components * (removedGraphElements + danglingEdges))
            // = O(components * (removedGraphElements * (components^2 + 1) + danglingEdges  * (componentsize + components + 1)))
            // \eq O(components * (removedGraphElements * components^2 + danglingEdges  * (componentsize + components)))

            const restoreSingleGraphElementsStart = performance.now()
            while (connectedComponents.size > 1) {
                // O(components * (removedGraphElements * components^2 + danglingEdges * (componentsize + components)))
                const tryToConnectComponentsWithGraphElement = this.getGraphElementIdxAndMergedComponents(connectedComponents, danglingEdges);
                if (tryToConnectComponentsWithGraphElement === undefined) 
                    break;

                const [graphElementIdxConnectingTwoComponents, mergedComponents, danglingEdgesToRepair] = tryToConnectComponentsWithGraphElement;
                const graphElementConnectingTwoComponents = this.removedGraphElements.get(graphElementIdxConnectingTwoComponents);
                
                // O(components * (removedGraphElements + danglingEdges))
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
            this.benchmarkData.restoreSingleGraphElementsTime = performance.now() - restoreSingleGraphElementsStart;

            let allGraphElementsRev: RemovedGraphElementDirected[] | undefined = undefined

            // O(danglingEdges * log(danglingEdges))
            const lazyAllGraphElements = () => {
                if (allGraphElementsRev !== undefined)
                    return allGraphElementsRev

                // O(danglingEdges * log(danglingEdges))
                const sortedDanglingEdges = Array.from(danglingEdges).sort((a, b) => a.item.edgeId.localeCompare(b.item.edgeId));
                // O(1)
                allGraphElementsRev = this.removedGraphElements.toArray().concat(sortedDanglingEdges).toReversed();
                return allGraphElementsRev
            }

            // O(pathLength * (removedGraphElements + danglingEdges))
            const pathCost = (path: RestorablePathDirected): BigInt => {
                let cost = 0n;
                // O(pathLength)
                // assumption: usedRemovedElements per edge in path is limited to at most 2
                const usedRemovedElements = path.edges.reduce((s, n) => s.union(n.edgePayload.usedRemovedElements), path.finalEdge.edgePayload.usedRemovedElements)
                for (const elem of usedRemovedElements) {
                    const indexReversed = lazyAllGraphElements().findIndex(x => elem === x);

                    if (indexReversed === -1) {
                        console.warn('Element does not exist in the removed graph elements list (computePathConnectingComponents)', elem);
                    }
                    cost = cost + (1n << BigInt(indexReversed));
                }
                return cost;
            }
            
            // O(V! * pathLength * (removedGraphElements + danglingEdges))
            // > O(removedGraphElements! * (removedGraphElements + danglingEdges))
            let allPathsSorted: Array<[RestorablePathDirected, BigInt]> | undefined
            if (!useVirtualGraph && connectedComponents.size > 1){
                const pathInitalizationStart = performance.now()
                allPathsSorted = 
                    connectedComponents.size > 1 
                    ? Array.from(
                            findAllPaths<true>(this.removedGraphElements.toArray().concat(Array.from(danglingEdges)))
                        )
                        .map<[RestorablePathDirected, BigInt]>(x => [x, pathCost(x)])
                        .sort((a, b) => a[1] < b[1] ? -1 : 1)
                        .filter(([, cost], idx, arr) => idx === 0 || cost > arr[idx - 1][1])
                    : []

                this.benchmarkData.pathInitalizationTime = performance.now() - pathInitalizationStart
                this.benchmarkData.paths = allPathsSorted.length;
            }

            // Assuming removedGraphElements as pathLength
            // Assuming removedGraphElements! as pathCount
            // using distributivity
            // O(components * (removedGraphElements! * ((danglingEdges + components * V) + log(removedGraphElements!)) + V^2)
            // + O(components * (removedGraphElements^2 + removedGraphElements * danglingEdgesToPath))
            // = O(components * (removedGraphElements! * ((danglingEdges + components * V) + log(removedGraphElements!)) + V^2 + danglingEdgesToPath))
            while (connectedComponents.size > 1 && !useVirtualGraph) {
                const pathStart = performance.now()
                const tryToConnectComponentsWithPath = 
                    usePathVariant2 ? 
                    computePathConnectingComponentsVar2<true>(connectedComponents, allPathsSorted!, danglingEdges)
                    : computePathConnectingComponentsVar1<true>(connectedComponents, allPathsSorted!, danglingEdges);
                if (tryToConnectComponentsWithPath !== undefined) {
                    const [path, danglingEdgesInPath, mergedComponents, pathsContainedInConnectedComponents] = tryToConnectComponentsWithPath;
                    this.addYRemovedPath(path, danglingEdgesInPath);
                    connectedComponents = mergedComponents;
                    danglingEdges = danglingEdges.difference(danglingEdgesInPath);
                    {
                        // pathsContainedInConnecteComponents.forEach(cost => allPathsSorted.splice(allPathsSorted.findIndex(x => x[1] === cost), 1))
                        // allPathsSorted.differenceBy(pathsContainedInConnectedComponents)
                        // remove costs
                        let i = 0
                        for (const cost of pathsContainedInConnectedComponents) {
                            const curr = allPathsSorted!.slice(i)
                            const newI = curr.findIndex(s => s[1] === cost)
                            if (newI === -1)
                                continue

                            i = newI + i
                            allPathsSorted!.splice(i, 1)
                        }
                    }
                    const pathTime = performance.now() - pathStart
                    this.benchmarkData.restoredPaths.push({
                        length: path.edges.length + 1,
                        time: pathTime
                    });
                }

                assert(tryToConnectComponentsWithPath !== undefined, 'Could not connect components');
            }

            while (connectedComponents.size > 1 && useVirtualGraph) {
                const pathStart = performance.now()
                const graph = computeAdjacencyMapGraphFromRemovedGraphElements<true>(this.removedGraphElements.toArray().concat([...danglingEdges]))
                const foundPath = computePathConnectingComponentsVar3<true>(connectedComponents, graph, danglingEdges)
                assert(foundPath !== undefined, 'There was no path found')
                const [path, resolvedDanglingEdges, mergedComponents] = foundPath
                this.addYRemovedPath(path, resolvedDanglingEdges)
                danglingEdges = danglingEdges.difference(resolvedDanglingEdges)
                connectedComponents = mergedComponents
                const pathTime = performance.now() - pathStart
                this.benchmarkData.restoredPaths.push({
                    length: path.edges.length + 1, 
                    time: pathTime
                });
            }

            // Remove remaining dangling edges which were not used to connect components
            // O (danglingEdges)
            const startRemoveRemainingDanglingEdges = performance.now()
            this.removeRemainingDanglingEdges(danglingEdges, clock);
            this.benchmarkData.resolveInvalidEdgesTime = (performance.now() - startRemoveRemainingDanglingEdges) + elapsedResolveInvalidEdgesTime;

            assert(this.getDanglingEdges().length === 0, 'Dangling edges should be removed');
            assert(this.isConsistent(), 'Edge information is not consistent')

            return { ...this.benchmarkData, totalTime: performance.now() - start }
        });
    }

    static syncDefault(graphs: FixedRootWeaklyConnectedGraph[], useVirtualGraph: boolean = true, useVariant2: boolean = false) {
        return syncDefault(
            graphs,
            graphs.map(graph => graph.yDoc),
            graph => graph.makeGraphWeaklyConnected(useVirtualGraph, useVariant2)
            )
    }
    static async syncPUS(graphs: FixedRootWeaklyConnectedGraph[], maxSleep: number, rnd: (idx: number) => number, useVirtualGraph: boolean = true, useVariant2: boolean = false) {
        return await syncPUSPromAll(
            graphs,
            graphs.map(x => x.yDoc),
            rnd,
            yDoc => new FixedRootWeaklyConnectedGraph(yDoc),
            graph => graph.getDanglingEdges().length === 0 && graph.isWeaklyConnected(),
            graph => graph.makeGraphWeaklyConnected(useVirtualGraph, useVariant2),
            maxSleep
        )
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

    getIncomingNodesAsJson(): string {
        let incomingNodes = 
            Array.from(this.nodeIds.keys()).map(node =>
                Array.from(this.nodeMap(node)!.incomingNodes).map(([incomingNode]) => {
                    return [incomingNode + '+' + node]
                })).flat()
        return JSON.stringify(incomingNodes.sort());
    }

    getNodes(): string[] {
        return Array.from(this.nodeIds.keys());
    }

    getNode(id: id): NodeInformation | undefined {
        return this.nodeMap(id);
    }

    getEdge(source: id, target: id): EdgeInformation | undefined {
        return this.nodeMap(source)?.edgeInformation.get(target);
    }

    isConsistent(): boolean {
        return [...this.nodeIds]
            .every(([id]) => 
                [...this.nodeMap(id)!.edgeInformation]
                .every(([target]) => 
                    this.nodeMap(target)?.incomingNodes.has(id) !== false
                ) &&
                [...this.nodeMap(id)!.incomingNodes]
                .every(([source]) =>
                    this.nodeMap(source)?.edgeInformation.has(id) !== false
                )
            )
    }
}