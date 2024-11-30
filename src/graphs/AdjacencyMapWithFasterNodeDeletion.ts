import * as Y from 'yjs'
import { MarkerType, XYPosition } from '@xyflow/react';
import { FlowNode, FlowEdge, ObjectYMap, YSet, id, makeYSet, EventEmitter } from '../Types';
import { Graph, IncomingNodesGraph } from './Graph';

type EdgeInformation = {
    label: string
}
type NodeInformation = ObjectYMap<{
    flowNode: FlowNode,
    edgeInformation: Y.Map<EdgeInformation>,
    /* 
    `incomingNodes` is a actually a ymap where keys are producer nodes of incoming edges, 
    called `incomingNodes` and values are always undefined.
    This additional information for each node is used later for faster node deletion. 
    */
    incomingNodes: YSet
}>
export type AdjacencyMapWithFasterNodeDeletionGraph = Y.Map<NodeInformation>

export class AdjacencyMapWithFasterNodeDeletion implements Graph, IncomingNodesGraph {
    private yMatrix: AdjacencyMapWithFasterNodeDeletionGraph;
    private selectedNodes: Set<id>;
    private selectedEdges: Set<id>;
    private eventEmitter: EventEmitter | undefined;

    constructor(yMatrix: AdjacencyMapWithFasterNodeDeletionGraph, eventEmitter?: EventEmitter) {
        this.yMatrix = yMatrix
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
                this.selectedEdges.delete(source.get('flowNode').id + '+' + target)
            }
            for (const incomingNode of source.get('incomingNodes').keys()) {
                if (this.yMatrix.get(incomingNode) !== undefined)
                    continue

                source.get('incomingNodes').delete(incomingNode);
            }
        }
    }

    private setLabel(nodeId: id, label: string) {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn('Node does not exist')
                return 
            }
            
            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), data: { label } })
        });
    }

    private makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>, incomingNodes: YSet) {
        const res = new Y.Map<FlowNode | Y.Map<EdgeInformation> | Y.Map<boolean>>() as NodeInformation
        res.set('flowNode', node)
        res.set('edgeInformation', edges)
        res.set('incomingNodes', incomingNodes)
        return res
    }

    addNode(nodeId: string, label: string, position: XYPosition): void {
        const innerMap = this.makeNodeInformation({ 
            id: nodeId, 
            data : { label}, 
            position, 
            deletable: true, 
            // type: 'editNodeLabel' 
        }, 
        new Y.Map<EdgeInformation>(),
        makeYSet())
    this.yMatrix.set(nodeId, innerMap)
    
    console.log('document of newly created map (should not be null)', this.yMatrix.get(nodeId)!.get('edgeInformation').doc)
    }

    addEdge(source: string, target: string, label: string): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(source)
            const nodeInfo2 = this.yMatrix.get(target)
            if (nodeInfo === undefined || nodeInfo2 === undefined) {
                console.warn('One of the edge nodes does not exist', source, target)
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
                console.warn('Node does not exist (removeNode)')
                return 
            }
            const incomingNodes = nodeInfo.get('incomingNodes')
            
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
            }
            // Removes the node and its outgoing edges 
            this.yMatrix.delete(nodeId)
            this.selectedNodes.delete(nodeId);
        });
    }

    removeEdge(source: string, target: string): void {
        this.yMatrix.doc!.transact(() => {
            const innerMap = this.yMatrix.get(source)
            const innerMap2 = this.yMatrix.get(target)
            if (innerMap === undefined || innerMap2 === undefined) {
                console.warn('One of the nodes does not exist', innerMap, innerMap2)
                return 
            }
            /* 
            Remove edge (source, target) from outgoing edges of nodeId1
            and from incoming nodes of target.
            */
            innerMap.get('edgeInformation').delete(target);
            innerMap2.get('incomingNodes').delete(source);
            this.selectedEdges.delete(source + '+' + target);
        });
    }

    changeNodePosition(nodeId: string, position: XYPosition): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn('Node does not exist')
                return 
            }

            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), position })
        });
    }

    changeNodeDimension(nodeId: string, dimensions: { width: number; height: number; }): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo = this.yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn('Node does not exist')
                return 
            }

            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), measured: dimensions })
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
        const [nodeId1, ] = edgeId.split('+');
        const nodeInformation = this.yMatrix.get(nodeId1);
        if (nodeInformation === undefined) {
            console.warn('Node does not exist');
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
            const flowNode = x.get('flowNode');
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
                    return {
                        id: sourceNode + '+' + targetNode,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        data: { label},
                        label,
                        selected: this.selectedEdges.has(sourceNode + '+' + targetNode),
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
        let edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        if (edge === undefined)
            return undefined 
        return { 
                id: source + '+' + target, 
                source, 
                target, 
                deletable: true, 
                markerEnd: { type: MarkerType.Arrow}, 
                data: { label: edge.label}, 
                selected: this.selectedEdges.has(source + '+' + target), 
        }
    }

    isNodeSelected(nodeId: string): boolean {
        return this.selectedNodes.has(nodeId);
    }

    isEdgeSelected(source: id, target: id) {
        return this.selectedEdges.has(source + '+' + target);
    }

    getIncomingNodes(nodeId: string): YSet | undefined {
        return this.yMatrix.get(nodeId)?.get('incomingNodes');
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