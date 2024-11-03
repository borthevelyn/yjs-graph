import { Background, Connection, ControlButton, Controls, EdgeChange, NodeChange, ReactFlow } from "@xyflow/react"
import { FlowEdge, FlowNode, GraphApi } from "../Types"
import { useCallback } from "react"
import EditLabelNode from "./EditLabelNode"
import { v4 } from "uuid"

export default function Graph({ 
    addNode, 
    addEdge, 
    removeNode, 
    removeEdge, 
    changeNodePosition, 
    nodesAsFlow, 
    changeNodeDimension, 
    changeNodeSelection, 
    changeEdgeSelection, 
    edgesAsFlow }: GraphApi) {

    const onNodesChange = useCallback(
        (changes: NodeChange<FlowNode>[]) => changes.forEach((change) => {
        console.log('node change', changes)
        if (change.type === 'position') {
            if (change.position !== undefined && !isNaN(change.position.x))
            changeNodePosition(change.id, change.position);
        } else if (change.type === 'dimensions') {
            if (change.dimensions !== undefined)
            changeNodeDimension(change.id, change.dimensions)
        } else if (change.type === 'select') {
            changeNodeSelection(change.id, change.selected);
        } else {
            console.warn("unhandled change!", change);
        }
        }),
        [],
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange<any>[]) => changes.forEach((change) => {
        console.log("edge change", change);
        if (change.type === 'select') {
            changeEdgeSelection(change.id, change.selected);
        }
        else
            console.warn("unhandled change!", change);
        }),
        [],
    );

    const onNodesDelete = useCallback(
        (nodes: FlowNode[]) => {
        console.log("delete nodes", nodes);
        nodes.forEach((node) => {
            removeNode(node.id)
        })
        },[removeNode],)

    const onConnect = useCallback(
        (connection: Connection) => {
        console.log("connect")
        addEdge(connection.source, connection.target, "edge label")
        },
        [addEdge],
    ) 

    const onEdgesDelete = useCallback(
        (edges: FlowEdge[]) => {
        console.log("delete edges", edges)
        edges.forEach((edge) => {
            removeEdge(edge.source, edge.target)
        })
        },[removeEdge])

    const nodeTypes = {
    editNodeLabel: EditLabelNode 
    }

    return (
        <>
        <ReactFlow 
            nodes={nodesAsFlow()} 
            edges={edgesAsFlow()} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange} 
            onNodesDelete={onNodesDelete}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
        >
        <Background />
        <Controls>
            <ControlButton onClick={() => addNode(v4(), "node label", {x: 0, y: 0})}>Add Node</ControlButton>
        </Controls> 
        </ReactFlow>
        </>
    );
}