import { MarkerType, XYPosition } from "@xyflow/react";
import { id, FlowNode, FlowEdge, EventEmitter, EdgeId, splitEdgeId } from "../Types";
import { Graph } from "./Graph";
import * as automerge from "@automerge/automerge";
import { AutomergeObject } from "./AutomergeObject";

type EdgeInformation = {
    id: string,
    label: string
}
type NodeInformation = {
    flowNode: FlowNode,
    edgeInformation: EdgeInformation[]
}
export type AdjacencyListAutomergeGraph = {map: {[key: string]: NodeInformation}}

export class AdjacencyListAutomerge extends AutomergeObject<AdjacencyListAutomergeGraph> implements Graph {
    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;

    constructor(amdoc: automerge.next.Doc<AdjacencyListAutomergeGraph>, eventEmitter?: EventEmitter) {
        super(amdoc, eventEmitter)
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
    }
    private removeDanglingEdges() {
        for (const source of Object.values(this.doc.map)) {
            source.edgeInformation.forEach((target, index) => {
                const targetId = target.id;
                if (this.doc.map[targetId] !== undefined)
                    return
                this.changeDoc(doc => {
                    doc.map[source.flowNode.id].edgeInformation.splice(index, 1);
                })
                this.selectedEdges.delete(`${source.flowNode.id}+${targetId}`);
            })
        }
    }
    private removeDuplicateEdges() {   
        for (const source of Object.values(this.doc.map)) {
            const uniqueEdgesForNode: Set<id> = new Set();
            source.edgeInformation.forEach((edge, index) => {
                const edgeId = edge.id;
                if (uniqueEdgesForNode.has(edgeId)) {
                    this.changeDoc(doc => {
                        doc.map[source.flowNode.id].edgeInformation.splice(index, 1);
                    })
                    this.selectedEdges.delete(`${source.flowNode.id}+${edgeId}`);
                } else {
                    uniqueEdgesForNode.add(edgeId);
                } 
            })
        }
    }


    addNode(nodeId: id, label: string, position: XYPosition): void {
        this.changeDoc(doc => {
            doc.map[nodeId] = {
                flowNode: {
                    id: nodeId,
                    data: { label },
                    position,
                    deletable: true
                },
                edgeInformation: [] 
            }
        });
        console.log('document of newly created map (should not be null)', this.doc.map[nodeId]);
    }
    addEdge(source: id, target: id, label: string): void {
        const nodeInfo1 = this.doc.map[source];
        const nodeInfo2 = this.doc.map[target];
        if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
            console.warn('one of the edge nodes does not exist', source, target)
            return 
        }
        let duplicateEdgeIndex = nodeInfo1.edgeInformation.findIndex((edgeInfo) => edgeInfo.id === target);

        if (duplicateEdgeIndex !== -1) {
            this.changeDoc(doc => {
                doc.map[source].edgeInformation[duplicateEdgeIndex].label = label;
            });
            console.log('replaced edge with label, edges', label);
            return
        }

        this.changeDoc(doc => {
            doc.map[source].edgeInformation.push({
                id: target,
                label
            })
        });
        console.log('added edge with label, edges', label, this.doc.map[source].edgeInformation);
    }
    removeNode(nodeId: id): void {
        const nodeInfo = this.doc.map[nodeId]; 
        if (nodeInfo === undefined) {
            console.log('Node does not exist (removeNode)')
            return 
        }
        this.changeDoc(doc => {
            delete doc.map[nodeId];
            this.selectedNodes.delete(nodeId);
            for (const nodeInformation of Object.values(doc.map)) {
                const edges = nodeInformation.edgeInformation;
                edges.forEach((edge, index) => {
                    if (edge.id === nodeId) {
                        edges.splice(index, 1);
                        this.selectedEdges.delete(`${nodeId}+${edge.id}`);
                    }
                });
            }
        });
        console.log('removed node, node in doc should be undefined', nodeId, this.doc.map[nodeId]);
    }
    removeEdge(source: id, target: id): void {
        const nodeInfo1 = this.doc.map[source];
        if (nodeInfo1 === undefined) {
            console.warn('Node does not exist');
            return 
        }
        console.log('remove edge', source, target);
            const edges = this.doc.map[source].edgeInformation;
            edges.forEach((edge, index) => {
                if (edge.id === target) {
                    this.changeDoc(doc => {
                        doc.map[source].edgeInformation.splice(index, 1);
                    });
                    this.selectedEdges.delete(`${source}+${target}`);
                }
            });
    }
    changeNodePosition(nodeId: id, position: XYPosition): void {
        const nodeInfo = this.doc.map[nodeId];
        if (nodeInfo === undefined) {
            console.warn('Node does not exist');
            return 
        }
        this.changeDoc(doc => {
            doc.map[nodeId].flowNode.position = position;
        });
    }
    changeNodeDimension(nodeId: id, dimensions: { width: number; height: number; }): void {
        const nodeInfo = this.doc.map[nodeId];
        if (nodeInfo === undefined) {
            console.warn('Node does not exist');
            return 
        }
        this.changeDoc(doc => {
            doc.map[nodeId].flowNode.measured = dimensions;
        });
    }
    changeNodeSelection(nodeId: id, selected: boolean): void {
        const nodeInfo = this.doc.map[nodeId];
        if (nodeInfo === undefined) {
            console.warn('Node does not exist');
            return 
        }
        if (selected) {
            this.selectedNodes.add(nodeId);
        } else {
            this.selectedNodes.delete(nodeId);
        }
        this.fireEventEmitter();
    }
    changeEdgeSelection(edgeId: EdgeId, selected: boolean): void {
        const [source, target] = splitEdgeId(edgeId);
        const nodeInfo1 = this.doc.map[source];
        const nodeInfo2 = this.doc.map[target];
        if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
            console.warn('one of the edge nodes does not exist', nodeInfo1, nodeInfo2)
            return 
        }
        if (selected) {
            this.selectedEdges.add(edgeId);
        } else {
            this.selectedEdges.delete(edgeId);
        }
        this.fireEventEmitter();
    }
    nodesAsFlow(): FlowNode[] {
        return Object.values(this.doc.map).map(nodeInfo => {
            nodeInfo.flowNode.selected = this.selectedNodes.has(nodeInfo.flowNode.id);
            return nodeInfo.flowNode;
        });
    }
    edgesAsFlow(): FlowEdge[] {
        this.removeDanglingEdges();
        this.removeDuplicateEdges();
        const nestedEdges = 
            Object.entries(this.doc.map).map(([sourceNode, nodeInfo]) => {  
                return Object.entries(nodeInfo.edgeInformation).map(([targetNode, edgeInfo]) => {
                    const edgeId: EdgeId = `${sourceNode}+${targetNode}`;
                    return {
                        id: edgeId,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: {type: MarkerType.Arrow},
                        data: {label: nodeInfo.flowNode.data.label},                   
                        label: edgeInfo.label,
                        selected: this.selectedEdges.has(edgeId)
                    }
                });
        });
        return nestedEdges.flat();
    }
    getNode(nodeId: id): FlowNode | undefined {
        return this.doc.map[nodeId]?.flowNode;
    }
    getEdge(source: id, target: id): FlowEdge | undefined {
        this.removeDanglingEdges();
        this.removeDuplicateEdges();

        let targetIndex = this.doc.map[source]?.edgeInformation.findIndex(edgeInfo => edgeInfo.id === target);
        if (targetIndex === undefined || targetIndex === -1) {
            console.log('targetindex is -1', source, target, this.doc.map[source]?.edgeInformation);
            return undefined;
        }
        const edgeId: EdgeId = `${source}+${target}`;
        return {
            id: edgeId,
            source,
            target,
            deletable: true,
            markerEnd: {type: MarkerType.Arrow},
            data: {label: this.doc.map[source]?.edgeInformation[targetIndex].label},                   
            selected: this.selectedEdges.has(edgeId)
        }  
    }
    isNodeSelected(nodeId: id): boolean {
        return this.selectedNodes.has(nodeId);
    }
    isEdgeSelected(source: id, target: id): boolean {
        return this.selectedEdges.has(`${source}+${target}`);
    }
    get nodeCount(): number {
        return Object.keys(this.doc.map).length;
    }
    get edgeCount(): number {
        return Object.values(this.doc.map).reduce((acc, nodeInfo) => acc + nodeInfo.edgeInformation.length, 0);
    }
    get selectedNodesCount(): number {
        return this.selectedNodes.size;
    }
    get selectedEdgesCount(): number {
        return this.selectedEdges.size;
    }

}