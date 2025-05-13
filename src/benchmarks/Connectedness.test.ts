import * as Y from 'yjs';
import { EssentialHeaders, makeBenchmarkCsvWriter } from './Benchmark';

import { FixedRootWeaklyConnectedGraph } from '../graphs/FixedRootWeaklyConnectedGraph';
import { FixedRootConnectedUndirectedGraph } from '../graphs/FixedRootConnectedUndirectedGraph';
import { id } from '../Types';
import assert from 'assert';

interface TestGraph {
    addNodeWithEdge: FixedRootWeaklyConnectedGraph['addNodeWithEdge']
    removeEdge: FixedRootWeaklyConnectedGraph['removeEdge']
    addEdge: FixedRootWeaklyConnectedGraph['addEdge']
}

function wrapUnidirected(g: FixedRootConnectedUndirectedGraph): TestGraph {
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


describe('benchmarks', () => {
    


    test('simple two path restoration', async () => {
        const writer = makeBenchmarkCsvWriter<EssentialHeaders>('connectedness_simplepath.csv')

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

        const wrap1 = wrapUnidirected(frcug1)
        const wrap2 = wrapUnidirected(frcug2)
        
        generateTwoPaths(wrap1, twoPathsInfo)
        FixedRootConnectedUndirectedGraph.syncDefault([frcug1, frcug2])
        expect(frcug2.nodeCount).toBe(2 * twoPathsInfo.length + 2)
        deleteTwoPathsConcurrently(wrap1, wrap2, twoPathsInfo)
        FixedRootConnectedUndirectedGraph.syncDefault([frcug1, frcug2])
        expect(frcug1.nodeCount).toBe(twoPathsInfo.length + 2)
        expect(frcug2.nodeCount).toBe(twoPathsInfo.length + 2)


    }, 5000000)
});