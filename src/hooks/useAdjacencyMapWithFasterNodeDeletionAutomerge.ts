import { useState, useEffect, useCallback, useRef } from 'react'
import { EventEmitter } from '../Types'
import { AdjacencyMapWithFasterNodeDeletionAutomerge, AdjacencyMapWithFasterNodeDeletionAutomergeGraph } from '../graphs/AdjacencyMapWithFasterNodeDeletionAutomerge'
import * as automerge from "@automerge/automerge"

export function useAdjacencyMapAutomerge({ amDoc }: { amDoc: automerge.next.Doc<AdjacencyMapWithFasterNodeDeletionAutomergeGraph>}): AdjacencyMapWithFasterNodeDeletionAutomerge {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])
    const graph = useRef(new AdjacencyMapWithFasterNodeDeletionAutomerge(amDoc, new EventEmitter()));

    useEffect(() => {
        graph.current.observe(update);
    }, [update])
    
    return graph.current
}