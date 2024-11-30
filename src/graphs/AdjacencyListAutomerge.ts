import { XYPosition } from "@xyflow/react";
import { id, FlowNode, FlowEdge } from "../Types";
import { Graph } from "./Graph";
import * as automerge from "@automerge/automerge";

type EdgeInformation = {
    id: string,
    label: string
}
type NodeInformation = {
    flowNode: FlowNode,
    edgeInformation: automerge.List<EdgeInformation>
}
export type AdjacencyListGraph = {map: {[key: string]: NodeInformation}}


export class AdjacencyListAutomerge implements Graph {
    addNode(nodeId: id, label: string, position: XYPosition): void {
        throw new Error("Method not implemented.");
    }
    addEdge(source: id, target: string, label: string): void {
        throw new Error("Method not implemented.");
    }
    removeNode(nodeId: id): void {
        throw new Error("Method not implemented.");
    }
    removeEdge(source: id, target: string): void {
        throw new Error("Method not implemented.");
    }
    changeNodePosition(nodeId: id, position: XYPosition): void {
        throw new Error("Method not implemented.");
    }
    changeNodeDimension(nodeId: id, dimensions: { width: number; height: number; }): void {
        throw new Error("Method not implemented.");
    }
    changeNodeSelection(nodeId: id, selected: boolean): void {
        throw new Error("Method not implemented.");
    }
    changeEdgeSelection(edgeId: id, selected: boolean): void {
        throw new Error("Method not implemented.");
    }
    nodesAsFlow(): FlowNode[] {
        throw new Error("Method not implemented.");
    }
    edgesAsFlow(): FlowEdge[] {
        throw new Error("Method not implemented.");
    }
    getNode(nodeId: id): FlowNode | undefined {
        throw new Error("Method not implemented.");
    }
    getEdge(source: id, target: id): FlowEdge | undefined {
        throw new Error("Method not implemented.");
    }
    isNodeSelected(nodeId: id): boolean {
        throw new Error("Method not implemented.");
    }
    isEdgeSelected(source: id, target: id): boolean {
        throw new Error("Method not implemented.");
    }
    get nodeCount(): number {
        throw new Error("Method not implemented.");
    }
    get edgeCount(): number {
        throw new Error("Method not implemented.");
    }
    get selectedNodesCount(): number {
        throw new Error("Method not implemented.");
    }
    get selectedEdgesCount(): number {
        throw new Error("Method not implemented.");
    }

}