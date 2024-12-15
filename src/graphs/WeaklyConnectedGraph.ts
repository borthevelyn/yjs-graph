import { MarkerType, XYPosition } from "@xyflow/react";
import { id, FlowNode, FlowEdge, ObjectYMap, EventEmitter, EdgeId, splitEdgeId } from "../Types";
import { Graph } from "./Graph";
import * as Y from 'yjs';

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

export type AdjacencyMapGraph = Y.Map<NodeInformation>

export class WeaklyConnectedGraph implements Graph {
    private yMatrix: AdjacencyMapGraph;
    private yRemovedEdges: Y.Array<EdgeInformationForRemovedEdges>;

    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;
    private eventEmitter: EventEmitter | undefined;

    constructor(yMatrix: AdjacencyMapGraph, yRemovedEdges: Y.Array<EdgeInformationForRemovedEdges>, eventEmitter?: EventEmitter) {
        this.yMatrix = yMatrix;
        this.yRemovedEdges = yRemovedEdges;
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

    private removeYEdge(edgeId: EdgeId) {
        this.yRemovedEdges.doc!.transact(() => {
            let nodeIndex;
            do {
                nodeIndex = this.yRemovedEdges.toArray().findIndex(x => x.edgeId === edgeId);  
                if (nodeIndex !== -1)
                    this.yRemovedEdges.delete(nodeIndex);   
            } while(nodeIndex >= 0);
        });
    }

    private removeDanglingEdges() {
        this.yMatrix.doc!.transact(() => {
            for (const source of this.yMatrix.values()) {
                for (const target of source.get('edgeInformation').keys()) {
                    if (this.yMatrix.get(target) !== undefined)
                        continue

                    const edgeId: EdgeId = `${source.get('flowNode').id}+${target}`;
                    this.removeEdge(source.get('flowNode').id, target);
                    this.selectedEdges.delete(edgeId);
                }
                for (const incomingNode of source.get('incomingNodes').keys()) {
                    if (this.yMatrix.get(incomingNode) !== undefined)
                        continue

                    const incomingNodeId: EdgeId =`${incomingNode}+${source.get('flowNode').id}`;
                    this.removeEdge(incomingNode, source.get('flowNode').id);
                    this.selectedEdges.delete(incomingNodeId);
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
                console.warn('Node does not exist (dfsVisitedNodes)')
                return
            }

            const edges = nodeInfo.get('edgeInformation');
            edges.forEach((_, neighborId) => {
                console.log('outoing node', neighborId);
                if (!visited.has(neighborId) && (!excludedEdges.has(`${nodeId}+${neighborId}`))) {
                    console.log('neighborId dfs', neighborId);
                    dfs(neighborId);
                }
            });
            const incomingEdges = nodeInfo.get('incomingNodes');
            incomingEdges.forEach((_, neighborId) => {
                console.log('incoming node', neighborId)
                if (!visited.has(neighborId) && (!excludedEdges.has(`${nodeId}+${neighborId}`))) 
                    dfs(neighborId);
            });
        }
        dfs(nodeId);
        return visited;
    }

    private isConnectedAfterEdgeRemoval(source: id, target: id): boolean {
        const excludedEdge = new Set<EdgeId>([`${source}+${target}`, `${target}+${source}`]);
        const edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        const edgeReversed = this.yMatrix.get(target)?.get('incomingNodes').get(source);
        if ((edge !== undefined) && (edgeReversed !== undefined)) 
            return true;

        const visited = this.dfsVisitedNodes(source, excludedEdge);
        return visited.has(target);
    }
    private isConnectedAfterNodeRemoval(nodeId: id): boolean {
        const nodeInfo = this.yMatrix.get(nodeId);
        const allNodesWithoutRemovedNode = 
            Array.from(this.yMatrix.keys())
            .filter(x => x !== nodeId);

        if (allNodesWithoutRemovedNode.length === 0)
            return true;

        if (nodeInfo === undefined) {
            console.warn('Node does not exist (isConnectedAfterNodeRemoval)')
            return false
        }

        const outgoingEdges = 
            Array.from(nodeInfo.keys())
            .map<EdgeId>(outgoingNodeId => `${nodeId}+${outgoingNodeId}`)
            
        const incomingEdges = 
            Array.from(nodeInfo.get('incomingNodes').keys())
            .map<EdgeId>(incomingNodeId => `${incomingNodeId}+${nodeId}`)

        let excludedEdges = new Set([...outgoingEdges, ...incomingEdges]);
        let visited = this.dfsVisitedNodes(allNodesWithoutRemovedNode[0], excludedEdges);
        return visited.size === this.yMatrix.size - 1;
    }
    private getConnectedComponents(): Set<Set<id>> {
        let connectedComponents = new Set<Set<id>>();
        let visited = new Set<id>();
        for (const nodeId of this.yMatrix.keys()) {
            if (visited.has(nodeId))
                continue;
            console.log('nodeId in getconnectd components', nodeId);
            let component = this.dfsVisitedNodes(nodeId);
            console.log('component', component);
            // console.log('edge', this.yMatrix.get(nodeId)?.get('edgeInformation'));
            visited = new Set([...visited, ...component]);
            connectedComponents.add(component);
        }
        return connectedComponents;
    }
    private getEdgesInConnectedComponents(connectedComponents: Set<Set<id>>): Set<Set<id>> | undefined {
        let edges = new Set<Set<id>>();
        for (const component of connectedComponents) {
            let edgesForComponent = new Set<id>();
            for (const nodeId of component) {
                const nodeInfo = this.yMatrix.get(nodeId);
                if (nodeInfo === undefined) {
                    console.warn('Node does not exist')
                    return undefined
                }
                for (const neighborId of nodeInfo.get('edgeInformation').keys()) {
                    edgesForComponent.add(nodeId + '+' + neighborId);
                }
                edges.add(edgesForComponent);
            }
        }
        return edges;
    }
    public isWeaklyConnected(): boolean {
        return this.getConnectedComponents().size === 1;
    }
    private mergeComponents(connectedComponents: Set<Set<id>>, comp1: Set<id>, comp2: Set<id>): Set<Set<id>> {
        connectedComponents.delete(comp1);
        connectedComponents.delete(comp2);
        connectedComponents.add(new Set([...comp1, ...comp2]));
        return connectedComponents;
    }
    private getEdgeIdxAndMergedComponents(connectedComponents: Set<Set<id>>): [number, Set<Set<id>>] | undefined {
        for (const [reverseEdgeIndex, edge] of this.yRemovedEdges.toArray().reverse().entries()) {
            const [source, target] = splitEdgeId(edge.edgeId);
            for (const component of connectedComponents) {
                for (const otherConnectedComponent of connectedComponents) {
                    if (component === otherConnectedComponent)
                        continue;
                    if ((component.has(source) && otherConnectedComponent.has(target)) || (otherConnectedComponent.has(source) && component.has(target))) {
                        const mergedComponents = this.mergeComponents(connectedComponents, component, otherConnectedComponent);
                        const edgeIndex = this.yRemovedEdges.length - 1 - reverseEdgeIndex
                        return [edgeIndex, mergedComponents];
                    }
                }
            }
        }
        return undefined;
    }

    public makeGraphWeaklyConnected(): void {
        this.yRemovedEdges.doc!.transact(() => {
            this.removeDanglingEdges();
            let connectedComponents = this.getConnectedComponents();
            console.log('connected components', connectedComponents, connectedComponents.size);

            while (connectedComponents.size > 1) {
                const tryToConnectComponents = this.getEdgeIdxAndMergedComponents(connectedComponents);
                if (tryToConnectComponents === undefined) {
                    console.warn('No edge found connecting two components');
                    return;
                }
                const [edgeIdxConnectingTwoComponents, mergedComponents] = tryToConnectComponents;
                const edgeConnectingTwoComponents = this.yRemovedEdges.get(edgeIdxConnectingTwoComponents);
                const [source, target] = edgeConnectingTwoComponents.edgeId.split('+');
                const edgeLabel = edgeConnectingTwoComponents.edgeLabel;
                this.addEdge(source, target, edgeLabel);
                connectedComponents = mergedComponents;
            }
        });
    }

    addNode(nodeId: id, label: string, position: XYPosition): void {
        if (this.yMatrix.size > 0) {
            console.warn('Cannot add a single node to a non-empty graph');
            return; 
        }
        const innerMap = this.makeNodeInformation({ 
            id: nodeId, 
            data : { label }, 
            position, 
            deletable: true, 
            // type: 'editNodeLabel',
        }, 
        new Y.Map<EdgeInformation>(),
        new Y.Map<EdgeInformation>());
        this.yMatrix.doc!.transact(() => {
            this.yMatrix.set(nodeId, innerMap);
        });
    }
    addNodeWithEdge(nodeId: id, nodeLabel: string, nodePosition: XYPosition, edgeSource :id, edgeTarget: id, edgeLabel: string): void {
        if (this.yMatrix.size === 0 && edgeTarget !== edgeSource) {
            console.warn('Cannot add a single node with an edge to a non-existing node');
            return; 
        }

        if (!(edgeSource === nodeId || edgeTarget === nodeId)) {
            console.warn('Edge is not connected to the added node');
            return; 
        }

        if (this.yMatrix.get(edgeSource) === undefined && edgeSource !== nodeId && edgeTarget === nodeId) {
            console.warn('Invalid source node', edgeSource);
            return; 
        }

        if (this.yMatrix.get(edgeTarget) === undefined && edgeTarget !== nodeId && edgeSource === nodeId) {
            console.warn('Invalid target node', edgeTarget);
            return; 
        }

        const innerMap = this.makeNodeInformation({ 
            id: nodeId, 
            data : { label: nodeLabel }, 
            position: nodePosition, 
            deletable: true, 
            // type: 'editNodeLabel',
        }, new Y.Map<EdgeInformation>()
        , new Y.Map<EdgeInformation>());
        this.yMatrix.doc!.transact(() => {
            this.yMatrix.set(nodeId, innerMap);
            this.addEdge(edgeSource, edgeTarget, edgeLabel);
        });
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
    removeNode(nodeId: id): void {
        const nodeInfo = this.yMatrix.get(nodeId);
        if (nodeInfo === undefined) {
            console.log('Node does not exist (removeNode)')
            return 
        }

        if (!this.isConnectedAfterNodeRemoval(nodeId)) {
            console.warn('Removing this node would disconnect the graph');
            return
        }
  
        this.yMatrix.doc!.transact(() => {   
            const incomingNodes = nodeInfo.get('incomingNodes')
            
            for (const incomingNode of incomingNodes.keys()) {
                const incomingNodeInfo = this.yMatrix.get(incomingNode)
                if (incomingNodeInfo === undefined) {
                    console.warn('Node does not exist. It should have an edge to the removed node(removeNode)')
                    return 
                }
                // 1. Remove the edge from the incoming node to the node being removed
                // 2. Add removed edge to the removed edges list 
                // 3. Remove it from the selected edges
                const edgeId: EdgeId = `${incomingNodeInfo.get('flowNode').id}+${nodeId}`;
                const edgeLabel = incomingNodeInfo.get('edgeInformation').get(nodeId)?.label ?? '';
                const edgeInfo = { edgeId, edgeLabel };

                incomingNodeInfo.get('edgeInformation').delete(nodeId);
                this.yRemovedEdges.push([edgeInfo]);
                this.selectedEdges.delete(edgeId);
            }
            // Remove the node itself
            this.yMatrix.delete(nodeId);
            this.selectedNodes.delete(nodeId);

        });
    }
    removeEdge(source: id, target: id): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.yMatrix.get(source);
            const nodeInfo2 = this.yMatrix.get(target);
            if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
                console.warn('one of the edge nodes does not exist', source, target);
                return 
            }
            if (!this.isConnectedAfterEdgeRemoval(source, target)) {
                console.warn('Removing this edge would disconnect the graph');
                return
            }
            // 1. Remove the edge from the source node to the target node
            // 2. Remove the reversed edge from incoming nodes
            // 3. Add removed edge to the removed edges list
            // 4. Remove it from selected edges
            const edgeId: EdgeId = `${source}+${target}`;
            const edgeLabel = nodeInfo1.get('edgeInformation').get(target)?.label ?? '';
            const edgeInfo = { edgeId, edgeLabel };
            nodeInfo1.get('edgeInformation').delete(target);
            nodeInfo2.get('incomingNodes').delete(source);
            this.yRemovedEdges.push([edgeInfo]);
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
    changeEdgeSelection(edgeId: id, selected: boolean): void {
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
        console.log('before remove', this.yMatrix.get('node1')?.get('edgeInformation'));
        this.removeDanglingEdges();
        console.log('after remove', this.yMatrix.get('node1')?.get('edgeInformation'));

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
    getYEdgesAsJson(): string {
        return JSON.stringify(this.yRemovedEdges.toArray());
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
        this.removeDanglingEdges();
        return Array.from(this.yMatrix.values()).reduce((acc, x) => acc + x.get('edgeInformation').size, 0);
    }
    get selectedNodesCount(): number {
        return this.selectedNodes.size;
    }
    get selectedEdgesCount(): number {
        return this.selectedEdges.size;
    }
    
}

