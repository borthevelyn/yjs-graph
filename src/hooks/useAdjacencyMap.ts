import { useState, useEffect, useCallback, useRef } from 'react'
import { EventEmitter } from '../Types'
import { AdjacencyMapGraph, AdjacencyMap } from '../graphs/AdjacencyMap'

export function useAdjacencyMap({ yMatrix }: { yMatrix: AdjacencyMapGraph }): AdjacencyMap {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])
    const graph = useRef(new AdjacencyMap(yMatrix, new EventEmitter()));

    useEffect(() => {
        graph.current.observe(update);
    }, [update])
    
    return graph.current
}
 
