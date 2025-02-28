import * as Y from 'yjs';
import { DirectedAcyclicGraph } from '../graphs/DirectedAcyclicGraph';
import { test, fc } from '@fast-check/jest';
import { assert } from 'console';

describe('properties', () => {
    fc.configureGlobal({ baseSize: 'medium' });
    const createExecutionTimeCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriterExecutionTime = createExecutionTimeCsvWriter({
        path: './dagExecutionTime.csv',
        header: [
            {id: 'graphNodes', title: 'Node count'},
            {id: 'graphEdges', title: 'Edge count'},
            {id: 'executionTime', title: 'Execution time'},
            {id: 'cycles', title: 'Cycles'},
            {id: 'cycleResolutionSteps', title: 'Cycle resolution steps'},
            {id: 'yEdges', title: 'yEdges'},
        ]
    });
    async function syncConcurrently(yDocs: Y.Doc[], yGraphs: DirectedAcyclicGraph[]) {
        if (yDocs.length < 2) return;

        let updatesMap = new Map<number, Array<Uint8Array<ArrayBufferLike>>>()
        for (let i = 0; i < yDocs.length; i++) {
            let updates = new Array<Uint8Array<ArrayBufferLike>>()
            for (let j = 0; j < yDocs.length; j++) {
                if (i !== j) {
                    updates.push(Y.encodeStateAsUpdate(yDocs[j], Y.encodeStateVector(yDocs[i])))
                }
            }
            updatesMap.set(i, updates);
        }
        for (const [idx, updates] of updatesMap.entries()) {
            for (const update of updates) {
                Y.applyUpdate(yDocs[idx], update)
            }
        }
        for (const graph of yGraphs) {
            
            performance.mark('start');
            graph.removeCycles();
            performance.mark('end');

            await csvWriterExecutionTime.writeRecords([{
                graphNodes: graph.nodeCount, 
                graphEdges: graph.edgeCount, 
                executionTime: performance.measure('makeGraphWeaklyConnected', 'start', 'end').duration,
                cycles: graph.benchmarkData.cycles,
                cycleResolutionSteps: graph.benchmarkData.cycleResolutionSteps,
                yEdges: graph.benchmarkData.yEdges
            }]);
        }
    }

    function createGraph(graph: DirectedAcyclicGraph, n: number) {
        for (let i = 1; i <= n; i++) {
            graph.addNode(i.toString(), i.toString(), { x: 0, y: 0 })
        }
    }

    async function runAcyclicityTest(clientCount: number, initialGraphSize: number, maxGraphSize: number, maxOperationsPerRoundCount: number, iteration: number = 0) {
        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        const csvWriter = createCsvWriter({
            path: './file.csv',
            header: [
                {id: 'client', title: 'client'},
                {id: 'op', title: 'op'},
                {id: 'arguments', title: 'arguments'},
            ],
        });
        assert(initialGraphSize < maxGraphSize);
        await fc.assert(
        fc.asyncProperty(
            fc.constant(iteration),
            fc.array(
                fc.tuple(
                    fc.integer({ min: 0, max: clientCount - 1 }), 
                    fc.oneof(
                        fc.record({
                            op: fc.constant<'addNode'>('addNode'),
                            position: fc.constant({ x: 0, y: 0 })
                        }),
                        fc.record({
                            op: fc.constant<'removeNode'>('removeNode'),
                        }),
                        {
                            arbitrary:
                                fc.record({
                                    op: fc.constant<'addEdge'>('addEdge'),
                                }),
                            weight: 6
                        },
                        fc.record({
                            op: fc.constant<'removeEdge'>('removeEdge'),
                        }),
                        fc.record({
                            op: fc.constant<'sync'>('sync'),
                            clients: fc.uniqueArray(fc.integer({ min: 0, max: clientCount-1 }), { minLength: 2, maxLength: clientCount }),
                        }
                        )
                    ),
                    // refer to https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/
                    fc.noBias(fc.integer({ min: 0, max: (1 << 24) - 1 }).map((v) => v / (1 << 24))),
                    fc.noBias(fc.integer({ min: 0, max: (1 << 24) - 1 }).map((v) => v / (1 << 24))),
                ),
                { minLength: 15, maxLength: maxOperationsPerRoundCount }
            ),
            async (iteration, commands) => {
            const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
            const yGraphs = yDocs.map((yDoc) => new DirectedAcyclicGraph(yDoc.getMap('adjacency map'), yDoc.getArray('edges')))
            createGraph(yGraphs[0], initialGraphSize);
            await syncConcurrently(yDocs, yGraphs);

            const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + initialGraphSize + 1)
            for (const [clientIdx, operation, rnd1, rnd2] of commands) {
                const nodesInGraph = yGraphs[clientIdx].nodeIds;
                const sourceNode = nodesInGraph[Math.floor(rnd1 * yGraphs[clientIdx].nodeCount)];
                const targetNode = nodesInGraph[Math.floor(rnd2 * yGraphs[clientIdx].nodeCount)];
                if (operation.op === 'addNode') {
                    if (freeNodeIds.length === 0) 
                        continue;
                    const nodeId = freeNodeIds.shift()!.toString();
                    yGraphs[clientIdx].addNode(nodeId, nodeId, operation.position)
                    await csvWriter.writeRecords([{client: clientIdx.toString(), op: operation.op, arguments: `${nodeId}`}]);
                } else if (operation.op === 'removeNode') {
                    yGraphs[clientIdx].removeNode(sourceNode)
                    await csvWriter.writeRecords([{client: clientIdx.toString(), op: operation.op, arguments: `${sourceNode}`}]);
                } else if (operation.op === 'addEdge') {
                    if (sourceNode === targetNode) 
                        continue;
                    yGraphs[clientIdx].addEdge(sourceNode, targetNode, `edge${sourceNode}+${targetNode}`)
                    await csvWriter.writeRecords([{client: clientIdx.toString(), op: operation.op, arguments: `${sourceNode} -> ${targetNode}`}]);
                } else if (operation.op === 'removeEdge') {
                    if (sourceNode === targetNode) 
                        continue;
                    yGraphs[clientIdx].removeEdge(sourceNode, targetNode)
                    await csvWriter.writeRecords([{client: clientIdx.toString(), op: operation.op, arguments: `${sourceNode} -> ${targetNode}`}]);
                } else if (operation.op === 'sync') {
                    let docs = yDocs.filter((_, index) => operation.clients.includes(index))
                    let graphs = yGraphs.filter((_, index) => operation.clients.includes(index))
                    await syncConcurrently(docs, graphs);
                    await csvWriter.writeRecords([{client: '', op: operation.op, arguments: operation.clients.toString()}]);
                }
            }
            await csvWriter.writeRecords([{client: 'next round', op: '', arguments: ''}]);
            await syncConcurrently(yDocs, yGraphs);
            for (let i = 0; i < yGraphs.length; i++) {
                expect(yGraphs[i].isAcyclic()).toBe(true);
                expect(yGraphs[i].nodeCount).toEqual(yGraphs[0].nodeCount);
                expect(yGraphs[i].edgeCount).toEqual(yGraphs[0].edgeCount);
                expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
                expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
                expect(yGraphs[i].getYEdgesAsJson()).toEqual(yGraphs[0].getYEdgesAsJson());
            }
        }),
        { 
            numRuns: 1000,
            verbose: true,
        },
        );
    }
    
    test('simple test', () => {
        const yDocs = Array.from({ length: 2 }, () => new Y.Doc())
        const yGraphs = yDocs.map((yDoc) => new DirectedAcyclicGraph(yDoc.getMap('adjacency map'), yDoc.getArray('edges')))

        createGraph(yGraphs[0], 2);
        syncConcurrently(yDocs, yGraphs);
        yGraphs[0].addEdge('1', '2', 'edge1+2');
        yGraphs[1].addEdge('2', '1', 'edge2+1');
        syncConcurrently(yDocs, yGraphs);
        expect(yGraphs[0].isAcyclic()).toBe(true);
        expect(yGraphs[1].isAcyclic()).toBe(true);
        expect(yGraphs[0].nodeCount).toEqual(2);
        expect(yGraphs[0].edgeCount).toEqual(1);
        expect(yGraphs[0].nodeCount).toEqual(yGraphs[1].nodeCount);
        expect(yGraphs[0].edgeCount).toEqual(yGraphs[1].edgeCount);
        expect(yGraphs[0].getEdgesAsJson()).toEqual(yGraphs[1].getEdgesAsJson());
        expect(yGraphs[0].getYEdgesAsJson()).toEqual(yGraphs[1].getYEdgesAsJson());
    });

    test('graph should always be acyclic', async () => {
        const clientCount = 5;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 30;
        await runAcyclicityTest(clientCount, initialGraphSize, maxGraphSize, maxOperationsPerRoundCount);
    }, 50000000);

    // This test takes 18 minutes to run!
    test('general test with many clients', async () => {
        const clientCount = 10;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 30;
        for (let i = 0; i < 5; i++) {
            await runAcyclicityTest(clientCount + i*10, initialGraphSize, maxGraphSize, maxOperationsPerRoundCount, i);
        }
    }, 50000000);

    // Initial graph size: 5, 10, 15, 20, 25, ..., 50
    // Max graph size: 10, 20, 30, 40, 50, ..., 100
    // Max operations per round count: 10, 20, 30, 40, 50, ..., 100
    // This test takes 7 minutes to run!
    test('general test with different graph sizes', async () => {
        const clientCount = 5;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 30;
        for (let i = 0; i < 10; i++) {
            await runAcyclicityTest(clientCount, initialGraphSize + 5 * i, maxGraphSize + 10 * i, maxOperationsPerRoundCount + 10 * i, i);
        }
    }, 50000000);


    // Test specific seeds failed in bigger tests
    test('critical test', () => {
        const clientCount = 5;
        const initialGraphSize = 20;
        const maxGraphSize = 40;
        const maxOperationsPerRoundCount = 40;
        assert(initialGraphSize < maxGraphSize);
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
                        fc.record({
                            op: fc.constant<'removeNode'>('removeNode'),
                            nodeId: fc.integer({ min: 1, max: maxGraphSize }),
                        }),
                        {
                            arbitrary:
                                fc.record({
                                    op: fc.constant<'addEdge'>('addEdge'),
                                    from: fc.integer({ min: 1, max: maxGraphSize }),
                                    to: fc.integer({ min: 1, max: maxGraphSize }),
                                }),
                            weight: 6
                        },
                        fc.record({
                            op: fc.constant<'removeEdge'>('removeEdge'),
                            from: fc.integer({ min: 1, max: maxGraphSize }),
                            to: fc.integer({ min: 1, max: maxGraphSize }),
                        }),
                        fc.record({
                            op: fc.constant<'sync'>('sync'),
                            clients: fc.uniqueArray(fc.integer({ min: 0, max: clientCount-1 }), { minLength: 2, maxLength: clientCount }),
                        }
                        )
                    )
                ),
                { minLength: 5, maxLength: maxOperationsPerRoundCount }
            ),
            (commands) => {
            const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
            const yGraphs = yDocs.map((yDoc) => new DirectedAcyclicGraph(yDoc.getMap('adjacency map'), yDoc.getArray('edges')))
            createGraph(yGraphs[0], initialGraphSize);
            syncConcurrently(yDocs, yGraphs);

            const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + initialGraphSize + 1)
            for (const [clientIdx, operation] of commands) {
                if (operation.op === 'addNode') {
                    if (freeNodeIds.length === 0) 
                        continue;
                    const nodeId = freeNodeIds.unshift().toString();
                    yGraphs[clientIdx].addNode(nodeId, nodeId, operation.position)
                } else if (operation.op === 'removeNode') {
                    yGraphs[clientIdx].removeNode(operation.nodeId.toString())
                } else if (operation.op === 'addEdge') {
                    yGraphs[clientIdx].addEdge(operation.from.toString(), operation.to.toString(), `edge${operation.from}+${operation.to}`)
                } else if (operation.op === 'removeEdge') {
                    yGraphs[clientIdx].removeEdge(operation.from.toString(), operation.to.toString())
                } else if (operation.op === 'sync') {
                    let docs = yDocs.filter((_, index) => operation.clients.includes(index))
                    let graphs = yGraphs.filter((_, index) => operation.clients.includes(index))
                    syncConcurrently(docs, graphs);
                }
            }
            syncConcurrently(yDocs, yGraphs);
            for (let i = 0; i < yGraphs.length; i++) {
                expect(yGraphs[i].isAcyclic()).toBe(true);
                expect(yGraphs[i].nodeCount).toEqual(yGraphs[0].nodeCount);
                expect(yGraphs[i].edgeCount).toEqual(yGraphs[0].edgeCount);
                expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
                expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
                expect(yGraphs[i].getYEdgesAsJson()).toEqual(yGraphs[0].getYEdgesAsJson());
            }
        }),
        { 
            numRuns: 1000,
            verbose: true,
            seed: 1240485179, 
            path: "654:3:0:1:15:17:24:23:24:34:35:37:36:36:39:14:34:27:27:27:27:27:27:27:28:32:32:21:19:23:23", 
            endOnFailure: true 

        },
        );
    });  

    test('graph should always be acyclic, add a lot of edges', () => {
        const clientCount = 4;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 10;
        assert(initialGraphSize < maxGraphSize);
        fc.assert(
        fc.property(
            fc.array(
                fc.tuple(
                    fc.integer({ min: 0, max: clientCount - 1 }), 
                    fc.oneof(
                        {
                        arbitrary: 
                            fc.record({
                                op: fc.constant<'addEdge'>('addEdge'),
                                from: fc.integer({ min: 1, max: maxGraphSize }),
                                to: fc.integer({ min: 1, max: maxGraphSize }),
                            }).filter(({ from, to }) => from !== to), 
                        weight: 10
                        },
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
            const yGraphs = yDocs.map((yDoc) => new DirectedAcyclicGraph(yDoc.getMap('adjacency map'), yDoc.getArray('edges')))
            createGraph(yGraphs[0], initialGraphSize);
            syncConcurrently(yDocs, yGraphs);
            console.log('commands', commands)
            for (const [clientIdx, operation] of commands) {
                if (operation.op === 'addEdge') {
                    yGraphs[clientIdx].addEdge(operation.from.toString(), operation.to.toString(), `edge${operation.from}+${operation.to}`)
                } else if (operation.op === 'sync') {
                    let docs = yDocs.filter((_, index) => operation.clients.includes(index))
                    let graphs = yGraphs.filter((_, index) => operation.clients.includes(index))
                    syncConcurrently(docs, graphs);
                }
            }
            console.log('end')
            syncConcurrently(yDocs, yGraphs);
            for (let i = 0; i < yGraphs.length; i++) {
                expect(yGraphs[i].isAcyclic()).toBe(true);
                expect(yGraphs[i].nodeCount).toEqual(yGraphs[0].nodeCount);
                expect(yGraphs[i].edgeCount).toEqual(yGraphs[0].edgeCount);
                expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
                expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
                expect(yGraphs[i].getYEdgesAsJson()).toEqual(yGraphs[0].getYEdgesAsJson());
                expect(new Set(yGraphs[i].nodesAsFlow())).toEqual(new Set(yGraphs[0].nodesAsFlow()));
                expect(new Set(yGraphs[i].edgesAsFlow())).toEqual(new Set(yGraphs[0].edgesAsFlow()));
            }
        }),
        { 
            verbose: 2,
            numRuns: 100,
        },
        );
    });

});