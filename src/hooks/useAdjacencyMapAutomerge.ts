import { useState, useEffect, useCallback, useRef } from 'react'
import { EventEmitter } from '../Types'
import { AdjacencyMapAutomerge, AdjacencyMapAutomergeGraph } from '../graphs/AdjacencyMapAutomerge'
import * as automerge from "@automerge/automerge"

export function useAdjacencyMapAutomerge({ amDoc }: { amDoc: automerge.next.Doc<AdjacencyMapAutomergeGraph>}): AdjacencyMapAutomerge {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])
    const graph = useRef(new AdjacencyMapAutomerge(amDoc, new EventEmitter()));

    useEffect(() => {
        graph.current.observe(update);
    }, [update])
    
    return graph.current
}