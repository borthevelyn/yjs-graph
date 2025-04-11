import fc, { WeightedArbitrary } from "fast-check";
import { EdgeDirection, id } from "../Types";
import { XYPosition } from "@xyflow/react";

export type Command = { 
    op: 'addNode'
    position: { x: number; y: number }
} | { 
    op: 'addEdge'
    from: number
    to: number
} | {
    op: 'removeNode'
} | {
    op: 'removeEdge'
} | {
    op: 'addNodeWithEdge'
    edgeDirection: EdgeDirection
    position: { x: number; y: number }
} | {
    op: 'sync'
    clients: number[]
}

type AllowedWeights = {
    [OpName in Command['op']]?: number
}

type AllowedOps<Weights extends AllowedWeights> = {
    [Weight in keyof Weights]: Weights[Weight] extends 0 | undefined | never ? never : Weight
}[keyof Weights]

export type CommandFunArg<AllowedOps extends Command['op']> = [number, Command & { op: AllowedOps }, number, number]

export function commandProperty<Weights extends AllowedWeights>(args: {
    clientCount: number
    minOperationCount: number
    maxOperationCount: number
    maxGraphSize: number
    iteration?: number
}, weights: Weights, func: (commands: [number, Command & { op: AllowedOps<Weights> }, number, number][], iteration?: number) => Promise<void>) {
    console.log(weights)
    return fc.asyncProperty(
        fc.array(
            fc.tuple(
                fc.integer({ min: 0, max: args.clientCount - 1 }), 
                fc.oneof<WeightedArbitrary<Command & { op: AllowedOps<Weights> }>[]>(
                    {
                        arbitrary:
                            fc.record<Command & { op: 'addNode' }>({
                                op: fc.constant<'addNode'>('addNode'),
                                position: fc.constant({ x: 0, y: 0 })
                            }),
                        weight: weights.addNode ?? 0
                    } as WeightedArbitrary<Command & { op: AllowedOps<Weights> }>,
                    {
                        arbitrary:
                            fc.record<Command & { op: 'removeNode' }>({
                                op: fc.constant<'removeNode'>('removeNode'),
                            }),
                        weight: weights.removeNode ?? 0
                    } as WeightedArbitrary<Command & { op: AllowedOps<Weights> }>,
                    {
                        arbitrary:
                            fc.record<Command & { op: 'addEdge' }>({
                                op: fc.constant<'addEdge'>('addEdge'),
                                from: fc.integer({ min: 1, max: args.maxGraphSize }),
                                to: fc.integer({ min: 1, max: args.maxGraphSize }),
                            }),
                        weight: weights.addEdge ?? 0
                    } as WeightedArbitrary<Command & { op: AllowedOps<Weights> }>,
                    {
                        arbitrary:
                            fc.record<Command & { op: 'removeEdge' }>({
                                op: fc.constant<'removeEdge'>('removeEdge'),
                            }),
                        weight: weights.removeEdge ?? 0
                    } as WeightedArbitrary<Command & { op: AllowedOps<Weights> }>,
                    {
                        arbitrary:
                            fc.record<Command & { op: 'sync' }>({
                                op: fc.constant<'sync'>('sync'),
                                clients: fc.uniqueArray(fc.integer({ min: 0, max: args.clientCount-1 }), { minLength: 2, maxLength: args.clientCount }),
                            }),
                        weight: weights.sync ?? 0
                    } as WeightedArbitrary<Command & { op: AllowedOps<Weights> }>,
                    {
                        arbitrary:
                            fc.record<Command & { op: 'addNodeWithEdge' }>({
                                op: fc.constant<'addNodeWithEdge'>('addNodeWithEdge'),
                                edgeDirection: fc.constantFrom<EdgeDirection>('->', '<-'),
                                position: fc.constant({ x: 0, y: 0 })
                            }),
                        weight: weights.addNodeWithEdge ?? 0
                    } as WeightedArbitrary<Command & { op: AllowedOps<Weights> }>,
                ),
                // refer to https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/
                fc.noBias(fc.integer({ min: 0, max: (1 << 24) - 1 }).map((v) => v / (1 << 24))),
                fc.noBias(fc.integer({ min: 0, max: (1 << 24) - 1 }).map((v) => v / (1 << 24))),
            ),
            { minLength: args.minOperationCount, maxLength: args.maxOperationCount }
        ),
        fc.constant(args.iteration),
        func
    );
}


interface OptinMethods {
    addNode(nodeId: id, label: string, position: XYPosition): void; 
    addEdge(source: id, target: id, label: string): void;
    removeNode(nodeId: id): void;
    removeEdge(source: id, target: id): void;
    addNodeWithEdge(): void;
}
interface Common {
    get nodeCount(): number;
    get nodeIds(): id[];
}

// This function is weirdly required, because typescript seems unable to extrapolate its knowledge about
// operation.op to the operation object otherwise
function is<T extends Command['op']>(operation: Command, t: T): operation is Command & { op: T } {
    return operation.op === t
}


export async function applyCommands<AllowedOps extends Command['op']>(
    commands: CommandFunArg<AllowedOps>[],
    graph: (idx: number) => Pick<OptinMethods, Exclude<AllowedOps, 'sync'>> & Common,
    sync: 'sync' extends AllowedOps ? (clients: number[], seed: string) => void | Promise<void> : undefined,
    newNodeId: () => id | undefined,
    afterEach?: (args: { client: string, op: Command['op'], arguments: string }) => void | Promise<void>) {
    for (const [clientIdx, operation, rnd1, rnd2] of commands) {
        const g = graph(clientIdx) as OptinMethods & Common
        
        const nodesInGraph = g.nodeIds;
        const sourceNode = nodesInGraph[Math.floor(rnd1 * g.nodeCount)];
        const targetNode = nodesInGraph[Math.floor(rnd2 * g.nodeCount)];

        if (is(operation, 'addNode')) {
            const nodeId = newNodeId();
            
            if (nodeId === undefined)
                continue
            
            g.addNode(nodeId, nodeId, operation.position)
            await afterEach?.({ client: clientIdx.toString(), op: operation.op, arguments: `${nodeId}` })
        }
        else if (is(operation, 'addEdge')) {
            if (sourceNode === targetNode) 
                continue;

            g.addEdge(sourceNode, targetNode, `edge${sourceNode}+${targetNode}`)
            await afterEach?.({ client: clientIdx.toString(), op: operation.op, arguments: `${sourceNode} -> ${targetNode}` })
        }
        else if (is(operation, 'removeNode')) {
            g.removeNode(sourceNode)
            await afterEach?.({ client: clientIdx.toString(), op: operation.op, arguments: `${sourceNode}` })
        }
        else if (is(operation, 'removeEdge')) {
            if (sourceNode === targetNode) 
                continue;
            g.removeEdge(sourceNode, targetNode)
            await afterEach?.({ client: clientIdx.toString(), op: operation.op, arguments: `${sourceNode} -> ${targetNode}` })
        }
        else if (is(operation, 'sync')) {
            await sync!(operation.clients, `${rnd1}${rnd2}`)
            await afterEach?.({ client: clientIdx.toString(), op: operation.op, arguments: operation.clients.toString() })
        }
    }
}