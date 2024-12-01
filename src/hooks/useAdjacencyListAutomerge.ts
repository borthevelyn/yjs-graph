import { useState, useEffect, useCallback, useRef } from 'react'
import { EventEmitter } from '../Types'
import { AdjacencyListAutomerge, AdjacencyListAutomergeGraph } from '../graphs/AdjacencyListAutomerge'
import * as automerge from "@automerge/automerge"

export function useAdjacencyMapAutomerge({ amDoc }: { amDoc: automerge.next.Doc<AdjacencyListAutomergeGraph>}): AdjacencyListAutomerge {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])
    const graph = useRef(new AdjacencyListAutomerge(amDoc, new EventEmitter()));

    useEffect(() => {
        graph.current.observe(update);
    }, [update])
    
    return graph.current
}