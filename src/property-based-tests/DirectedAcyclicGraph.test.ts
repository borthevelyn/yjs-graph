import * as Y from 'yjs';
import { DirectedAcyclicGraph } from '../graphs/DirectedAcyclicGraph';
import { test, fc } from '@fast-check/jest';
import { assert } from 'console';

describe('properties', () => {
    fc.configureGlobal({ baseSize: 'medium' });
    function syncConcurrently(yDocs: Y.Doc[], yGraphs: DirectedAcyclicGraph[]) {
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
            graph.removeCycles()
        }
    }

    function createGraph(graph: DirectedAcyclicGraph, n: number) {
        for (let i = 1; i <= n; i++) {
            graph.addNode(i.toString(), i.toString(), { x: 0, y: 0 })
        }
    }

    function runAcyclicityTest(clientCount: number, initialGraphSize: number, maxGraphSize: number, maxOperationsPerRoundCount: number, iteration: number = 0) {
        assert(initialGraphSize < maxGraphSize);
        fc.assert(
        fc.property(
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
            (iteration, commands) => {
            const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
            const yGraphs = yDocs.map((yDoc) => new DirectedAcyclicGraph(yDoc.getMap('adjacency map'), yDoc.getArray('edges')))
            createGraph(yGraphs[0], initialGraphSize);
            syncConcurrently(yDocs, yGraphs);

            const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + initialGraphSize + 1)
            for (const [clientIdx, operation] of commands) {
                if (operation.op === 'addNode') {
                    if (freeNodeIds.length === 0) 
                        continue;
                    const nodeId = freeNodeIds.shift()!.toString();
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

    test('graph should always be acyclic', () => {
        const clientCount = 5;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 10;
        runAcyclicityTest(clientCount, initialGraphSize, maxGraphSize, maxOperationsPerRoundCount);
    });

    // This test takes 7 minutes to run!
    test('general test with many clients', () => {
        const clientCount = 10;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 10;
        for (let i = 0; i < 5; i++) {
            runAcyclicityTest(clientCount + i*10, initialGraphSize, maxGraphSize, maxOperationsPerRoundCount, i);
        }
    });

    // Initial graph size: 5, 10, 15, 20, 25, ..., 50
    // Max graph size: 10, 20, 30, 40, 50, ..., 100
    // Max operations per round count: 10, 20, 30, 40, 50, ..., 100
    // This test takes 7 minutes to run!
    test('general test with different graph sizes', () => {
        const clientCount = 5;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 10;
        for (let i = 0; i < 10; i++) {
            runAcyclicityTest(clientCount, initialGraphSize + 5 * i, maxGraphSize + 10 * i, maxOperationsPerRoundCount + 10 * i, i);
        }
    });


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