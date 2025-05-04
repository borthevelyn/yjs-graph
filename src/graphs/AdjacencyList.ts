import * as Y from 'yjs'
import { EdgeId, EventEmitter, FlowEdge, FlowNode, id, ObjectYMap, splitEdgeId } from '../Types'
import { MarkerType, XYPosition } from '@xyflow/react';
import { Graph } from './Graph';
import { syncDefault, syncPUSPromAll } from './SynchronizationMethods';

type EdgeInformation = ObjectYMap<{
    id: string,
    label: string
}>
type NodeData = {
    id: string,
    label: string,
    position: XYPosition,
    deletable: boolean,
    dimension: {width: number | undefined, height: number | undefined}
}

type NodeInformation = ObjectYMap<NodeData & {
    edgeInformation: Y.Array<EdgeInformation>
}>
export type AdjacencyListGraph = Y.Map<NodeInformation>;

export class AdjacencyList implements Graph {
    private yMatrix: AdjacencyListGraph;
    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;
    private eventEmitter: EventEmitter | undefined

    private readonly yMatrixId = 'adjacency_list_ydoc'

    constructor(yDoc: Y.Doc, eventEmitter?: EventEmitter) {
        this.yMatrix = yDoc.getMap(this.yMatrixId);
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
        this.eventEmitter = eventEmitter
        if (this.eventEmitter !== undefined)
            this.yMatrix.observeDeep(() => this.eventEmitter?.fire())
    }

    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda)
    }

    public hasNoDanglingEdges() {
        for (const source of this.yMatrix.values()) {
            source.get('edgeInformation').forEach((target) => {
                if (this.yMatrix.get(target.get('id')) === undefined)
                    return false
            })
        }
        return true
    }

    public makeGraphValid() {
        const start = performance.now()
        this.removeDanglingEdges();
        this.removeDuplicateEdges();
        return { time: performance.now() - start}
    }

    private removeDanglingEdges() {
        for (const source of this.yMatrix.values()) {
            for (let i = source.get('edgeInformation').length - 1; i >= 0; i--) {
                const targetId = source.get('edgeInformation').get(i).get('id');
                if (this.yMatrix.get(targetId) !== undefined)
                    return

                source.get('edgeInformation').delete(i, 1);
                this.selectedEdges.delete(`${source.get('id')}+${targetId}`);
            }
        }
    }

    private removeDuplicateEdges() {
        for (const source of this.yMatrix.values()) {
            const uniqueEdgesForNode: Set<id> = new Set();
            for (let i = source.get('edgeInformation').length - 1; i >= 0; i--) {
                const edgeId = source.get('edgeInformation').get(i).get('id');
                if (uniqueEdgesForNode.has(edgeId)) {
                    source.get('edgeInformation').delete(i, 1);
                    this.selectedEdges.delete(`${source.get('id')}+${edgeId}`);
                } else {
                    uniqueEdgesForNode.add(edgeId);
                }
            }
        }
    }

    private setLabel(nodeId: id, label: string) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }
            nodeInfo.set('label', label);
        });
    }

    private makeNodeInformation(node: FlowNode, edges: Y.Array<EdgeInformation>) {
        const res = new Y.Map<FlowNode | Y.Array<EdgeInformation>>() as NodeInformation
        res.set('id', node.id);
        res.set('label', node.data.label);
        res.set('position', node.position);
        res.set('deletable', true);
        res.set('dimension', {width: node.measured?.width, height: node.measured?.height});
        res.set('edgeInformation', edges);
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
        new Y.Array<EdgeInformation>());
        this.yMatrix.set(nodeId, innerMap);
        console.log('document of newly created map (should not be null)', this.yMatrix.get(nodeId)!.get('edgeInformation').doc);
    }

    addEdge(source: string, target: id, label: string): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.yMatrix.get(source);
            const nodeInfo2 = this.yMatrix.get(target);
            if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
                console.warn('One of the edge nodes does not exist', source, target)
                return 
            }
            const edgeInfo = new Y.Map<string | boolean>() as EdgeInformation;
            
            edgeInfo.set('id', target);
            edgeInfo.set('label', label);

            // If the edge already exists in the local state, we replace the edge label 
            let duplicateEdgeIndex = nodeInfo1.get('edgeInformation').toArray().findIndex((edgeInfo) => edgeInfo.get('id') === target);

            if (duplicateEdgeIndex !== -1) {
                nodeInfo1.get('edgeInformation').get(duplicateEdgeIndex)!.set('label', label);
                console.log('replaced edge with label, edges', label);
                return
            }

            nodeInfo1.get('edgeInformation').push([edgeInfo]);
            
            console.log('added edge with label, edges', label);
        });
    }

    removeNode(nodeId: string): void {
        const nodeInfo = this.yMatrix.get(nodeId); 
        if (nodeInfo === undefined) {
            console.log('Node does not exist (removeNode)')
            return 
        }
        this.yMatrix.doc!.transact(() => {   
            this.yMatrix.delete(nodeId);
            this.selectedNodes.delete(nodeId);
            this.yMatrix.forEach((nodeInfo) => {
                const edges = nodeInfo.get('edgeInformation');
                edges.forEach((edgeInfo, index) => {
                    if (edgeInfo.get('id') === nodeId) {
                        edges.delete(index, 1);
                        this.selectedEdges.delete(`${nodeInfo.get('id')}+${nodeId}`);
                    }
                })
            })
        });
    }

    removeEdge(source: string, target: id): void {
        this.yMatrix.doc!.transact(() => {
            const innerMap = this.yMatrix.get(source);
            if (innerMap === undefined) {
                console.warn('Edge does not exist');
                return 
            }
            console.log('removed edge', source, target)
            const edges = innerMap.get('edgeInformation');
            edges.forEach((edgeInfo, index) => {
                if (edgeInfo.get('id') === target) {
                    innerMap.get('edgeInformation').delete(index, 1);
                    this.selectedEdges.delete(`${source}+${target}`);
                }
            })
        });
    }


    static syncDefault(graphs: AdjacencyList[]) {
        return syncDefault(graphs, graphs.map(graph => graph.yMatrix.doc!), graph => graph.makeGraphValid())
    }
    static async syncPUS(graphs: AdjacencyList[], maxSleep: number, rnd: (idx: number) => number) {
        return await syncPUSPromAll(
            graphs,
            graphs.map(x => x.yMatrix.doc!),
            rnd,
            yDoc => new AdjacencyList(yDoc),
            graph => graph.hasNoDanglingEdges(),
            graph => graph.makeGraphValid(),
            maxSleep
        )
    }

    changeNodePosition(nodeId: string, position: XYPosition): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }
            nodeInfo.set('position', position);
        });
    }

    changeNodeDimension(nodeId: string, dimensions: { width: number; height: number; }): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }
            nodeInfo.set('dimension', dimensions);
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
        const nodeInfo1 = this.yMatrix.get(source);
        const nodeInfo2 = this.yMatrix.get(target);
        if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
            console.warn('one of the edge nodes does not exist', nodeInfo1, nodeInfo2)
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
                selected: this.selectedNodes.has(x.get('id')),
            }
        })
    }

    edgesAsFlow(): FlowEdge[] {
        const nestedEdges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map<FlowEdge>((edge) => {
                    const edgeId: EdgeId = `${sourceNode}+${edge.get('id')}`;
                    return {
                        id: edgeId,
                        source: sourceNode,
                        target: edge.get('id'),
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow },
                        data: { label: edge.get('label'), setLabel: this.setLabel },
                        label: edge.get('label'),
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
        let edge = this.yMatrix.get(source)?.get('edgeInformation').toArray().find((edgeInfo) => edgeInfo.get('id') === target);
        if (edge === undefined)
            return undefined
        const edgeId: EdgeId = `${source}+${target}`;
        return { 
            id: edgeId, 
            source, 
            target, 
            deletable: true, 
            markerEnd: { type: MarkerType.Arrow },
            data: { label: edge.get('label') },
            selected: this.selectedEdges.has(edgeId), 
        }
    }

    getNodesAsJson(): string {
        return JSON.stringify(Array.from(this.yMatrix.keys()).sort());
    }

    getEdgesAsJson(): string {
        return JSON.stringify(
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map((edge) => `${sourceNode}+${edge.get('id')}`)
            ).flat().sort()
        );
    }

    isNodeSelected(nodeId: string): boolean {
        return this.selectedNodes.has(nodeId);
    }

    isEdgeSelected(source: string, target: id): boolean {
        return this.selectedEdges.has(`${source}+${target}`);
    }

    get nodeCount(): number {
        return this.yMatrix.size;
    }

    get edgeCount(): number {
        return Array.from(this.yMatrix.values()).reduce((acc, nodeInfo) => acc + nodeInfo.get('edgeInformation').length, 0);
    }

    get selectedNodesCount(): number {
        return this.selectedNodes.size;
    }

    get selectedEdgesCount(): number {
        return this.selectedEdges.size;
    }
}