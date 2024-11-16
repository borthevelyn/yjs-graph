import { useState, useEffect, useCallback } from "react"
import * as Y from 'yjs'
import { MarkerType, XYPosition } from "@xyflow/react"
import { id, FlowEdge, FlowNode, GraphApi, ObjectYMap } from "../Types"
import { useSet } from "./useSet"

type EdgeInformation = {
    label: string
}
type NodeInformation = ObjectYMap<{
    flowNode: FlowNode
    // This map may contain dangling edges because of Yjs synchronization
    // Reading from this map should always takes this into account
    edgeInformation: Y.Map<EdgeInformation>
}>

export type AdjacencyMap = Y.Map<NodeInformation>


function makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>) {
    const res = new Y.Map() as NodeInformation
    res.set('flowNode', node)
    res.set('edgeInformation', edges)
    return res
}

export function useAdjacencyMap({ yMatrix }: { yMatrix: AdjacencyMap }): GraphApi {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])

    const [selectedNodes, addSelectedNode, removeSelectedNode] = useSet<id>()
    const [selectedEdges, addSelectedEdge, removeSelectedEdge] = useSet<id>()

    function removeDanglingEdges() {
        for (const source of yMatrix.values()) {
            for (const target of source.get('edgeInformation').keys()) {
                if (yMatrix.get(target) !== undefined)
                    continue

                source.get('edgeInformation').delete(target)
                removeSelectedEdge(source.get('flowNode').id + "+" + target)
            }
        }
    }

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
            const nodeInfo1 = yMatrix.get(nodeId1)
            const nodeInfo2 = yMatrix.get(nodeId2)
            if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
                console.warn("one of the edge nodes does not exist", nodeId1, nodeId2)
                return 
            }
            nodeInfo1.get('edgeInformation').set(nodeId2, { label})
            console.log("added edge with label", label)
        });
    }

    const removeNode = (nodeId: id) => {
        yMatrix.doc!.transact(() => {   
            yMatrix.delete(nodeId)
            for (const nodeInfo of yMatrix.values()) {
                nodeInfo.get('edgeInformation').delete(nodeId)      
                removeSelectedEdge(nodeInfo.get('flowNode').id + "+" + nodeId)
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
        console.log('before remove', yMatrix.get('node1')?.get('edgeInformation'))
        removeDanglingEdges()
        console.log('after remove', yMatrix.get('node1')?.get('edgeInformation'))

        const nestedEdges = 
            Array.from(yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode, {label}]) => {
                    if (yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained')
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
