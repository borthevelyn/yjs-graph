import { XYPosition } from '@xyflow/react';
import { EdgeId, FlowEdge, FlowNode, id} from '../Types';

export interface Graph {
    addNode(nodeId: id, label: string, position: XYPosition): void; 
    addEdge(source: id, target: id, label: string): void;
    removeNode(nodeId: id): void;
    removeEdge(source: id, target: id): void;
    changeNodePosition(nodeId: id, position: XYPosition): void; 
    changeNodeDimension(nodeId: id, dimensions: { width: number; height: number }): void; 
    changeNodeSelection(nodeId: id, selected: boolean): void; 
    changeEdgeSelection(edgeId: EdgeId, selected: boolean): void; 
    nodesAsFlow(): FlowNode[]; 
    edgesAsFlow(): FlowEdge[];

    getNode(nodeId: id): FlowNode | undefined;
    getEdge(source: id, target: id): FlowEdge | undefined;
    isNodeSelected(nodeId: id): boolean;
    isEdgeSelected(source: id, target:id): boolean;
    get nodeCount(): number;
    get edgeCount(): number;
    get selectedNodesCount(): number;
    get selectedEdgesCount(): number;
}

export interface IncomingNodesGraph<NodeSet> {
    getIncomingNodes(nodeId: id): NodeSet | undefined;
}
