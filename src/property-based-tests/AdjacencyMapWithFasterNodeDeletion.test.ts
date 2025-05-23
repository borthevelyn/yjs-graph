import * as Y from 'yjs';
import { test, fc } from '@fast-check/jest'; 
import { AdjacencyMapWithFasterNodeDeletion } from '../graphs/AdjacencyMapWithFasterNodeDeletion';

describe('properties', () => {

    function createGraph(graph: AdjacencyMapWithFasterNodeDeletion, n: number) {
        for (let i = 1; i <= n; i++) {
            graph.addNode(i.toString(), i.toString(), { x: 0, y: 0 })
        }
    }

    function runTest(clientCount: number, initialGraphSize: number, maxGraphSize: number, maxOperationsPerRoundCount: number) {
        fc.assert(
            fc.property(
                fc.array(
                    fc.tuple(
                        fc.integer({ min: 0, max: clientCount - 1 }), 
                        fc.oneof(
                            fc.record({
                                op: fc.constant<'addNode'>('addNode'),
                                position: fc.constant({ x: 0, y: 0 })
                            }),
                            {
                                arbitrary: 
                                    fc.record({
                                        op: fc.constant<'removeNode'>('removeNode'),
                                        nodeId: fc.integer({ min: 1, max: maxGraphSize }),
                                    }),
                                weight: 2
                            },
                            {
                                arbitrary: fc.record({
                                    op: fc.constant<'addEdge'>('addEdge'),
                                    from: fc.integer({ min: 1, max: maxGraphSize }),
                                    to: fc.integer({ min: 1, max: maxGraphSize }),
                                }),
                                weight: 2
                            },
                            fc.record({
                                op: fc.constant<'removeEdge'>('removeEdge'),
                                from: fc.integer({ min: 1, max: maxGraphSize }),
                                to: fc.integer({ min: 1, max: maxGraphSize }),
                            }),
                            {
                                arbitrary: 
                                    fc.record({
                                        op: fc.constant<'sync'>('sync'),
                                        clients: fc.uniqueArray(fc.integer({ min: 0, max: clientCount-1 }), { minLength: 2, maxLength: clientCount }),
                                    }),
                                weight: 1
                            }
                        )
                    ),
                    { minLength: 5, maxLength: maxOperationsPerRoundCount }
                ),
                (commands) => {
                const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
                const yGraphs = yDocs.map((yDoc) => new AdjacencyMapWithFasterNodeDeletion(yDoc))
                createGraph(yGraphs[0], initialGraphSize);
                AdjacencyMapWithFasterNodeDeletion.syncDefault(yGraphs);
    
                const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + initialGraphSize + 1)
                for (const [clientIdx, operation] of commands) {
                    if (operation.op === 'addNode') {
                        if (freeNodeIds.length === 0) 
                            continue;
                        const nodeId = freeNodeIds.shift()!.toString();
                        yGraphs[clientIdx].addNode(nodeId, nodeId, operation.position)
                    } else if (operation.op === 'removeNode') {
                        const node = Math.floor(operation.nodeId / maxGraphSize) * yGraphs[clientIdx].nodeCount
                        yGraphs[clientIdx].removeNode(node.toString())
                    } else if (operation.op === 'addEdge') {
                        const source = Math.floor(operation.from / maxGraphSize) * yGraphs[clientIdx].nodeCount
                        const target = Math.floor(operation.to / maxGraphSize) * yGraphs[clientIdx].nodeCount
                        yGraphs[clientIdx].addEdge(source.toString(), target.toString(), `edge${source}+${target}`)
                    } else if (operation.op === 'removeEdge') {
                        const source = Math.floor(operation.from / maxGraphSize) * yGraphs[clientIdx].nodeCount
                        const target = Math.floor(operation.to / maxGraphSize) * yGraphs[clientIdx].nodeCount
                        yGraphs[clientIdx].removeEdge(source.toString(), target.toString())
                    } else if (operation.op === 'sync') {
                        let docs = yDocs.filter((_, index) => operation.clients.includes(index))
                        let graphs = yGraphs.filter((_, index) => operation.clients.includes(index))
                        AdjacencyMapWithFasterNodeDeletion.syncDefault(graphs);
                    }
                }
                
                AdjacencyMapWithFasterNodeDeletion.syncDefault(yGraphs);
                for (let i = 0; i < yGraphs.length; i++) {
                    expect(yGraphs[i].hasNoDanglingEdges()).toBe(true);
                    expect(yGraphs[i].nodeCount).toEqual(yGraphs[0].nodeCount);
                    expect(yGraphs[i].edgeCount).toEqual(yGraphs[0].edgeCount);
                    expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
                    expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
                    expect(new Set(yGraphs[i].nodesAsFlow())).toEqual(new Set(yGraphs[0].nodesAsFlow()));
                    expect(new Set(yGraphs[i].edgesAsFlow())).toEqual(new Set(yGraphs[0].edgesAsFlow()));
                }
            }),
            { 
                numRuns: 1000,
                verbose: true,
            },
            );
    
    }
    test('graph should not have dangling edges', () => {
        const clientCount = 5;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 10;
        runTest(clientCount, initialGraphSize, maxGraphSize, maxOperationsPerRoundCount);
    });

    // This test takes 6 minutes and 14 seconds to run
    test('general test with many clients', () => {
        const clientCount = 10;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 10;
        for (let i = 0; i < 5; i++) {
            runTest(clientCount + i*10, initialGraphSize, maxGraphSize, maxOperationsPerRoundCount);
        }
    });

    // Initial graph size: 5, 10, 15, 20, 25, ..., 50
    // Max graph size: 10, 20, 30, 40, 50, ..., 100
    // Max operations per round count: 10, 20, 30, 40, 50, ..., 100
    // This test takes 21 minutes
    test('general test with different graph sizes', () => {
        const clientCount = 5;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 10;
        for (let i = 0; i < 10; i++) {
            runTest(clientCount, initialGraphSize + 5 * i, maxGraphSize + 10 * i, maxOperationsPerRoundCount + 10 * i);
        }
    });

});