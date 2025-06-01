import './App.css'
import Graph from './components/Graph'
import { useEffect } from 'react'
import { type Graph as GraphApi } from './graphs/Graph'
import '@xyflow/react/dist/style.css'
import { useAdjacencyMapAutomerge, useAdjacencyListAutomerge, useAdjacencyMapWithFasterNodeDeletionAutomerge } from './hooks/useAutomergeGraph'
import { useAdjacencyListYjs, useAdjacencyMapWithFasterNodeDeletionYjs, useAdjacencyMapYjs } from './hooks/useYjsGraph'


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


  const { graph1, graph2, sync1to2, sync2to1, syncBoth } = useAdjacencyMapWithFasterNodeDeletionAutomerge()
  
  useEffect(() => {
    populateMatrix(graph1)
    sync1to2()
  }, [graph1, sync1to2])


  return (
    <>
    <button onClick={() => { populateMatrix(graph1); sync1to2() }}>Populate</button>
    <button onClick={() => sync1to2()}>Sync 1 to 2</button>
    <button onClick={() => sync2to1()}>Sync 2 to 1</button>
    <button onClick={() => syncBoth()}>Sync concurrently</button>
    <div style={{ height: '96vh', width: '100vw', display: 'inline-flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
      <div style={{ height: '100%', width: '50%', borderRight: '1px solid black' }}>
        <Graph
          addEdge={(source, target, label) => graph1.addEdge(source, target, label)}
          addNode={(id, label, position) => graph1.addNode(id, label, position)}
          changeEdgeSelection={(id, selected) => graph1.changeEdgeSelection(id, selected)}
          changeNodeDimension={(id, dim) => graph1.changeNodeDimension(id, dim)}
          changeNodePosition={(id, position) => graph1.changeNodePosition(id, position)}
          changeNodeSelection={(id, selected) => graph1.changeNodeSelection(id, selected)}
          edgesAsFlow={() => graph1.edgesAsFlow()}
          nodesAsFlow={() => graph1.nodesAsFlow()} 
          removeEdge={(source, target) => graph1.removeEdge(source, target)}
          removeNode={(id) => graph1.removeNode(id)}
        />
      </div>
      <div style={{ height: '100%', width: '50%' }}>
        <Graph
          addEdge={(source, target, label) => graph2.addEdge(source, target, label)}
          addNode={(id, label, position) => graph2.addNode(id, label, position)}
          changeEdgeSelection={(id, selected) => graph2.changeEdgeSelection(id, selected)}
          changeNodeDimension={(id, dim) => graph2.changeNodeDimension(id, dim)}
          changeNodePosition={(id, position) => graph2.changeNodePosition(id, position)}
          changeNodeSelection={(id, selected) => graph2.changeNodeSelection(id, selected)}
          edgesAsFlow={() => graph2.edgesAsFlow()}
          nodesAsFlow={() => graph2.nodesAsFlow()} 
          removeEdge={(source, target) => graph2.removeEdge(source, target)}
          removeNode={(id) => graph2.removeNode(id)}
          />
      </div>
    </div>
    </>
  );
}

export default App;


