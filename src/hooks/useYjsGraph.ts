import * as Y from 'yjs';
import { useRef, useCallback, useState, useEffect } from "react";
import { Graph, AppGraphData } from "../graphs/Graph";
import { AdjacencyList } from "../graphs/AdjacencyList";
import { EventEmitter } from '../Types';
import { AdjacencyMap } from '../graphs/AdjacencyMap';
import { AdjacencyMapWithFasterNodeDeletion } from '../graphs/AdjacencyMapWithFasterNodeDeletion';

function useYjsGraph<T extends Graph & { makeGraphValid: () => void; observe: (updater: () => void) => void}>(make: (doc: Y.Doc, eventEmitter: EventEmitter) => T): AppGraphData {
    const doc1 = useRef(new Y.Doc())
    const doc2 = useRef(new Y.Doc())
    const graph1 = useRef(make(doc1.current, new EventEmitter()))
    const graph2 = useRef(make(doc2.current, new EventEmitter()))
    
    const sync1to2 = useCallback(() => {
        Y.applyUpdate(doc2.current, Y.encodeStateAsUpdate(doc1.current, Y.encodeStateVector(doc2.current)))
        graph2.current.makeGraphValid()
    }, [doc1, doc2, graph2])

    
    const sync2to1 = useCallback(() => {
        Y.applyUpdate(doc1.current, Y.encodeStateAsUpdate(doc2.current, Y.encodeStateVector(doc1.current)))
        graph1.current.makeGraphValid()
    }, [doc1, doc2, graph1])

    const syncBoth = useCallback(() => {
        Y.applyUpdate(doc2.current, Y.encodeStateAsUpdate(doc1.current, Y.encodeStateVector(doc2.current)))
        Y.applyUpdate(doc1.current, Y.encodeStateAsUpdate(doc2.current, Y.encodeStateVector(doc1.current)))

        graph1.current.makeGraphValid()
        graph2.current.makeGraphValid()

    }, [doc1, doc2, graph1, graph2])

    
    const [, updateHelper] = useState({})
    const update = useCallback(() => updateHelper({}), [])
    useEffect(() => {
        graph1.current.observe(update)
        graph2.current.observe(update)
    }, [update])

    
    return { graph1: graph1.current, graph2: graph2.current, sync1to2, sync2to1, syncBoth }
}


export function useAdjacencyListYjs(): AppGraphData {
  return useYjsGraph((doc, ee) => new AdjacencyList(doc, ee))
}

export function useAdjacencyMapYjs(): AppGraphData {
  return useYjsGraph((doc, ee) => new AdjacencyMap(doc, ee))
}

export function useAdjacencyMapWithFasterNodeDeletionYjs(): AppGraphData {
  return useYjsGraph((doc, ee) => new AdjacencyMapWithFasterNodeDeletion(doc, ee))
}
