import { useState, useEffect, useCallback, useRef } from 'react'
import { EventEmitter, GraphApi } from '../Types'
import { AdjacencyMapGraph, AdjacencyMap } from '../graphs/AdjacencyMap'

export function useAdjacencyMap({ yMatrix }: { yMatrix: AdjacencyMapGraph }): GraphApi {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])
    const graph = useRef(new AdjacencyMap(yMatrix, new EventEmitter()));

    useEffect(() => {
        graph.current.observe(update);
    }, [update])
    
    return {
        addNode: graph.current.addNode.bind(graph.current),
        addEdge: graph.current.addEdge.bind(graph.current),
        removeNode: graph.current.removeNode.bind(graph.current),
        removeEdge: graph.current.removeEdge.bind(graph.current),
        changeNodePosition: graph.current.changeNodePosition.bind(graph.current),
        changeNodeDimension: graph.current.changeNodeDimension.bind(graph.current),
        changeNodeSelection: graph.current.changeNodeSelection.bind(graph.current),
        changeEdgeSelection: graph.current.changeEdgeSelection.bind(graph.current),
        nodesAsFlow: graph.current.nodesAsFlow.bind(graph.current),
        edgesAsFlow: graph.current.edgesAsFlow.bind(graph.current),
    }
}
 
