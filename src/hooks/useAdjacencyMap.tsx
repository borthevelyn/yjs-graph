import { useState, useEffect, useCallback } from "react"
import * as Y from 'yjs'
import { MarkerType, XYPosition } from "@xyflow/react"
import { id, FlowEdge, FlowNode, GraphApi, ObjectYMap } from "../Types"
import { useSet } from "./useSet"

export type EdgeInformation = {
    label: string
}
export type NodeInformation = ObjectYMap<{
    flowNode: FlowNode,
    edgeInformation: Y.Map<EdgeInformation>
}>
export type AdjacencyMap = Y.Map<NodeInformation>


function makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>) {
    const res = new Y.Map<FlowNode | Y.Map<EdgeInformation>>() as NodeInformation
    res.set('flowNode', node)
    res.set('edgeInformation', edges)
    return res
}

export function useAdjacencyMap({ yMatrix }: { yMatrix: AdjacencyMap }): GraphApi {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])

    const [selectedNodes, addSelectedNode, removeSelectedNode] = useSet<id>()
    const [selectedEdges, addSelectedEdge, removeSelectedEdge] = useSet<id>()

    function setLabel(nodeId: id, label: string) {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn("Node does not exist")
                return 
            }
            
            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), data: { label, setLabel } })
        });
    }

    const addNode = (nodeId: id, label: string, position: XYPosition) => {
        const innerMap = makeNodeInformation({ 
                id: nodeId, 
                data : { label, setLabel }, 
                position, 
                deletable: true, 
                // type: 'editNodeLabel' 
            }, 
            new Y.Map<EdgeInformation>())
        yMatrix.set(nodeId, innerMap)
        console.log('document of newly created map (should not be null)', yMatrix.get(nodeId)!.get('edgeInformation').doc)
      }
      
    const addEdge = (nodeId1: id, nodeId2: id, label: string) => {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId1)
            if (nodeInfo === undefined) {
                console.warn("Node does not exist")
                return 
            }
            nodeInfo.get('edgeInformation').set(nodeId2, { label})
            console.log("added edge with label", label)
        });
    }

    const removeNode = (nodeId: id) => {
        yMatrix.doc!.transact(() => {   
            yMatrix.delete(nodeId)
            for (const nodeInfo of yMatrix.values()) {
                nodeInfo.get('edgeInformation').delete(nodeId)
            }
            removeSelectedNode(nodeId)
        });
    }

    const removeEdge = (nodeId1: id, nodeId2: id) => {
        yMatrix.doc!.transact(() => {
            const innerMap = yMatrix.get(nodeId1)
            if (innerMap === undefined) {
                console.warn("Node does not exist")
                return 
            }
            console.log('removed edge', nodeId1, nodeId2)
            innerMap.get('edgeInformation').delete(nodeId2)
            removeSelectedEdge(nodeId1 + "+" + nodeId2)
        });
    }

    const changeNodePosition = (nodeId: id, position: XYPosition) => {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn("Node does not exist")
                return 
            }

            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), position })
        });
    }

    const changeNodeDimension = (nodeId: id, dim: {width: number, height: number}) => {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn("Node does not exist")
                return 
            }

            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), measured: dim })
        });
    }

    const changeNodeSelection = (nodeId: id, selected: boolean) => {
        const nodeInfo = yMatrix.get(nodeId);
        if (nodeInfo === undefined) {
            console.warn("Node does not exist");
            return 
        }

        if (selected) {
            addSelectedNode(nodeId)
        }
        else {
            removeSelectedNode(nodeId)
        }
    }

    const changeEdgeSelection = (edgeId: id, selected: boolean) => {
        const [nodeId1, ] = edgeId.split("+");
        const nodeInformation = yMatrix.get(nodeId1);
        if (nodeInformation === undefined) {
            console.warn("Node does not exist");
            return 
        }    
        
        if (selected) {
            addSelectedEdge(edgeId)
        }
        else {
            removeSelectedEdge(edgeId)
        }
    }


    const nodesAsFlow : () => FlowNode[] = () => {
        return Array.from(yMatrix.values()).map(x => {
            const flowNode = x.get('flowNode')
            console.log('node is selected', selectedNodes.has(flowNode.id), selectedNodes)
            return {
                ...flowNode,
                selected: selectedNodes.has(flowNode.id)
            }
        })
    }

    const edgesAsFlow: () => FlowEdge[] = () => {
        const nestedEdges = 
            Array.from(yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode, {label}]) => {
                    return {
                        id: sourceNode + "+" + targetNode,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        label,
                        selected: selectedEdges.has(sourceNode + "+" + targetNode),
                    }
                })
            )

        return nestedEdges.flat()
    }
    
    useEffect(() => {
        yMatrix.observeDeep((m) => {
            console.log('yMatrix updates', m)
            update()
        })
      }, [yMatrix, update])

 
    return {addNode, addEdge, removeNode, removeEdge, changeNodePosition, changeNodeDimension, changeNodeSelection, changeEdgeSelection, nodesAsFlow, edgesAsFlow}

}
