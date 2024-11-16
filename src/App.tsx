import '@xyflow/react/dist/style.css'

import './App.css'
import * as Y from 'yjs'
import Graph from './components/Graph'
import { GraphApi } from './Types'
import { useEffect, useRef } from 'react'
import { AdjacencyList, useAdjacencyList } from './hooks/useAdjacencyList'
import { AdjacencyMap, useAdjacencyMap } from './hooks/useAdjacencyMap'
import { AdjacencyMapWithFasterNodeDeletion, useAdjacencyMapWithFasterNodeDeletion } from './hooks/useAdjacencyMapWithFasterNodeDeletion'

function populateMatrix(graphApi: GraphApi) {  
    // Create nested yarray
    const nodeId1 = 'nodeId1'
    const nodeId2 = 'nodeId2'
    const nodeId3 = 'nodeId3'

    graphApi.addNode(nodeId1, "label1", {x: 1, y: 0})
    graphApi.addNode(nodeId2, "label2", {x: 1, y: 100})
    graphApi.addNode(nodeId3, "label3", {x: 1, y: 200})
    graphApi.addEdge(nodeId1, nodeId2, "edge1")
}

function App() {
  const ydoc1 = useRef(new Y.Doc())
  const yMatrix1 = useRef(ydoc1.current.getMap('adjacency map') as AdjacencyMap)
  const ydoc2 = useRef(new Y.Doc())
  const yMatrix2 = useRef(ydoc2.current.getMap('adjacency map') as AdjacencyMap)

  const graphApi1 = useAdjacencyMap({ yMatrix: yMatrix1.current })
  const graphApi2 = useAdjacencyMap({ yMatrix: yMatrix2.current })

/*   const ydoc1 = useRef(new Y.Doc())
  const yMatrix1 = useRef(ydoc1.current.getMap('adjacency map') as AdjacencyMapWithFasterNodeDeletion)
  const ydoc2 = useRef(new Y.Doc())
  const yMatrix2 = useRef(ydoc2.current.getMap('adjacency map') as AdjacencyMapWithFasterNodeDeletion)


  const graphApi1 = useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1.current })
  const graphApi2 = useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2.current }) */
/* 
  const ydoc1 = useRef(new Y.Doc())
  const yMatrix1 = useRef(ydoc1.current.getMap('adjacency list') as AdjacencyList)
  const ydoc2 = useRef(new Y.Doc())
  const yMatrix2 = useRef(ydoc2.current.getMap('adjacency list') as AdjacencyList)

  const graphApi1 = useAdjacencyList({ yMatrix: yMatrix1.current })
  const graphApi2 = useAdjacencyList({ yMatrix: yMatrix2.current }) */

  function sync1to2() {
    console.log('State clock 1', Y.encodeStateVector(ydoc1.current))
    console.log('State clock 2', Y.encodeStateVector(ydoc2.current))
    const state = Y.encodeStateAsUpdate(ydoc1.current, Y.encodeStateVector(ydoc2.current))
    console.log(`Sending updates to second ydoc`)
    Y.applyUpdate(ydoc2.current, state)
  }

  function sync2to1() {
    const state = Y.encodeStateAsUpdate(ydoc2.current, Y.encodeStateVector(ydoc1.current))
    Y.applyUpdate(ydoc1.current, state)
  }

  function syncConcurrently() {
    const updates1to2 = Y.encodeStateAsUpdate(ydoc1.current, Y.encodeStateVector(ydoc2.current))
    const updates2to1 = Y.encodeStateAsUpdate(ydoc2.current, Y.encodeStateVector(ydoc1.current))
    Y.applyUpdate(ydoc1.current, updates2to1)
    Y.applyUpdate(ydoc2.current, updates1to2)
  }

  useEffect(() => {
    populateMatrix(graphApi1)
    sync1to2()
  }, [])

  return (
    <>
    <button onClick={() => { populateMatrix(graphApi1); sync1to2() }}>Populate</button>
    <button onClick={sync1to2}>Sync 1 to 2</button>
    <button onClick={sync2to1}>Sync 2 to 1</button>
    <button onClick={syncConcurrently}>Sync concurrently</button>
    <div style={{ height: '96vh', width: '100vw', display: 'inline-flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
      <div style={{ height: '100%', width: '50%', borderRight: '1px solid black' }}>
        <Graph {...graphApi1}/>
      </div>
      <div style={{ height: '100%', width: '50%' }}>
        <Graph {...graphApi2}/>
      </div>
    </div>
    </>
  );
}

export default App;


