import { XYPosition } from "@xyflow/react";
import { EdgeId, id, splitEdgeId } from "../Types";

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