import * as Y from 'yjs';
import { test, fc } from '@fast-check/jest'; 
import { FixedRootWeaklyConnectedGraph } from '../graphs/FixedRootWeaklyConnectedGraph';
import { EdgeDirection } from '../Types';
import { assert } from 'console';


describe('properties', () => {
    fc.configureGlobal({ baseSize: 'medium' });
    const createExecutionTimeCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriterExecutionTime = createExecutionTimeCsvWriter({
        path: './executionTime.csv',
        header: [
            {id: 'graphNodes', title: 'Node count'},
            {id: 'graphEdges', title: 'Edge count'},
            {id: 'executionTime', title: 'Execution time'},
            {id: 'connectedComponents', title: 'Connected components'},
            {id: 'danglingEdges', title: 'Dangling edges'},
            {id: 'paths', title: 'Paths'},
            {id: 'restoredEdges', title: 'Restored edges'},
            {id: 'restoredNodesWithEdges', title: 'Restored nodes with edges'},
            {id: 'restoredPaths', title: 'Restored paths'},
        ]
    });

    async function syncConcurrently(yDocs: Y.Doc[], yGraphs: FixedRootWeaklyConnectedGraph[]) {
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
            // const copy = new Y.Doc()
            // const copyGraph = new FixedRootWeaklyConnectedGraph(copy)
            // Y.applyUpdate(copy, Y.encodeStateAsUpdate(yDocs[idx]))
            // assert(copyGraph.isConsistent(), 'prev consistent')
            // updates.forEach(up => Y.applyUpdate(copy, up))
            // assert(copyGraph.isConsistent(), 'after consistent')

            for (const update of updates) {
                Y.applyUpdate(yDocs[idx], update)
            }
        }
        for (const graph of yGraphs) {

            performance.mark('start');
            graph.makeGraphWeaklyConnected(true)
            performance.mark('end');

            await csvWriterExecutionTime.writeRecords([{
                graphNodes: graph.nodeCount, 
                graphEdges: graph.edgeCount, 
                executionTime: performance.measure('makeGraphWeaklyConnected', 'start', 'end').duration,
                connectedComponents: graph.benchmarkData.connectedComponents,
                danglingEdges: graph.benchmarkData.danglingEdges,
                paths: graph.benchmarkData.paths,
                restoredEdges: graph.benchmarkData.restoredEdges,
                restoredNodesWithEdges: graph.benchmarkData.restoredNodesWithEdges,
                restoredPaths: graph.benchmarkData.restoredPaths,
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
                    // refer to https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/
                    fc.noBias(fc.integer({ min: 0, max: (1 << 24) - 1 }).map((v) => v / (1 << 24))),
                    fc.noBias(fc.integer({ min: 0, max: (1 << 24) - 1 }).map((v) => v / (1 << 24))),
                ),
                { minLength: 8, maxLength: maxOperationsPerRoundCount }
            ),
            async (commands) => {
            const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
            const yGraphs = yDocs.map((yDoc) => new FixedRootWeaklyConnectedGraph(yDoc))
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
                expect(yGraphs[i].getNode('root')).toBeDefined();
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
            ],
        });
        const clientCount = 5;
        const initialGraphSize = clientCount + 1;
        const maxGraphSize = 15;
        const maxOperationsPerRoundCount = 30;
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
                            arbitrary: 
                                fc.record({
                                    op: fc.constant<'addEdge'>('addEdge'),
                                }),
                            weight: 2

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
                            weight: 3
                        }
                    ),
                    // refer to https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/
                    fc.noBias(fc.integer({ min: 0, max: (1 << 24) - 1 }).map((v) => v / (1 << 24))),
                    fc.noBias(fc.integer({ min: 0, max: (1 << 24) - 1 }).map((v) => v / (1 << 24))),
                ),
                { minLength: 15, maxLength: maxOperationsPerRoundCount }
            ),
            async (commands) => {
            const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
            const yGraphs = yDocs.map((yDoc) => new FixedRootWeaklyConnectedGraph(yDoc))

            yGraphs[0].addNodeWithEdge('0', '<-', 'root', `$node0`, { x: 0, y: 0 }, `$root+0`);
            await syncConcurrently(yDocs, yGraphs);
            for (let i = 1; i < yGraphs.length; i++) {
                yGraphs[i].addNodeWithEdge(`${i}`, '<-', `${i - 1}`, `$node${i}`, { x: 0, y: 0 }, `$edge${i - 1}+${i}`);
                let ydocs = yDocs.filter((_, index) => index > i - 1);
                let graphs = yGraphs.filter((_, index) => index > i - 1);
                await syncConcurrently(ydocs, graphs);
            }

            yGraphs[0].removeEdge('root', '0');
            for (let i = 1; i < yGraphs.length; i++) {
                yGraphs[i].removeEdge(`${i - 1}`, `${i}`);
            }

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
                    assert(!yGraphs[clientIdx].getNodes().includes(nodeId), 'duplicate node')
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
                expect(yGraphs[i].getNode('root')).toBeDefined();
                expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
                expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
                expect(yGraphs[i].getYRemovedGraphElementsAsJson()).toEqual(yGraphs[0].getYRemovedGraphElementsAsJson());
            }
        }),
        { 
            numRuns: 10000,
            verbose: true,
            // this seed produces inconsistent graphs after the yjs sync
            // it is still unclear why - inconsistent meaning that the source and target node
            // disagree about if the edge is there
            // seed: 1792881123, path: "236:44:12:4:5:8:52:10:12:8:17:3:4:2:14:60:24:17:8:6:17:5:12:16:28:15:6:19:25:7:10:6:5:14:5:7:7:52:33:6:25:29:30:8:7:32:6:5:11:6:26:20:6:6:7:5:11:12:37:24:12:24:34:37:13:14:5:5:8:13:7:9:5:7:13:12:13:5:29:25:5:14:5:9:5:43:16:48:25:26:51:31:13:5:21:12:16:23:6:6:5:18:12:25:16:34:7:14:9:6:5:28:14:26:7:32:12:34:35:22:26:22:34:35:22:25:38:11:24:17:5:10:48:9:8:9:6:34:7:12:5:42:13:13:7:7:6:53:13:12:5:54:13:5:7:15:18:5:13:22:32:12:18:5:44:13:8:22:9:39:16:5:7:7:15:6:10:22:7:36:8:7:39:5:13:24:23:23:12:32:14:46:24:13:12:17:41:25:14:7:12:75:16:15:17:6:11:15:25:16:15:13:26:69:6:13:11:11:56:7:23:13:12:20:11:36:31:15:19:28:44:5:5:49:26:32:12:17:11:12:43:18:5:28:36:5:5:16:11:16:6:12:5:11:21:11:27:31:28:50:5:11:5:30:26:30:35:26:42:37:21:25:21:10:25:10:5:14:5:13:5:32:6:11:26:13:22:40:29:20:61:41:23:25:35:30:44:29:28:10:11:13:12:13:10:13:31:13:28:39:9:18:12:10:12:45:11:45:48:42:42:9:4:17:59:81:47:19:53:46:28:32:40:10:4:19:9:46:25:29:28:32:10:13:11:4:18:9:13:10:30:10:27:64:29:26:28:9:15:40:15:39:28:11:10:13:17:21:33:13:66:42:15:4:13:49:13:30:60:9:27:35:29:37:12:27:11:49:20:4:16:13:31:28:58:10:26:9:4:12:6:7:63:10:4:44:10:27:7:9:6:35:6:36:14:60:47:9:11:54:46:11:20:24:65:49:42:24:33:20:20:4:18:10:30:27:22:30:9:38:26:40:9:72:17:14:4:13:26:11:25:30:38:34:38:23:34:9:22:10:40:15:27:19:33:23:39:24:24:4:4:17:11:4:44:4:24:24:31:19:9:22:40:10:42:13:28:20:30:4:15:6:9:29:39:5:44:9:9:10:35:30:10:18:14:39:10:43:4:33:13:11:23:4:11:16:5:37:10:9:24:4:11:5:13:16:4:14:43:61:5:19:46:47:10:4:31:49:4:14:38:6:6:44:36:15:14:40:39:42:16:4:35:28:5:13:53:5:10:33:25:32:19:19:32:85:19:22:64:43:35:32:21:10:14:12:4:15:10:10:9:17:11:9:58:15:11:11:48:4:42:25:28:24:30:32:4:11:8:56:29:5:7:30:31:13:44:6:20:31:4:19:10:30:10:30:24:48:10:4:9:18:14:14:13:13:13:17:9:9:20:4:13:13:4:4:14:4:23:58:14:21:11:16:16:30:9:19:9:35:31:19:32:4:23:4:17:12:64:39:9:18:14:4:36:14:13:20:4:10:9:15:12:50:18:25:10:30:35:50:23:33:19:9:21:38:4:4:13:4:18:46:7:14:7:4:15:14:27:21:30:20:33:9:9:51:10:19:59:28:31:26:29:4:19:4:29:5:22:25:29:4:21:11:6:19:4:31:20:6:15:16:38:27:6:38:9:22:4:22:20:4:32:4:10:5:41:21:12:15:9:13:43:67:4:4:20:4:6:4:4:9:19:12:9:11:9:10:9:10:9:23:11:10:9:11:9:9:9:29:19:19:20:17:16:16:16:16:16:16:16:16:16:16:19:16:16:16:17:17:17:17:20:17:17:18:18:17:17:17:17:17:18:17:18:17:17:18:17:25:17:17:18:18:17:17:17:17:18:17:17:17:18:17:20:17:28:17:17:17:21:21:19:19:20:19:19:19:20:19:20:20:19:27:20:19:19:19:21:19:19:19:19:19:19:19:19:19:28:21:19:19:22:19:19:20:19:19:19:39:19:24:19:22:19:19:21:19:40:19:19:23:20:20:21:19:20:21:20:21:20:22:20:31:20:22:20:21:20:20:20:20:22:20:20:33:20:20:20:21:20:21:24:22:20:20:21:20:33:20:20:21:20:20:20:20:20:20:20:40:22:21:20:37:20:23:21:20:43:43:43:44:43:44:44:43:43:43:43:44:43:45:43:43:43:43:46:47:43:45:43:43:43:43:45:43:43:44:44:43:48:44:44:46:44:43:45:43:43:43:43:43:57:45:44:45:44:43:53:43:49:43:43:43:44:44:43:43:43:63:45:46:46:45:46:45:45:47:47:49:45:49:45:45:45:46:46:45:61:48:48:10:42:43:44:43:43:43:44:43:43:43:43:43:43:44:43:43:44:43:43:44:43:43:43:45:45:44:43:43:45:46:43:43:43:43:43:44:44:43:47:43:43:42:13:37:37:40:37:37:38:37:37:37:37:37:37:37:39:37:38:38:37:37:38:37:37:37:37:37:37:37:37:38:11:35:35:9:15:11:12:14:11:9:17:10:16:9:27:17:21:12:12:9:13:13:13:10:19:13:32:11:15:10:11:18:18:11:10:9:14:10:9:10:11:19:10:9:11:18:9:11:10:12:11:11:9:21:9:13:12:44:12:9:10:9:15:12:15:20:9:9:11:9:9:18:9:10:15:11:9:13:12:15:15:9:14:12:9:14:14:9:9:15:9:9:24:9:13:9:11:10:16:13:13:10:25:11:10:19:13:10:9:12:9:15:15:12:12:24:9:32:13:9:12:14:10:38:15:9:13:15:12:12:17:12:11:9:27:16:16:19:22:11:12:9:14:9:21:21:11:16:10:9:19:13:10:20:10:9:14:11:10:9:19:9:9:18:10:19:18:9:14:13:10:14:9:23:32:11:11:9:10:16:12:15:13:16:20:12:9:18:18:16:10:33:17:13:14:18:19:14:9:14:9:18:10:22:13:10:20:13:11:13:14:15:11:10:19:9:22:16:15:23:9:11:9:15:18:13:16:13:9:23:30:11:18:10:19:11:19:13:18:23:10:27:10:13:13:13:9:9:26:9:16:11:10:9:38:24:11:13:14:13:15:9:43:29:14:10:13:10:20:10:11:11:11:12:9:16:11:13:17:10:23:14:10:11:12:12:9:25:16:20:9:17:13:13:12:21:20:16:19:9:22:19:14:9:29:19:16:9:27:11:9:9:9:32:21:12:14:14:12:9:29:11:20:12:13:14:22:9:26:9:17:16:10:12:24:10:12:10:10:14:16:12:21:20:14:14:26:12:9:14:15:12:9:28:13:10:9:25:15:14:18:10:33:12:13:10:39:22:12:16:12:12:12:22:14:14:9:17:13:16:20:10:9:31:9:24:9:36:29:12:13:10:12:17:10:18:16:10:28:13:21:12:18:14:18:13:16:9:16:13:10:25:10:13:15:11:12:10:27:22:10:12:12:10:17:10:23:18:18:17:13:10:25:16:13:18:14:14:12:18:10:29:21:17:12:10:26:11:11:17:10:10:10:36:50:37:44:41:34:43:37:48:39:37:41:32:16:14:14:13:13:12:13:15:13:14:12:15:18:19:15:12:14:23:18:14:16:23:15:23:19:12:14:12:13:17:20:20:13:15:14:13:23:13:13:15:16:13:13:15:13:13:14:20:12:20:13:17:19:12:13:29:18:18:15:14:17:12:25:13:24:18:16:18:12:14:17:26:22:12:19:16:19:15:35:19:19:14:14:18:13:22:21:12:12:17:14:15:16:12:14:15:20:12:16:17:15:16:12:15:14:3:3:5:7:4:3:8:17:3:3:5:12:9:9:3:3:9:14:13:9:9:9:13:12:23:9:11:11:9:3:11:6:8:4:3:14:14:10:9:3:12:3:3:8:10:10:15:21:13:14:12:23:8:18:8:9:15:10:17:8:9:10:10:8:9:8:9:14:8:8:17:17:16:16:12:15:12:15:8:8:18:13:17:11:18:12:12:11:14:13:14:9:11:10:21:11:14:17:12:15:11:12:12:26:19:14:10:12:12:9:14:9:13:13:12:9:14:13:9:9" 
        },
        );
    }, 50000000);
});