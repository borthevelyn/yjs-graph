import { fc } from "@fast-check/jest";
import { applyCommands, CommandFunArg, commandProperty } from "../property-based-tests/PropTestUtilities";
import { Cause, ConflictResolutionVariant, CRCyclesDAGHeaders, EssentialHeaders, GraphVariant, makeBenchmarkCsvWriter } from "./Benchmark";
import * as Y from 'yjs';
import { DirectedAcyclicGraph } from "../graphs/DirectedAcyclicGraph";
import { CsvWriter } from "csv-writer/src/lib/csv-writer";
import { InitialGraph } from "./InitialGraphs";

describe('benchmarks', () => {
    async function acyclicityTestForBenchmarks(
        optimized: boolean,
        clientCount: number, 
        initialGraphSize: number, 
        maxGraphSize: number, 
        commands: CommandFunArg<'addNode' | 'addEdge'>[],
        writer: CsvWriter<CRCyclesDAGHeaders & EssentialHeaders>) {

        const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
        const yGraphs = yDocs.map((yDoc) => new DirectedAcyclicGraph(yDoc))
        for (let i = 1; i <= initialGraphSize; i++) {
            yGraphs[0].addNode(i.toString(), i.toString(), { x: 0, y: 0 })
        }
        DirectedAcyclicGraph.syncDefault(yGraphs, optimized);

        const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + initialGraphSize + 1)
        await applyCommands(commands, idx => yGraphs[idx], undefined, () => freeNodeIds.shift()?.toString())

        const graphSizes = yGraphs.map<[number, number]>(graph => [graph.nodeCount, graph.edgeCount])
        const data = DirectedAcyclicGraph.syncDefault(yGraphs, optimized);
        await writer.writeRecords(data.map((datum, idx) => {
            return {
                cause: Cause.OpConflictResolution,
                clientCount,
                graphVariant: GraphVariant.DAG,
                initialGraph: InitialGraph.DontCare,
                crvariant: optimized
                    ? ConflictResolutionVariant.Variant2
                    : ConflictResolutionVariant.Variant1,
                cycleCount: datum.cycles,
                cycleResolutionSteps: datum.cycleResolutionSteps,
                nodeCount: graphSizes[idx][0],
                edgeCount: graphSizes[idx][1],
                executionMillis: datum.time,
                yEdgesCount: datum.yEdges
            }
        }))
    }

    test('Optimized vs. Not optimized cycle resolution', async () => {
        const writer = makeBenchmarkCsvWriter<CRCyclesDAGHeaders & EssentialHeaders>('cr_dag.csv')

        const clientCount = 8;
        const initialGraphSizes = [5, 10, 15, 20, 25];
        const maxGraphSizes = [10, 20, 30, 40, 50];
        const maxOperationsPerRoundCounts = [30, 40, 50, 60, 70];

        for (let i = 0; i < 5; i++) {
            const initialGraphSize = initialGraphSizes[i]
            const maxGraphSize = maxGraphSizes[i]
            const maxOperationsPerRoundCount = maxOperationsPerRoundCounts[i]
            const minOperationsPerRoundCount = Math.floor(maxOperationsPerRoundCount / 2);

            await fc.assert(
                commandProperty({
                    clientCount,
                    maxGraphSize: maxGraphSize,
                    minOperationCount: minOperationsPerRoundCount,
                    maxOperationCount: maxOperationsPerRoundCount
                }, {
                    addNode: 2,
                    addEdge: minOperationsPerRoundCount
                },async (commands, iteration) => {
                    await acyclicityTestForBenchmarks(true, clientCount, initialGraphSize, maxGraphSize, commands, writer);
                    await acyclicityTestForBenchmarks(false, clientCount, initialGraphSize, maxGraphSize, commands, writer);
                }),
                { 
                    numRuns: 1000,
                    verbose: true,
                },
            );
    }
    }, 50000000)
})