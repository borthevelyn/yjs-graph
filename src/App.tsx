import './App.css'
import * as Y from 'yjs'
import Graph from './components/Graph'
import { useEffect, useRef } from 'react'
import { type Graph as GraphApi } from './graphs/Graph'
import '@xyflow/react/dist/style.css'
import { useAdjacencyMap } from './hooks/useAdjacencyMap'
import { useAdjacencyList } from './hooks/useAdjacencyList'
import { useAdjacencyMapWithFasterNodeDeletion } from './hooks/useAdjacencyMapWithFasterNodeDeletion'
import * as automerge from "@automerge/automerge"
import { useAdjacencyMapAutomerge } from './hooks/useAdjacencyMapAutomerge'
import { AdjacencyMapAutomerge, AdjacencyMapAutomergeGraph } from './graphs/AdjacencyMapAutomerge'
import { AdjacencyMap } from './graphs/AdjacencyMap'


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

  let amdoc1 = automerge.init<AdjacencyMapAutomergeGraph>()
  amdoc1 = automerge.change(amdoc1, d => {
      d.map = {};
  });

  let amdoc2 = automerge.init<AdjacencyMapAutomergeGraph>()
  amdoc2 = automerge.merge(amdoc2, automerge.clone(amdoc1))

  const graphApi1 = useAdjacencyMapAutomerge({ amDoc: amdoc1})
  const graphApi2 = useAdjacencyMapAutomerge({ amDoc: amdoc2}) 

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
    //sync1to2()
    AdjacencyMapAutomerge.syncFirstToSecond(graphApi1, graphApi2)
  }, [])

  function syncObjects<T extends AdjacencyMapAutomerge>(g1: T, g2: T) {
      AdjacencyMapAutomerge.sync(g1, g2)
  }

  return (
    <>
    <button onClick={() => { populateMatrix(graphApi1); AdjacencyMapAutomerge.syncFirstToSecond(graphApi1, graphApi2) }}>Populate</button>
    <button onClick={() => AdjacencyMapAutomerge.syncFirstToSecond(graphApi1, graphApi2)}>Sync 1 to 2</button>
    <button onClick={() => AdjacencyMapAutomerge.syncFirstToSecond(graphApi2, graphApi1)}>Sync 2 to 1</button>
    <button onClick={() => AdjacencyMapAutomerge.sync(graphApi1, graphApi2)}>Sync concurrently</button>
    <div style={{ height: '96vh', width: '100vw', display: 'inline-flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
      <div style={{ height: '100%', width: '50%', borderRight: '1px solid black' }}>
        <Graph
          addEdge={(source, target, label) => graphApi1.addEdge(source, target, label)}
          addNode={(id, label, position) => graphApi1.addNode(id, label, position)}
          changeEdgeSelection={(id, selected) => graphApi1.changeEdgeSelection(id, selected)}
          changeNodeDimension={(id, dim) => graphApi1.changeNodeDimension(id, dim)}
          changeNodePosition={(id, position) => graphApi1.changeNodePosition(id, position)}
          changeNodeSelection={(id, selected) => graphApi1.changeNodeSelection(id, selected)}
          edgesAsFlow={() => graphApi1.edgesAsFlow()}
          nodesAsFlow={() => graphApi1.nodesAsFlow()} 
          removeEdge={(source, target) => graphApi1.removeEdge(source, target)}
          removeNode={(id) => graphApi1.removeNode(id)}
        />
      </div>
      <div style={{ height: '100%', width: '50%' }}>
        <Graph
          addEdge={(source, target, label) => graphApi2.addEdge(source, target, label)}
          addNode={(id, label, position) => graphApi2.addNode(id, label, position)}
          changeEdgeSelection={(id, selected) => graphApi2.changeEdgeSelection(id, selected)}
          changeNodeDimension={(id, dim) => graphApi2.changeNodeDimension(id, dim)}
          changeNodePosition={(id, position) => graphApi2.changeNodePosition(id, position)}
          changeNodeSelection={(id, selected) => graphApi2.changeNodeSelection(id, selected)}
          edgesAsFlow={() => graphApi2.edgesAsFlow()}
          nodesAsFlow={() => graphApi2.nodesAsFlow()} 
          removeEdge={(source, target) => graphApi2.removeEdge(source, target)}
          removeNode={(id) => graphApi2.removeNode(id)}
          />
      </div>
    </div>
    </>
  );
}

export default App;


