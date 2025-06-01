import { useState, useEffect, useCallback, useRef } from 'react'
import { EventEmitter } from '../Types'
import { next as automerge } from "@automerge/automerge";
import { AppGraphData, Graph } from '../graphs/Graph';
import { AutomergeObject } from '../graphs/AutomergeObject';
import { AdjacencyListAutomerge } from '../graphs/AdjacencyListAutomerge';
import { AdjacencyMapAutomerge } from '../graphs/AdjacencyMapAutomerge';
import { AdjacencyMapWithFasterNodeDeletionAutomerge } from '../graphs/AdjacencyMapWithFasterNodeDeletionAutomerge';

function useAutomergeGraph<
    GraphType extends AutomergeObject<{ map: { [key: string]: any }}> 
        & Graph
    >(
        make: 
            (doc: automerge.Doc<{ map: { [key: string]: any }}>, eventEmitter: EventEmitter) => GraphType
    ): AppGraphData {
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])
    

    const graph1 = useRef(make(
        automerge.change(
            automerge.init(),
            d => {
                d.map = {};
            }), new EventEmitter()
        )
    );

    const graph2 = useRef(make(
        automerge.change(
            automerge.init(),
            d => {
                d.map = {};
            }), new EventEmitter()
        )
    );

    const sync1to2 = useCallback(() => {
        AutomergeObject.syncFirstToSecond(graph1.current, graph2.current)
    }, [graph1, graph2])

    
    const sync2to1 = useCallback(() => {
        AutomergeObject.syncFirstToSecond(graph2.current, graph1.current)
    }, [graph1, graph2])

    const syncBoth = useCallback(() => {
        AutomergeObject.sync(graph1.current, graph2.current)
    }, [graph1, graph2])
    
    useEffect(() => {
        syncBoth();
        graph1.current.observe(update);
        graph2.current.observe(update);
    }, [update, syncBoth])
    
    return { graph1: graph1.current, graph2: graph2.current, sync1to2, sync2to1, syncBoth }
}

export function useAdjacencyListAutomerge(): AppGraphData {
    return useAutomergeGraph((doc, ee) => new AdjacencyListAutomerge(doc, ee))
}
export function useAdjacencyMapAutomerge(): AppGraphData {
    return useAutomergeGraph((doc, ee) => new AdjacencyMapAutomerge(doc, ee))
}
export function useAdjacencyMapWithFasterNodeDeletionAutomerge(): AppGraphData {
    return useAutomergeGraph((doc, ee) => new AdjacencyMapWithFasterNodeDeletionAutomerge(doc, ee))
}