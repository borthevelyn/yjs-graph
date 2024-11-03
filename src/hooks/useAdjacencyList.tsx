
import { useState, useEffect, useCallback } from "react"
import * as Y from 'yjs'
import { FlowEdge, FlowNode, GraphApi, id, ObjectYMap } from "../Types"
import { MarkerType, XYPosition } from "@xyflow/react"

type EdgeInformation = ObjectYMap<{
    id: string,
    label: string,
    selected: boolean
}>
type NodeInformation = ObjectYMap<{
    flowNode: FlowNode,
    edgeInformation: Y.Array<EdgeInformation>
}>
export type AdjacencyList = Y.Map<NodeInformation>


function makeNodeInformation(node: FlowNode, edges: Y.Array<EdgeInformation>) {
    const res = new Y.Map<FlowNode | Y.Array<EdgeInformation>>() as NodeInformation
    res.set('flowNode', node)
    res.set('edgeInformation', edges)
    return res
}


export function useAdjacencyList({ yMatrix }: { yMatrix: AdjacencyList }): GraphApi {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])

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
        new Y.Array<EdgeInformation>())
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
            const edgeInfo = new Y.Map<string | boolean>() as EdgeInformation
            
            edgeInfo.set('id', nodeId2)
            edgeInfo.set('label', label)
            edgeInfo.set('selected', false)

            nodeInfo.get('edgeInformation').forEach((edgeInfo) => {
                if (edgeInfo.get('id') === nodeId2) {
                    console.warn("Edge already exists", edgeInfo)
                    return 
                }
            })

            nodeInfo.get('edgeInformation').push([edgeInfo])
            console.log("added edge with label", label)
        });
    }

    const removeNode = (nodeId: id) => {
        yMatrix.doc!.transact(() => {   
            yMatrix.delete(nodeId)
            yMatrix.forEach((nodeInfo) => {
                const edges = nodeInfo.get('edgeInformation')
                edges.forEach((edgeInfo, index) => {
                    if (edgeInfo.get('id') === nodeId) {
                        edges.delete(index, 1)
                    }
                })
            })
        });
    }

    const removeEdge = (nodeId1: id, nodeId2: id) => {
        yMatrix.doc!.transact(() => {
            const innerMap = yMatrix.get(nodeId1)
            if (innerMap === undefined) {
                console.warn("Edge does not exist")
                return 
            }
            console.log('removed edge', nodeId1, nodeId2)
            const edges = innerMap.get('edgeInformation')
            edges.forEach((edgeInfo, index) => {
                if (edgeInfo.get('id') === nodeId2) {
                    innerMap.get('edgeInformation').delete(index, 1)
                }
            })
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
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId)
            if (nodeInfo === undefined) {
                console.warn("Node does not exist")
                return 
            }

            nodeInfo.set('flowNode', { ...nodeInfo.get('flowNode'), selected })
        });
    }

    const changeEdgeSelection = (edgeId: id, selected: boolean) => {
        yMatrix.doc!.transact(() => {
            console.warn("Change selection1", selected)
            const [nodeId1, nodeId2] = edgeId.split("+")
            const nodeInformation = yMatrix.get(nodeId1)
            if (nodeInformation === undefined) {
                console.warn("Node does not exist")
                return 
            }
            nodeInformation.get('edgeInformation').forEach((edgeInfo) => {
                if (edgeInfo.get('id') === nodeId2) {
                    console.warn("Change selection", selected)
                    edgeInfo.set('selected', selected)
                }
            })
        });
    }

    const nodesAsFlow : () => FlowNode[] = () => {
        return Array.from(yMatrix.values()).map(x => x.get('flowNode'))
    }

    const edgesAsFlow: () => FlowEdge[] = () => {
        const nestedEdges = 
            Array.from(yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map((edge) => {
                    return {
                        id: sourceNode + "+" + edge.get('id'),
                        source: sourceNode,
                        target: edge.get('id'),
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        label: edge.get('label'),
                        selected: edge.get('selected'),
                    }
                })
            )

        return nestedEdges.flat()
    }

    useEffect(() => {
        yMatrix.observeDeep((m) => {
            update() 
        })
      }, [yMatrix, update])

 
    return {addNode, addEdge, removeNode, removeEdge, changeNodePosition, changeNodeDimension, changeNodeSelection, changeEdgeSelection, nodesAsFlow, edgesAsFlow}
}
