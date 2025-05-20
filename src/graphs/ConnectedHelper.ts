import { XYPosition } from "@xyflow/react";
import { EdgeId, id, splitEdgeId } from "../Types";
import * as Y from 'yjs';

export type clock = {
    [client: string]: number | undefined
}

// O(ClientCount)
export function clockLeq(clock1: clock , clock2: clock): boolean {
    for (const [key, value] of Object.entries(clock1) as [string, number][]) {
        if (value > (clock2[key] ?? 0))
            return false
    }
    return true
}

// encodes a path as an ordered collection of nodes and edges like (edge - node)* - edge
export type Path<NodePayload, EdgePayload> = {
    // (edge - node)*
    edges: {
        edgePayload: EdgePayload,
        edgeId: EdgeId,
        nodePayload: NodePayload,
        nodeId: id,
        vectorclock: clock
    }[],
    // - edge
    finalEdge: {
        id: EdgeId,
        edgePayload: EdgePayload,
        vectorclock: clock
    }
}

export type EdgeInformationForRemovedEdges = {
    edgeId: EdgeId
    edgeLabel: string
    vectorclock: clock
}
export type EdgeInformationForRemovedEdgesWithNodeDirected = {
    nodeId: id
    nodeLabel: string
    nodePosition: XYPosition
    edgeInformation: Array<EdgeInformationForRemovedEdges>
    incomingNodes: Array<EdgeInformationForRemovedEdges>
} & EdgeInformationForRemovedEdges
export type EdgeInformationForRemovedEdgesWithNodeUndirected = {
    nodeId: id
    nodeLabel: string
    nodePosition: XYPosition
    edgeInformation: Array<EdgeInformationForRemovedEdges>
} & EdgeInformationForRemovedEdges


export type RemovedGraphElementDirected = 
    | { type: 'edge', item: EdgeInformationForRemovedEdges } 
    | { type: 'edgeWithNode', item: EdgeInformationForRemovedEdgesWithNodeDirected }
export type RemovedGraphElementUndirected = 
    | { type: 'edge', item: EdgeInformationForRemovedEdges } 
    | { type: 'edgeWithNode', item: EdgeInformationForRemovedEdgesWithNodeUndirected }

export type PathWithoutNodesDirected = Path<undefined, { label: string, usedRemovedElements: Set<RemovedGraphElementDirected> }>
export type PathWithoutNodesUndirected = Path<undefined, { label: string, usedRemovedElements: Set<RemovedGraphElementUndirected> }>

export type RestorablePathDirected = Path<{ label: string, position: XYPosition }, { label: string, usedRemovedElements: Set<RemovedGraphElementDirected> }>
export type RestorablePathUndirected = Path<{ label: string, position: XYPosition }, { label: string, usedRemovedElements: Set<RemovedGraphElementUndirected> }>

type RemovedGraphElement<T extends boolean> = T extends true ? RemovedGraphElementDirected : RemovedGraphElementUndirected
type PathWithoutNodes<T extends boolean> = Path<undefined, { label: string, usedRemovedElements: Set<RemovedGraphElement<T>> }>
type RestorablePath<T extends boolean> = Path<{ label: string, position: XYPosition }, { label: string, usedRemovedElements: Set<RemovedGraphElement<T>> }>



/**
 * Only defined on paths with at least one stored node.
 */
export function begin(path: Path<any, any>): id | undefined {
    if (path.edges.length === 0)
        return undefined

    const [source, target] = splitEdgeId(path.edges[0].edgeId)
    if (source === path.edges[0].nodeId)
        return target
    if (target === path.edges[0].nodeId)
        return source
}
/**
 * Only defined on paths with at least one stored node.
 */
export function end(path: Path<any, any>): id | undefined {
    if (path.edges.length === 0)
        return undefined

    const [source, target] = splitEdgeId(path.finalEdge.id)
    const lastNodeStored = path.edges[path.edges.length - 1].nodeId
    if (source === lastNodeStored)
        return target
    if (target === lastNodeStored)
        return source
}


/**
 * Calculates a complete list of paths with length m + 1, where items has also m set of paths.
 * @param paths The list of already calculated and complete paths. Assumes that at every index i, the paths of length i + 1 are stored.
 */
// O(path * hops * pathLength)
function findPathsOfLengthPlusOne<T extends boolean>(hops: RemovedGraphElement<T>[], paths: Array<PathWithoutNodes<T>>): Array<PathWithoutNodes<T>> {
    // O(1) 
    function tryAppendToPath<T extends boolean>(item: RemovedGraphElement<T>, path: PathWithoutNodes<T>): PathWithoutNodes<T> | undefined {
        const newNodes = new Set(splitEdgeId(item.item.edgeId))
        const oldNodes = new Set(splitEdgeId(path.finalEdge.id))
        const commons = newNodes.intersection(oldNodes)
        if (commons.size !== 1)
            return undefined
    
        const commonNode = commons.values().next().value!

        if (path.edges.some(edge => edge.nodeId === commonNode))
            return undefined
        
        return {
            edges:
                [...path.edges, {
                    edgePayload: path.finalEdge.edgePayload,
                    edgeId: path.finalEdge.id,
                    nodePayload: undefined,
                    nodeId: commonNode,
                    vectorclock: path.finalEdge.vectorclock
                }],
            finalEdge: {
                id: item.item.edgeId,
                edgePayload: { 
                    label: item.item.edgeLabel,
                    usedRemovedElements: new Set([item])
                },
                vectorclock: item.item.vectorclock
            }
        }
    }

    if (paths.length === 0)
        // nothing useful can be done
        return []
    
    
    // the combination of all paths will have length m + 1, and will also be complete
    return paths.flatMap(longPath => 
        // for each path of length m, calculate all combinations with paths of length 1
        // try to combine `path` with all items in `first` - may return an empty array, if no combination can be built
        hops.flatMap(hop => {
            // do not create cycles
            if (longPath.edges.some(x => x.edgeId === hop.item.edgeId) || longPath.finalEdge.id === hop.item.edgeId)
                return []

            const possiblePath = tryAppendToPath(hop, longPath)
            if (possiblePath === undefined)
                return []
            else
                return [possiblePath]
        })
    )
}

// O(removedGraphElements!)
export function findAllPaths<T extends boolean>(graphElements: Array<RemovedGraphElement<T>>): Set<RestorablePath<T>> {
    // index i in result stores all paths of length i + 1
    const result: PathWithoutNodes<T>[][] = [graphElements.map(x => {
        return {
            edges: [],
            finalEdge: {
                id: x.item.edgeId,
                edgePayload: {
                    label: x.item.edgeLabel,
                    usedRemovedElements: new Set([x])
                },
                vectorclock: x.item.vectorclock
            },
        }
    })]
    
    // first, calculate paths of length 2
    // O(removedGraphElements^2)
    let toAppend = findPathsOfLengthPlusOne(graphElements, result[0])

    // O(Vrm * (Vrm!* removedGraphElements * Vrm))
    // => O(removedGraphElements!)
    while (toAppend.length > 0) {
        // append if they exist
        result.push(toAppend)
        // find paths of length +1
        // repeat until none is found
        toAppend = findPathsOfLengthPlusOne(graphElements, result[result.length - 1])
    }
    
    // all paths have been found
    // paths ^= O(removedGraphElements!)
    // O (removedGraphElements! * edges * removedGraphElements) = O(removedGraphElements!)
    return new Set(
        result
        .flat()
        .map<RestorablePath<T> | undefined>(path => {
            const mappedEdges = path.edges.map(edge => {
                const node = graphElements.find((x): x is { type: 'edgeWithNode', item: EdgeInformationForRemovedEdgesWithNodeDirected } => 
                    x.type === 'edgeWithNode' && x.item.nodeId === edge.nodeId)

                if (node === undefined)
                    return undefined

                return {
                    edgeId: edge.edgeId,
                    nodeId: edge.nodeId,
                    edgePayload: {
                        usedRemovedElements: edge.edgePayload.usedRemovedElements.union(new Set([node])),
                        label: edge.edgePayload.label
                    },
                    nodePayload: {
                        label: node.item.nodeLabel,
                        position: node.item.nodePosition
                    },
                    vectorclock: edge.vectorclock
                }
            })

            const cleaned = mappedEdges.filter(x => x !== undefined)
            if (cleaned.length < mappedEdges.length)
                return undefined
            else
                return {
                    finalEdge: path.finalEdge,
                    edges: cleaned
                }
        })
        .filter(x => x !== undefined)
    )
}
/**
 * 
 * @param connectedComponents Holds all connected components in the graph. The union of all connected components is the whole graph.
 * @param componentsToBeMerged Components to be merged
 * @param connectingNodes Nodes used to connect the two components
 * @returns Connected components with comp1, comp2 and connectingNodes merged. 
 */
// O(V^2)
export function mergeComponents(connectedComponents: Set<Set<id>>, componentsToBeMerged: Set<Set<id>>, connectingNodes: Set<id> = new Set()): Set<Set<id>> {
    let mergedComponents = new Set<string>();
    let componentsSet = new Set(connectedComponents)

    for (const componentToBeMerged of componentsToBeMerged) {
        componentsSet = componentsSet.difference(new Set([componentToBeMerged]));
        mergedComponents = mergedComponents.union(componentToBeMerged);
    }

    return componentsSet.union(new Set([mergedComponents.union(connectingNodes)]));
}

// O(PathsInRemovedGraphElements * V^2 + (danglingEdges + V^2 + pathsInRemovedGraphElements))
export function computePathConnectingComponentsVar1<T extends boolean>(connectedComponents: Set<Set<id>>, allPathsSorted: [RestorablePath<T>, BigInt][], danglingEdges: Set<RemovedGraphElement<T>>): [RestorablePath<T>, Set<RemovedGraphElement<T>>, Set<Set<id>>,  BigInt[]] | undefined {
    for (const [path, ] of allPathsSorted) {
        const first = begin(path) ?? splitEdgeId(path.finalEdge.id)[0]
        const last = end(path) ?? splitEdgeId(path.finalEdge.id)[1]
        for (const component of connectedComponents) {
            for (const otherComponent of connectedComponents) {
                if (component === otherComponent)
                    continue
                if ((component.has(first) && otherComponent.has(last)) || 
                    (otherComponent.has(first) && component.has(last)) 
                ) {
                    const pathNodes = new Set(path.edges.map(x => x.nodeId));
                    const danglingEdgesInPath = 
                        new Set(
                            Array.from(danglingEdges)
                            .filter(x => splitEdgeId(x.item.edgeId).some(y => pathNodes.has(y)))
                            .filter(x => splitEdgeId(x.item.edgeId).every(node => pathNodes.has(node) 
                            || [...connectedComponents].some(comp => comp.has(node))))
                        );
                    const danglingEdgeNodesToBeRestored = new Set([...danglingEdgesInPath].map(x => splitEdgeId(x.item.edgeId)).flat());

                    const componentsToBeMerged = 
                        new Set(
                            Array.from(connectedComponents)
                            .filter(x => x.intersection(danglingEdgeNodesToBeRestored).size > 0)
                        ).union(new Set([component, otherComponent]))
                    
                    const mergedComponents = mergeComponents(connectedComponents, componentsToBeMerged, pathNodes)

                    // filter paths which would only connect nodes which are already connected (e.g. a path is contained in a connected component)
                    const pathsContainedInConnectedComponents =
                        allPathsSorted
                        .filter(x => [...mergedComponents].some(mc => mc.isSupersetOf(new Set(x[0].edges.flatMap(y => splitEdgeId(y.edgeId)).concat(splitEdgeId(x[0].finalEdge.id))))))
                        .map(x => x[1])

                    return [path, danglingEdgesInPath, mergedComponents, pathsContainedInConnectedComponents];
                }
            }
        }
    }
    return undefined
}

// O(pathsInRemovedGraphElements * (pathlength + danglingEdges + components * O(V))) 
// + 2 * O(paths log(paths))
// + O(paths log(paths) * pathlength^2)
// + O((PathsInRemovedGraphElements + (V^2 + pathsInRemovedGraphElements)))
// => O(pathsInRemovedGraphElements * (pathlength + danglingEdges + components * O(V))) + O(paths log(paths) * pathlength^2) + V^2 
export function computePathConnectingComponentsVar2<T extends boolean>(connectedComponents: Set<Set<id>>, allPathsSorted: [RestorablePath<T>, BigInt][], danglingEdges: Set<RemovedGraphElement<T>>): [RestorablePath<T>, Set<RemovedGraphElement<T>>, Set<Set<id>>,  BigInt[]] | undefined {
    // Sort by the number of components a path connects (descending)
    // O(PathsInRemovedGraphElements * (pathlength + danglingEdges + danglingEdges + O(V) + components * O(V))
    // O(pathsInRemovedGraphElements * (pathlength + danglingEdges + components * O(V)))
    const connectingComponentsCountPerPath = new Map<RestorablePath<T>, [Set<string>, Set<Set<id>>, Set<RemovedGraphElement<T>>]>(allPathsSorted.map(([path, cost]) => {

        const start = begin(path) ?? splitEdgeId(path.finalEdge.id)[0]
        const ending = end(path) ?? splitEdgeId(path.finalEdge.id)[1]

        if (![...connectedComponents].some(component => component.has(start))
            || ![...connectedComponents].some(component => component.has(ending)))
            return [path, [new Set(), new Set(), new Set()]]

        const allVisitedNodes = new Set(path.edges.flatMap(x => splitEdgeId(x.edgeId)).concat(splitEdgeId(path.finalEdge.id)));

        if (![...allVisitedNodes].every(node => 
            node === start || node === ending
                ? [...connectedComponents].some(component => component.has(node))
                : [...connectedComponents].every(component => !component.has(node))))
            return [path, [new Set(), new Set(), new Set()]]


        const danglingEdgesInPath = 
            new Set(
                Array.from(danglingEdges)
                .filter(x => splitEdgeId(x.item.edgeId).some(y => allVisitedNodes.has(y)))
                .filter(x => splitEdgeId(x.item.edgeId).every(node => allVisitedNodes.has(node) 
                    || [...connectedComponents].some(comp => comp.has(node)))
                )
            );

        const danglingEdgeNodesToBeRestored = new Set([...danglingEdgesInPath].map(x => splitEdgeId(x.item.edgeId)).flat());

        const allNodesToBeRestored = allVisitedNodes.union(danglingEdgeNodesToBeRestored);

        return [path, [allVisitedNodes, new Set([...connectedComponents].filter(component => 
            component.intersection(allNodesToBeRestored).size > 0)
        ), danglingEdgesInPath]]
    }))

    // O(paths log(paths))
    const pathsSortedByComponentCount = allPathsSorted.toSorted(([path1], [path2]) => connectingComponentsCountPerPath.get(path2)![1].size - connectingComponentsCountPerPath.get(path1)![1].size)

    // Sort by vc (causal order)
    // put those paths in front which are greater on all clocks than other paths
    // (note that this will have to return 0 for concurrently deleted paths)

    // O(paths log(paths) * pathlength^2)
    const pathsSortedByCausality = pathsSortedByComponentCount.toSorted(([path1], [path2]) => {
        const vcs1 = path1.edges.map(edge => edge.vectorclock).concat(path1.finalEdge.vectorclock)
        const vcs2 = path2.edges.map(edge => edge.vectorclock).concat(path2.finalEdge.vectorclock)

        const vcs1leq2 = vcs1.every(vc1 => vcs2.every(vc2 => clockLeq(vc1, vc2)))
        const vcs2leq1 = vcs1.every(vc1 => vcs2.every(vc2 => clockLeq(vc2, vc1)))

        if (vcs1leq2 === vcs2leq1)
            // this covers the case if both are true and both are false
            // so if both are equal or they are concurrent
            return 0

        if (vcs1leq2)
            return -1
        
        
        return 1
    })

    // O(PathsInRemovedGraphElements + (V^2 + pathsInRemovedGraphElements))
    for (const [path, ] of pathsSortedByCausality) {
        const [pathNodes, componentsToBeMerged, danglingEdgesInPath] = connectingComponentsCountPerPath.get(path)!
        if (componentsToBeMerged.size > 1) {
            const mergedComponents = mergeComponents(connectedComponents, componentsToBeMerged, pathNodes)
            const pathsContainedInConnectedComponents =
                allPathsSorted
                .filter(x => [...mergedComponents].some(mc => mc.isSupersetOf(new Set(x[0].edges.flatMap(y => splitEdgeId(y.edgeId)).concat(splitEdgeId(x[0].finalEdge.id))))))
                .map(x => x[1])

            return [path, danglingEdgesInPath, mergedComponents, pathsContainedInConnectedComponents];
        } 
    }

    return undefined
}




type GraphInRemovedElems<T extends boolean> = Map<id, Map<id, RemovedGraphElement<T>[]>>

export function computeAdjacencyMapGraphFromRemovedGraphElements<T extends boolean>(removedGraphElements: RemovedGraphElement<T>[]) {
    const graph: GraphInRemovedElems<T> = new Map()
    
    for(const removedGraphElem of removedGraphElements) {
        const [source, target] = splitEdgeId(removedGraphElem.item.edgeId)
        const ls = graph.get(source)
        if (ls === undefined)
            graph.set(source, new Map([[target, [removedGraphElem]]]))
        else {
            const inner = ls.get(target)
            if (inner === undefined)
                ls.set(target, [removedGraphElem])
            else
                inner.push(removedGraphElem)
        }
    
        const ls2 = graph.get(target)
        if (ls2 === undefined)
            graph.set(target, new Map([[source, [removedGraphElem]]]))
        else {
            const inner = ls2.get(source)
            if (inner === undefined)
                ls2.set(source, [removedGraphElem])
            else
                inner.push(removedGraphElem)
        }
    }

    return graph
}

/**
 * Calculates a path connecting two components. Returns the path to be restored, a set of dangling edges 
 * which are used in the path and the merged components. Undefined if no path was found
 * @param connectedComponents 
 * @param graph 
 * @param danglingEdges 
 */
export function computePathConnectingComponentsVar3<T extends boolean>(
    connectedComponents: Set<Set<id>>,
    graph: GraphInRemovedElems<T>,
    danglingEdges: Set<RemovedGraphElementDirected>
    ): [RestorablePath<T>, Set<RemovedGraphElementDirected>, Set<Set<id>>] | undefined
{
    // idea: try to connect components [0] and [1]. If on the way a node is found which is
    //       already part of the graph, terminate, we have connected two components.

    if (connectedComponents.size < 2)
        return undefined

    const components = [...connectedComponents]
    const nodesInGraph = components.flatMap(x => [...x])

    const startItems = 
        [...components[0]]
        // the starting component may contain nodes which are not connected to any removed element
        // e.g. they are 'inside' of the component
        .filter(x => graph.has(x))

    const queue: [id, id[]][] = startItems.map<[id, id[]]>(x => [x, []])
    const handledIds = new Set()
    while (true) {
        // get next queue item
        const nextQueueItem = queue.shift()
        if (nextQueueItem === undefined)
            break

        const [node, prevPath] = nextQueueItem

        // check if already handled
        if (handledIds.has(node))
            continue

        handledIds.add(node)

        const currentPath = [...prevPath, node]

        // add neighbors
        for (const neighbor of graph.get(node)!.keys())
            queue.push([neighbor, currentPath])

        // -------
        // check if path connects to another component
        // -------

        // this are the nodes that need to be restored
        const nodesInBetween = prevPath.slice(1)

        // check if we are still in the start component
        // if so, we have not connected to another component
        if (startItems.includes(node))
            continue

        const componentsContainingNode = 
            components.filter(comp => comp.has(node))

        if (componentsContainingNode.length === 0)
            continue

        // we now know that this node is contained in a component different from the start component
        // -> we have found a path
        if (componentsContainingNode.length > 1 || currentPath.length === 1)
            throw new Error('should not happen, more than one component contains the node')

        const danglingEdgesToBeRestored = 
            new Set(
                [...danglingEdges]
                .filter(dang => {
                    const [node1, node2] = splitEdgeId(dang.item.edgeId)
                    return (nodesInGraph.includes(node1) && nodesInBetween.includes(node2)) ||
                        (nodesInBetween.includes(node1) && nodesInGraph.includes(node2))
                })
            )

        const mergedComponents = mergeComponents(
            connectedComponents,
            new Set([
                components[0],
                componentsContainingNode[0],
                ...components.filter(x => [...danglingEdgesToBeRestored].some(d => splitEdgeId(d.item.edgeId).some(n => x.has(n))))]),
            new Set(nodesInBetween)
        )

        const mappingToEdges: RestorablePath<T>['finalEdge'][] = 
            currentPath
            .map<RestorablePath<T>['finalEdge'] | undefined>((id, idx) => {
                if (idx === 0)
                    return undefined
                const prevId = currentPath[idx - 1]
                // edge connects id and prevId
                const elemsConnecting = graph.get(id)!.get(prevId)!
                const matchingElems =
                    elemsConnecting
                    .filter(x => x.item.edgeId === `${id}+${prevId}` || x.item.edgeId === `${prevId}+${id}`)

                if (matchingElems.length === 0) {
                    // ????
                    throw new Error('Elems in the graph map do not match the stored items or there are no elems in the graph?')
                }

                // this is an arbitrary choice, maybe there are multiple elements matching?
                const elem = matchingElems[0]

                return {
                    edgePayload: {
                        label: elem.item.edgeLabel,
                        usedRemovedElements: new Set([elem])
                    },
                    vectorclock: elem.item.vectorclock,
                    id: elem.item.edgeId
                }
            })
            .filter(x => x !== undefined)

        const path: RestorablePath<T> = 
            {
                edges: mappingToEdges.slice(0, -1).map((edge, i) => {
                    const matchingRemovedNodeElems = 
                        [...graph.get(nodesInBetween[i])!.keys()]
                        .flatMap(key => graph.get(nodesInBetween[i])!.get(key)!)
                        .filter(elem => elem.type === 'edgeWithNode' && elem.item.nodeId === nodesInBetween[i])

                    if (matchingRemovedNodeElems.length !== 1) {
                        console.warn('Could not find exactly one item to restore node')
                    }

                    const nodeElem = matchingRemovedNodeElems[0] as RemovedGraphElementDirected & { item: EdgeInformationForRemovedEdgesWithNodeDirected }
                    return {
                        edgeId: edge.id,
                        edgePayload: {
                            label: edge.edgePayload.label,
                            usedRemovedElements: edge.edgePayload.usedRemovedElements.union(new Set([nodeElem]))
                        },
                        vectorclock: edge.vectorclock,
                        nodeId: nodeElem.item.nodeId,
                        nodePayload: {
                            label: nodeElem.item.nodeLabel,
                            position: nodeElem.item.nodePosition
                        }
                    }
                }),
                finalEdge: mappingToEdges.at(-1)!
            }

        return [path, danglingEdgesToBeRestored, mergedComponents]
        
    }

    return undefined
}



export function removeDuplicatesInRemovedGraphElements<T extends boolean>(directed: T, removedGraphElements: Y.Array<RemovedGraphElement<T>>) {
        // removes duplicates of removedGraphElements
        removedGraphElements
        .toArray()
        // map to undefined or index to delete (undefined should be kept)
        .map((v, idx, arr) => {
            const prev = arr.slice(idx + 1)
            const prevIdx = prev.findIndex(v2 => {
                if (v.type !== v2.type)
                    return false
                if (directed && v2.item.edgeId !== v.item.edgeId)
                    return false
                if (!directed && (v2.item.edgeId !== v.item.edgeId && `${splitEdgeId(v.item.edgeId)[1]}+${splitEdgeId(v.item.edgeId)[0]}` !== v2.item.edgeId))
                    return false
                if (v.type === 'edgeWithNode' && v2.type === 'edgeWithNode')
                    return v.item.nodeId === v2.item.nodeId
                return false
            })
            if (prevIdx >= 0)
                return idx
            else
                return undefined
        })
        .reverse()
        .forEach(v => { if (v !== undefined) removedGraphElements.delete(v) })
}


export type BenchmarkData = {
    danglingEdges: number,
    connectedComponents: number,
    paths: number,
    restoredNodesWithEdges: number,
    restoredEdges: number,
    restoredPaths: {
        length: number
        time: number
    }[],
    pathInitalizationTime: number,
    totalTime: number,
    resolveInvalidEdgesTime: number,
    removedGraphElementsCount: number,
    restoreSingleGraphElementsTime: number
}