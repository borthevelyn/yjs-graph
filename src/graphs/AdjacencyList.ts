import * as Y from 'yjs'
import { EventEmitter, FlowEdge, FlowNode, id, ObjectYMap } from '../Types'
import { MarkerType, XYPosition } from '@xyflow/react';
import { Graph } from './Graph';

type EdgeInformation = ObjectYMap<{
    id: string,
    label: string
}>
type NodeInformation = ObjectYMap<{
    flowNode: FlowNode,
    edgeInformation: Y.Array<EdgeInformation>
}>
export type AdjacencyListGraph = Y.Map<NodeInformation>;

export class AdjacencyList implements Graph {
    private yMatrix: AdjacencyListGraph;
    private selectedNodes: Set<id>;
    private selectedEdges: Set<id>;
    private eventEmitter: EventEmitter | undefined

    constructor(yMatrix: AdjacencyListGraph, eventEmitter?: EventEmitter) {
        this.yMatrix = yMatrix;
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
        this.eventEmitter = eventEmitter
        if (this.eventEmitter !== undefined)
            this.yMatrix.observeDeep(() => this.eventEmitter?.fire())
    }

    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda)
    }

    private removeDanglingEdges() {
        for (const source of this.yMatrix.values()) {
            source.get('edgeInformation').forEach((target, index) => {
                const targetId = target.get('id');
                if (this.yMatrix.get(targetId) !== undefined)
                    return

                source.get('edgeInformation').delete(index, 1);
                this.selectedEdges.delete(source.get('flowNode').id + '+' + targetId);
            })
        }
    }

    private removeDuplicateEdges() {
        for (const source of this.yMatrix.values()) {
            const uniqueEdgesForNode: Set<id> = new Set();
            source.get('edgeInformation').forEach((edge, index) => {
                const edgeId = edge.get('id');
                if (uniqueEdgesForNode.has(edgeId)) {
                    source.get('edgeInformation').delete(index, 1);
                    this.selectedEdges.delete(source.get('flowNode').id + '+' + edgeId);
                } else {
                    uniqueEdgesForNode.add(edgeId);
                } 
            })
        }
    }

    private setLabel(nodeId: id, label: string) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }
            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), data: { label, } });
        });
    }

    private makeNodeInformation(node: FlowNode, edges: Y.Array<EdgeInformation>) {
        const res = new Y.Map<FlowNode | Y.Array<EdgeInformation>>() as NodeInformation
        res.set('flowNode', node);
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

    addEdge(source: string, target: string, label: string): void {
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
        this.yMatrix.doc!.transact(() => {   
            this.yMatrix.delete(nodeId);
            this.selectedNodes.delete(nodeId);
            this.yMatrix.forEach((nodeInfo) => {
                const edges = nodeInfo.get('edgeInformation');
                edges.forEach((edgeInfo, index) => {
                    if (edgeInfo.get('id') === nodeId) {
                        edges.delete(index, 1);
                    }
                })
            })
        });
    }

    removeEdge(source: string, target: string): void {
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
                    this.selectedEdges.delete(source + '+' + target);
                }
            })
        });
    }

    changeNodePosition(nodeId: string, position: XYPosition): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }
            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), position });
        });
    }

    changeNodeDimension(nodeId: string, dimensions: { width: number; height: number; }): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist');
                return 
            }
            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), measured: dimensions });
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

    changeEdgeSelection(edgeId: string, selected: boolean): void {
        const [nodeId1, nodeId2] = edgeId.split('+');
        const nodeInformation = this.yMatrix.get(nodeId1);
        if (nodeInformation === undefined) {
            console.warn('Node does not exist');
            return 
        }
        nodeInformation.get('edgeInformation').forEach((edgeInfo) => {
            if (edgeInfo.get('id') === nodeId2) {
                if (selected) {
                    this.selectedEdges.add(edgeId);
                }
                else {
                    this.selectedEdges.delete(edgeId);
                }
            }
        })
        this.eventEmitter?.fire();
    }

    nodesAsFlow(): FlowNode[] {
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
        this.removeDuplicateEdges(); 
        const nestedEdges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map<FlowEdge>((edge) => {
                    return {
                        id: sourceNode + '+' + edge.get('id'),
                        source: sourceNode,
                        target: edge.get('id'),
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow },
                        data: { label: edge.get('label'), setLabel: this.setLabel },
                        label: edge.get('label'),
                        selected: this.selectedEdges.has(sourceNode + '+' + edge.get('id')),
                    }
                })
            )

        return nestedEdges.flat()
    }

    getNode(nodeId: string): FlowNode | undefined {
        return this.yMatrix.get(nodeId)?.get('flowNode');
    }

    getEdge(source: string, target: string): FlowEdge | undefined {
        this.removeDanglingEdges();
        this.removeDuplicateEdges();
        let edge = this.yMatrix.get(source)?.get('edgeInformation').toArray().find((edgeInfo) => edgeInfo.get('id') === target);
        if (edge === undefined)
            return undefined
        return { 
            id: source + '+' + target, 
            source, 
            target, 
            deletable: true, 
            markerEnd: { type: MarkerType.Arrow },
            data: { label: edge.get('label') },
            selected: this.selectedEdges.has(source + '+' + target), 
        }
    }

    isNodeSelected(nodeId: string): boolean {
        return this.selectedNodes.has(nodeId);
    }

    isEdgeSelected(source: string, target: string): boolean {
        return this.selectedEdges.has(source + '+' + target);
    }

    get nodeCount(): number {
        return this.yMatrix.size;
    }

    get edgeCount(): number {
        this.removeDanglingEdges();
        this.removeDuplicateEdges();
        return Array.from(this.yMatrix.values()).reduce((acc, nodeInfo) => acc + nodeInfo.get('edgeInformation').length, 0);
    }

    get selectedNodesCount(): number {
        return this.selectedNodes.size;
    }

    get selectedEdgesCount(): number {
        return this.selectedEdges.size;
    }
}