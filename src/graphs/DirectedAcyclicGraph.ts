import { MarkerType, XYPosition } from "@xyflow/react";
import { id, FlowNode, FlowEdge, ObjectYMap, EventEmitter, EdgeId, splitEdgeId } from "../Types";
import { Graph } from "./Graph";
import * as Y from 'yjs'
import assert from 'assert';
import { syncDefault, syncPUSParSim } from "./SynchronizationMethods";

type BenchmarkData = {
    cycles: number,
    cycleResolutionSteps: number,
    yEdges: number,
    optimized: boolean,
    time: number,
    resolveInvalidEdgesTime: number
}

type EdgeInformation = {
    label: string
}
type NodeData = {
    id: string,
    label: string,
    position: XYPosition,
    deletable: boolean,
    dimension: {width: number | undefined, height: number | undefined}
}
type NodeInformation = ObjectYMap<NodeData & {
    // This map may contain dangling edges because of Yjs synchronization
    // Reading from this map should always takes this into account
    edgeInformation: Y.Map<EdgeInformation>
}>
type clock = {
    [client: string]: number | undefined
}
type yEdgeInformation = {
    edgeId: EdgeId
    clock: clock
}

export type AdjacencyMapGraph = Y.Map<NodeInformation>

export function nodeListToEdgeList(nodeList: ReadonlyArray<id>): ReadonlyArray<EdgeId> {
    if (nodeList.length < 2)
        return []

    return Array.from(
        new Array(nodeList.length - 1).keys())
        .map<EdgeId>(i => `${nodeList[i]}+${nodeList[i + 1]}`)
}

export class DirectedAcyclicGraph implements Graph {
    private yMatrix: AdjacencyMapGraph;
    private yEdges: Y.Array<yEdgeInformation>;
    private yEdgesAsArray: yEdgeInformation[] | undefined;

    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;
    private eventEmitter: EventEmitter | undefined;

    private readonly yMatrixId = 'adjacency_map_ydoc'
    private readonly yEdgesId = 'edges_ydoc'

    constructor(yDoc: Y.Doc, eventEmitter?: EventEmitter) {
        this.yMatrix = yDoc.getMap(this.yMatrixId);
        this.yEdges = yDoc.getArray(this.yEdgesId);
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
        this.eventEmitter = eventEmitter;
        if (this.eventEmitter !== undefined) {
            this.yMatrix.observeDeep(() => this.eventEmitter?.fire());
        }
    }

    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda)
    }

    // removes edges that were removed from the graph
    private filterRemovedEdgeInYEdges(edgeId: EdgeId) {
        this.yMatrix.doc!.transact(() => {
            const arr = this.yEdgesAsArray ?? this.yEdges.toArray();
            let edgeIndex;
            do {
                edgeIndex = arr.findIndex(x => x.edgeId === edgeId);  
                if (edgeIndex !== -1) {
                    arr.splice(edgeIndex, 1);
                    this.yEdges.delete(edgeIndex);
                }
            } while(edgeIndex >= 0);
        });
    }


    public hasInvalidEdges() {
        const dangling = [...this.yMatrix.values()].some(source => [...source.get('edgeInformation').keys()].some(target => this.yMatrix.get(target) === undefined))
        const edges = [...this.yEdges]
        const duplicate = edges.some((edge, idx) => edges.some((otherEdge, otherIdx) => edge.edgeId === otherEdge.edgeId && otherIdx !== idx))
        return dangling || duplicate
    }

    private removeInvalidEdges() {
        this.removeDuplicateEdges()
        this.removeDanglingEdges()
    }
    private removeDanglingEdges() {
        this.yMatrix.doc!.transact(() => {
            for (const source of this.yMatrix.values()) {
                for (const target of source.get('edgeInformation').keys()) {
                    if (this.yMatrix.get(target) !== undefined) {
                        continue
                    }
                    this.removeEdge(source.get('id'), target)
                }
            }
        });
    }
    private removeDuplicateEdges() {
        const visitedEdges = new Map<EdgeId, number>();
        const duplicateEdgeIdx = new Array<number>();
        this.yEdges.doc!.transact(() => {
            
            this.yEdges.forEach((item, i) => {
                if (visitedEdges.has(item.edgeId)) {
                    duplicateEdgeIdx.push(visitedEdges.get(item.edgeId)!);
                } 
                visitedEdges.set(item.edgeId, i);
            })

            duplicateEdgeIdx.sort((a, b) => b - a).forEach(x => { this.yEdges.delete(x); this.yEdgesAsArray?.splice(x, 1) });
        });
    }
    private makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>) {
        const res = new Y.Map() as NodeInformation;
        res.set('id', node.id);
        res.set('label', node.data.label);
        res.set('position', node.position);
        res.set('deletable', true);
        res.set('dimension', {width: node.measured?.width, height: node.measured?.height});
        res.set('edgeInformation', edges);
        return res
    }

    // Complexity: O(V + E)
    // If either source or target does not exist, the function will return an empty array
    private findPath(source: id, target: id): ReadonlyArray<id> {
        if(this.yMatrix.get(source) === undefined || this.yMatrix.get(target) === undefined)
            return []

        const visited = new Set<id>();
        const path: id[] = [];

        const dfs = (node: id): boolean => {
            assert(!visited.has(node), 'graph is cyclic, but should not be (findPath)')

            visited.add(node);
            path.push(node);

            if (node === target)
                return true

            const nodeInfo = this.yMatrix.get(node);
            for (const [successorNode,] of nodeInfo!.get('edgeInformation')) {
                if (dfs(successorNode))
                    return true
            }
            visited.delete(node);
            path.pop();
            return false
        }
        return dfs(source) ? path : []
    }

    // Complexity: O(V + E)
    private createsEdgeCycle(source: id, target: id): boolean {
        return this.findPath(target, source).length > 0
    }

    // Complexity: O(V + E)
    // Works only for directed graphs without dangling edges
    // Reference implementation: https://www.geeksforgeeks.org/detect-cycle-in-a-graph/
    private isCyclic(): boolean {
        let visited = new Set<id>();
        let recStack = new Set<id>();

        const isCyclicUtil = (node: id): boolean => {
            if (!visited.has(node)) {
                visited.add(node);
                recStack.add(node);

                const nodeInfo = this.yMatrix.get(node);
                assert(nodeInfo !== undefined, 'Node does not exist (isCyclic)')

                for (const [successorNode,] of nodeInfo.get('edgeInformation')) {
                    if (!visited.has(successorNode) && isCyclicUtil(successorNode)) {
                        return true
                    } else if (recStack.has(successorNode)) {
                        return true
                    }
                }
            }

            recStack.delete(node);
            return false
        }

        for (const node of this.yMatrix.keys()) {
            if (!visited.has(node) && isCyclicUtil(node))
                return true
        }
        return false
    }

    // Complexity: O((V + E) * (C + 1))
    // Johnson Algorithm: https://www.cs.tufts.edu/comp/150GA/homeworks/hw1/Johnson%2075.PDF
    // Reference implementation in Java: https://github.com/mission-peace/interview/blob/master/src/com/interview/graph/AllCyclesInDirectedGraphJohnson.java
    private getAllCyclesInDAG(): Set<ReadonlyArray<id>> {
        let blockedSet = new Set<number>();
        let blockedMap = new Map<number, Set<number>>();
        let stack = new Array<number>();
        let allCycles = new Set<ReadonlyArray<id>>();

        const nodeIdToNumberMap = new Map([...this.yMatrix.keys()].map((node, i) => [node, i+1])); 
        const nodeNumberMapToNodeIdMap = new Map([...this.yMatrix.keys()].map((nodeId) => [nodeIdToNumberMap.get(nodeId)!, nodeId]));

        const createGraphWithNumberIds = (): Map<number, Set<number>> => {
            const graphWithNumberIds = new Map(
                [...this.yMatrix.keys()]
                .map((node) => 
                    [nodeIdToNumberMap.get(node)!, new Set<number>( [...this.yMatrix.get(node)!.get('edgeInformation').keys()]
                    .map(x => nodeIdToNumberMap.get(x)!))]));
            return graphWithNumberIds
        }
        const createSubGraph = (startIndex: number, graph: Map<number, Set<number>>) => {
            return new Map(
                [...graph]
                .filter(([node,]) => node >= startIndex)
                .map(([node, successors]) => [node, new Set([...successors].filter(x => x >= startIndex))]))
        }
        // Complexity: O(V + E)
        // Reference implementation: https://youcademy.org/tarjans-scc-algorithm/#implementation
        const computeStronglyConnectedComponentsTarajan = (graph: Map<number, Set<number>>): Array<Set<number>> => {
            // Stores discovery index of visited nodes
            const discoveryIndex = new Map<number, number>();
            // Stores the lowest discovery index reachable from the node
            const lowLink = new Map<number, number>();
            // All nodes that are not part of a strongly connected component are in the stack
            const stack = new Array<number>();
            const onStack = new Set<number>();
            // Counter for discovery index of nodes
            let counter = 0;
            const sccs = new Array<Set<number>>();

            const dfs = (currentNode: number) => {
                discoveryIndex.set(currentNode, counter);
                lowLink.set(currentNode, counter);
                counter++;
                stack.push(currentNode);
                onStack.add(currentNode);

                for (const successorNode of graph.get(currentNode)!) {
                    // If the successor has not been discovered yet, discover it
                    if (!discoveryIndex.has(successorNode)) {
                        dfs(successorNode);
                        lowLink.set(currentNode, Math.min(lowLink.get(currentNode)!, lowLink.get(successorNode)!));
                    } else if (onStack.has(successorNode)) {
                        lowLink.set(currentNode, Math.min(lowLink.get(currentNode)!, discoveryIndex.get(successorNode)!));
                    }
                }

                if (lowLink.get(currentNode) === discoveryIndex.get(currentNode)) {
                    const scc = new Set<number>();

                    while(stack.length > 0) {
                        const top = stack.pop()!;
                        onStack.delete(top);
                        scc.add(top);
                        if (top === currentNode)
                            break;
                    }
                    sccs.push(scc);
                }
            }

            for (const node of graph.keys()) {
                if (!discoveryIndex.has(node))
                    dfs(node);
            }
            return sccs
        }
        const leastIndexSCC = (sccs: Array<Set<number>>, subGraph: Map<number, Set<number>>): [number, Map<number, Set<number>>] | undefined => {
            let leastIndex = Number.MAX_VALUE;
            let minSCC = new Set<number>();
            for (const scc of sccs) {
                if (scc.size === 1)
                    continue;
                for (const vertex of scc) {
                    if (vertex < leastIndex) {
                        leastIndex = vertex;
                        minSCC = scc;
                    }
                }
            }
            if (leastIndex === Number.MAX_VALUE)
                return undefined

            let graphSCC = new Map<number, Set<number>> ();
            for (const [node, edges] of subGraph.entries()) {
                if (!minSCC.has(node))
                    continue;
                graphSCC.set(node, edges.intersection(minSCC))
            }
            return [leastIndex, graphSCC];
        }

        // removes the current node from the blocked set and all nodes that depend on the current node
        const unblock = (uNode: number) => {
            blockedSet.delete(uNode);
            if (blockedMap.has(uNode)) {
                for (const vNode of blockedMap.get(uNode)!) {
                    if (blockedSet.has(vNode)) {
                        unblock(vNode);
                    }
                }
                blockedMap.delete(uNode);
            }
        }
        const findCyclesInSCG = (startNode: number, currentNode: number, scc: Map<number, Set<number>>): boolean => {
            let foundCycle = false;
            stack.push(currentNode);
            blockedSet.add(currentNode);

            for (const successor of scc.get(currentNode)!) {
                // If the successor is the start node, we have found a cycle
                if (startNode === successor) {
                    let cycle: ReadonlyArray<id> = [];
                    stack.push(startNode);
                    let stackWithNodeIDs = stack.map(x => nodeNumberMapToNodeIdMap.get(x)!);
                    cycle = cycle.concat(stackWithNodeIDs);
                    stack.pop();
                    allCycles.add(cycle);
                    foundCycle = true;
                } else if (!blockedSet.has(successor)) {
                    let gotCycle = findCyclesInSCG(startNode, successor, scc);
                    foundCycle = foundCycle || gotCycle;
                }
            }

            if (foundCycle) {
                unblock(currentNode);
            } else {
                for (const successor of scc.get(currentNode)!) {
                    blockedMap.set(successor, blockedMap.get(successor)?.add(currentNode) ?? new Set([currentNode]));
                }
            }

            stack.pop();
            return foundCycle;
        }

        const graph = createGraphWithNumberIds();
        let allNodes = Array.from(graph.keys());
        let currentIndex = 1;
        
        while(currentIndex <= allNodes.length) {
            const subGraph = createSubGraph(currentIndex, graph);
            let sccs = computeStronglyConnectedComponentsTarajan(subGraph);
            let sccResult = leastIndexSCC(sccs, graph);

            if (sccResult !== undefined) {
                blockedSet.clear();
                blockedMap.clear();
                const [leastIndex, scc] = sccResult;
                findCyclesInSCG(leastIndex, leastIndex, scc);
                currentIndex = leastIndex + 1;
            } else {
                break;
            }
        }
        return allCycles;

    }

    private clockLess(clock1: clock , clock2: clock): boolean {
        let strictlyLess = false;
        for (const [key, value] of Object.entries(clock1) as [string, number][]) {
            if (value > (clock2[key] ?? 0))
                return false
            if (value < (clock2[key] ?? 0))
                strictlyLess = true
        }
        return strictlyLess
    }

    public benchmarkData: Omit<BenchmarkData, 'time'> = {
        cycles: 0,
        cycleResolutionSteps: 0,
        yEdges: 0,
        optimized: true,
        resolveInvalidEdgesTime: 0,
    }

    private removeCyclesOptimized(remainingCycles: Set<yEdgeInformation[]>, edgesContributingToCycles: Set<yEdgeInformation>): void {
        while (remainingCycles.size > 0) {
            const edgeIdxInYEdges = new Map(
                Array.from(this.yEdges).map((x, i) => [x.edgeId, i])
            );

            const renamedRemainingCycles = remainingCycles
            const edgeContributesToCyclesMap = new Map<EdgeId, Set<yEdgeInformation[]>>(
                [...edgesContributingToCycles].map((e) => [e.edgeId, new Set([...renamedRemainingCycles].filter(edges => edges.find(x => x === e) !== undefined))])
            )

            const clockCompareFn = (a: yEdgeInformation, b: yEdgeInformation) => {
                return this.clockLess(a.clock, b.clock) ? -1 : this.clockLess(b.clock, a.clock) ? 1 : 0
            }
            const cycleCountCompareFn = (a: yEdgeInformation, b: yEdgeInformation) => {
                return edgeContributesToCyclesMap.get(a.edgeId)!.size < edgeContributesToCyclesMap.get(b.edgeId)!.size 
                        ? -1 
                            : edgeContributesToCyclesMap.get(b.edgeId)!.size < edgeContributesToCyclesMap.get(a.edgeId)!.size 
                            ? 1 
                            : 0
            }
            const yIndexCompareFn = (a: yEdgeInformation, b: yEdgeInformation) => {
                return edgeIdxInYEdges.get(a.edgeId)! < edgeIdxInYEdges.get(b.edgeId)! 
                        ? -1 
                            : edgeIdxInYEdges.get(b.edgeId)! < edgeIdxInYEdges.get(a.edgeId)! 
                            ? 1 
                            : 0
            }

            const edgesContributingToCyclesSorted = 
                [...edgesContributingToCycles].sort(yIndexCompareFn).sort(cycleCountCompareFn).sort(clockCompareFn)

            const maxEdge = edgesContributingToCyclesSorted[edgesContributingToCyclesSorted.length - 1];
            const edgeIndex = edgeIdxInYEdges.get(maxEdge.edgeId);
            assert(edgeIndex !== undefined, 'Edge not found in yEdges, but is part of a cycle.')

            const edgeToBeRemoved = splitEdgeId(maxEdge.edgeId);
            this.removeEdge(edgeToBeRemoved[0], edgeToBeRemoved[1]);
            this.benchmarkData.cycleResolutionSteps++;

            const resolvedCycles = edgeContributesToCyclesMap.get(maxEdge.edgeId)!;
            remainingCycles = remainingCycles.difference(resolvedCycles);
            edgesContributingToCycles = new Set(Array.from(remainingCycles).flat()); 
        }

    }

    private removeCyclesNotOptimized(remainingCycles: Set<yEdgeInformation[]>, edgesContributingToCycles: Set<yEdgeInformation>): void {
        while (remainingCycles.size > 0) {
            const renamedRemainingCycles = remainingCycles
            const edgeContributesToCyclesMap = new Map<EdgeId, Set<yEdgeInformation[]>>(
                [...edgesContributingToCycles].map((e) => [e.edgeId, new Set([...renamedRemainingCycles].filter(edges => edges.find(x => x === e) !== undefined))])
            )
            const findEdgeIndex = (edgesContributingToCycles: Set<yEdgeInformation>) => {
                const reverseIdx = this.yEdges.toArray().reverse().findIndex((edge) => edgesContributingToCycles.has(edge));
                return this.yEdges.length - 1 - reverseIdx
            }
            const edgeIndex = findEdgeIndex(edgesContributingToCycles);
            assert(edgeIndex !== -1, 'Edge not found in yEdges, but is part of a cycle.')

            const edgeToBeRemoved = this.yEdges.get(edgeIndex).edgeId;
            const [source, target] = splitEdgeId(edgeToBeRemoved);
            this.removeEdge(source, target);
            this.benchmarkData.cycleResolutionSteps++;

            const resolvedCycles = edgeContributesToCyclesMap.get(edgeToBeRemoved)!;
            remainingCycles = remainingCycles.difference(resolvedCycles);
            edgesContributingToCycles = new Set(Array.from(remainingCycles).flat()); 
        }

    }

    public makeGraphValid(optimized: boolean = false): BenchmarkData {
        return this.yEdges.doc!.transact(() => {
            this.benchmarkData = {
                cycles: 0,
                cycleResolutionSteps: 0,
                optimized,
                yEdges: this.yEdges.length,
                resolveInvalidEdgesTime: 0,
            }
            const start = performance.now()

            const startInvalidEdgeTime = performance.now()
            this.yEdgesAsArray = this.yEdges.toArray();
            this.removeInvalidEdges();
            this.yEdgesAsArray = undefined;
            this.benchmarkData.resolveInvalidEdgesTime = performance.now() - startInvalidEdgeTime

            if (!this.isCyclic()) 
                return { ...this.benchmarkData, time: performance.now() - start }
            
            const cycles = this.getAllCyclesInDAG();
            this.benchmarkData.cycles = cycles.size;

            const cycleEdgeRepresentation = (cycles: Set<ReadonlyArray<id>>): Set<Array<yEdgeInformation>> => {
                return new Set(
                    Array.from(cycles)
                    .map(cycle => nodeListToEdgeList(cycle).flatMap(x => this.yEdges.toArray().find(y => y.edgeId === x)!)) 
                )
            }

            let remainingCycles = cycleEdgeRepresentation(cycles);
            let edgesContributingToCycles = new Set([...remainingCycles].flat());

            if (optimized) 
                this.removeCyclesOptimized(remainingCycles, edgesContributingToCycles);
            else 
                this.removeCyclesNotOptimized(remainingCycles, edgesContributingToCycles);

            return { ...this.benchmarkData, time: performance.now() - start }
        })
    }
    // Complexity: O(1)
    addNode(nodeId: id, label: string, position: XYPosition): void {
        const innerMap = this.makeNodeInformation({ 
            id: nodeId, 
            data : { label }, 
            position, 
            deletable: true, 
            // type: 'editNodeLabel',
        }, new Y.Map<EdgeInformation>());
        this.yMatrix.set(nodeId, innerMap);
    }
    // Complexity: O((V + E))
    addEdge(source: id, target: id, label: string): void {
        const edgeId: EdgeId = `${source}+${target}`;

        if (source === target) {
            //console.warn('Try to add edge, self loops are not allowed.')
            return
        }

        if (this.createsEdgeCycle(source, target)) {
            //console.warn('Cycle detected. Edge not added.');
            return
        }
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.yMatrix.get(source);
            const nodeInfo2 = this.yMatrix.get(target);
            if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
                //console.warn('one of the edge nodes does not exist', source, target)
                return 
            }
            nodeInfo1.get('edgeInformation').set(target, {label});
            this.yEdges.push([{edgeId, clock: Object.fromEntries(Y.decodeStateVector(Y.encodeStateVector(this.yMatrix.doc!)))}]);
        });
    }
    // Complexity: O(V + E)
    removeNode(nodeId: id): void {
        const nodeInfo = this.yMatrix.get(nodeId);
        if (nodeInfo === undefined)
            return

        this.yMatrix.doc!.transact(() => {

            for (const target of this.yMatrix.get(nodeId)!.get('edgeInformation').keys()) {
                this.filterRemovedEdgeInYEdges(`${nodeId}+${target}`);
            }

            this.yMatrix.delete(nodeId)
            for (const nodeInformation of this.yMatrix.values()) {
                if (!nodeInformation.get('edgeInformation').has(nodeId))
                    continue;
                
                nodeInformation.get('edgeInformation').delete(nodeId);
                const edgeId: EdgeId = `${nodeInformation.get('id')}+${nodeId}`;

                this.filterRemovedEdgeInYEdges(edgeId);

                this.selectedEdges.delete(edgeId);
            }
            this.selectedNodes.delete(nodeId);
        });
    }
    // Complexity: O(E)
    removeEdge(source: id, target: id): void {
        this.yMatrix.doc!.transact(() => {
            const innerMap = this.yMatrix.get(source);
            innerMap?.get('edgeInformation').delete(target);  

            const edgeId: EdgeId = `${source}+${target}`;
            this.filterRemovedEdgeInYEdges(edgeId);
            this.selectedEdges.delete(edgeId);
        });
    }

    static syncDefault(graphs: DirectedAcyclicGraph[], useVariant2: boolean = false) {
        return syncDefault(graphs, graphs.map(graph => graph.yMatrix.doc!), graph => graph.makeGraphValid(useVariant2))
    }
    static async syncPUS(graphs: DirectedAcyclicGraph[], maxSleepDur: number, networkDelay: number, rnd: (idx: number) => number, useVariant2: boolean = false) {
        return await syncPUSParSim(
            graphs,
            graphs.map(x => x.yMatrix.doc!),
            rnd,
            yDoc => new DirectedAcyclicGraph(yDoc),
            graph => !graph.hasInvalidEdges() && graph.isAcyclic(),
            graph => graph.makeGraphValid(useVariant2),
            maxSleepDur,
            networkDelay
        )
    }

    changeNodePosition(nodeId: id, position: XYPosition): void {
        throw new Error("Method not implemented.");
    }
    changeNodeDimension(nodeId: id, dimensions: { width: number; height: number; }): void {
        throw new Error("Method not implemented.");
    }
    changeNodeSelection(nodeId: id, selected: boolean): void {
        throw new Error("Method not implemented.");
    }
    changeEdgeSelection(edgeId: EdgeId, selected: boolean): void {
        throw new Error("Method not implemented.");
    }
    nodesAsFlow(): FlowNode[] {
        return Array.from(this.yMatrix.values()).map(x => {
            return {
                id: x.get('id'),
                data: { label: x.get('label') },
                position: x.get('position'),
                deletable: x.get('deletable'),
                measured: x.get('dimension'),
                selected: this.selectedNodes.has(x.get('id'))
            }
        })
    }
    edgesAsFlow(): FlowEdge[] {
        const nestedEdges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode, {label}]) => {
                    assert(this.yMatrix.get(targetNode) !== undefined, 'target node still dangling and contained')
                    const edgeId: EdgeId = `${sourceNode}+${targetNode}`;
                    return {
                        id: edgeId,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        data: { label },
                        label,
                        selected: this.selectedEdges.has(edgeId),
                    }
                })
            )

        return nestedEdges.flat()
    }
    getNode(nodeId: id): FlowNode | undefined {
        const nodeInfo = this.yMatrix.get(nodeId);
        if (nodeInfo === undefined)
            return undefined
        return {
            id: nodeInfo.get('id'),
            data: { label: nodeInfo.get('label') },
            position: nodeInfo.get('position'),
            deletable: nodeInfo.get('deletable'),
            measured: nodeInfo.get('dimension'),
            selected: this.selectedNodes.has(nodeId)
        }
    }
    getEdge(source: id, target: id): FlowEdge | undefined {
        this.removeDanglingEdges();
        let edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        if (edge === undefined)
            return undefined 

        const edgeId: EdgeId = `${source}+${target}`;
        return { 
            id: edgeId, 
            source, 
            target, 
            deletable: true, 
            markerEnd: {type: MarkerType.Arrow}, 
            data: {label: edge.label }, 
            selected: this.selectedEdges.has(edgeId), 
        }
    }
    isAcyclic(): boolean {
        return !this.isCyclic();
    }
    isNodeSelected(nodeId: id): boolean {
        return this.selectedNodes.has(nodeId);
    }
    isEdgeSelected(source: id, target: id): boolean {
        return this.selectedEdges.has(`${source}+${target}`);
    }
    getNodesAsJson(): string {
        return JSON.stringify(Array.from(this.yMatrix.keys()).sort());
    }
    getYEdgesAsJson(): string {
        return JSON.stringify(this.yEdges.toArray());
    }
    getEdgesAsJson(): string {
        let edges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode,]) => {
                    assert(this.yMatrix.get(targetNode) !== undefined, 'target node still dangling and contained');
                    return [sourceNode + '+' + targetNode]
                })).flat()
        return JSON.stringify(edges.sort());
    }

    get nodeIds(): string[] {
        return Array.from(this.yMatrix.keys());
    }

    get nodeCount(): number {
        return this.yMatrix.size;
    }
    get edgeCount(): number {
        return Array.from(this.yMatrix.values()).reduce((acc, x) => acc + x.get('edgeInformation').size, 0);
    }
    get yEdgeCount(): number {
        return this.yEdges.length;
    }
    get selectedNodesCount(): number {
        return this.selectedNodes.size;
    }
    get selectedEdgesCount(): number {
        return this.selectedEdges.size;
    }
    

    /**
     * This function generates a new Y.Doc and creates a new class instance.
     * @returns A newly created DAG on a newly copied Y.Doc
     */
    clone() {
        const doc = new Y.Doc()
        Y.applyUpdate(doc, Y.encodeStateAsUpdate(this.yMatrix.doc!))
        return new DirectedAcyclicGraph(doc)
    }
}