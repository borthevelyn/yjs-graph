import * as Y from 'yjs'
import { MarkerType, XYPosition } from '@xyflow/react';
import { FlowNode, FlowEdge, ObjectYMap, YSet, id, makeYSet, EventEmitter, EdgeId, splitEdgeId } from '../Types';
import { Graph, IncomingNodesGraph } from './Graph';
import { syncDefault, syncPUSPromAll } from './SynchronizationMethods';
import { assert } from 'console';

type EdgeInformation = {
    label: string
}
type NodeData = {
    id: string,
    label: string,
    position: XYPosition,
    deletable: boolean,
    dimension: {width: number | undefined, height: number | undefined}
}
type NodeInformation = ObjectYMap<NodeData & {
    edgeInformation: Y.Map<EdgeInformation>,
    /* 
    `incomingNodes` is a actually a ymap where keys are producer nodes of incoming edges, 
    called `incomingNodes` and values are always undefined.
    This additional information for each node is used later for faster node deletion. 
    */
    incomingNodes: YSet
}>
export type AdjacencyMapWithFasterNodeDeletionGraph = Y.Map<NodeInformation>

export class AdjacencyMapWithFasterNodeDeletion implements Graph, IncomingNodesGraph<YSet> {
    private yMatrix: AdjacencyMapWithFasterNodeDeletionGraph;
    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;
    private eventEmitter: EventEmitter | undefined;

    private readonly yMatrixId = 'adjacencymap_ydoc'

    constructor(yDoc: Y.Doc, eventEmitter?: EventEmitter) {
        this.yMatrix = yDoc.getMap(this.yMatrixId)
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
        this.eventEmitter = eventEmitter;
        if (this.eventEmitter !== undefined)
            this.yMatrix.observeDeep(() => this.eventEmitter?.fire());

    }

    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda)
    }

    public hasNoDanglingEdges() {
        for (const source of this.yMatrix.values()) {
            for (const target of source.get('edgeInformation').keys()) {
                if (this.yMatrix.get(target) === undefined)
                    return false
            }
            for (const incomingNode of source.get('incomingNodes').keys()) {
                if (this.yMatrix.get(incomingNode) === undefined)
                    return false
            }
        }
        return true
    }

    public makeGraphValid() {
        const start = performance.now()
        for (const source of this.yMatrix.values()) {
            for (const target of source.get('edgeInformation').keys()) {
                if (this.yMatrix.get(target) !== undefined)
                    continue

                source.get('edgeInformation').delete(target);
                this.selectedEdges.delete(`${source.get('id')}+${target}`);
            }
            for (const incomingNode of source.get('incomingNodes').keys()) {
                if (this.yMatrix.get(incomingNode) !== undefined)
                    continue

                source.get('incomingNodes').delete(incomingNode);
            }
        }
        // assert(this.isConsistent(), 'expected consistent')
        return { time: performance.now() - start }
    }

    private setLabel(nodeId: id, label: string) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn('Node does not exist')
                return 
            }
            
            nodeInfo.set('label', label)
        });
    }

    private makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>, incomingNodes: YSet) {
        const res = new Y.Map<FlowNode | Y.Map<EdgeInformation> | Y.Map<boolean>>() as NodeInformation
        res.set('id', node.id);
        res.set('label', node.data.label);
        res.set('position', node.position);
        res.set('deletable', true);
        res.set('dimension', {width: node.measured?.width, height: node.measured?.height});
        res.set('edgeInformation', edges)
        res.set('incomingNodes', incomingNodes)
        return res
    }

    addNode(nodeId: string, label: string, position: XYPosition): void {
        const innerMap = this.makeNodeInformation({ 
            id: nodeId, 
            data : { label }, 
            position, 
            deletable: true, 
            // type: 'editNodeLabel' 
        }, 
        new Y.Map<EdgeInformation>(),
        makeYSet())
        this.yMatrix.set(nodeId, innerMap)
    }

    addEdge(source: string, target: id, label: string): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(source)
            const nodeInfo2 = this.yMatrix.get(target)
            if (nodeInfo === undefined || nodeInfo2 === undefined) {
                // console.warn('One of the edge nodes does not exist', source, target)
                return 
            }
            /* 
            Add edge (source, target) to outgoing edges of source
            and to incoming nodes of target.
            */
            nodeInfo.get('edgeInformation').set(target, { label })
            nodeInfo2.get('incomingNodes').set(source);
        });
    }

    removeNode(nodeId: string): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId)  
            if (nodeInfo === undefined) {
                // console.log('Node does not exist (removeNode)')
                return 
            }
            const incomingNodes = nodeInfo.get('incomingNodes')
            const edgeInformation = nodeInfo.get('edgeInformation')
            
            /* 
            Faster node deletion: Iteration over all nodes is not required here, 
            only over nodes with an edge to the removed node 
            */
            for (const incomingNode of incomingNodes.keys()) {
                const innerMap = this.yMatrix.get(incomingNode)
                if (innerMap === undefined) {
                    console.warn('Node does not exist. It should have an edge to the removed node(removeNode)')
                    return 
                }
                innerMap.get('edgeInformation').delete(nodeId);
                this.selectedEdges.delete(`${innerMap.get('id')}+${nodeId}`);
            }
            for (const edgeInfo of edgeInformation.keys()) {
                const innerMap = this.yMatrix.get(edgeInfo)
                if (innerMap === undefined) {
                    console.warn('Node does not exist. It should have an edge to the removed node(removeNode)')
                    return 
                }
                innerMap.get('incomingNodes').delete(nodeId);
                this.selectedEdges.delete(`${nodeId}+${innerMap.get('id')}`);
            }
            // Removes the node and its outgoing edges 
            this.yMatrix.delete(nodeId)
            this.selectedNodes.delete(nodeId);
        });
    }

    removeEdge(source: string, target: id): void {
        this.yMatrix.doc!.transact(() => {
            const innerMap = this.yMatrix.get(source)
            const innerMap2 = this.yMatrix.get(target)
            if (innerMap === undefined || innerMap2 === undefined) {
                // console.warn('One of the nodes does not exist', innerMap, innerMap2)
                return 
            }
            /* 
            Remove edge (source, target) from outgoing edges of nodeId1
            and from incoming nodes of target.
            */
            innerMap.get('edgeInformation').delete(target);
            innerMap2.get('incomingNodes').delete(source);
            this.selectedEdges.delete(`${source}+${target}`);
        });
    }

    changeNodePosition(nodeId: string, position: XYPosition): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn('Node does not exist')
                return 
            }

            nodeInfo.set('position', position )
        });
    }

    changeNodeDimension(nodeId: string, dimensions: { width: number; height: number; }): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn('Node does not exist')
                return 
            }

            nodeInfo.set('dimension', dimensions )
        });
    }

    changeNodeSelection(nodeId: string, selected: boolean): void {
        const nodeInfo = this.yMatrix.get(nodeId);
        if (nodeInfo === undefined) {
            console.warn('Node does not exist');
            return 
        }

        if (selected) {
            this.selectedNodes.add(nodeId);
        }
        else {
            this.selectedNodes.delete(nodeId);
        }
        this.eventEmitter?.fire();
    }

    changeEdgeSelection(edgeId: EdgeId, selected: boolean): void {
        const [source, target] = splitEdgeId(edgeId);
        const innerMap = this.yMatrix.get(source);
        const innerMap2 = this.yMatrix.get(target);
        if (innerMap === undefined || innerMap2 === undefined) {
            console.warn('One of the edge nodes does not exist in edge selection', innerMap, innerMap2)
            return 
        }
        if (selected) {
            this.selectedEdges.add(edgeId);
        }
        else {
            this.selectedEdges.delete(edgeId);
        }
        this.eventEmitter?.fire();
    }

    nodesAsFlow(): FlowNode[] {
        return Array.from(this.yMatrix.values()).map(x => {
            return {
                id: x.get('id'),
                data: { label: x.get('label') },
                position: x.get('position'),
                deletable: x.get('deletable'),
                measured: x.get('dimension'),
                selected: this.selectedNodes.has(x.get('id'))
            }
        })
    }

    edgesAsFlow(): FlowEdge[] {
        const nestedEdges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode, {label}]) => {
                    const edgeId: EdgeId = `${sourceNode}+${targetNode}`;
                    return {
                        id: edgeId,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        data: { label},
                        label,
                        selected: this.selectedEdges.has(edgeId),
                    }
                })
            )

        return nestedEdges.flat()
    }

    getNode(nodeId: string): FlowNode | undefined {
        const nodeInfo = this.yMatrix.get(nodeId);
        if (nodeInfo === undefined)
            return undefined
        return {
            id: nodeInfo.get('id'),
            data: { label: nodeInfo.get('label') },
            position: nodeInfo.get('position'),
            deletable: nodeInfo.get('deletable'),
            measured: nodeInfo.get('dimension'),
            selected: this.selectedNodes.has(nodeId)
        }
    }

    getEdge(source: string, target: id): FlowEdge | undefined {
        let edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        if (edge === undefined)
            return undefined 
        
        const edgeId: EdgeId = `${source}+${target}`;
        return { 
                id: edgeId, 
                source, 
                target, 
                deletable: true, 
                markerEnd: { type: MarkerType.Arrow}, 
                data: { label: edge.label}, 
                selected: this.selectedEdges.has(edgeId), 
        }
    }


    isConsistent(): boolean {
        return [...this.yMatrix.keys()]
            .every(id => 
                [...this.yMatrix.get(id)!.get('edgeInformation').keys()]
                .every(target => 
                    this.yMatrix.get(target)?.get('incomingNodes').has(id) !== false
                ) &&
                [...this.yMatrix.get(id)!.get('incomingNodes').keys()]
                .every(source =>
                    this.yMatrix.get(source)?.get('edgeInformation').has(id) !== false
                )
            )
    }

    static syncDefault(graphs: AdjacencyMapWithFasterNodeDeletion[]) {
        return syncDefault(graphs, graphs.map(graph => graph.yMatrix.doc!), graph => graph.makeGraphValid())
    }
    static async syncPUS(graphs: AdjacencyMapWithFasterNodeDeletion[], maxSleep: number, rnd: (idx: number) => number) {
        return await syncPUSPromAll(
            graphs,
            graphs.map(x => x.yMatrix.doc!),
            rnd,
            yDoc => new AdjacencyMapWithFasterNodeDeletion(yDoc),
            graph => graph.hasNoDanglingEdges(),
            graph => graph.makeGraphValid(),
            maxSleep
        )
    }


    getNodesAsJson(): string {
        return JSON.stringify(Array.from(this.yMatrix.keys()).sort());
    }

    getEdgesAsJson(): string {
        return JSON.stringify(Array.from(this.yMatrix.entries()).map(([source, nodeInfo]) => 
            Array.from(nodeInfo.get('edgeInformation').keys()).map(target => `${source}+${target}`)).flat().sort());
    }

    isNodeSelected(nodeId: string): boolean {
        return this.selectedNodes.has(nodeId);
    }

    isEdgeSelected(source: id, target: id) {
        return this.selectedEdges.has(`${source}+${target}`);
    }

    getIncomingNodes(nodeId: string): YSet | undefined {
        return this.yMatrix.get(nodeId)?.get('incomingNodes');
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