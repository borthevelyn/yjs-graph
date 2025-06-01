import { XYPosition } from "@xyflow/react";
import { EdgeId, id, splitEdgeId } from "../Types";
import * as Y from 'yjs';

// encodes a path as an ordered collection of nodes and edges like (edge - node)* - edge
export type Path<NodePayload, EdgePayload> = {
    // (edge - node)*
    edges: {
        edgePayload: EdgePayload,
        edgeId: EdgeId,
        nodePayload: NodePayload,
        nodeId: id,
    }[],
    // - edge
    finalEdge: {
        id: EdgeId,
        edgePayload: EdgePayload,
    }
}

export type EdgeInformationForRemovedEdges = {
    edgeId: EdgeId
    edgeLabel: string
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
                    nodeId: commonNode
                }],
            finalEdge: {
                id: item.item.edgeId,
                edgePayload: { 
                    label: item.item.edgeLabel,
                    usedRemovedElements: new Set([item])
                }
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
                }
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
                    }
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



// O(C + V)
export function mergeComponents(connectedComponents: Set<Set<id>>, componentsToBeMerged: Set<Set<id>>, connectingNodes: Set<id> = new Set()): Set<Set<id>> {
    let mergedComponents = new Set<string>();
    let componentsSet = new Set(connectedComponents)


    // all unions on the component set result in at most V elements in componentsSet
    // the cost of all unions is at most that together

    // the changes on componentsSet are at most C many with all being in constant time

    for (const componentToBeMerged of componentsToBeMerged) {
        componentsSet.delete(componentToBeMerged)
        // componentsSet = componentsSet.difference(new Set([componentToBeMerged]));
        mergedComponents = mergedComponents.union(componentToBeMerged);
    }

    componentsSet.add(mergedComponents.union(connectingNodes))
    return componentsSet
}

// O(V + PE! * C^2 + (DE + C + V + PE!))
export function findConnectingPath<T extends boolean>(connectedComponents: Set<Set<id>>, allPathsSorted: [RestorablePath<T>, BigInt][], danglingEdges: Set<RemovedGraphElement<T>>): [RestorablePath<T>, Set<RemovedGraphElement<T>>, Set<Set<id>>,  BigInt[]] | undefined {
    // O(V)
    const allNodes = new Set([...connectedComponents].flatMap(x => [...x]))
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
                    // O(DE)
                    const danglingEdgesInPath = 
                        new Set(
                            Array.from(danglingEdges)
                            .filter(x => splitEdgeId(x.item.edgeId).some(y => pathNodes.has(y)))
                            .filter(x => splitEdgeId(x.item.edgeId).every(node => pathNodes.has(node) 
                            || allNodes.has(node)))
                        );
                    const danglingEdgeNodesToBeRestored = new Set([...danglingEdgesInPath].map(x => splitEdgeId(x.item.edgeId)).flat());

                    // O(C + V)
                    const componentsToBeMerged = 
                        new Set(
                            Array.from(connectedComponents)
                            // x has, over all iterations, at most V elements
                            // isDisjointFrom can be done using that many `has` operations (O(1))
                            .filter(x => !x.isDisjointFrom(danglingEdgeNodesToBeRestored))
                        ).union(new Set([component, otherComponent]))
                    
                    // O(C + V)
                    const mergedComponents = mergeComponents(connectedComponents, componentsToBeMerged, pathNodes)

                    // filter paths which would only connect nodes which are already connected (e.g. a path is contained in a connected component)
                    // O(PE!)
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


type GraphInRemovedElems<T extends boolean> = Map<id, Map<id, RemovedGraphElement<T>[]>>


// O(R)
export function computeMapGraphFromRemovedElements<T extends boolean>(removedGraphElements: RemovedGraphElement<T>[]) {
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
// Init: O(C + V)
// Iteration: O(PE)
// Result: O(PL + DE + C + V + PE)
export function computePathInGraph<T extends boolean>(
    connectedComponents: Set<Set<id>>,
    graph: GraphInRemovedElems<T>,
    danglingEdges: Set<RemovedGraphElementDirected>
    ): [RestorablePath<T>, Set<RemovedGraphElementDirected>, Set<Set<id>>] | undefined
{
    // idea: try to connect components [0] and [1]. If on the way a node is found which is
    //       already part of the graph, terminate, we have connected two components.

    if (connectedComponents.size < 2)
        return undefined

    // O(C)
    const components = [...connectedComponents]
    // O(V)
    const nodesInComponents = new Set(components.flatMap(x => [...x]))

    // O(V)
    const startItems = 
        [...components[0]]
        // the starting component may contain nodes which are not connected to any removed element
        // e.g. they are 'inside' of the component
        .filter(x => graph.has(x))

    // only required to have constnat time has-check
    const startItemsAsSet = new Set(startItems)

    const queue: [id, id[]][] = startItems.map<[id, id[]]>(x => [x, []])
    // will grow for up to O(PE)
    const handledIds = new Set()
    // at most O(PE) many iterations
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
        // each neighbor is handled only once, so the push operations distribute
        // and each push can be seen as constant in time
        for (const neighbor of graph.get(node)!.keys())
            queue.push([neighbor, currentPath])

        
        // -------
        // check if path connects to another component
        // -------

        // check if we are still in the start component
        // if so, we have not connected to another component
        if (startItemsAsSet.has(node))
            continue


        if (!nodesInComponents.has(node))
            continue

        // we now know that this node is contained in a component different from the start component
        // -> we have found a path
        // -> all of the following operations are executed only once

        // O(C)
        const componentsContainingNode = 
            components.filter(comp => comp.has(node))

        if (componentsContainingNode.length > 1 || currentPath.length === 1)
            throw new Error('should not happen, more than one component contains the node')


        // this are the nodes that need to be restored
        // O(PL)
        const nodesInBetween = prevPath.slice(1)
        const nodesInBetweenSet = new Set(nodesInBetween)

        // O(DE)
        const danglingEdgesToBeRestored = 
            new Set(
                [...danglingEdges]
                .filter(dang => {
                    const [node1, node2] = splitEdgeId(dang.item.edgeId)
                    return (nodesInComponents.has(node1) && nodesInBetweenSet.has(node2)) ||
                        (nodesInBetweenSet.has(node1) && nodesInComponents.has(node2))
                })
            )

        // O(DE)
        const danglingEdgeNodesToBeRestored = new Set([...danglingEdgesToBeRestored].map(x => splitEdgeId(x.item.edgeId)).flat());
        // O(C + V)
        const componentsToBeMerged = 
            new Set(
                components
                // x has, over all iterations, at most V elements
                // isDisjointFrom can be done using that many `has` operations (O(1))
                .filter(x => !x.isDisjointFrom(danglingEdgeNodesToBeRestored))
            ).union(new Set([components[0], componentsContainingNode[0]]))

        // O(C + V)
        const mergedComponents = mergeComponents(
            connectedComponents,
            componentsToBeMerged,
            nodesInBetweenSet
        )

        // O(PL + PE)
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
                    id: elem.item.edgeId
                }
            })
            .filter(x => x !== undefined)

        // O(PL + PE)
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

// O(R) + O(duplicate * delete)
export function removeDuplicatesInRemovedGraphElements<T extends boolean>(directed: T, removedGraphElements: Y.Array<RemovedGraphElement<T>>) {
    const edgeIdSet = new Set<string>()
    for (let i = removedGraphElements.length - 1; i >= 0; i--) {
        const prevSize = edgeIdSet.size

        // insert the new elem into the set
        {
            const elem = removedGraphElements.get(i)
            const typeComp = elem.type === 'edge'
                ? 'e'
                : `n${elem.item.nodeId}`
            const idComp: EdgeId =
                directed
                ? elem.item.edgeId
                // for the undirected variant, the edge 1+2 and 2+1 are identical. sort them and take the first
                // the selected edge id will always be 1+2
                : [elem.item.edgeId, `${splitEdgeId(elem.item.edgeId)[1]}+${splitEdgeId(elem.item.edgeId)[0]}` as EdgeId].sort()[0]

            edgeIdSet.add(`${typeComp}-${idComp}`)
        }

        if (prevSize < edgeIdSet.size)
            continue

        // the inserted element was a duplicate
        // ----
        // as delete is not in O(1), the duplicate removal process isn't either
        // by creating a filtered array where the distinct items are pushed into, the
        // algorithm would get a runtime of O(1), but then we would have to clear the map
        // and push new items with every call, potentially harming the performance of 
        // Yjs synchronization
        removedGraphElements.delete(i)
    }
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