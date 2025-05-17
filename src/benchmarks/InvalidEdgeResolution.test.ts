import * as Y from 'yjs';
import { DirectedAcyclicGraph } from '../graphs/DirectedAcyclicGraph';
import { Cause, ConflictResolutionVariant, CRDanglingEdgeHeaders, EssentialHeaders, GraphVariant, makeBenchmarkCsvWriter } from './Benchmark';
import { AdjacencyList } from '../graphs/AdjacencyList';
import { AdjacencyMap } from '../graphs/AdjacencyMap';
import { AdjacencySet } from '../graphs/AdjacencySet';
import { AdjacencyMapWithFasterNodeDeletion } from '../graphs/AdjacencyMapWithFasterNodeDeletion';
import { CsvWriter } from 'csv-writer/src/lib/csv-writer';
import { Graph } from '../graphs/Graph';
import { InitialGraph, makeLineWithRaysFRCUG, makeLineWithRaysFRWCG, makeLineWithRaysGraph } from './InitialGraphs';
import { FixedRootWeaklyConnectedGraph } from '../graphs/FixedRootWeaklyConnectedGraph';
import { FixedRootConnectedUndirectedGraph } from '../graphs/FixedRootConnectedUndirectedGraph';


describe('benchmarks', () => {
    
    async function benchmarkOneEdgePerRay(graph1: Graph, graph2: Graph, sync: () => number[], variant: GraphVariant, count: number, writer: CsvWriter<EssentialHeaders & CRDanglingEdgeHeaders>) {
        makeLineWithRaysGraph(graph1, count)
        sync()

        for (let i = 0; i < count; i++) {
            graph1.removeNode(`${i + 1}_ray`)
            graph2.addEdge(`${i}`, `${i + 1}_ray`, 'label')
        }

        const times = sync()

        for (const time of times)
            await writer.writeRecords([{
                cause: Cause.OpConflictResolution,
                clientCount: 2,
                graphVariant: variant,
                initialGraph: InitialGraph.LineWithRays,
                danglingEdgeResolutionTime: time,
                crdanglingEdgeCount: count,
                crvariant: ConflictResolutionVariant.OneEdgePerRay
            }])
    }

    async function benchmarkOneEdgePerRayFRWCG(graph1: FixedRootWeaklyConnectedGraph, graph2: FixedRootWeaklyConnectedGraph, sync: () => number[], variant: GraphVariant, count: number, writer: CsvWriter<EssentialHeaders & CRDanglingEdgeHeaders>) {
        makeLineWithRaysFRWCG(graph1, count)
        sync()

        for (let i = 0; i < count; i++) {
            graph1.removeEdge(`${i + 1}`, `${i + 1}_ray`)
            graph2.addEdge(`${i}`, `${i + 1}_ray`, 'label')
        }

        const times = sync()

        for (const time of times)
            await writer.writeRecords([{
                cause: Cause.OpConflictResolution,
                clientCount: 2,
                graphVariant: variant,
                initialGraph: InitialGraph.LineWithRays,
                danglingEdgeResolutionTime: time,
                crdanglingEdgeCount: count,
                crvariant: ConflictResolutionVariant.OneEdgePerRay
            }])
    }

    async function benchmarkOneEdgePerRayFRCUG(graph1: FixedRootConnectedUndirectedGraph, graph2: FixedRootConnectedUndirectedGraph, sync: () => number[], variant: GraphVariant, count: number, writer: CsvWriter<EssentialHeaders & CRDanglingEdgeHeaders>) {
        makeLineWithRaysFRCUG(graph1, count)
        sync()

        for (let i = 0; i < count; i++) {
            graph1.removeEdge(`${i + 1}`, `${i + 1}_ray`)
            graph2.addEdge(`${i}`, `${i + 1}_ray`, 'label')
        }

        const times = sync()

        for (const time of times)
            await writer.writeRecords([{
                cause: Cause.OpConflictResolution,
                clientCount: 2,
                graphVariant: variant,
                initialGraph: InitialGraph.LineWithRays,
                danglingEdgeResolutionTime: time,
                crdanglingEdgeCount: count,
                crvariant: ConflictResolutionVariant.OneEdgePerRay
            }])
    }


    // takes about 11 minutes
    test('one dangling edge per ray, delete all rays', async () => {
        const writer = makeBenchmarkCsvWriter<EssentialHeaders & CRDanglingEdgeHeaders>('cr_oneEdgePerRay.csv')
        const graphSizes = [10, 20, 50, 100, 200, 400, 600, 800, 1000]
        const iterations = 50

        // a line with ray graph is created for each graph variant
        // each variant has two clients
        // for each variant, for each ray an edge is created from {i} to {i+1}_ray on client 1
        // on client 2, {i+1}_ray is deleted
        // this produces one dangling edge per deleted node
        // then the conflict resolution can be measured
        // this is repeated for multiple graph sizes
        for (let iter = 1; iter <= iterations; iter++) {
            for (const size of graphSizes) {
                const dag1 = new DirectedAcyclicGraph(new Y.Doc())
                const dag2 = new DirectedAcyclicGraph(new Y.Doc())
        
                const adjl1 = new AdjacencyList(new Y.Doc())
                const adjl2 = new AdjacencyList(new Y.Doc())
        
                const adjm1 = new AdjacencyMap(new Y.Doc())
                const adjm2 = new AdjacencyMap(new Y.Doc())
        
                const adjs1 = new AdjacencySet(new Y.Doc())
                const adjs2 = new AdjacencySet(new Y.Doc())
        
                const adjmf1 = new AdjacencyMapWithFasterNodeDeletion(new Y.Doc())
                const adjmf2 = new AdjacencyMapWithFasterNodeDeletion(new Y.Doc())    
        
                const graphs: [GraphVariant, Graph, Graph, () => number[]][] = [
                    [GraphVariant.DAG, dag1, dag2, 
                        () => DirectedAcyclicGraph.syncDefault([dag1, dag2]).map(x => x.resolveInvalidEdgesTime)
                    ], [GraphVariant.AdjList, adjl1, adjl2,
                        () => AdjacencyList.syncDefault([adjl1, adjl2]).map(x => x.time)
                    ], [GraphVariant.AdjMap, adjm1, adjm2,
                        () => AdjacencyMap.syncDefault([adjm1, adjm2]).map(x => x.time)
                    ], [GraphVariant.AdjSet, adjs1, adjs2,
                        () => AdjacencySet.syncDefault([adjs1, adjs2]).map(x => x.time)
                    ], [GraphVariant.AdjMapFasterDelete, adjmf1, adjmf2,
                        () => AdjacencyMapWithFasterNodeDeletion.syncDefault([adjmf1, adjmf2]).map(x => x.time)
                    ]
                ]
        
                for (const [variant, graph1, graph2, sync] of graphs) {
                    await benchmarkOneEdgePerRay(graph1, graph2, sync, variant, size, writer)
                }
            }

            for (const size of graphSizes) {    
                const frwc1 = new FixedRootWeaklyConnectedGraph(new Y.Doc())
                const frwc2 = new FixedRootWeaklyConnectedGraph(new Y.Doc())
                await benchmarkOneEdgePerRayFRWCG(
                    frwc1,
                    frwc2,
                    () => FixedRootWeaklyConnectedGraph.syncDefault([frwc1, frwc2]).map(x => x.resolveInvalidEdgesTime),
                    GraphVariant.FRWCG,
                    size,
                    writer
                )
            }

            for (const size of graphSizes) {    
                const frwc1 = new FixedRootConnectedUndirectedGraph(new Y.Doc())
                const frwc2 = new FixedRootConnectedUndirectedGraph(new Y.Doc())
                await benchmarkOneEdgePerRayFRCUG(
                    frwc1,
                    frwc2,
                    () => FixedRootConnectedUndirectedGraph.syncDefault([frwc1, frwc2]).map(x => x.resolveInvalidEdgesTime),
                    GraphVariant.FRCUG,
                    size,
                    writer
                )
            }
        }
    }, 5000000)
});