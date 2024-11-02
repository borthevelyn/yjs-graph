import { useState, useEffect, useCallback } from "react";
import * as Y from 'yjs'; 
import { MarkerType, XYPosition } from "@xyflow/react";
import { id, FlowEdge, FlowNode, AdjacencyMap, GraphApi } from "../Types";
import { EdgeInformation, NodeInformation } from "./../Types";

function makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>) {
    const res = new Y.Array<FlowNode | Y.Map<EdgeInformation>>()
    res.push([node, edges])
    return res
}
function getEdges(ni: NodeInformation) {
    if (ni.length > 2)
        console.warn('Called get edges, but node information contains more than two elements', ni)
    return ni.get(1)! as Y.Map<EdgeInformation>
}
function getFlowNode(ni: NodeInformation) {
    return ni.get(0)! as FlowNode
}
function replaceFlowNode(ni: NodeInformation, node: FlowNode) {
    // This method is supposed to overwrite the array item at index 0
    // Because there is no such method, first the item is deleted and a new item inserted
    // This does not work if the array's first item is not entirely in sync.
    // Assume, both instances call this function concurrently:
    //
    // Two theories, first:
    // If both nodes are moved without syncing, each instance will have called this function
    // and will have overwritten some property. More importantly, it seems that the `clock` stored in the
    // `id` field will have had some updates. When sycing and trying to reconcile this, yjs respects
    // the higher clock and will not delete the old FlowNode element, leading to the NodeInformation array
    // containing more than one FlowNode. It seems that tuples cannot be expressed in a Y.Array
    //
    // Second theory, more convincing:
    // Insertion creates a new unique id. When two conflicting calls to this function are made, the old
    // id is deleted, and a random id is inserted. When reconciling, two new ids are inserted, resulting
    // in an array of two nodes and one edge map
    ni.doc!.transact(() => {
        console.log('deleting item with id', ni._first?.id)
        ni.delete(0, 1)
        ni.insert(0, [node])
    })
}


export function useAdjacencyMap({ yMatrix }: { yMatrix: AdjacencyMap }): GraphApi {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])

    function setLabel(nodeId: id, label: string) {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn("Node does not exist");
                return 
            }
            replaceFlowNode(nodeInfo, { ...getFlowNode(nodeInfo), data: { label, setLabel } })
        });
    }

    const addNode = (nodeId: id, label: string, position: XYPosition) => {
        const innerArray = makeNodeInformation({ 
                id: nodeId, 
                data : { label, setLabel }, 
                position, 
                deletable: true, 
                // type: 'editNodeLabel' 
            }, 
            new Y.Map<EdgeInformation>())
        yMatrix.set(nodeId, innerArray);
        console.log('document of newly created map (should not be null)', getEdges(yMatrix.get(nodeId)!).doc)
      };
      
    const addEdge = (nodeId1: id, nodeId2: id, label: string) => {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId1);
            if (nodeInfo === undefined) {
                console.warn("Node does not exist");
                return 
            }
            getEdges(nodeInfo).set(nodeId2, { label, selected: false });
            console.log("added edge with label", label);
        });
    }

    const removeNode = (nodeId: id) => {
        yMatrix.doc!.transact(() => {   
            yMatrix.delete(nodeId);
            for (const nodeInfo of yMatrix.values()) {
                getEdges(nodeInfo).delete(nodeId);
            }
        });
    }

    const removeEdge = (nodeId1: id, nodeId2: id) => {
        yMatrix.doc!.transact(() => {
            const innerMap = yMatrix.get(nodeId1);
            if (innerMap === undefined) {
                console.warn("Node does not exist");
                return 
            }
            console.log('removed edge', nodeId1, nodeId2)
            getEdges(innerMap).delete(nodeId2);
        });
    }

    const changeNodePosition = (nodeId: id, position: XYPosition) => {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn("Node does not exist");
                return 
            }
            replaceFlowNode(nodeInfo, { ...getFlowNode(nodeInfo), position })
        });
    }

    const changeNodeDimension = (nodeId: id, dim: {width: number, height: number}) => {
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn("Node does not exist");
                return 
            }

            replaceFlowNode(nodeInfo, { ...getFlowNode(nodeInfo), measured: dim })
        });
    }

    const changeNodeSelection = (nodeId: id, selected: boolean) => {    
        yMatrix.doc!.transact(() => {
            const nodeInfo = yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn("Node does not exist");
                return 
            }
            replaceFlowNode(nodeInfo, { ...getFlowNode(nodeInfo), selected })
        })
    }

    const changeEdgeSelection = (edgeId: id, selected: boolean) => {
        yMatrix.doc!.transact(() => {
            const [nodeId1, nodeId2] = edgeId.split("+")
            const nodeInformation = yMatrix.get(nodeId1);
            if (nodeInformation === undefined) {
                console.warn("Node does not exist");
                return 
            }
            getEdges(nodeInformation).set(nodeId2, { ...getEdges(nodeInformation).get(nodeId2)!, selected});
        })
    }


    const nodesAsFlow : () => FlowNode[] = () => {
        return Array.from(yMatrix.values()).map(getFlowNode);
    }

    const edgesAsFlow: () => FlowEdge[] = () => {
        const nestedEdges = 
            Array.from(yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(getEdges(nodeInfo)).map(([targetNode, {label, selected}]) => {
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
        });
      }, [yMatrix, update]);

 
    return {addNode, addEdge, removeNode, removeEdge, changeNodePosition, changeNodeDimension, changeNodeSelection, changeEdgeSelection, nodesAsFlow, edgesAsFlow}

}
