import { useState, useEffect, useCallback, useRef } from 'react'
import { AdjacencyMapWithFasterNodeDeletion, AdjacencyMapWithFasterNodeDeletionGraph } from '../graphs/AdjacencyMapWithFasterNodeDeletion'
import { EventEmitter } from '../Types'

export function useAdjacencyMapWithFasterNodeDeletion({ yMatrix }: { yMatrix: AdjacencyMapWithFasterNodeDeletionGraph }): AdjacencyMapWithFasterNodeDeletion {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])

    const graph = useRef(new AdjacencyMapWithFasterNodeDeletion(yMatrix, new EventEmitter()));

    useEffect(() => {
        graph.current.observe(update);
      }, [update])

      return graph.current

}

