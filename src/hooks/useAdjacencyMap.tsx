import { useState, useEffect, useCallback } from "react"
import * as Y from 'yjs'
import { MarkerType, XYPosition } from "@xyflow/react"
import { id, FlowEdge, FlowNode, GraphApi, ObjectYMap } from "../Types"

export type EdgeInformation = {
    label: string,
    selected: boolean
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
            nodeInfo.get('edgeInformation').set(nodeId2, { label, selected: false })
            console.log("added edge with label", label)
        });
    }

    const removeNode = (nodeId: id) => {
        yMatrix.doc!.transact(() => {   
            yMatrix.delete(nodeId)
            for (const nodeInfo of yMatrix.values()) {
                nodeInfo.get('edgeInformation').delete(nodeId)
            }
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
            const [nodeId1, nodeId2] = edgeId.split("+")
            const nodeInformation = yMatrix.get(nodeId1)
            if (nodeInformation === undefined) {
                console.warn("Node does not exist")
                return 
            }
            nodeInformation.get('edgeInformation').set(nodeId2, { ...nodeInformation.get('edgeInformation').get(nodeId2)!, selected})
        });
    }


    const nodesAsFlow : () => FlowNode[] = () => {
        return Array.from(yMatrix.values()).map(x => x.get('flowNode'))
    }

    const edgesAsFlow: () => FlowEdge[] = () => {
        const nestedEdges = 
            Array.from(yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode, {label, selected}]) => {
                    return {
                        id: sourceNode + "+" + targetNode,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        label,
                        selected,
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
