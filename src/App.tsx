import './App.css'
import * as Y from 'yjs'
import Graph from './components/Graph'
import { GraphApi } from './Types'
import { useEffect, useRef } from 'react'
import '@xyflow/react/dist/style.css'
import { useAdjacencyMap } from './hooks/useAdjacencyMap'
import { useAdjacencyList } from './hooks/useAdjacencyList'
import { useAdjacencyMapWithFasterNodeDeletion } from './hooks/useAdjacencyMapWithFasterNodeDeletion'

function populateMatrix(graphApi: GraphApi) {  
    // Create nested yarray
    const nodeId1 = 'nodeId1'
    const nodeId2 = 'nodeId2'
    const nodeId3 = 'nodeId3'

    graphApi.addNode(nodeId1, 'label1', {x: 1, y: 0})
    graphApi.addNode(nodeId2, 'label2', {x: 1, y: 100})
    graphApi.addNode(nodeId3, 'label3', {x: 1, y: 200})
    graphApi.addEdge(nodeId1, nodeId2, 'edge1')
}

function App() {
  const ydoc1 = useRef(new Y.Doc())
  const ydoc2 = useRef(new Y.Doc())

  const graphApi1 = useAdjacencyList({ yMatrix: ydoc1.current.getMap('adjacency map') })
  const graphApi2 = useAdjacencyList({ yMatrix: ydoc2.current.getMap('adjacency map') })

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
        {/* This relies on the assumption that graphApi has enumerable properties which are the functions. 
        Functions in the prototype chain are not expanded as expected. Typescript does NOT log an error here */}
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


