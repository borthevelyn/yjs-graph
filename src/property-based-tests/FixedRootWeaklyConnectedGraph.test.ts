import * as Y from 'yjs';
import { test, fc } from '@fast-check/jest'; 
import { FixedRootWeaklyConnectedGraph } from '../graphs/FixedRootWeaklyConnectedGraph';
import { EdgeDirection } from '../Types';


describe('properties', () => {
    fc.configureGlobal({ baseSize: 'medium' });
    const createExecutionTimeCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriterExecutionTime = createExecutionTimeCsvWriter({
        path: './executionTime.csv',
        header: [
            {id: 'graphNodes', title: 'Node count'},
            {id: 'graphEdges', title: 'Edge count'},
            {id: 'executionTime', title: 'Execution time'},
        ]
    });

    async function syncConcurrently(yDocs: Y.Doc[], yGraphs: FixedRootWeaklyConnectedGraph[]) {
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
            graph.makeGraphWeaklyConnected()
            performance.mark('end');

            await csvWriterExecutionTime.writeRecords([{
                graphNodes: graph.nodeCount, 
                graphEdges: graph.edgeCount, 
                executionTime: performance.measure('makeGraphWeaklyConnected', 'start', 'end').duration
            }]);
        }
    }

    function createGraph(graph: FixedRootWeaklyConnectedGraph, n: number) {
        graph.addNodeWithEdge('0', '->', 'root', `$node0`, { x: 0, y: 0 }, `$edge0+root`);
        for (let i = 1; i <= (n - 2); i++) {
            for (let j = 0; j < i; j++) {
                if (j === 0) 
                    graph.addNodeWithEdge(`${i}`, '->', `${j}`, `$node${i}`, { x: 0, y: 0 }, `$edge${i}+${j}`);
                else
                    graph.addEdge(`${i}`, `${j}`, `$edge${i}+${j}`);
            }
        }
    }
    test('Graph should be weakly connected', async () => {
        const clientCount = 3;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 15;
        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        const csvWriter = createCsvWriter({
            path: './file.csv',
            header: [
                {id: 'client', title: 'client'},
                {id: 'op', title: 'op'},
                {id: 'arguments', title: 'arguments'},
            ]
        });
        
        await fc.assert(
        fc.asyncProperty(
            fc.array(
                fc.tuple(
                    fc.integer({ min: 0, max: clientCount - 1 }), 
                    fc.oneof(
                        {
                            arbitrary:
                                fc.record({
                                    op: fc.constant<'addNodeWithEdge'>('addNodeWithEdge'),
                                    edgeDirection: fc.constantFrom<EdgeDirection>('->', '<-'),
                                    position: fc.constant({ x: 0, y: 0 })
                                }),
                            weight: 2
                        },
                        {
                            arbitrary: fc.record({
                                op: fc.constant<'addEdge'>('addEdge'),
                            }),
                            weight: 1
                        },
                        {
                            arbitrary: fc.record({
                                op: fc.constant<'removeEdge'>('removeEdge'),
                            }),
                            weight: 4
                        },
                        {
                            arbitrary: 
                                fc.record({
                                    op: fc.constant<'sync'>('sync'),
                                    clients: fc.uniqueArray(fc.integer({ min: 0, max: clientCount-1 }), { minLength: 2, maxLength: clientCount }),
                                }),
                            weight: 2
                        }
                    ),
                    fc.float({ min: 0, max: 1, maxExcluded: true }),
                    fc.float({ min: 0, max: 1, maxExcluded: true }),
                ),
                { minLength: 8, maxLength: maxOperationsPerRoundCount }
            ),
            async (commands) => {
            const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
            const yGraphs = yDocs.map((yDoc, i) => new FixedRootWeaklyConnectedGraph(yDoc.getMap('adjacency map'), yDoc.getArray('graphElements'), i === 0))
            createGraph(yGraphs[0], initialGraphSize);
            expect(yGraphs[0].nodeCount).toBe(initialGraphSize);
            await syncConcurrently(yDocs, yGraphs);

            const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + (initialGraphSize - 2) + 1)
            console.log(freeNodeIds)
            console.log(yGraphs[0].getNodes())
            for (const [clientIdx, operation, rnd1, rnd2] of commands) {
                const nodesInGraph = yGraphs[clientIdx].getNodes();
                const sourceNode = nodesInGraph[Math.floor(rnd1 * yGraphs[clientIdx].nodeCount)];
                const targetNode = nodesInGraph[Math.floor(rnd2 * yGraphs[clientIdx].nodeCount)];
                
                if (operation.op === 'addNodeWithEdge') {
                    if (freeNodeIds.length === 0) 
                        continue;
                    const nodeId = freeNodeIds.shift()!.toString();
                    yGraphs[clientIdx].addNodeWithEdge(nodeId, operation.edgeDirection, targetNode, nodeId, operation.position, `edge${nodeId} ${operation.edgeDirection} ${targetNode}`);
                    await csvWriter.writeRecords([{client: clientIdx.toString(), op: operation.op, arguments: `${nodeId} ${operation.edgeDirection} ${targetNode}`}]);

                } else if (operation.op === 'addEdge') {
                    yGraphs[clientIdx].addEdge(sourceNode, targetNode, `edge${sourceNode}+${targetNode}`);
                    await csvWriter.writeRecords([{client: clientIdx.toString(), op: operation.op, arguments: `${sourceNode} -> ${targetNode}`}]);
                } else if (operation.op === 'removeEdge') {
                    yGraphs[clientIdx].removeEdge(sourceNode, targetNode);
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
                expect(yGraphs[i].isWeaklyConnected()).toBe(true);
                expect(yGraphs[i].nodeCount).toEqual(yGraphs[0].nodeCount);
                expect(yGraphs[i].edgeCount).toEqual(yGraphs[0].edgeCount);
                expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
                expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
                expect(yGraphs[i].getYRemovedGraphElementsAsJson()).toEqual(yGraphs[0].getYRemovedGraphElementsAsJson());
            }
        }),
        { 
            numRuns: 1000,
            verbose: true,
        },
        );
    }, 50000000);

    test('Graph should be weakly connected, second variant', async () => {
        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        const csvWriter = createCsvWriter({
            path: './file.csv',
            header: [
                {id: 'client', title: 'client'},
                {id: 'op', title: 'op'},
                {id: 'arguments', title: 'arguments'},
            ]
        });
        const clientCount = 3;
        const initialGraphSize = 2;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 15;
        await fc.assert(
        fc.asyncProperty(
            fc.array(
                fc.tuple(
                    fc.integer({ min: 0, max: clientCount - 1 }), 
                    fc.oneof(
                        {
                            arbitrary:
                                fc.record({
                                    op: fc.constant<'addNodeWithEdge'>('addNodeWithEdge'),
                                    edgeDirection: fc.constantFrom<EdgeDirection>('->', '<-'),
                                    position: fc.constant({ x: 0, y: 0 })
                                }),
                            weight: 4
                        },
                        {
                            arbitrary: 
                                fc.record({
                                    op: fc.constant<'addEdge'>('addEdge'),
                                }),
                            weight: 1

                        },
                        {
                            arbitrary: 
                                fc.record({
                                    op: fc.constant<'removeEdge'>('removeEdge'),
                                }),
                            weight: 5
                        },
                        {
                            arbitrary: 
                                fc.record({
                                    op: fc.constant<'sync'>('sync'),
                                    clients: fc.uniqueArray(fc.integer({ min: 0, max: clientCount-1 }), { minLength: 2, maxLength: clientCount }),
                                }),
                            weight: 4
                        }
                    )
                ),
                { minLength: 10, maxLength: maxOperationsPerRoundCount }
            ),
            async (commands) => {
            const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
            const yGraphs = yDocs.map((yDoc, i) => new FixedRootWeaklyConnectedGraph(yDoc.getMap('adjacency map'), yDoc.getArray('graphElements'), i === 0))
            createGraph(yGraphs[0], initialGraphSize);
            expect(yGraphs[0].nodeCount).toBe(initialGraphSize);
            await syncConcurrently(yDocs, yGraphs);

            const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + (initialGraphSize - 2) + 1)
            console.log(freeNodeIds)
            console.log(yGraphs[0].getNodes())
            for (const [clientIdx, operation] of commands) {
                const nodesInGraph = yGraphs[clientIdx].getNodes();
                const sourceNode = nodesInGraph[Math.floor(Math.random() * yGraphs[clientIdx].nodeCount)];
                const targetNode = nodesInGraph[Math.floor(Math.random() * yGraphs[clientIdx].nodeCount)];

                if (operation.op === 'addNodeWithEdge') {
                    if (freeNodeIds.length === 0) 
                        continue;
                    const nodeId = freeNodeIds.shift()!.toString();
                    yGraphs[clientIdx].addNodeWithEdge(nodeId, operation.edgeDirection, targetNode, nodeId, operation.position, `edge${nodeId} ${operation.edgeDirection} ${targetNode}`);
                    await csvWriter.writeRecords([{client: clientIdx.toString(), op: operation.op, arguments: `${nodeId} ${operation.edgeDirection} ${targetNode}`}]);

                } else if (operation.op === 'addEdge') {
                    yGraphs[clientIdx].addEdge(sourceNode, targetNode, `edge${sourceNode}+${targetNode}`);
                    await csvWriter.writeRecords([{client: clientIdx.toString(), op: operation.op, arguments: `${sourceNode} -> ${targetNode}`}]);
                } else if (operation.op === 'removeEdge') {
                    yGraphs[clientIdx].removeEdge(sourceNode, targetNode);
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
                expect(yGraphs[i].isWeaklyConnected()).toBe(true);
                expect(yGraphs[i].nodeCount).toEqual(yGraphs[0].nodeCount);
                expect(yGraphs[i].edgeCount).toEqual(yGraphs[0].edgeCount);
                expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
                expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
                expect(yGraphs[i].getYRemovedGraphElementsAsJson()).toEqual(yGraphs[0].getYRemovedGraphElementsAsJson());
            }
        }),
        { 
            numRuns: 1000,
            verbose: true,
        },
        );
    });
});