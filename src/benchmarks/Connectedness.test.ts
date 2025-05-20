import * as Y from 'yjs';
import { Cause, ConflictResolutionVariant, CRConnectednessHeaders, EssentialHeaders, GraphVariant, makeBenchmarkCsvWriter } from './Benchmark';
import { FixedRootWeaklyConnectedGraph } from '../graphs/FixedRootWeaklyConnectedGraph';
import { FixedRootConnectedUndirectedGraph } from '../graphs/FixedRootConnectedUndirectedGraph';
import { id } from '../Types';
import assert from 'assert';
import seedrandom from 'seedrandom';
import { InitialGraph } from './InitialGraphs';
import { BenchmarkData } from '../graphs/ConnectedHelper';

interface TestGraph {
    addNodeWithEdge: FixedRootWeaklyConnectedGraph['addNodeWithEdge']
    removeEdge: FixedRootWeaklyConnectedGraph['removeEdge']
    addEdge: FixedRootWeaklyConnectedGraph['addEdge']
}

function wrapUndirected(g: FixedRootConnectedUndirectedGraph): TestGraph & { getSource: () => FixedRootConnectedUndirectedGraph} {
    return {
        addEdge(source, target, label) {
            return g.addEdge(source, target, label)
        },
        addNodeWithEdge(nodeId, edgeDirection, otherNodeId, nodeLabel, nodePosition, edgeLabel) {
            return g.addNodeWithEdge(nodeId, otherNodeId, nodeLabel, nodePosition, edgeLabel)
        },
        removeEdge(source, target, vec) {
            return g.removeEdge(source, target, vec)
        },
        getSource() {
            return g
        },
    }
}

type TwoPathsInfo = {
    startNodeId: id,
    pathNodePrefix: string,
    finalNodeId: id,
    length: number
}

function generateTwoPaths(graph: TestGraph, info: TwoPathsInfo) {
    assert(info.length >= 1)

    graph.addNodeWithEdge(`${info.pathNodePrefix}p1_0`, '<-', info.startNodeId, 'label', { x: 0, y: 0 }, `edge ${info.startNodeId} -> ${info.pathNodePrefix}p1_0`)
    graph.addNodeWithEdge(`${info.pathNodePrefix}p2_0`, '<-', info.startNodeId, 'label', { x: 0, y: 0 }, `edge ${info.startNodeId} -> ${info.pathNodePrefix}p2_0`)

    for (let i = 1; i < info.length; i++) {
        graph.addNodeWithEdge(`${info.pathNodePrefix}p1_${i}`, '<-', `${info.pathNodePrefix}p1_${i - 1}`, 'label', { x: 0, y: 0 }, `edge ${info.pathNodePrefix}p1_${i - 1} -> ${info.pathNodePrefix}p1_${i}`)
        graph.addNodeWithEdge(`${info.pathNodePrefix}p2_${i}`, '<-', `${info.pathNodePrefix}p2_${i - 1}`, 'label', { x: 0, y: 0 }, `edge ${info.pathNodePrefix}p2_${i - 1} -> ${info.pathNodePrefix}p2_${i}`)
    }

    graph.addNodeWithEdge(info.finalNodeId, '<-', `${info.pathNodePrefix}p1_${info.length - 1}`, 'label', { x: 0, y: 0 }, `edge ${info.pathNodePrefix}p1_${info.length - 1} -> ${info.finalNodeId}`)
    graph.addEdge(`${info.pathNodePrefix}p2_${info.length - 1}`, info.finalNodeId, `edge ${info.pathNodePrefix}p2_${info.length - 1} -> ${info.finalNodeId}`)
}

function deleteTwoPathsConcurrently(graph1: TestGraph, graph2: TestGraph, info: TwoPathsInfo) {
    
    graph1.removeEdge(`${info.pathNodePrefix}p1_${info.length - 1}`, info.finalNodeId)
    graph2.removeEdge(`${info.pathNodePrefix}p2_${info.length - 1}`, info.finalNodeId)
    
    for (let i = info.length - 1; i > 0; i--) {
        graph1.removeEdge(`${info.pathNodePrefix}p1_${i - 1}`, `${info.pathNodePrefix}p1_${i}`)
        graph2.removeEdge(`${info.pathNodePrefix}p2_${i - 1}`, `${info.pathNodePrefix}p2_${i}`)
    }

    graph1.removeEdge(info.startNodeId, `${info.pathNodePrefix}p1_0`)
    graph2.removeEdge(info.startNodeId, `${info.pathNodePrefix}p2_0`)
}


/**
 * Each node stores all edges to another node. The boolean of the set indicates whether the node containing the set is the source of the edge.
 */
type NodeMap = Map<id, [id, boolean][]>
function generatePartialConnectedGraph(seed: string, graph: TestGraph, size: number, edgesPerNode: number): NodeMap {
    const nodeMap: NodeMap = new Map()
    graph.addNodeWithEdge('0', '<-', 'root', 'label', { x: 0, y: 0 }, 'label')
    nodeMap.set('root', [['0', true]])
    nodeMap.set('0', [['root', false]])
    for (let i = 1; i < size - 1; i++) {
        graph.addNodeWithEdge(`${i}`, '<-', `${i - 1}`, 'label', { x: 0, y: 0 }, 'label')
        nodeMap.set(`${i}`, [[`${ i - 1}`, false]])
        nodeMap.get(`${i - 1}`)!.push([`${i}`, true])
    }

    const allIds = [...nodeMap.keys()]
    
    const rnd = seedrandom(seed)
    for (const node of allIds) {
        const id = node.toString()

        while (nodeMap.get(id)!.length < edgesPerNode) {
            const unfinishedPartners = allIds
                .filter(x => !nodeMap.get(id)!.some(([otherX,]) => otherX === x))
                .filter(x => x !== id)
                .map<[id, number]>(x => [x, nodeMap.get(x)!.length])
                .filter(([, size]) => size < edgesPerNode)

            if (unfinishedPartners.length === 0) {
                console.warn('no possible partner')
                break
            }

            const minEdgeCount = unfinishedPartners
                .map(([, size]) => size)
                // .min()
                .reduce((state, size) => state < size ? state : size, Number.MAX_VALUE)

            const possiblePartners = unfinishedPartners
                .filter(([, size]) => size === minEdgeCount)
                .map(([x,]) => x)

            const selected = possiblePartners[Math.floor(possiblePartners.length * rnd())]
            graph.addEdge(id, selected, 'label')
            nodeMap.get(id)!.push([selected, true])
            nodeMap.get(selected)!.push([id, false])
        }
    }

    return nodeMap
}


function lerp(p1: number, p2: number, t: number) {
    return t * (p2 - p1) + p1
}

/**
 * Deletes a number of edges from all nodes.
 * @param graph 
 * @param nodeMap The current node map of the graph. It is modified during this function.
 */
function deleteEdgesInPartialGraph(seed: string, graph: TestGraph, nodeMap: NodeMap, deletedEdgesPerNode: [number, number]) {
    const allIds =[...nodeMap.keys()]
    const rnd = seedrandom(seed)
    for (const node of allIds) {
        const edgesToDel = Math.floor(lerp(deletedEdgesPerNode[0], deletedEdgesPerNode[1], rnd()))
        const targetEdgeCount = Math.max(nodeMap.get(node)!.length - edgesToDel, 0)

        const undeletableEdges = new Set<id>()
        while (nodeMap.get(node)!.length > targetEdgeCount) {
            const edges = nodeMap.get(node)!.filter(([partnerId,]) => !undeletableEdges.has(partnerId))

            if (edges.length === 0) {
                console.log(`couldn't delete enough edges`)
                break
            }

            const edgesAsList = [...edges]
            const [selectedId, selectedDirection] = edgesAsList[Math.floor(edgesAsList.length * rnd())]
            const [source, target] = 
                selectedDirection
                ? [node, selectedId]
                : [selectedId, node]

            if (graph.removeEdge(source, target)) {
                nodeMap.set(node, nodeMap.get(node)!.filter(([x,]) => x !== selectedId))
                nodeMap.set(selectedId, nodeMap.get(selectedId)!.filter(([x,]) => x !== node))
            }
            else {
                undeletableEdges.add(selectedId)
            }
        }
    }
}


function addNodesInPartialGraph(seed: string, g4: TestGraph, nodeMap: Map<string, [string, boolean][]>, nodesToAppend: number) {
    const rnd = seedrandom(seed)

    for (let i = 0; i < nodesToAppend; i++) {
        const allIds = [...nodeMap.keys()].filter(x => x !== 'root')
        const selIdx = Math.floor(allIds.length * rnd())
        const selId = allIds[selIdx]
        allIds.splice(selIdx, 1)

        const newId = `path_${i}`
        g4.addNodeWithEdge(newId, '->', selId, 'label', { x: 0, y: 0 }, 'label')
        nodeMap.set(newId, [[selId, true]])
        nodeMap.set(selId, [...nodeMap.get(selId)!, [newId, false]])
    }
}


function generateDonutGraph(size: number, g: TestGraph) {
    g.addNodeWithEdge('0', '<-', 'root', 'label', { x: 0, y: 0 }, 'label')
    for (let i = 1; i < size - 1; i++)
        g.addNodeWithEdge(`${i}`, '<-', `${i - 1}`, 'label', { x: 0, y: 0 }, 'label')
    g.addEdge(`${size - 2}`, 'root', 'label')
}


function deleteFromDonutGraph(g: TestGraph, begin: number, count: number) {
    for (let i = 0; i < count; i++) {
        g.removeEdge(`${begin - 1 + i}`, `${begin + i}`)
    }
}


describe('benchmarks', () => {
    


    test('simple two path restoration', async () => {
        const twoPathsInfo: TwoPathsInfo = {
            finalNodeId: 'finalId',
            length: 50,
            pathNodePrefix: 'pnp',
            startNodeId: 'root'
        }

        const frwcg1 = new FixedRootWeaklyConnectedGraph(new Y.Doc())
        const frwcg2 = new FixedRootWeaklyConnectedGraph(new Y.Doc())

        generateTwoPaths(frwcg1, twoPathsInfo)
        FixedRootWeaklyConnectedGraph.syncDefault([frwcg1, frwcg2])
        expect(frwcg2.nodeCount).toBe(2 * twoPathsInfo.length + 2)
        deleteTwoPathsConcurrently(frwcg1, frwcg2, twoPathsInfo)
        FixedRootWeaklyConnectedGraph.syncDefault([frwcg1, frwcg2])
        expect(frwcg1.nodeCount).toBe(twoPathsInfo.length + 2)
        expect(frwcg2.nodeCount).toBe(twoPathsInfo.length + 2)

        const frcug1 = new FixedRootConnectedUndirectedGraph(new Y.Doc())
        const frcug2 = new FixedRootConnectedUndirectedGraph(new Y.Doc())

        const wrap1 = wrapUndirected(frcug1)
        const wrap2 = wrapUndirected(frcug2)
        
        generateTwoPaths(wrap1, twoPathsInfo)
        FixedRootConnectedUndirectedGraph.syncDefault([frcug1, frcug2])
        expect(frcug2.nodeCount).toBe(2 * twoPathsInfo.length + 2)
        deleteTwoPathsConcurrently(wrap1, wrap2, twoPathsInfo)
        FixedRootConnectedUndirectedGraph.syncDefault([frcug1, frcug2])
        expect(frcug1.nodeCount).toBe(twoPathsInfo.length + 2)
        expect(frcug2.nodeCount).toBe(twoPathsInfo.length + 2)


    }, 5000000)


    type GraphTypeInfo<SyncData, Graph extends TestGraph> = {
        makeNewGraph: () => Graph,
        sync: (graphs: Graph[]) => SyncData
    }

    function fixedRootWeaklyConnected(useVirtualGraph: boolean, useVariant2: boolean = false): 
        GraphTypeInfo<ReturnType<typeof FixedRootWeaklyConnectedGraph.syncDefault>, FixedRootWeaklyConnectedGraph>
    {
        return {
            makeNewGraph: () => new FixedRootWeaklyConnectedGraph(new Y.Doc()),
            sync: graphs => FixedRootWeaklyConnectedGraph.syncDefault(graphs, useVirtualGraph, useVariant2)
        }
    }

    
    function fixedRootConnectedUndirected(useVirtualGraph: boolean, useVariant2: boolean = false): 
        GraphTypeInfo<ReturnType<typeof FixedRootConnectedUndirectedGraph.syncDefault>, ReturnType<typeof wrapUndirected>>
    {
        return {
            makeNewGraph: () => wrapUndirected(new FixedRootConnectedUndirectedGraph(new Y.Doc())),
            sync: graphs => FixedRootConnectedUndirectedGraph.syncDefault(graphs.map(x => x.getSource()), useVirtualGraph, useVariant2)
        }
    }

    function benchmarkPartialGraph<T, Graph extends TestGraph>(
        seed: string,
        nodeCount: number,
        edgesPerNode: number,
        deletedEdgesPerNodeAndClient: [number, number],
        nodesToAppend: number,
        graphTypeInfo: GraphTypeInfo<T, Graph>): T
    {            
        const g1 =  graphTypeInfo.makeNewGraph()
        const nm = generatePartialConnectedGraph(seed, g1, nodeCount, edgesPerNode)

        const g2 = graphTypeInfo.makeNewGraph()
        const g3 = graphTypeInfo.makeNewGraph()
        const g4 = graphTypeInfo.makeNewGraph()

        graphTypeInfo.sync([g1, g2, g3, g4])

        deleteEdgesInPartialGraph(`${seed}asdf`, g1, new Map(nm.entries()), deletedEdgesPerNodeAndClient)
        deleteEdgesInPartialGraph(`${seed}sdsb`, g2, new Map(nm.entries()), deletedEdgesPerNodeAndClient)
        deleteEdgesInPartialGraph(`${seed}cxvn`, g3, new Map(nm.entries()), deletedEdgesPerNodeAndClient)

        addNodesInPartialGraph(`${seed}ascaxc`, g4, new Map(nm.entries()), nodesToAppend)

        
        return graphTypeInfo.sync([g1, g2, g3, g4])
    }

    function benchmarkDonutGraph<T, Graph extends TestGraph>(
        nodeCount: number,
        counts: number[],
        graphTypeInfo: GraphTypeInfo<T, Graph>)
    {
        const graphs = counts.map(() => graphTypeInfo.makeNewGraph())
        generateDonutGraph(nodeCount, graphs[0])
        graphTypeInfo.sync(graphs)

        let nextIndex = 1
        for (const [count, graph] of counts.map<[number, TestGraph]>((c, i) => [c, graphs[i]])) {
            deleteFromDonutGraph(graph, nextIndex, count)
            nextIndex += count + 2
        }

        return graphTypeInfo.sync(graphs)
    }
    test('partial graphs', async () => {
        const writer = makeBenchmarkCsvWriter<EssentialHeaders>('connectedness_partial_graph.csv')
        const nodeCount = 60
        const edgesPerNode = 3
        const deletedEdgesPerNodeAndClient: [number, number] = [3, 3]
        const nodesToAppend = 1

        // yields quite long paths (10 - 15)
        // 80, 2, [2, 2], 1
        const data1 = benchmarkPartialGraph('asfasf',  40, 2, [2, 2], 1, fixedRootWeaklyConnected(false, false))
        const data2 = benchmarkPartialGraph('asfssf', 40, 2, [2, 2], 1, fixedRootConnectedUndirected(false, false))
        // const data3 = benchmarkPartialGraph('asfsdgsf', 20, 5, [4, 6], 1, fixedRootWeaklyConnected(true))
        const data4 = benchmarkPartialGraph('asfasf', 40, 2, [2, 2], 1, fixedRootWeaklyConnected(true))
        writer.writeRecords([
            {
                ...data4,
                cause: Cause.OpConflictResolution,
                clientCount: 4,
                graphVariant: GraphVariant.FRWCG,
                initialGraph: InitialGraph.Partial,
            }

        ])
        
        console.log(data1)
    })

    test('donut graphs', async () => {
        // const data = benchmarkDonutGraph(1600, [2, 4, 8, 16, 32, 64, 128, 256, 512, 513], fixedRootWeaklyConnected(true))
        const data1 = benchmarkDonutGraph(1600, [2, 4, 8, 16, 32, 64, 128, 256, 512, 513], fixedRootWeaklyConnected(true))
        const data2 = benchmarkDonutGraph(1600, [2, 4, 8, 16, 32, 64, 128, 256, 512, 513], fixedRootWeaklyConnected(false, false))
        const data3 = benchmarkDonutGraph(1600, [2, 4, 8, 16, 32, 64, 128, 256, 512, 513], fixedRootWeaklyConnected(false, true))
        const x = 3
    })

    // currently takes 90 seconds
    test('donut graph: time / removedElems', async () => {
        const writer = makeBenchmarkCsvWriter<EssentialHeaders & CRConnectednessHeaders>('connectedness_time_removedElems.csv')
        // tests each graph variant of directed and undirected connected graphs.
        // constant throughout all tests: number of removed graph elements

        async function writeBenchmark(data: BenchmarkData[], clientCount: number, graphVariant: GraphVariant, crvariant: ConflictResolutionVariant) {
            await writer.writeRecords(
                data.map(datum => {
                    return {
                        cause: Cause.OpConflictResolution,
                        clientCount,
                        componentCount: datum.connectedComponents,
                        crvariant: crvariant,
                        executionMillis: datum.restoredPaths.reduce((s, n) => s + n.time, 0) + datum.pathInitalizationTime,
                        graphVariant,
                        initialGraph: InitialGraph.Donut,
                        removedGraphElements: datum.removedGraphElementsCount,
                        pathInitializationTime: datum.pathInitalizationTime,
                        restoredPaths: datum.restoredPaths.length
                    }
                })
            )
        }

        async function benchmark(size: number, counts: number[], graphVariant: GraphVariant, crvariant: ConflictResolutionVariant) {
            if (graphVariant === GraphVariant.FRWCG) {
                await writeBenchmark(benchmarkDonutGraph(size, counts, fixedRootWeaklyConnected(crvariant === ConflictResolutionVariant.Variant3, crvariant === ConflictResolutionVariant.Variant2)), counts.length, graphVariant, crvariant)
            }
            else {
                await writeBenchmark(benchmarkDonutGraph(size, counts, fixedRootConnectedUndirected(crvariant === ConflictResolutionVariant.Variant3, crvariant === ConflictResolutionVariant.Variant2)), counts.length, graphVariant, crvariant)
            }
        }


        const counts = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 30, 40, 50, 51]
        const size =  1000
        const repeat = 3
        for (let i = 0; i < counts.length; i++) {
            let currentCounts = counts.slice(0, i + 1)
            for (let j = 0; j < repeat; j++) {
                // each `benchmark` is repeated counts often times in these functions (because of the sync and counts many clients)
                await benchmark(size, currentCounts, GraphVariant.FRWCG, ConflictResolutionVariant.Variant1)
                await benchmark(size, currentCounts, GraphVariant.FRWCG, ConflictResolutionVariant.Variant3)
                await benchmark(size, currentCounts, GraphVariant.FRCUG, ConflictResolutionVariant.Variant1)
                await benchmark(size, currentCounts, GraphVariant.FRCUG, ConflictResolutionVariant.Variant3)
            }
        }
    }, 5000000)


    // currently takes 3 minutes
    test('partial graph: total / components (single elements)', async () => {
        const writer = makeBenchmarkCsvWriter<EssentialHeaders & CRConnectednessHeaders>('connectedness_total_components.csv')

        // we generate a partial graph and delete many edges
        // the restoration should only use single elements (as that is most often possible)
        // therefore, the variant is not important as no paths should be restored

        const seeds = ['asf', 'asdgzxvc', 'xcvzx', 'asdbvx', 'asfzxv', 'efsg', '2fsdf', 'sdggt' /*, '124', 'ascxb', '1wdgsx'*/ ]
        const sizes = [5, 10, 15, 20, 25, 30, 35, 40, 45]
        const edgesPerNode = 4
        const deletedEdgesPerClient: [number, number] = [1, 4]
        // const nodesToAppend = 15
        
        async function benchmark(seed: string, size: number, directed: boolean) {
            const data = directed
                ? benchmarkPartialGraph(seed, size, edgesPerNode, deletedEdgesPerClient, size / 2, fixedRootWeaklyConnected(true))
                : benchmarkPartialGraph(seed, size, edgesPerNode, deletedEdgesPerClient, size / 2, fixedRootConnectedUndirected(true))

            await writer.writeRecords(data.map(datum => {
                return {
                    cause: Cause.OpConflictResolution,
                    clientCount: 4,
                    componentCount: datum.connectedComponents,
                    crvariant: ConflictResolutionVariant.Variant3,
                    executionMillis: datum.restoreSingleGraphElementsTime,
                    graphVariant: directed ? GraphVariant.FRWCG : GraphVariant.FRCUG,
                    initialGraph: InitialGraph.Partial,
                    pathInitializationTime: datum.pathInitalizationTime,
                    inputSize: size,
                    removedGraphElements: datum.removedGraphElementsCount,
                    restoredPathLength: 0,
                    restoredEdges: datum.restoredEdges,
                    restoredNodesWithEdges: datum.restoredNodesWithEdges
                }
            }))
        }

        for (const seed of seeds) {
            for (const size of sizes) {
                await benchmark(seed, size, true)
                await benchmark(seed, size, false)
            }
        }
    }, 5000000)
});
