import * as Y from 'yjs';
import { DirectedAcyclicGraph } from '../graphs/DirectedAcyclicGraph';
import { test, fc } from '@fast-check/jest';
import { applyCommands, Command, CommandFunArg, commandProperty } from '../property-based-tests/PropTestUtilities';
import { Cause, EssentialHeaders, GraphVariant, makeBenchmarkCsvWriter, UpdateStormHeaders } from './Benchmark';
import seedrandom from 'seedrandom';
import { InitialGraph } from './InitialGraphs';

describe('benchmarks', () => {
    fc.configureGlobal({ baseSize: 'medium' });

    const writer = makeBenchmarkCsvWriter<UpdateStormHeaders & EssentialHeaders>('updateStormDelay.csv')

    async function benchmarkUpdateStormDelayDAG(networkDelays: number[], maxSleepDurations: number[], commands: CommandFunArg<Exclude<Command['op'], 'addNodeWithEdge'>>[], initialCount: number, clientCount: number) {

        const yDoc = new Y.Doc()
        const initial = new DirectedAcyclicGraph(yDoc)
        for (let i = 1; i <= initialCount; i++) {
            initial.addNode(i.toString(), i.toString(), { x: 0, y: 0 })
        }
        for (const networkDelay of networkDelays) {
            for (const maxSleepFactor of maxSleepDurations) {
                const maxSleepDur = networkDelay * maxSleepFactor
                const copies = Array.from(new Array(clientCount).keys()).map(_ => initial.clone())
                for (const [idx, command, rnd1, rnd2] of commands) {
                    switch (command.op) {
                        case "sync":
                            const graphs = copies.filter((v, idx) => command.clients.includes(idx))
                            const syncData = await DirectedAcyclicGraph.syncPUS(graphs, maxSleepDur, networkDelay, idx => seedrandom(`rnd${idx}${rnd1}${rnd2}`)())
                            await writer.writeRecords(syncData.map(([ush, data]) => {
                                return {
                                    ...ush,
                                    ...data,
                                    graphVariant: GraphVariant.DAG,
                                    cause: Cause.OpSync,
                                    clientCount,
                                    initialGraph: InitialGraph.DontCare
                                }
                            }))
                            break
                        default:
                            await applyCommands([[idx, command, rnd1, rnd2]], idx => copies[idx], undefined, () => `node${rnd1}${rnd2}`)
                    }
                }
        
                const syncData = await DirectedAcyclicGraph.syncPUS(copies, maxSleepDur, networkDelay, idx => seedrandom(`rnd${idx}lastsync`)())
                await writer.writeRecords(syncData.map(([ush, data]) => {
                    return {
                        ...ush,
                        ...data,
                        graphVariant: GraphVariant.DAG,
                        cause: Cause.OpSync,
                        clientCount,
                        initialGraph: InitialGraph.DontCare
                    }
                }))
            }
        }
    }
    
    test('DAG updatestorm benchmark', async () => {
        await fc.assert(commandProperty({
            maxClientCount: 10,
            maxGraphSize: 250,
            maxOperationCount: 25,
            minOperationCount: 10,
        }, {
            addEdge: 50,
            addNode: 20,
            
            sync: 1
        }, async (commands, it) => {
            await benchmarkUpdateStormDelayDAG([50, 100, 200, 300],[1.3, 2.5, 5, 10], commands, 4, 10)
        }), {
            numRuns: 16
        })
    }, 5000000);

});