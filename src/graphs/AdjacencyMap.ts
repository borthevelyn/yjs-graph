import { Graph } from './Graph';
import * as Y from 'yjs'
import { MarkerType, XYPosition } from '@xyflow/react'
import { id, FlowEdge, FlowNode, ObjectYMap, EventEmitter, EdgeId, splitEdgeId } from '../Types'

type EdgeInformation = {
    label: string
}
type NodeInformation = ObjectYMap<{
    flowNode: FlowNode
    // This map may contain dangling edges because of Yjs synchronization
    // Reading from this map should always takes this into account
    edgeInformation: Y.Map<EdgeInformation>
}>

export type AdjacencyMapGraph = Y.Map<NodeInformation>

export class AdjacencyMap implements Graph {
    private yMatrix: AdjacencyMapGraph;
    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;
    private eventEmitter: EventEmitter | undefined;

    constructor(yMatrix: AdjacencyMapGraph, eventEmitter?: EventEmitter) {
        this.yMatrix = yMatrix;
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
        this.eventEmitter = eventEmitter;
        if (this.eventEmitter !== undefined)
            this.yMatrix.observeDeep(() => this.eventEmitter?.fire());
    }

    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda)
    }

    private removeDanglingEdges() {
        for (const source of this.yMatrix.values()) {
            for (const target of source.get('edgeInformation').keys()) {
                if (this.yMatrix.get(target) !== undefined)
                    continue

                source.get('edgeInformation').delete(target);
                this.selectedEdges.delete(`${source.get('flowNode').id}+${target}`);
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
            
            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), data: { label } });
        });
    }

    private makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>) {
        const res = new Y.Map() as NodeInformation;
        res.set('flowNode', node);
        res.set('edgeInformation', edges);
        return res
    }

    addNode(nodeId: id, label: string, position: XYPosition) {
        const innerMap = this.makeNodeInformation({ 
                id: nodeId, 
                data : { label }, 
                position, 
                deletable: true, 
                // type: 'editNodeLabel',
            }, 
            new Y.Map<EdgeInformation>());
        this.yMatrix.set(nodeId, innerMap);
        console.log('document of newly created map (should not be null)', this.yMatrix.get(nodeId)!.get('edgeInformation').doc);
      }
      
    addEdge(source: id, target: id, label: string) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.yMatrix.get(source);
            const nodeInfo2 = this.yMatrix.get(target);
            if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
                console.warn('one of the edge nodes does not exist', source, target)
                return 
            }
            nodeInfo1.get('edgeInformation').set(target, {label});
            console.log('added edge with label, edges', label, nodeInfo1.get('edgeInformation'));
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
            for (const nodeInfo of this.yMatrix.values()) {
                nodeInfo.get('edgeInformation').delete(nodeId);     
                this.selectedEdges.delete(`${nodeInfo.get('flowNode').id}+${nodeId}`);
            }
            this.selectedNodes.delete(nodeId);
        });
    }

    removeEdge(source: id, target: id) {
        this.yMatrix.doc!.transact(() => {
            const innerMap = this.yMatrix.get(source);
            if (innerMap === undefined) {
                console.warn('Node does not exist');
                return 
            }
            console.log('removed edge', source, target);
            innerMap.get('edgeInformation').delete(target);
            this.selectedEdges.delete(`${source}+${target}`);
        });
    }

    changeNodePosition(nodeId: id, position: XYPosition) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }

            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), position });
        });
    }

    changeNodeDimension(nodeId: id, dim: {width: number, height: number}) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }

            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), measured: dim });
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
        console.log('yMat', this.yMatrix);
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
                    const edgeId: EdgeId = `${sourceNode}+${targetNode}`;
                    return {
                        id: edgeId,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        data: { label, setLabel: this.setLabel },
                        label,
                        selected: this.selectedEdges.has(edgeId),
                    }
                })
            )

        return nestedEdges.flat()
    }

    getNode(nodeId: string): FlowNode | undefined {
        return this.yMatrix.get(nodeId)?.get('flowNode');
    }

    getEdge(source: string, target: id): FlowEdge | undefined {
        this.removeDanglingEdges();
        let edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        if (edge === undefined)
            return undefined 
        const edgeId: EdgeId = `${source}+${target}`;
        return { 
                id: edgeId, 
                source, 
                target, 
                deletable: true, 
                markerEnd: {type: MarkerType.Arrow}, 
                data: {label: edge.label }, 
                selected: this.selectedEdges.has(edgeId), 
        }
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