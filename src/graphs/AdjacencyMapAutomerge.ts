import { MarkerType, XYPosition } from "@xyflow/react";
import * as automerge from "@automerge/automerge";
import { id, FlowNode, FlowEdge, EventEmitter, EdgeId, splitEdgeId } from "../Types";
import { Graph } from "./Graph";
import { AutomergeObject } from "./AutomergeObject";

type EdgeInformation = {
    label: string
}

type NodeInformation = {flowNode: FlowNode, edgeInformation: {[key: string]: EdgeInformation}}
export type AdjacencyMapAutomergeGraph = {map: {[key: string]: NodeInformation}}

export class AdjacencyMapAutomerge extends AutomergeObject<AdjacencyMapAutomergeGraph> implements Graph {

    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;

    constructor(amdoc: automerge.next.Doc<AdjacencyMapAutomergeGraph>, eventEmitter?: EventEmitter) {
        super(amdoc, eventEmitter)
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
    }

    private removeDanglingEdges() {
        
        for (const source of Object.values(this.doc.map)) {
            for (const target of Object.keys(source.edgeInformation)) {
                if (this.doc.map[target] !== undefined)
                    continue
                this.changeDoc(doc => {
                    delete doc.map[source.flowNode.id].edgeInformation[target];
                })
                this.selectedEdges.delete(`${source.flowNode.id}+${target}`);
            }
        }
    }

    private setLabel(nodeId: id, label: string) {
        const nodeInfo = this.doc.map[nodeId];
        if (nodeInfo === undefined) {
            console.warn('Node does not exist');
            return 
        }
        this.changeDoc(doc => {
            doc.map[nodeId].flowNode.data.label = label;
        });
    }

    addNode(nodeId: id, label: string, position: XYPosition): void {
        this.changeDoc(doc => {
            doc.map[nodeId] = {
                flowNode: 
                {
                    id: nodeId, 
                    data: { label }, 
                    position, 
                    deletable:true
                }, 
                edgeInformation: {}
            }
        }
        );
        console.log('document of newly created map (should not be null)', this.doc.map[nodeId]);
    }

    addEdge(source: id, target: id, label: string): void {
        const nodeInfo1 = this.doc.map[source];
        const nodeInfo2 = this.doc.map[target];
        if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
            console.warn('one of the edge nodes does not exist', source, target)
            return 
        }
        this.changeDoc(doc => {
            doc.map[source].edgeInformation[target] = {label};
        });
        console.log('added edge with label, edges', label, this.doc.map[source].edgeInformation);
    }

    removeNode(nodeId: id): void {
        this.changeDoc(doc => {
            delete doc.map[nodeId];
            for (const nodeInfo of Object.values(doc.map)) {
                delete nodeInfo.edgeInformation[nodeId];
                this.selectedEdges.delete(`${nodeInfo.flowNode.id}+${nodeId}`);     
            }
            this.selectedNodes.delete(nodeId);
        });
    }

    removeEdge(source: id, target: id): void {
        const innerMap = this.doc.map[source];
        const innerMap2 = this.doc.map[target];
        if (innerMap === undefined || innerMap2 === undefined) {
            console.warn('One of the edge nodes does not exist', innerMap, innerMap2)
            return 
        }
        console.log('remove edge', source, target);
        this.changeDoc(doc => {
            delete doc.map[source].edgeInformation[target];
            this.selectedEdges.delete(`${source}+${target}`);
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
        console.log('change node selection', nodeId, selected);
        if (selected) {
             this.selectedNodes.add(nodeId);
        }
        else {
            this.selectedNodes.delete(nodeId);
        }
        this.fireEventEmitter();
    }

    changeEdgeSelection(edgeId: EdgeId, selected: boolean): void {
        const [source, ] = splitEdgeId(edgeId);
        const nodeInfo = this.doc.map[source];
        if (nodeInfo === undefined) {
            console.warn('Node does not exist');
            return 
        }
        console.log('change edge selection', edgeId, selected);
        if (selected) {
            this.selectedEdges.add(edgeId);
        }
        else {
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
        let edge = this.doc.map[source]?.edgeInformation[target];
        if (edge === undefined)
            return undefined;
        const edgeId: EdgeId = `${source}+${target}`;
        return {
            id: edgeId,
            source,
            target,
            deletable: true,
            markerEnd: {type: MarkerType.Arrow},
            data: {label: this.doc.map[source]?.edgeInformation[target].label},                   
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
        return Object.values(this.doc.map).reduce((acc, x) => acc + Object.keys(x.edgeInformation).length, 0);
    }

    get selectedNodesCount(): number {
        return this.selectedNodes.size;
    }

    get selectedEdgesCount(): number {
        return this.selectedEdges.size;
    }
    
}