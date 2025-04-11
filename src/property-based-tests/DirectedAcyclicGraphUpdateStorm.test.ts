import * as Y from 'yjs';
import { DirectedAcyclicGraph } from '../graphs/DirectedAcyclicGraph';
import { test, fc } from '@fast-check/jest';
import { assert } from 'console';
import seedrandom from 'seedrandom';
import { applyCommands, type CommandFunArg, commandProperty } from './PropTestUtilities';
import { randomUUID } from 'crypto';


describe('properties', () => {
    fc.configureGlobal({ baseSize: 'medium' });
    const createPUSCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvPUSWriter = createPUSCsvWriter({
        path: './pus.csv',
        header: [
            {id: 'id', title: 'id'},
            {id: 'cycleCount', title: 'Cycle count'},
            {id: 'copyTime', title: 'Copy time'},
            {id: 'hadConflicts', title: 'Had conflicts'},
            {id: 'waitingHelped', title: 'Waiting helped'},
            {id: 'randomTime', title: 'Random time'},
            {id: 'clientCount', title: 'Client count'},
            {id: 'maxSleep', title: 'MaxSleep'},
        ]
    });


    const maxSleepDur = 20

    /**
     * Performs syncing of all given clients and docs with update storm prevention.
     */
    async function syncPUS(yDocs: Y.Doc[], yGraphs: DirectedAcyclicGraph[], rnd: (arg0: number) => number) {

        const id = randomUUID()

        // parallel for such that each peer runs concurrently
        await Promise.all(
            Array.from(new Array(yDocs.length).keys()).map(async idx => {
                // from here, the graph might be invalid, thus operate on a copy
                const firstCopyStart = performance.now()
                const copy = new Y.Doc()
                Y.applyUpdate(copy, Y.encodeStateAsUpdate(yDocs[idx]))
                const copyTime = performance.now() - firstCopyStart

                
                const updates = Array.from(new Array(yDocs.length).keys())
                    .filter(i => i !== idx)
                    .map(i => Y.encodeStateAsUpdate(yDocs[i], Y.encodeStateVector(yDocs[idx])))

                for (const update of updates) {
                    Y.applyUpdate(copy, update)
                }
                const copiedGraph = new DirectedAcyclicGraph(copy.getMap('adjacency map'), copy.getArray('edges'))
                
                if (copiedGraph.hasInvalidEdges() || !copiedGraph.isAcyclic()) {
                    // the graph is valid, but not up to date
                    const sleepDur = rnd(idx) * maxSleepDur
                    await new Promise(resolve => setTimeout(resolve, sleepDur)) // sleep random
                    // recalculate missing updates (some might have been applied, other updates might have arrived)
                    const newUpdates = Array.from(new Array(yDocs.length).keys())
                        .filter(i => i !== idx)
                        .map(i => Y.encodeStateAsUpdate(yDocs[i], Y.encodeStateVector(yDocs[idx])))
                    
                        // try to apply again
                    // if successful, simply continue
                    // if still unsuccessful, resolve conflicts, calculate resolving transaction
                    newUpdates.forEach(up => Y.applyUpdate(yDocs[idx], up))
                    const waitingHelped = !yGraphs[idx].hasInvalidEdges() && yGraphs[idx].isAcyclic()
                    yGraphs[idx].removeCycles();
                    await csvPUSWriter.writeRecords([{
                        id: id,
                        cycleCount: yGraphs[idx].benchmarkData.cycles,
                        copyTime: copyTime,
                        hadConflicts: true,
                        waitingHelped: waitingHelped,
                        randomTime: sleepDur,
                        clientCount: yDocs.length,
                        maxSleep: maxSleepDur
                    }])
                }
                // the graph is valid and up to date
                else {
                    console.log('updates were applied without conflict')
                    updates.forEach(up => Y.applyUpdate(yDocs[idx], up))
                    await csvPUSWriter.writeRecords([{
                        id: id,
                        cycleCount: 0,
                        copyTime: copyTime,
                        hadConflicts: false,
                        waitingHelped: false,
                        randomTime: 0,
                        clientCount: yDocs.length,
                        maxSleep: maxSleepDur
                    }])
                }

            })
        );
    }

    function createGraph(graph: DirectedAcyclicGraph, n: number) {
        for (let i = 1; i <= n; i++) {
            graph.addNode(i.toString(), i.toString(), { x: 0, y: 0 })
        }
    }

    async function initDAGTest(count: number, initialSize: number) {        
        const yDocs = Array.from({ length: count }, () => new Y.Doc())
        const yGraphs = yDocs.map((yDoc) => new DirectedAcyclicGraph(yDoc.getMap('adjacency map'), yDoc.getArray('edges')))
        createGraph(yGraphs[0], initialSize);
        await syncPUS(yDocs, yGraphs, idx => seedrandom(idx + 'first')());
        return { yDocs, yGraphs }
    }
    function defaultSync(yDocs: Y.Doc[], yGraphs: DirectedAcyclicGraph[]) {
        return async (clients: number[], seed: string) => {
            let docs = yDocs.filter((_, index) => clients.includes(index))
            let graphs = yGraphs.filter((_, index) => clients.includes(index))
            await syncPUS(docs, graphs, idx => seedrandom(`${idx}${seed}`)());
        }
    }

    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriterForBenchmarks = createCsvWriter({
        path: './fileBenchmarks.csv',
        header: [
            {id: 'client', title: 'client'},
            {id: 'op', title: 'op'},
            {id: 'arguments', title: 'arguments'},
        ],
    });

    async function acyclicityTestForBenchmarks(
        optimized: boolean,
        clientCount: number, 
        initialGraphSize: number, 
        maxGraphSize: number, 
        commands: CommandFunArg<'addNode' | 'addEdge'>[]) {

        const { yDocs, yGraphs } = await initDAGTest(clientCount, initialGraphSize)

        const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + initialGraphSize + 1)
        await applyCommands(
            commands,
            idx => yGraphs[idx],
            undefined,
            () => freeNodeIds.length === 0 ? undefined: freeNodeIds.shift()!.toString(),
            async arg => await csvWriterForBenchmarks.writeRecords([arg])
        )
        
        await syncPUS(yDocs, yGraphs, idx => seedrandom(idx + 'last')());
        await csvWriterForBenchmarks.writeRecords([{client: 'next round', op: '', arguments: ''}]);

        for (let i = 0; i < yGraphs.length; i++) {
            expect(yGraphs[i].isAcyclic()).toBe(true);
            expect(yGraphs[i].getYEdgesAsJson()).toEqual(yGraphs[0].getYEdgesAsJson());
            
            expect(yGraphs[i].nodeCount).toEqual(yGraphs[0].nodeCount);
            expect(yGraphs[i].edgeCount).toEqual(yGraphs[0].edgeCount);
            expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
            expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
        }
    }
    async function runAcyclicityTestForBenchmarks(clientCount: number, initialGraphSize: number, maxGraphSize: number, minOperationsPerRoundCount: number, maxOperationsPerRoundCount: number, iteration: number = 0) {
        assert(initialGraphSize < maxGraphSize);
        await fc.assert(            
            commandProperty(
                {
                    clientCount,
                    maxOperationCount: maxOperationsPerRoundCount,
                    minOperationCount: minOperationsPerRoundCount,
                    maxGraphSize,
                    iteration
                },
                {
                    addNode: 2,
                    addEdge: minOperationsPerRoundCount,
                },
                async (commands, iter) => {
                    await acyclicityTestForBenchmarks(true, clientCount, initialGraphSize, maxGraphSize, commands);
                    await acyclicityTestForBenchmarks(false, clientCount, initialGraphSize, maxGraphSize, commands);    
                }
            ),
            { 
                numRuns: 1000,
                verbose: true,
            },
        );
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
            commandProperty({
                clientCount,
                iteration,
                maxGraphSize,
                maxOperationCount: maxOperationsPerRoundCount,
                minOperationCount: 15
            }, {
                addNode: 1,
                removeNode: 1,
                addEdge: 6,
                removeEdge: 1,
                sync: 1,
            }, 
            async (commands, iteration) => {
                const { yDocs, yGraphs } = await initDAGTest(clientCount, initialGraphSize)

                const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + initialGraphSize + 1)
                await applyCommands(
                    commands,
                    idx => yGraphs[idx],
                    defaultSync(yDocs, yGraphs),
                    () => freeNodeIds.length === 0 ? undefined : freeNodeIds.shift()!.toString(),
                    async arg => await csvWriter.writeRecords([arg])
                )


                await csvWriter.writeRecords([{client: 'next round', op: '', arguments: ''}]);
                await syncPUS(yDocs, yGraphs, idx => seedrandom(idx + 'last')());
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
        });
    }
    
    test('simple test', async () => {
        const yDocs = Array.from({ length: 2 }, () => new Y.Doc())
        const yGraphs = yDocs.map((yDoc) => new DirectedAcyclicGraph(yDoc.getMap('adjacency map'), yDoc.getArray('edges')))

        createGraph(yGraphs[0], 2);
        await syncPUS(yDocs, yGraphs, idx => seedrandom(idx + 'hard1')());
        yGraphs[0].addEdge('1', '2', 'edge1+2');
        yGraphs[1].addEdge('2', '1', 'edge2+1');
        await syncPUS(yDocs, yGraphs,  idx => seedrandom(idx + 'hard2')());
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

    // This test compares the cycle resolution time between optimized and not optimized versions
    // Initial graph size starts with a specific amount of nodes without edges
    // Then clients apply at least 15 operations or more concurrently to the graph
    // Allowed operations are addNode (weight: 2), removeNode (weight: 1), addEdge (weight: minOperationsCount)
    // The reason for the choice of allowed operations for this benchmark is to reach a high number of cycles in the graph
    // At the end all clients sync their changes either in the optimized or not optimized version
    test('Benchmark 1: Optimized vs. Not optimized cycle resolution', async () => {
        const clientCount = 8;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 30;
        await csvWriterForBenchmarks.writeRecords([{client: 'start', op: '', arguments: ''}]);
        for (let i = 0; i < 5; i++) {
            const minOperationsPerRoundCount = Math.floor((maxOperationsPerRoundCount + 10 * i) / 2);
            await runAcyclicityTestForBenchmarks(clientCount, initialGraphSize + 5 * i, maxGraphSize + 10 * i, minOperationsPerRoundCount, maxOperationsPerRoundCount + 10 * i, i);
        }
        await csvWriterForBenchmarks.writeRecords([{client: 'end', op: '', arguments: ''}]);
    }, 50000000);


    test('graph should always be acyclic, add a lot of edges', async () => {
        const clientCount = 4;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 10;
        assert(initialGraphSize < maxGraphSize);
        await fc.assert(
            commandProperty({
                clientCount,
                minOperationCount: 5,
                maxOperationCount: maxOperationsPerRoundCount,
                maxGraphSize
            }, {
                addEdge: 10,
                sync: 1
            },
            async (commands) => {
            
            const { yDocs, yGraphs } = await initDAGTest(clientCount, initialGraphSize)
            await applyCommands(
                commands,
                idx => yGraphs[idx],
                defaultSync(yDocs, yGraphs),
                () => undefined)
                
            await syncPUS(yDocs, yGraphs, idx => seedrandom(idx + 'last')());
            
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
            timeout: 1000000000,
        },
        );
    }, 60000000);

});