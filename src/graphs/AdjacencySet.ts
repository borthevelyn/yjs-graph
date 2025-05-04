import { Graph } from './Graph';
import * as Y from 'yjs'
import { MarkerType, XYPosition } from '@xyflow/react'
import { id, FlowEdge, FlowNode, ObjectYMap, EventEmitter, EdgeId, splitEdgeId } from '../Types'
import assert from 'assert';
import { wrapYMap, YSet } from '../ySet';
import { syncDefault, syncPUSPromAll } from './SynchronizationMethods';

// Maps edge id to label
type EdgeInformation = Y.Map<string>

type NodeData = {
    id: string,
    label: string,
    position: XYPosition,
    deletable: boolean,
    dimension: {width: number | undefined, height: number | undefined}
}

type NodeInformation = ObjectYMap<NodeData & {
    edgeInformation: Y.Array<id>
}>

export type AdjacencySetGraph = Y.Map<NodeInformation>

export class AdjacencySet implements Graph {
    private yMatrix: AdjacencySetGraph;
    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;
    private eventEmitter: EventEmitter | undefined;
    private edgeLabelMap: EdgeInformation;

    private wrappedNodes: ReadonlyMap<string, { readonly edgeInformation: YSet<id>; readonly id: id }>

    
    private readonly yMatrixId = 'adjacencyset_ydoc'

    constructor(yDoc: Y.Doc, eventEmitter?: EventEmitter) {
        this.yMatrix = yDoc.getMap(this.yMatrixId);
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
        this.edgeLabelMap = this.yMatrix.doc!.getMap<string>('edges');
        this.eventEmitter = eventEmitter;
        if (this.eventEmitter !== undefined)
            this.yMatrix.observeDeep(() => this.eventEmitter?.fire());

        this.wrappedNodes = wrapYMap(this.yMatrix, nodeInfo => { return { 
            edgeInformation: new YSet(nodeInfo.get('edgeInformation')),
            id: nodeInfo.get('id'),
        }}, (nodeInfo, key, old) => {
            if (key === 'edgeInformation')
                return old
            else
                return {
                    edgeInformation: new YSet(nodeInfo.get('edgeInformation')),
                    id: nodeInfo.get('id'),
            }
        })
    }

    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda)
    }

    public makeGraphValid() {
        const start = performance.now()
        for (const source of this.wrappedNodes.values()) {
            for (const target of source.edgeInformation.keys()) {
                if (this.yMatrix.get(target) !== undefined)
                    continue

                source.edgeInformation.delete(target);
                this.selectedEdges.delete(`${source.id}+${target}`);
            }
        }
        return { time: performance.now() - start }
    }

    public hasNoDanglingEdges() {
        for (const source of this.wrappedNodes.values()) {
            for (const target of source.edgeInformation.keys()) {
                if (this.yMatrix.get(target) === undefined)
                    return false
            }
        }
        return true
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

    private makeNodeInformation(node: FlowNode) {
        const res = new Y.Map() as NodeInformation;
        res.set('id', node.id);
        res.set('label', node.data.label);
        res.set('position', node.position);
        res.set('deletable', true);
        res.set('dimension', {width: node.measured?.width, height: node.measured?.height});
        res.set('edgeInformation', new Y.Array());
        return res
    }

    addNode(nodeId: id, label: string, position: XYPosition) {
        const innerMap = this.makeNodeInformation({ 
                id: nodeId, 
                data : { label }, 
                position, 
                deletable: true, 
                // type: 'editNodeLabel',
            });
        this.yMatrix.set(nodeId, innerMap);
    }
      
    addEdge(source: id, target: id, label: string) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.wrappedNodes.get(source);
            const nodeInfo2 = this.wrappedNodes.get(target);
            if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
                console.warn('one of the edge nodes does not exist', source, target)
                return 
            }
            nodeInfo1.edgeInformation.add(target);
            this.edgeLabelMap.set(`${source}+${target}`, label);
            
            console.log('added edge with label, edges', label, nodeInfo1.edgeInformation);
        });
    }

    removeNode(nodeId: id) {
        const nodeInfo = this.yMatrix.get(nodeId);
        if (nodeInfo === undefined) {
            console.log('Node does not exist (removeNode)')
            return 
        }
        this.yMatrix.doc!.transact(() => {   
            this.yMatrix.delete(nodeId)
            for (const nodeInfo of this.wrappedNodes.values()) {
                nodeInfo.edgeInformation.delete(nodeId);     
                this.selectedEdges.delete(`${nodeInfo.id}+${nodeId}`);
            }
            this.selectedNodes.delete(nodeId);
        });
    }

    removeEdge(source: id, target: id) {
        this.yMatrix.doc!.transact(() => {
            const innerMap = this.wrappedNodes.get(source);
            if (innerMap === undefined) {
                console.warn('Node does not exist');
                return 
            }
            console.log('removed edge', source, target);
            innerMap.edgeInformation.delete(target);
            this.yMatrix.doc!.getMap('edges').delete(`${source}+${target}`);
            this.selectedEdges.delete(`${source}+${target}`);
        });
    }

    static syncDefault(graphs: AdjacencySet[]) {
        return syncDefault(graphs, graphs.map(graph => graph.yMatrix.doc!), graph => graph.makeGraphValid())
    }
    static async syncPUS(graphs: AdjacencySet[], maxSleep: number, rnd: (idx: number) => number) {
        return await syncPUSPromAll(
            graphs,
            graphs.map(x => x.yMatrix.doc!),
            rnd,
            yDoc => new AdjacencySet(yDoc),
            graph => graph.hasNoDanglingEdges(),
            graph => graph.makeGraphValid(),
            maxSleep
        )
    }


    changeNodePosition(nodeId: id, position: XYPosition) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }

            nodeInfo.set('position', position);
        });
    }

    changeNodeDimension(nodeId: id, dim: {width: number, height: number}) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }
            nodeInfo.set('dimension', dim);
        });
    }

    changeNodeSelection(nodeId: id, selected: boolean) {
        const nodeInfo = this.yMatrix.get(nodeId);
        if (nodeInfo === undefined) {
            console.warn('Node does not exist');
            return 
        }
        console.log('change node selection, selected', selected);
        if (selected) {
            this.selectedNodes.add(nodeId);
            console.log('selected nodes add', this.selectedNodes);
        }
        else {
            this.selectedNodes.delete(nodeId);
            console.log('selected nodes delete', this.selectedNodes);
        }
        this.eventEmitter?.fire();
    }

    changeEdgeSelection(edgeId: EdgeId, selected: boolean) {
        const [nodeId1, ] = splitEdgeId(edgeId);
        const nodeInformation = this.yMatrix.get(nodeId1);
        if (nodeInformation === undefined) {
            console.warn('Node does not exist');
            return
        }    
        
        if (selected) {
            this.selectedEdges.add(edgeId);
            console.log('selected edges add', this.selectedEdges);
        }
        else {
            this.selectedEdges.delete(edgeId);
            console.log('selected edges delete', this.selectedEdges);
        }
        this.eventEmitter?.fire();
    }

    nodesAsFlow(): FlowNode[] {
        assert(this.yMatrix !== undefined, 'yMatrix is undefined')
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
            Array.from(this.wrappedNodes.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.edgeInformation.keys()).map((targetNode) => {
                    if (this.yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained');
                    const edgeId: EdgeId = `${sourceNode}+${targetNode}`;
                    const edgeLabel = this.edgeLabelMap.get(edgeId);
                    assert(edgeLabel !== undefined, 'edge label is undefined');
                    return {
                        id: edgeId,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        data: { label: edgeLabel, setLabel: this.setLabel },
                        label: edgeLabel,
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
        let edge = this.wrappedNodes.get(source)?.edgeInformation.has(target);
        if (edge === undefined || !edge)
            return undefined 
        const edgeId: EdgeId = `${source}+${target}`;
        const edgeLabel = this.edgeLabelMap.get(edgeId);
        assert(edgeLabel !== undefined, 'edge label is undefined');
        return { 
                id: edgeId, 
                source, 
                target, 
                deletable: true, 
                markerEnd: {type: MarkerType.Arrow}, 
                data: {label: edgeLabel}, 
                selected: this.selectedEdges.has(edgeId), 
        }
    }

    getNodesAsJson(): string {
        return JSON.stringify(Array.from(this.yMatrix.keys()).sort());
    }

    getEdgesAsJson(): string {
        return JSON.stringify(Array.from(this.wrappedNodes.entries()).map(([source, nodeInfo]) => 
            Array.from(nodeInfo.edgeInformation.keys()).map(target => `${source}+${target}`)).flat().sort());
    }

    isNodeSelected(nodeId: id) {
        return this.selectedNodes.has(nodeId);
    }

    isEdgeSelected(source: id, target: id) {
        return this.selectedEdges.has(`${source}+${target}`);
    }

    get nodeCount() {
        return this.yMatrix.size;
    }

    get edgeCount() {
        return Array.from(this.wrappedNodes.values()).reduce((acc, x) => acc + x.edgeInformation.size, 0);
    }

    get selectedNodesCount(): number {
        return this.selectedNodes.size;
    }

    get selectedEdgesCount(): number {
        return this.selectedEdges.size;
    }
   
}