import * as Y from 'yjs'; 
import { EdgeBase, NodeBase } from '@xyflow/system';

export type id = string;
export type FlowNode = NodeBase<{label: string, setLabel: (nodeId: string, label: string) => void}>
export type FlowEdge = EdgeBase<{label: string, setLabel: (nodeId: string, label: string) => void}>;

export type EdgeInformation = { label: string, selected: boolean }
export type NodeInformation = Y.Array<FlowNode | Y.Map<EdgeInformation>>
export type AdjacencyMap = Y.Map<NodeInformation>

export type GraphApi =  {
    addNode: (id: string, label: string, position: { x: number; y: number }) => void, 
    addEdge: (source: string, target: string, label: string) => void, 
    removeNode: (id: string) => void, 
    removeEdge: (source: string, target: string) => void, 
    changeNodePosition: (id: string, position: { x: number; y: number }) => void, 
    nodesAsFlow: () => FlowNode[], 
    changeNodeDimension: (id: string, dimensions: { width: number; height: number }) => void, 
    changeNodeSelection: (id: string, selected: boolean) => void, 
    changeEdgeSelection: (id: string, selected: boolean) => void, 
    edgesAsFlow: () => FlowEdge[]
}

    
