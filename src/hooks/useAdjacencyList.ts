import { useState, useEffect, useCallback, useRef } from 'react'
import { AdjacencyList, AdjacencyListGraph } from '../graphs/AdjacencyList'
import { EventEmitter } from '../Types'

export function useAdjacencyList({ yMatrix }: { yMatrix: AdjacencyListGraph }): AdjacencyList {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])
    const graph = useRef(new AdjacencyList(yMatrix, new EventEmitter()));

    useEffect(() => {
        graph.current.observe(update)
      }, [update])

    return graph.current
}
