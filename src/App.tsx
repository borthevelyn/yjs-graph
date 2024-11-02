import '@xyflow/react/dist/style.css';

import './App.css';
import * as Y from 'yjs'; 
import {useAdjacencyMap} from './components/AdjacencyMap';
import DrawGraph from './components/DrawGraph';
import { GraphApi, NodeInformation } from './Types';
import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

function populateMatrix(graphApi: GraphApi) {  
    // Create nested yarray
    const nodeId1 = 'nodeId1'
    const nodeId2 = 'nodeId2'
    const nodeId3 = 'nodeId3'

    graphApi.addNode(nodeId1, "label1", {x: 0, y: 0})
    graphApi.addNode(nodeId2, "label2", {x: 0, y: 100})
    graphApi.addNode(nodeId3, "label3", {x: 0, y: 200})
    graphApi.addEdge(nodeId1, nodeId2, "edge1")
}

function App() {
  const ydoc1 = useRef(new Y.Doc());
  const yMatrix1 = useRef(ydoc1.current.getMap<NodeInformation>('adjacency map'))
  const ydoc2 = useRef(new Y.Doc());
  const yMatrix2 = useRef(ydoc2.current.getMap<NodeInformation>('adjacency map'))

  const graphApi1 = useAdjacencyMap({ yMatrix: yMatrix1.current });
  const graphApi2 = useAdjacencyMap({ yMatrix: yMatrix2.current });

  function sync1to2() {
    console.log('State clock 1', Y.encodeStateVector(ydoc1.current))
    console.log('State clock 2', Y.encodeStateVector(ydoc2.current))
    const state = Y.encodeStateAsUpdate(ydoc1.current, Y.encodeStateVector(ydoc2.current))
    console.log(`Sending updates to second ydoc`)
    console.log(graphApi2.edgesAsFlow())
    Y.applyUpdate(ydoc2.current, state)
    console.log(graphApi2.edgesAsFlow())
  }

  function sync2to1() {
    console.log('State clock 1', Y.encodeStateVector(ydoc1.current))
    console.log('State clock 2', Y.encodeStateVector(ydoc2.current))
    const state = Y.encodeStateAsUpdate(ydoc2.current, Y.encodeStateVector(ydoc1.current))
    console.log(`Sending updates to first ydoc`)
    Y.applyUpdate(ydoc1.current, state)
  }

  function syncConcurrently() {
    console.log('State clock 1', Y.encodeStateVector(ydoc1.current))
    console.log('State clock 2', Y.encodeStateVector(ydoc2.current))
    const updates1to2 = Y.encodeStateAsUpdate(ydoc1.current, Y.encodeStateVector(ydoc2.current))
    const updates2to1 = Y.encodeStateAsUpdate(ydoc2.current, Y.encodeStateVector(ydoc1.current))
    console.log(`Sending updates to both`)
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
    <div style={{ height: '100vh', width: '100vw', display: 'inline-flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
      <div style={{ height: '100%', width: '45%' }}>
        <DrawGraph {...graphApi1}/>
      </div>
      <div style={{ height: '100%', width: '50%' }}>
        <DrawGraph {...graphApi2}/>
      </div>
    </div>
    </>
  );
}

export default App;


