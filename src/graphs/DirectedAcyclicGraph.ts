import { MarkerType, XYPosition } from "@xyflow/react";
import { id, FlowNode, FlowEdge, ObjectYMap, EventEmitter } from "../Types";
import { Graph } from "./Graph";
import * as Y from 'yjs'

type EdgeInformation = {
    label: string
}
type NodeInformation = ObjectYMap<{
    flowNode: FlowNode
    // This map may contain dangling edges because of Yjs synchronization
    // Reading from this map should always takes this into account
    edgeInformation: Y.Map<EdgeInformation>
}>

export type AdjacencyMapGraph = Y.Map<NodeInformation>

function addToSet<T>(set: ReadonlySet<T>, item: T): ReadonlySet<T> {
    return new Set([item, ...set.values()])
}
function unionWithSets<T>(set1: ReadonlySet<T>, set2: ReadonlySet<T>): ReadonlySet<T> {
    return new Set([...set1.values(), ...set2.values()])
}

export class DirectedAcyclicGraph implements Graph {
    private yMatrix: AdjacencyMapGraph;
    private yEdges: Y.Array<id>;

    private selectedNodes: Set<id>;
    private selectedEdges: Set<id>;
    private eventEmitter: EventEmitter | undefined;

    constructor(yMatrix: AdjacencyMapGraph, yEdges: Y.Array<id>, eventEmitter?: EventEmitter) {
        
        this.yMatrix = yMatrix;
        this.yEdges = yEdges;
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

    private removeDanglingEdges() {
        for (const source of this.yMatrix.values()) {
            for (const target of source.get('edgeInformation').keys()) {
                if (this.yMatrix.get(target) !== undefined)
                    continue

                source.get('edgeInformation').delete(target);
                this.selectedEdges.delete(source.get('flowNode').id + '+' + target);
            }
        }
    }

    private makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>) {
        const res = new Y.Map() as NodeInformation;
        res.set('flowNode', node);
        res.set('edgeInformation', edges);
        return res
    }

    // returns either an empty array if no path exists
    // or an array of the format [source, ...intermediates..., target]
    private findPath(source: id, target: id, excludeSet?: ReadonlySet<id>): ReadonlyArray<id> {
        const sourceNode = this.yMatrix.get(source)
        
        if (sourceNode === undefined || excludeSet?.has(source) || excludeSet?.has(target))
            return []
        
        if (sourceNode.get('edgeInformation').has(target))
            return [source, target]

        const newExclude = 
            excludeSet === undefined ? new Set([source]) :
            addToSet(excludeSet, source)

        for (const inter of sourceNode.get('edgeInformation').keys()) {
            if (newExclude.has(inter)) {
                console.warn('Found cycle.')
                continue
            }

            const result = this.findPath(inter, target, newExclude)
            if (result.length !== 0)
                return [source, ...result]
        }

        return []
    }
    private findAllPaths(source: id, target: id, excludeSet?: ReadonlySet<id>): ReadonlySet<ReadonlyArray<id>> {
        const sourceNode = this.yMatrix.get(source)
        
        if (sourceNode === undefined || excludeSet?.has(source) || excludeSet?.has(target))
            return new Set()
        
        const oneEdgePaths: Set<ReadonlyArray<id>> = 
            sourceNode.get('edgeInformation').has(target) ?
            new Set([[source, target]]) : new Set()

        const newExclude = 
            excludeSet === undefined ? new Set([source]) :
            addToSet(excludeSet, source)

        const multiEdgePaths =
            new Set(
                Array.from(sourceNode.get('edgeInformation').keys())
                .filter(x => !newExclude.has(x))
                .map(x => this.findPath(x, target, newExclude))
                .filter(x => x.length !== 0)
                .map(path => [source, ...path])
            )
            
        
        return unionWithSets(multiEdgePaths, oneEdgePaths)
    }
    private nodeListToEdgeList(nodeList: ReadonlyArray<id>): ReadonlyArray<id> {
        if (nodeList.length < 2)
            return []

        return Array.from(
            new Array(nodeList.length).keys())
            .map(i => `${nodeList[i]}+${nodeList[(i + 1) % nodeList.length]}`)
    }
    // Returns a set of all paths described by an edge list
    private findAllCyclesFromEdge(edgeId: id): ReadonlySet<ReadonlyArray<id>> {
        const [source, target] = edgeId.split('+');
        const paths = this.findAllPaths(target, source);
        return new Set(Array.from(paths.values()).map(this.nodeListToEdgeList))
    }
    private willAddEdgeCreateCycle(edgeId: id): boolean {
        const [source, target] = edgeId.split('+');
        return this.findAllPaths(target, source).size !== 0;
    }
    private sameNodeCycle(nodeList1: ReadonlyArray<id>, nodeList2: ReadonlyArray<id>): boolean {
        if (nodeList1.length !== nodeList2.length)
            return false

        const startIn2 = nodeList2.indexOf(nodeList1[0])
        if (startIn2 < 0)
            return false

        for (let i = 0; i < nodeList1.length; i++)
            if (nodeList1[i] !== nodeList2[(i + startIn2) % nodeList2.length])
                return false

        return true
    }
    // Returns a set of all cycles from a node
    private findAllCyclesFromNode(nodeId: id): ReadonlySet<ReadonlyArray<id>> {
        const node = this.yMatrix.get(nodeId);
        if (node === undefined)
            return new Set()

        const successorNodes = Array.from(node.get('edgeInformation').keys())
        return successorNodes
            .filter(x => x !== nodeId)
            .map(x => this.findAllPaths(x, nodeId))
            .reduce(unionWithSets, new Set())
    }
    // Returns a set of all cycles in the graph. Cycles are represented as arrays of node ids.
    private findAllCycles(): ReadonlySet<ReadonlyArray<id>> {
        const allNodes = Array.from(this.yMatrix.keys())
        const duplicatedCycles = 
            allNodes.map(node => this.findAllCyclesFromNode(node))
            .flatMap(x => Array.from(x.values()))

        // this is just an elaborate .distinctBy(this.sameNodeCycle)
        return new Set(
            duplicatedCycles
            .filter((val, i) => 
                duplicatedCycles.findIndex(
                    otherVal => this.sameNodeCycle(val, otherVal)) 
                !== i)
        )
    }
    // Returns a set of all edgeIds that contribute to cycles
    public findAllEdgesContributingToCycles(): ReadonlySet<id> {
        return new Set(
            Array.from(this.findAllCycles())
            .flatMap(x => this.nodeListToEdgeList(x))
        )
    }

    private findEdgeIndex(edgesContributingToCycles: ReadonlySet<string>)  {
        const reverseIdx = this.yEdges.toArray().reverse().findIndex((edge: string) => edgesContributingToCycles.has(edge));
        return this.yEdges.length - 1 - reverseIdx
    }

    public removeCycles(): void {
        this.yEdges.doc!.transact(() => {
            let edgesContributingToCycles = this.findAllEdgesContributingToCycles(); 
            while (edgesContributingToCycles.size > 0) {
                console.log('Current edges with cycle', edgesContributingToCycles)
                const edgeIndex = this.findEdgeIndex(edgesContributingToCycles);
                if (edgeIndex < 0) {
                    console.warn('Edge not found in yEdges, but is part of a cycle.')
                    return
                }
                const edgeToBeRemoved = this.yEdges.get(edgeIndex).split('+')
                this.removeEdge(edgeToBeRemoved[0], edgeToBeRemoved[1])
                edgesContributingToCycles = this.findAllEdgesContributingToCycles()
            }
        })
    }
    
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
    addEdge(source: id, target: string, label: string): void {
        const edgeId = source + '+' + target;
        if (source === target) {
            console.warn('Try to add edge, self loops are not allowed.')
            return
        }

        if (this.willAddEdgeCreateCycle(edgeId)) {
            console.warn('Cycle detected. Edge not added.');
            return
        }
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.yMatrix.get(source);
            const nodeInfo2 = this.yMatrix.get(target);
            if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
                console.warn('one of the edge nodes does not exist', source, target)
                return 
            }
            nodeInfo1.get('edgeInformation').set(target, {label});
            console.log('added edge with label, edges', label, nodeInfo1.get('edgeInformation'));
            this.yEdges.push([edgeId]);
        });
    }
    removeNode(nodeId: id): void {
        const nodeInfo = this.yMatrix.get(nodeId);
        if (nodeInfo === undefined) {
            console.log('Node does not exist (removeNode)')
            return 
        }
        this.yMatrix.doc!.transact(() => {   
            this.yMatrix.delete(nodeId)
            for (const nodeInfo of this.yMatrix.values()) {
                nodeInfo.get('edgeInformation').delete(nodeId);
                const edgeId = nodeInfo.get('flowNode').id + '+' + nodeId;


                let edgeIndex;
                do {
                    edgeIndex = this.yEdges.toArray().findIndex(x => x === edgeId);  
                    if (edgeIndex !== -1)
                        this.yEdges.delete(edgeIndex);   
                } while(edgeIndex >= 0)

                this.selectedEdges.delete(edgeId);
            }
            this.selectedNodes.delete(nodeId);
        });
    }
    removeEdge(source: id, target: string): void {
        this.yMatrix.doc!.transact(() => {
            const innerMap = this.yMatrix.get(source);
            if (innerMap === undefined) {
                console.warn('Node does not exist');
                return 
            }
            console.log('removed edge', source, target);
            innerMap.get('edgeInformation').delete(target);

            const edgeId = source + '+' + target;
            let edgeIndex;
            do {
                edgeIndex = this.yEdges.toArray().findIndex(x => x === edgeId);  
                if (edgeIndex !== -1)
                    this.yEdges.delete(edgeIndex);   
            } while(edgeIndex >= 0)  

            this.selectedEdges.delete(edgeId);
        });
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
    changeEdgeSelection(edgeId: id, selected: boolean): void {
        throw new Error("Method not implemented.");
    }
    nodesAsFlow(): FlowNode[] {
        console.log('yMat', this.yMatrix);
        if (this.yMatrix === undefined)
            console.log('this', this);
        return Array.from(this.yMatrix.values()).map(x => {
            const flowNode = x.get('flowNode');
            console.log('node is selected', this.selectedNodes.has(flowNode.id), this.selectedNodes);
            return {
                ...flowNode,
                selected: this.selectedNodes.has(flowNode.id)
            }
        })
    }
    edgesAsFlow(): FlowEdge[] {
        console.log('before remove', this.yMatrix.get('node1')?.get('edgeInformation'));
        this.removeDanglingEdges();
        console.log('after remove', this.yMatrix.get('node1')?.get('edgeInformation'));

        const nestedEdges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode, {label}]) => {
                    if (this.yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained');
                    return {
                        id: sourceNode + '+' + targetNode,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        data: { label },
                        label,
                        selected: this.selectedEdges.has(sourceNode + '+' + targetNode),
                    }
                })
            )

        return nestedEdges.flat()
    }
    getNode(nodeId: id): FlowNode | undefined {
        return this.yMatrix.get(nodeId)?.get('flowNode');
    }
    getEdge(source: id, target: id): FlowEdge | undefined {
        this.removeDanglingEdges();
        let edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        if (edge === undefined)
            return undefined 
        return { 
            id: source + '+' + target, 
            source, 
            target, 
            deletable: true, 
            markerEnd: {type: MarkerType.Arrow}, 
            data: {label: edge.label }, 
            selected: this.selectedEdges.has(source + '+' + target), 
        }
    }
    isAcyclic(): boolean {
        return this.findAllCycles().size === 0;
    }
    isNodeSelected(nodeId: id): boolean {
        return this.selectedNodes.has(nodeId);
    }
    isEdgeSelected(source: id, target: id): boolean {
        return this.selectedEdges.has(source + '+' + target);
    }
    getYEdgesAsJson(): string {
        return JSON.stringify(this.yEdges.toArray());
    }
    getEdgesAsJson(): string {
        this.removeDanglingEdges();
        let edges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode,]) => {
                    if (this.yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained');
                    return [sourceNode + '+' + targetNode]
                })).flat()
        return JSON.stringify(edges.sort());
    }
    get nodeCount(): number {
        return this.yMatrix.size;
    }
    get edgeCount(): number {
        this.removeDanglingEdges();
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
    
}