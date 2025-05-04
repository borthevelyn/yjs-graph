import * as Y from 'yjs';
import { DirectedAcyclicGraph } from '../graphs/DirectedAcyclicGraph';
import { test, fc } from '@fast-check/jest';
import { BasicOpHeader as BasicOpHeaders, Cause, EssentialHeaders, GraphVariant, makeBenchmarkCsvWriter } from './Benchmark';
import seedrandom from 'seedrandom';
import { AdjacencyList } from '../graphs/AdjacencyList';
import { AdjacencyMap } from '../graphs/AdjacencyMap';
import { AdjacencySet } from '../graphs/AdjacencySet';
import { AdjacencyListAutomerge } from '../graphs/AdjacencyListAutomerge';
import * as automerge from "@automerge/automerge";
import { AdjacencyMapAutomerge } from '../graphs/AdjacencyMapAutomerge';
import { AdjacencyMapWithFasterNodeDeletionAutomerge } from '../graphs/AdjacencyMapWithFasterNodeDeletionAutomerge';
import { AdjacencyMapWithFasterNodeDeletion } from '../graphs/AdjacencyMapWithFasterNodeDeletion';
import { CsvWriter } from 'csv-writer/src/lib/csv-writer';
import { Graph } from '../graphs/Graph';
import { FixedRootWeaklyConnectedGraph } from '../graphs/FixedRootWeaklyConnectedGraph';
import { assert } from 'console';
import { InitialGraph, makeCompleteGraph, makeLineGraphFRWCG, makeLineGraph, makeAcyclicCompleteGraph } from './InitialGraphs';

describe('properties', () => {
    fc.configureGlobal({ baseSize: 'medium' });

    // fixed root weakly connected is not integrated, because it only has addNodeWithEdge
    async function benchmarkIncreasingOperationsEmpty(seed: string, count: number, writer: CsvWriter<EssentialHeaders & BasicOpHeaders>) {
        const dag = new DirectedAcyclicGraph(new Y.Doc())
        const adjList = new AdjacencyList(new Y.Doc())
        const adjMap = new AdjacencyMap(new Y.Doc())
        const adjMapwfnd = new AdjacencyMapWithFasterNodeDeletion(new Y.Doc())
        const adjSet = new AdjacencySet(new Y.Doc())

        const adlAuto = new AdjacencyListAutomerge(automerge.init())
        const admAuto = new AdjacencyMapAutomerge(automerge.init())
        const admwfndAuto = new AdjacencyMapWithFasterNodeDeletionAutomerge(automerge.init())

        const graphs: [GraphVariant, Graph][] = [
            [GraphVariant.DAG, dag], 
            [GraphVariant.AdjList, adjList], 
            [GraphVariant.AdjMap, adjMap], 
            [GraphVariant.AdjMapFasterDelete, adjMapwfnd], 
            [GraphVariant.AdjSet, adjSet], 
            // [GraphVariant.AdjListAuto,adlAuto],
            // [GraphVariant.AdjMapAuto, admAuto],
            // [GraphVariant.AdjMapFasterDeleteAuto, admwfndAuto]
        ]
        
        const rnd = seedrandom(seed)
        let currentHighestNode = 0
        for (let i = 0; i < count; i++) {
            if (rnd() > 0.5) {
                // add node
                const id = (currentHighestNode + 1).toString()
                let allSuccess = true
                for (const [variant, graph] of graphs) {
                    const prevNodeCount = graph.nodeCount
                    const start = performance.now()
                    graph.addNode(id, 'label', { x: 0, y: 0 })
                    const time = performance.now() - start
                    allSuccess = allSuccess && graph.nodeCount > prevNodeCount
                    await writer.writeRecords([{
                        cause: Cause.OpAddNode,
                        clientCount: 1,
                        edgeCount: graph.edgeCount,
                        executionMillis: time,
                        fullRun: graph.nodeCount > prevNodeCount,
                        graphVariant: variant,
                        nodeCount: prevNodeCount,
                        initialGraph: InitialGraph.Empty
                    }])
                }
                if (allSuccess)
                    currentHighestNode++

            }
            else {
                // add edge
                const source = Math.floor(currentHighestNode * rnd()).toString()
                const target = Math.floor(currentHighestNode * rnd()).toString()
                for (const [variant, graph] of graphs) {
                    const prevEdgeCount = graph.edgeCount
                    const start = performance.now()
                    graph.addEdge(source, target, 'label')
                    const time = performance.now() - start
                    await writer.writeRecords([{
                        cause: Cause.OpAddEdge,
                        clientCount: 1,
                        edgeCount: prevEdgeCount,
                        executionMillis: time,
                        fullRun: graph.edgeCount > prevEdgeCount,
                        graphVariant: variant,
                        nodeCount: graph.nodeCount,
                        initialGraph: InitialGraph.Empty
                    }])
                }
            }
        }

    }

    async function benchmarkIncreasingOperationsEmptyFRWCG(seed: string, count: number, writer: CsvWriter<EssentialHeaders & BasicOpHeaders>) {
        const graph = new FixedRootWeaklyConnectedGraph(new Y.Doc())
        const rnd = seedrandom(seed)
        graph.addNodeWithEdge('0', '<-', 'root', 'label', { x: 0, y: 0 }, 'label');
        let currentHighestNode = 0
        for (let i = 0; i < count; i++) {
            // add node with edge
            const target = (currentHighestNode + 1).toString()
            const source = Math.floor(currentHighestNode * rnd()).toString()
            const prevEdgeCount = graph.edgeCount
            const prevNodeCount = graph.nodeCount
            const start = performance.now()
            graph.addNodeWithEdge(target, '<-', source, 'label', { x: 0, y: 0 }, 'label');
            const time = performance.now() - start
            const success = graph.nodeCount > prevNodeCount && graph.edgeCount > prevEdgeCount
            await writer.writeRecords([{
                cause: Cause.OpAddNodeWithEdge,
                clientCount: 1,
                edgeCount: prevEdgeCount,
                executionMillis: time,
                fullRun: success,
                graphVariant: GraphVariant.FRWCG,
                nodeCount: prevNodeCount,
                initialGraph: InitialGraph.Empty
            }])
            
            if (success)
                currentHighestNode++
            
        }

    }

    // DAG is not integrated, because it cannot be initialized as a complete graph
    // Fixed Root Weakly Connected is not considered, because it does not have a remove node function
    async function benchmarkDecreasingOperationsComplete(seed: string, count: number, writer: CsvWriter<EssentialHeaders & BasicOpHeaders>) {
        const adjList = new AdjacencyList(new Y.Doc())
        makeCompleteGraph(adjList, count)
        const adjMap = new AdjacencyMap(new Y.Doc())
        makeCompleteGraph(adjMap, count)
        const adjMapwfnd = new AdjacencyMapWithFasterNodeDeletion(new Y.Doc())
        makeCompleteGraph(adjMapwfnd, count)
        const adjSet = new AdjacencySet(new Y.Doc())
        makeCompleteGraph(adjSet, count)

        const adlAuto = new AdjacencyListAutomerge(automerge.init())
        const admAuto = new AdjacencyMapAutomerge(automerge.init())
        const admwfndAuto = new AdjacencyMapWithFasterNodeDeletionAutomerge(automerge.init())

        const graphs: [GraphVariant, Graph][] = [
            [GraphVariant.AdjList, adjList], 
            [GraphVariant.AdjMap, adjMap], 
            [GraphVariant.AdjMapFasterDelete, adjMapwfnd], 
            [GraphVariant.AdjSet, adjSet],
            // [GraphVariant.AdjListAuto,adlAuto],
            // [GraphVariant.AdjMapAuto, admAuto],
            // [GraphVariant.AdjMapFasterDeleteAuto, admwfndAuto]
        ]
        
        const rnd = seedrandom(seed)
        let nodeCount = count
        for (let i = count; i >= 0; i--) {
            if (rnd() > 0.5) {
                // remove node
                const id = nodeCount.toString()
                for (const [variant, graph] of graphs) {
                    const prevNodeCount = graph.nodeCount
                    const start = performance.now()
                    graph.removeNode(id)
                    const time = performance.now() - start
                    await writer.writeRecords([{
                        cause: Cause.OpRemoveNode,
                        clientCount: 1,
                        edgeCount: graph.edgeCount,
                        executionMillis: time,
                        fullRun: graph.nodeCount < prevNodeCount,
                        graphVariant: variant,
                        nodeCount: prevNodeCount,
                        initialGraph: InitialGraph.Complete
                    }])
                }
                nodeCount--
            }
            else {
                // remove edge
                const source = nodeCount.toString()
                const target = (nodeCount * rnd()).toString()
                for (const [variant, graph] of graphs) {
                    const prevEdgeCount = graph.edgeCount
                    const start = performance.now()
                    graph.removeEdge(source, target)
                    const time = performance.now() - start
                    await writer.writeRecords([{
                        cause: Cause.OpRemoveEdge,
                        clientCount: 1,
                        edgeCount: prevEdgeCount,
                        executionMillis: time,
                        fullRun: graph.edgeCount < prevEdgeCount,
                        graphVariant: variant,
                        nodeCount: graph.nodeCount,
                        initialGraph: InitialGraph.Complete
                    }])
                }
            }
        }
    }
    async function benchmarkDecreasingOperationsLineFRWCG(seed: string, count: number, writer: CsvWriter<EssentialHeaders & BasicOpHeaders>) {
   
        let nodeCount = count

        const graph = new FixedRootWeaklyConnectedGraph(new Y.Doc())
        makeLineGraphFRWCG(graph, count)
        for (let i = count; i >= 0; i--) {
            // remove node by removing two edges
            const id = nodeCount.toString()

            const prevId = (nodeCount - 1).toString()
            const prevEdgeCount = graph.edgeCount
            const prevNodeCount = graph.nodeCount
            const start = performance.now()
            graph.removeEdge(prevId, id)
            const time = performance.now() - start
            await writer.writeRecords([{
                cause: Cause.OpRemoveEdge,
                clientCount: 1,
                edgeCount: prevEdgeCount,
                executionMillis: time,
                fullRun: graph.edgeCount < prevEdgeCount,
                graphVariant: GraphVariant.FRWCG,
                nodeCount: graph.nodeCount,
                initialGraph: InitialGraph.LineWithRoot
            }])
            assert(prevNodeCount === graph.nodeCount, 'This operation should have been executed on a line graph and the node should still have a connection')

            const prevEdgeCount2 = graph.edgeCount
            const prevNodeCount2 = graph.nodeCount
            const start2 = performance.now()
            graph.removeEdge('root', id)
            const time2 = performance.now() - start2
            await writer.writeRecords([{
                cause: Cause.OpRemoveNode,
                clientCount: 1,
                edgeCount: prevEdgeCount2,
                executionMillis: time2,
                fullRun: graph.nodeCount < prevNodeCount2 && graph.edgeCount < prevEdgeCount2,
                graphVariant: GraphVariant.FRWCG,
                nodeCount: prevNodeCount2,
                initialGraph: InitialGraph.LineWithRoot
            }])
            assert(prevNodeCount === graph.nodeCount + 1, 'This operation should have been executed on a line graph and the node should have been deleted')

            nodeCount--
        }
    }
    async function benchmarkDecreasingOperationsLineDAG(seed: string, count: number, writer: CsvWriter<EssentialHeaders & BasicOpHeaders>) {
   
        let nodeCount = count
        const rnd = seedrandom(seed)

        const graph = new DirectedAcyclicGraph(new Y.Doc())
        makeLineGraph(graph, count)
        for (let i = count; i >= 0; i--) {
            // remove node by removing two edges
            const id = nodeCount.toString()

            {
                const prevId = (nodeCount - 1).toString()
                const prevEdgeCount = graph.edgeCount
                const start = performance.now()
                graph.removeEdge(prevId, id)
                const time = performance.now() - start
                await writer.writeRecords([{
                    cause: Cause.OpRemoveEdge,
                    clientCount: 1,
                    edgeCount: prevEdgeCount,
                    executionMillis: time,
                    fullRun: graph.edgeCount < prevEdgeCount,
                    graphVariant: GraphVariant.DAG,
                    nodeCount: graph.nodeCount,
                    initialGraph: InitialGraph.LineWithRoot
                }])
            }

            if (rnd() > 0.5)
            {
                const prevEdgeCount = graph.edgeCount
                const prevNodeCount = graph.nodeCount
                const start = performance.now()
                graph.removeEdge('root', id)
                const time = performance.now() - start
                await writer.writeRecords([{
                    cause: Cause.OpRemoveEdge,
                    clientCount: 1,
                    edgeCount: prevEdgeCount,
                    executionMillis: time,
                    fullRun: graph.edgeCount < prevEdgeCount,
                    graphVariant: GraphVariant.DAG,
                    nodeCount: prevNodeCount,
                    initialGraph: InitialGraph.LineWithRoot
                }])
            }

            {
                const prevEdgeCount = graph.edgeCount
                const prevNodeCount = graph.nodeCount
                const start = performance.now()
                graph.removeNode(id)
                const time = performance.now() - start
                await writer.writeRecords([{
                    cause: Cause.OpRemoveNode,
                    clientCount: 1,
                    edgeCount: prevEdgeCount,
                    executionMillis: time,
                    fullRun: graph.nodeCount < prevNodeCount,
                    graphVariant: GraphVariant.DAG,
                    nodeCount: prevNodeCount,
                    deletedEdgeCount: prevEdgeCount - graph.edgeCount,
                    initialGraph: InitialGraph.LineWithRoot
                }])
            }

            nodeCount--
        }
    }
    async function benchmarkDecreasingOperationsAcyclicCompleteDAG(seed: string, count: number, writer: CsvWriter<EssentialHeaders & BasicOpHeaders>) {
   
        let nodeCount = count

        const graph = new DirectedAcyclicGraph(new Y.Doc())
        makeAcyclicCompleteGraph(graph, count)
        for (let i = count; i >= 0; i--) {
            // remove node by removing two edges
            const id = nodeCount.toString()

            const prevEdgeCount = graph.edgeCount
            const prevNodeCount = graph.nodeCount
            const start = performance.now()
            graph.removeNode(id)
            const time = performance.now() - start
            await writer.writeRecords([{
                cause: Cause.OpRemoveNode,
                clientCount: 1,
                edgeCount: prevEdgeCount,
                executionMillis: time,
                fullRun: graph.nodeCount < prevNodeCount,
                graphVariant: GraphVariant.DAG,
                nodeCount: prevNodeCount,
                deletedEdgeCount: prevEdgeCount - graph.edgeCount,
                initialGraph: InitialGraph.AcyclicComplete
            }])

            nodeCount--
        }
    }

    test('graphsize increasing operations', async () => {
        const writer = makeBenchmarkCsvWriter<EssentialHeaders & BasicOpHeaders>('graphSizeBasicOpsIncr.csv')
        
        await benchmarkIncreasingOperationsEmpty('sdga3w5', 500, writer)
        await benchmarkIncreasingOperationsEmptyFRWCG('sdga3w5', 500, writer)
        
    }, 5000000);
    
    // this takes much much longer than the increasing operations
    test('graphsize decreasing operations', async () => {
        const writer = makeBenchmarkCsvWriter<EssentialHeaders & BasicOpHeaders>('graphSizeBasicOpsDecr.csv')

        await benchmarkDecreasingOperationsComplete('asdgasdg', 500, writer)
        await benchmarkDecreasingOperationsLineFRWCG('asdgasdg', 500, writer)
        await benchmarkDecreasingOperationsLineDAG('asdgasdg', 500, writer)
        await benchmarkDecreasingOperationsAcyclicCompleteDAG('asdgasdg', 200, writer)

    }, 5000000);

});