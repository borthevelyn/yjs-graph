import * as Y from 'yjs';
import { test, fc } from '@fast-check/jest';  
import { AdjacencyList } from '../graphs/AdjacencyList';

describe('properties', () => {
    function syncConcurrently(yDocs: Y.Doc[], yGraphs: AdjacencyList[]) {
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
            graph.removeInvalidEdges();
        }
    }

    function createGraph(graph: AdjacencyList, n: number) {
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
                const yGraphs = yDocs.map((yDoc) => new AdjacencyList(yDoc.getMap('adjacency list')))
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
    test('Adjacency List: graph should not have dangling edges', () => {
        const clientCount = 5;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 10;
        runTest(clientCount, initialGraphSize, maxGraphSize, maxOperationsPerRoundCount);
    });
});