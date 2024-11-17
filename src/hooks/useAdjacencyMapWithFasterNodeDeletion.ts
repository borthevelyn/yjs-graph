import { useState, useEffect, useCallback } from "react"
import * as Y from 'yjs'
import { MarkerType, XYPosition } from "@xyflow/react"
import { id, FlowEdge, FlowNode, GraphApi, ObjectYMap, YSet, makeYSet } from "../Types"
import { useSet } from "./useSet"

type EdgeInformation = {
    label: string
}
type NodeInformation = ObjectYMap<{
    flowNode: FlowNode,
    edgeInformation: Y.Map<EdgeInformation>,
    /* 
    `incomingNodes` is a actually a ymap where keys are producer nodes of incoming edges, 
    called `incomingNodes` and values are always undefined.
    This additional information for each node is used later for faster node deletion. 
    */
    incomingNodes: YSet
}>
export type AdjacencyMapWithFasterNodeDeletion = Y.Map<NodeInformation>


function makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>, incomingNodes: YSet) {
    const res = new Y.Map<FlowNode | Y.Map<EdgeInformation> | Y.Map<boolean>>() as NodeInformation
    res.set('flowNode', node)
    res.set('edgeInformation', edges)
    res.set('incomingNodes', incomingNodes)
    return res
}

export function useAdjacencyMapWithFasterNodeDeletion({ yMatrix }: { yMatrix: AdjacencyMapWithFasterNodeDeletion }): GraphApi {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])

    const [selectedNodes, addSelectedNode, removeSelectedNode] = useSet<id>()
    const [selectedEdges, addSelectedEdge, removeSelectedEdge] = useSet<id>()

    function removeDanglingEdges() {
        for (const source of yMatrix.values()) {
            for (const target of source.get('edgeInformation').keys()) {
                if (yMatrix.get(target) !== undefined)
                    continue

                source.get('edgeInformation').delete(target);
                removeSelectedEdge(source.get('flowNode').id + "+" + target)
            }
            for (const incomingNode of source.get('incomingNodes').keys()) {
                if (yMatrix.get(incomingNode) !== undefined)
                    continue

                source.get('incomingNodes').delete(incomingNode);
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
            new Y.Map<EdgeInformation>(),
            makeYSet())
        yMatrix.set(nodeId, innerMap)
        
        console.log('document of newly created map (should not be null)', yMatrix.get(nodeId)!.get('edgeInformation').doc)
      }
      
    const addEdge = (nodeId1: id, nodeId2: id, label: string) => {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId1)
            const nodeInfo2 = yMatrix.get(nodeId2)
            if (nodeInfo === undefined || nodeInfo2 === undefined) {
                console.warn("One of the edge nodes does not exist", nodeId1, nodeId2)
                return 
            }
            /* 
            Add edge (nodeId1, nodeId2) to outgoing edges of nodeId1
            and to incoming nodes of nodeId2.
            */
            nodeInfo.get('edgeInformation').set(nodeId2, { label })
            nodeInfo2.get('incomingNodes').set(nodeId1);
        });
    }

    const removeNode = (nodeId: id) => {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId)  
            if (nodeInfo === undefined) {
                console.warn("Node does not exist (removeNode)")
                return 
            }
            const incomingNodes = nodeInfo.get('incomingNodes')
            
            /* 
            Faster node deletion: Iteration over all nodes is not required here, 
            only over nodes with an edge to the removed node 
            */
            for (const incomingNode of incomingNodes.keys()) {
                const innerMap = yMatrix.get(incomingNode)
                if (innerMap === undefined) {
                    console.warn("Node does not exist. It should have an edge to the removed node(removeNode)")
                    return 
                }
                innerMap.get('edgeInformation').delete(nodeId);
            }
            // Removes the node and its outgoing edges 
            yMatrix.delete(nodeId)
            removeSelectedNode(nodeId);
        });
    }

    const removeEdge = (nodeId1: id, nodeId2: id) => {
        yMatrix.doc!.transact(() => {
            const innerMap = yMatrix.get(nodeId1)
            const innerMap2 = yMatrix.get(nodeId2)
            if (innerMap === undefined || innerMap2 === undefined) {
                console.warn("One of the nodes does not exist", innerMap, innerMap2)
                return 
            }
            /* 
            Remove edge (nodeId1, nodeId2) from outgoing edges of nodeId1
            and from incoming nodes of nodeId2.
            */
            innerMap.get('edgeInformation').delete(nodeId2);
            innerMap2.get('incomingNodes').delete(nodeId1);
            removeSelectedEdge(nodeId1 + "+" + nodeId2);
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
            return {
                ...flowNode,
                selected: selectedNodes.has(flowNode.id)
            }
        })
    }

    const edgesAsFlow: () => FlowEdge[] = () => {
        removeDanglingEdges();
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

