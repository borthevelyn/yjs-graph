import { FixedRootConnectedUndirectedGraph } from "../graphs/FixedRootConnectedUndirectedGraph"
import { FixedRootWeaklyConnectedGraph } from "../graphs/FixedRootWeaklyConnectedGraph"
import { Graph } from "../graphs/Graph"

export enum InitialGraph {
    /**
     * The initial graph is not relevant for this test.
     */
    DontCare = 'Dont care',
    /**
     * The graph is either empty at the start or maybe has a root node.
     */
    Empty = 'Empty',
    /**
     * A line with root graph is graph where each is connected to the previous node and each node is also directly connected to the root.
     * That means, each node has two incoming connections and one outgoing connection (excluding root).
     */
    LineWithRoot = 'Line With Root Graph',
    /**
     * Refer to the common definition (thus not suited for DAGs)
     */
    Complete = 'Complete Graph',
    /**
     * This can be used for DAGs: Ignoring the edge direction, this is a complete graph: Otherwise, this can be thought of as a complete
     * tree connecting all nodes of any upper level to all nodes of any lower level.
     */
    AcyclicComplete = 'Acyclic Complete Graph',
    /**
     * A line graph where each node connects only to its predecessor, but each also has an outgoing connection to another node with no other connections.
     */
    LineWithRays = 'Line With Rays',
}

export function makeCompleteGraph(g: Graph, count: number) {
    for (let i = 0; i < count; i++){
        g.addNode(i.toString(), 'label', { x: 0, y: 0 })
    }
    for (let i = 0; i < count; i++)
        for (let j = i; j < count; j++) {
            g.addEdge(i.toString(), j.toString(), 'label')
            g.addEdge(j.toString(), i.toString(), 'label')
        }
}

export function makeCompleteFRWCG(g: FixedRootWeaklyConnectedGraph, count: number) {
    g.addNodeWithEdge('0', '<-', 'root', 'label', { x: 0, y: 0 }, 'label');
    g.addEdge('root', '0', 'label')
    for (let i = 0; i < count; i++) {
        const nodeToAdd = i + 1
        g.addNodeWithEdge(nodeToAdd.toString(), '->', i.toString(), 'label', { x: 0, y: 0 }, 'label')

        for (let j = 0; j < nodeToAdd; j++) {
            g.addEdge(j.toString(), nodeToAdd.toString(), 'label')
            g.addEdge(nodeToAdd.toString(), j.toString(), 'label')
        }
        g.addEdge('root', nodeToAdd.toString(), 'label')
        g.addEdge(nodeToAdd.toString(), 'root', 'label')
    }
}

export function makeCompleteFRCUG(g: FixedRootConnectedUndirectedGraph, count: number) {
    g.addNodeWithEdge('0', 'root', 'label', { x: 0, y: 0 }, 'label');
    for (let i = 0; i < count; i++) {
        const nodeToAdd = i + 1
        g.addNodeWithEdge(nodeToAdd.toString(), i.toString(), 'label', { x: 0, y: 0 }, 'label')

        for (let j = 0; j < nodeToAdd; j++) {
            g.addEdge(j.toString(), nodeToAdd.toString(), 'label')
        }
        g.addEdge(nodeToAdd.toString(), 'root', 'label')
    }
}

export function makeLineGraphFRWCG(g: FixedRootWeaklyConnectedGraph, count: number) {
    g.addNodeWithEdge('0', '<-', 'root', 'label', { x: 0, y: 0 }, 'label')
    for (let i = 0; i < count; i++){
        g.addNodeWithEdge((i + 1).toString(), '<-', i.toString(), 'label', { x: 0, y: 0 }, 'label')
        g.addEdge('root', (i + 1).toString(), 'label')
    }
}

export function makeLineGraphFRCUG(g: FixedRootConnectedUndirectedGraph, count: number) {
    g.addNodeWithEdge('0', 'root', 'label', { x: 0, y: 0 }, 'label')
    for (let i = 0; i < count; i++){
        g.addNodeWithEdge((i + 1).toString(), i.toString(), 'label', { x: 0, y: 0 }, 'label')
        g.addEdge('root', (i + 1).toString(), 'label')
    }
}

/**
 * 
 * @param g The highest node will have a id of `${count}`
 * @param count 
 */
export function makeLineGraph(g: Graph, count: number) {
    g.addNode('root', 'label', { x: 0, y: 0 })
    g.addNode('0', 'label', { x: 0, y: 0})
    g.addEdge('root', '0', 'label')

    for (let i = 0; i < count; i++){
        g.addNode((i + 1).toString(), 'label', { x: 0, y: 0 })
        g.addEdge(i.toString(), (i + 1).toString(), 'label')
        g.addEdge('root', (i + 1).toString(), 'label')
    }
}


/**
 * @see InitialGraph.AcyclicComplete
 * @param g The highest node will have a id of `${count}`
 * @param count 
 */
export function makeAcyclicCompleteGraph(g: Graph, count: number) {
    g.addNode('root', 'label', { x: 0, y: 0 })
    g.addNode('0', 'label', { x: 0, y: 0})
    g.addEdge('root', '0', 'label')

    for (let i = 0; i < count; i++){
        g.addNode((i + 1).toString(), 'label', { x: 0, y: 0 })

        g.addEdge('root', (i + 1).toString(), 'label')
        for (let j = 0; j <= i; j++) {
            g.addEdge(j.toString(), (i + 1).toString(), 'label')
        }
    }
}

export function makeLineWithRaysGraph(g: Graph, count: number) {
    g.addNode('root', 'label', { x: 0, y: 0 })
    g.addNode('0', 'label', { x: 0, y: 0})
    g.addEdge('root', '0', 'label')
    g.addNode('0_ray', 'label', { x: 0, y: 0 })
    g.addEdge('0', '0_ray', 'label')

    for (let i = 0; i < count; i++) {
        g.addNode(`${i + 1}`, 'label', { x: 0, y: 0 })
        g.addEdge(i.toString(), (i + 1).toString(), 'label')
        g.addNode(`${i + 1}_ray`, 'label', { x: 0, y: 0 })
        g.addEdge(`${i + 1}`, `${i + 1}_ray`, 'label')
    }
}

export function makeLineWithRaysFRWCG(g: FixedRootWeaklyConnectedGraph, count: number) {
    g.addNodeWithEdge('0', '<-', 'root', 'label', { x: 0, y: 0 }, 'label')
    g.addNodeWithEdge('0_ray', '<-', '0', 'label', { x: 0, y: 0 }, 'label')
    
    for (let i = 0; i < count; i++) {
        g.addNodeWithEdge(`${i + 1}`, '<-', `${i}`, 'label', { x: 0, y: 0 }, 'label')
        g.addNodeWithEdge(`${i + 1}_ray`, '<-', `${i + 1}`, 'label', { x: 0, y: 0 }, 'label')
    }
}

export function makeLineWithRaysFRCUG(g: FixedRootConnectedUndirectedGraph, count: number) {
    g.addNodeWithEdge('0', 'root', 'label', { x: 0, y: 0 }, 'label')
    g.addNodeWithEdge('0_ray', '0', 'label', { x: 0, y: 0 }, 'label')
    
    for (let i = 0; i < count; i++) {
        g.addNodeWithEdge(`${i + 1}`, `${i}`, 'label', { x: 0, y: 0 }, 'label')
        g.addNodeWithEdge(`${i + 1}_ray`, `${i + 1}`, 'label', { x: 0, y: 0 }, 'label')
    }
}