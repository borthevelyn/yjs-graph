import * as Y from 'yjs'
import { DirectedAcyclicGraph, nodeListToEdgeList } from '../graphs/DirectedAcyclicGraph'
import { EventEmitter } from '../Types'

/* 
Assumptions: 
1. It is not allowed to add nodes with the same id
2. It is not possible by implementation to add several edges between the same nodes, 
as edge ids are generated from node ids connected by the edge
3. Cycles are not allowed in the graph. After a synchronization cycles can be created
and should be removed locally afterwards.
*/

describe('DirectedAcyclicGraph', () => {
    let ydoc1: Y.Doc
    let yMatrix1: DirectedAcyclicGraph
    let ydoc2: Y.Doc
    let yMatrix2: DirectedAcyclicGraph
    let ydoc3: Y.Doc
    let yMatrix3: DirectedAcyclicGraph


    function sync12Concurrently() {
        let updates1to2 = Y.encodeStateAsUpdate(ydoc1, Y.encodeStateVector(ydoc2))
        let updates2to1 = Y.encodeStateAsUpdate(ydoc2, Y.encodeStateVector(ydoc1))
        Y.applyUpdate(ydoc1, updates2to1)
        Y.applyUpdate(ydoc2, updates1to2)

        yMatrix1.removeCycles()
        yMatrix2.removeCycles()
        // Should not be necessary, because removeCycles() should create the same result in both graphs
        // updates1to2 = Y.encodeStateAsUpdate(ydoc1, Y.encodeStateVector(ydoc2))
        // updates2to1 = Y.encodeStateAsUpdate(ydoc2, Y.encodeStateVector(ydoc1))
        // Y.applyUpdate(ydoc1, updates2to1)
        // Y.applyUpdate(ydoc2, updates1to2)
    }

    function sync13Concurrently() {
        let updates1to3 = Y.encodeStateAsUpdate(ydoc1, Y.encodeStateVector(ydoc3))
        let updates3to1 = Y.encodeStateAsUpdate(ydoc3, Y.encodeStateVector(ydoc1))
        Y.applyUpdate(ydoc1, updates3to1)
        Y.applyUpdate(ydoc3, updates1to3)

        yMatrix1.removeCycles()
        yMatrix3.removeCycles()
    }

    function syncThreeConcurrently() {
        let updates1to2 = Y.encodeStateAsUpdate(ydoc1, Y.encodeStateVector(ydoc2))
        let updates2to1 = Y.encodeStateAsUpdate(ydoc2, Y.encodeStateVector(ydoc1))
        let updates1to3 = Y.encodeStateAsUpdate(ydoc1, Y.encodeStateVector(ydoc3))
        let updates3to1 = Y.encodeStateAsUpdate(ydoc3, Y.encodeStateVector(ydoc1))
        let updates2to3 = Y.encodeStateAsUpdate(ydoc2, Y.encodeStateVector(ydoc3))
        let updates3to2 = Y.encodeStateAsUpdate(ydoc3, Y.encodeStateVector(ydoc2))
        Y.applyUpdate(ydoc1, updates2to1)
        Y.applyUpdate(ydoc1, updates3to1)
        Y.applyUpdate(ydoc2, updates1to2)
        Y.applyUpdate(ydoc2, updates3to2)
        Y.applyUpdate(ydoc3, updates2to3)
        Y.applyUpdate(ydoc3, updates1to3)

        yMatrix1.removeCycles()
        yMatrix2.removeCycles()
        yMatrix3.removeCycles()
    }
  
    beforeEach(() => {
        ydoc1 = new Y.Doc()
        yMatrix1 = new DirectedAcyclicGraph(ydoc1.getMap('adjacency map'), ydoc1.getArray('edges'))
        ydoc2 = new Y.Doc()
        yMatrix2 = new DirectedAcyclicGraph(ydoc2.getMap('adjacency map'), ydoc2.getArray('edges'))
        ydoc3 = new Y.Doc()
        yMatrix3 = new DirectedAcyclicGraph(ydoc3.getMap('adjacency map'), ydoc3.getArray('edges'))
    })

    // Basic tests
     it('should add a node from yMatrix1 to both maps', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        sync12Concurrently();

        const node1LabelForMatrix1 = yMatrix1.getNode('node1')?.data.label;
        const node1LabelForMatrix2 = yMatrix2.getNode('node1')?.data.label;

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();

        expect(node1LabelForMatrix1).toBe('node1');
        expect(node1LabelForMatrix2).toBe('node1');

        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(1);
    })

    it('should add a node from yMatrix2 to both maps', () => {
        yMatrix2.addNode('node1', 'node1', { x: 0, y: 0 });
        sync12Concurrently();

        const node1LabelForMatrix1 = yMatrix1.getNode('node1')?.data.label;
        const node1LabelForMatrix2 = yMatrix2.getNode('node1')?.data.label;

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();

        expect(node1LabelForMatrix1).toBe('node1');
        expect(node1LabelForMatrix2).toBe('node1');

        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(1);
    })

    it('should delete a node in both maps', () => {
        yMatrix1.addNode('node2', 'node2', { x: 0, y: 0 });
        sync12Concurrently();
        yMatrix1.removeNode('node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeUndefined();
        
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeUndefined();

        expect(yMatrix1.nodeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(0);
    })

    it('should add an edge from yMatrix1 to both maps', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 0, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge 1');
        sync12Concurrently();

        const edgeLabelForMatrix1 = yMatrix1.getEdge('node1', 'node2')?.data?.label;
        const edgeLabelForMatrix2 = yMatrix2.getEdge('node1', 'node2')?.data?.label;
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(edgeLabelForMatrix1).toBe('edge 1');
        expect(edgeLabelForMatrix2).toBe('edge 1');

        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBeDefined();

        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(2);
    })

    it('should add an edge from yMatrix2 to both maps', () => {
        yMatrix2.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 0, y: 0 });
        yMatrix2.addEdge('node1', 'node2', 'edge1');
        sync12Concurrently();

        const edgeLabelForMatrix1 = yMatrix1.getEdge('node1', 'node2')?.data?.label;
        const edgeLabelForMatrix2 = yMatrix2.getEdge('node1', 'node2')?.data?.label;

        expect(edgeLabelForMatrix1).toBe('edge1');
        expect(edgeLabelForMatrix2).toBe('edge1');

        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBeDefined();

        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(2);
    })

    it('should delete an edge in both maps', () => {
        yMatrix1.addNode('node1', 'Node 1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'Node 2', { x: 0, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node2');
        sync12Concurrently();

        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();

        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(2);
    })
// Tests checking acyclicity property in a local graph
    it('should detect a cycle in a local graph', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 0, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1');
        yMatrix1.addEdge('node2', 'node1', 'edge2');

        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node1')).toBeUndefined();
        expect(yMatrix1.isAcyclic()).toBe(true);
    })

    it('should not create a bigger cycle in a local graph', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 20, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1');
        yMatrix1.addEdge('node2', 'node3', 'edge2');
        yMatrix1.addEdge('node3', 'node1', 'edge3');

        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node1')).toBeUndefined();
        expect(yMatrix1.isAcyclic()).toBe(true);
    })

    it('should not create a double cycle in a local graph', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 20, y: 0 });
        yMatrix1.addNode('node4', 'node4', { x: 20, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge12');
        yMatrix1.addEdge('node2', 'node3', 'edge23');
        yMatrix1.addEdge('node1', 'node3', 'edge13');
        yMatrix1.addEdge('node3', 'node4', 'edge34');
        yMatrix1.addEdge('node4', 'node1', 'edge41');

        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node4')).toBeDefined();
        expect(yMatrix1.getEdge('node4', 'node1')).toBeUndefined();
        expect(yMatrix1.isAcyclic()).toBe(true);
    })

    it('should not create a self loop in a local graph', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addEdge('node1', 'node1', 'edge11');

        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.getEdge('node1', 'node1')).toBeUndefined();
    })

// Testing synchronization between two acyclic graphs
// addNode(m), addNode(n), m != n
    it('add node1 in one map and node2 in the other map)', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(2);
    })

// addNode(m), addEdge(n1,n2), m == n2, but not synchronously
    it('add node1 in one map and then node2 with edge1-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        sync12Concurrently();
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addEdge('node1', 'node2', 'edge1-2');
        sync12Concurrently();


        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
    })

// addNode(m), removeNode(n), m == n, combination does not exist

// addNode(m), removeNode(n), m != n
    it('add node1 in one map and remove node2 the other map', () => {
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.removeNode('node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getNode('node1')?.data.label).toBe('node1');
        expect(yMatrix1.nodeCount).toBe(1);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getNode('node1')?.data.label).toBe('node1');
        expect(yMatrix2.nodeCount).toBe(1);
    })

// addNode(m), removeEdge(n1,n2), m != n1,n2
    it('add node3 in one map and remove edge1-2 in the other map', () => {
        yMatrix2.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addEdge('node1', 'node2', 'edge1-2');
        sync12Concurrently();
        yMatrix1.addNode('node3', 'node3', { x: 10, y: 0 });
        yMatrix2.removeEdge('node1', 'node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// addNode(m), removeEdge(n1,n2), m == n1,n2, combinations do not exist

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 != n2
    it('add edge1-2 in one map and add edge1-3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node1', 'node3', 'edge1-3');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.getEdge('node1', 'node3')?.data?.label).toBe('edge1-3');
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.getEdge('node1', 'node3')?.data?.label).toBe('edge1-3');
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and add edge3-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.getEdge('node3', 'node2')?.data?.label).toBe('edge3-2');
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.getEdge('node3', 'node2')?.data?.label).toBe('edge3-2');
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and add edge3-4 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix2.addNode('node4', 'node4', { x: 10, y: 10 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node3', 'node4', 'edge3-4');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.getEdge('node3', 'node4')?.data?.label).toBe('edge3-4');
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(4);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.getEdge('node3', 'node4')?.data?.label).toBe('edge3-4');
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(4);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 == n2
    it('try to add edge twice', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix2.addEdge('node1', 'node2', 'second edge1-2');
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        sync12Concurrently();

        const edgeForMatrix1 = yMatrix1.getEdge('node1', 'node2');
        const edgeForMatrix2 = yMatrix2.getEdge('node1', 'node2');

        expect(edgeForMatrix1).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        // yjs decides which label to take for the edge
        // expect(yMatrix1.getEdge('node1',  'node2')?.label).toBe('edge1-2');

        expect(edgeForMatrix2).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
    })

// addEdge(m1,m2), removeNode(n) m1 == n, m2 != n
    it('add edge1-2 in one map and remove node1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(1);

        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(1);
    })

// addEdge(m1,m2), removeNode(n) m1 != n, m2 == n
// This test requires garbage collection because of dangling edges
    it('add edge1-2 in one map and remove node2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node2');
        sync12Concurrently();
        // this is only because edges as flow may trigger react updates
        yMatrix1.edgesAsFlow();
        sync12Concurrently();

        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(1);

        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(1);
    })

// addEdge(m1,m2), removeNode(n) m1 == n, m2 == n
    it('add edge1-1 in one map and remove node1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node1', 'edge1-1');
        yMatrix2.removeNode('node1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(0);
    })

// addEdge(m1,m2), removeNode(n) m1 != n, m2 != n
    it('add edge1-2 in one map and remove node3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 0, y: 10 });
        yMatrix1.addNode('node3', 'node3', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node3');
        sync12Concurrently();


        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and remove edge3-4 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix2.addNode('node4', 'node4', { x: 10, y: 10 });
        yMatrix2.addEdge('node3', 'node4', 'edge3-4');
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node3', 'node4');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node4')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(4);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node4')).toBeUndefined();
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(4);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('add edge1-2 in one map and remove edge1-3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addEdge('node1', 'node3', 'edge1-3');
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node1', 'node3');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node3')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(3);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and remove edge3-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addEdge('node3', 'node2', 'edge3-2');
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node3', 'node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1','node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1','node3')).toBeUndefined();
        expect(yMatrix1.getEdge('node1','node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1','node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1','node3')).toBeUndefined();
        expect(yMatrix2.getEdge('node1','node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(3);
    })
    
// addEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 == n2
    it('add edge1-2 in one map and remove edge1-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        sync12Concurrently();

        yMatrix1.addEdge('node1', 'node2', 'new-edge1-2');
        yMatrix2.removeEdge('node1', 'node2');
        sync12Concurrently();

        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('new-edge1-2');
        expect(yMatrix1.getNodesAsJson()).toEqual(yMatrix2.getNodesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
    })

// removeNode(m), removeNode(n) n == m
    it('remove node1 in one map and remove node1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        sync12Concurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeNode('node1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(0);
    })

// removeNode(m), removeNode(n) n != m
    it('remove node1 in one map and remove node2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeNode('node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m == n1, m != n2
    it('remove node1 in one map and remove edge1-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        sync12Concurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node1', 'node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m != n1, m == n2
    it('remove node2 in one map and remove edge1-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeNode('node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m != n1, m != n2
    it('remove node1 in one map and remove edge2-3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        sync12Concurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node2', 'node3');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1',  'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m == n1, m == n2
    it('remove node1 in one map and remove edge1-1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addEdge('node1', 'node1', 'edge1-1');
        sync12Concurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node1', 'node1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(0);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(0);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 == n2
    it('remove edge1-2 in one map and remove edge1-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addEdge('node1', 'node1', 'edge1-1');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node1');
        yMatrix2.removeEdge('node1', 'node1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node1')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node1')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 == n2
    it('remove edge1-2 in one map and remove edge3-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node3', 'node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1',  'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(2);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(2);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('remove edge1-2 in one map and remove edge2-3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node2', 'node3');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(3);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('remove edge1-2 in one map and remove edge3-4 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix2.addNode('node4', 'node4', { x: 10, y: 10 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node3', 'node4', 'edge3-4');   
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node3', 'node4');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node3', 'node4')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(4);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node3', 'node4')).toBeUndefined();
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(4);
    })

// Testing acyclicity of the graph after synchronization of two graphs
    it('add edge1-2 in one map and add edge2-1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson() === yMatrix2.getYEdgesAsJson()).toBe(true);
    })

    it('add edge1-2 and edge 2-3 in one map and add edge3-1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node3', 'node1', 'edge3-1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson() === yMatrix2.getYEdgesAsJson()).toBe(true);
    })

    it('should not create a double cycle after synchroniation of two graphs', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 20, y: 0 });
        yMatrix1.addNode('node4', 'node4', { x: 20, y: 0 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge12');
        yMatrix1.addEdge('node2', 'node3', 'edge23');
        yMatrix1.addEdge('node1', 'node3', 'edge13');
        yMatrix1.addEdge('node3', 'node4', 'edge34');
        yMatrix2.addEdge('node4', 'node1', 'edge41');
        sync12Concurrently();

        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix1.isAcyclic()).toBe(true);
        // expect(yMatrix1.yEdgeCount).toBe(4);

        expect(yMatrix2.edgeCount).toBe(4);
        expect(yMatrix2.nodeCount).toBe(4);
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix2.isAcyclic()).toBe(true);
        // expect(yMatrix2.yEdgeCount).toBe(4);

        expect(yMatrix1.getYEdgesAsJson() === yMatrix2.getYEdgesAsJson()).toBe(true);
    })
    // Syncing two graphs concurrently
    it('add two edges forming a cycle after sync', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
    })
    it('add three edges forming a cycle after sync', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // Syncing two graphs concurrently
    // graph1: 1->2, 2->3 
    // graph2: 2->3, 3->1
    // graph3: 3->1, 2->1
    it('add six edges forming a cycle after sync', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node3', 'node1', 'edge3-1');
        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        yMatrix3.addEdge('node1', 'node2', 'edge1-2');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson() === yMatrix2.getYEdgesAsJson()).toBe(true);
        expect(yMatrix1.getYEdgesAsJson() === yMatrix3.getYEdgesAsJson()).toBe(true);
    })

    // Syncing two graphs concurrently
    // graph1: 1->2, 2->3, 3->1 
    // graph2: 2->3, 3->1, 1->2
    // graph3: 3->1, 2->1, 1->3
    it('add nine edges forming a cycle after sync', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix1.addEdge('node3', 'node1', 'edge3-1');

        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node3', 'node1', 'edge3-1');
        yMatrix2.addEdge('node1', 'node2', 'edge1-2');

        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        yMatrix3.addEdge('node1', 'node2', 'edge1-2');
        yMatrix3.addEdge('node2', 'node1', 'edge2-3');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })
    
    // graph1: 1->2, 2->3, 3->1 
    // graph2: 1->2, 2->3, 3->1
    // graph3: 1->2, 2->3, 3->1
    it('add three edges in same order forming a cycle in every graph', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix1.addEdge('node3', 'node1', 'edge3-1');

        yMatrix2.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node3', 'node1', 'edge3-1');

        yMatrix3.addEdge('node1', 'node2', 'edge1-2');
        yMatrix3.addEdge('node2', 'node3', 'edge2-3');
        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // Three cycles after sync
    // graph1: 1->2, 2->3
    // graph2: 2->1, 3->2
    // graph3: 3->1
    it('graph1: 1->2, 2->3, graph2: 2->1, 3->2, graph3: 3->1', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');

        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');

        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.edgeCount).toEqual(yMatrix2.edgeCount);
        expect(yMatrix1.edgeCount).toEqual(yMatrix3.edgeCount);
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());

    })

    // Three cycles after sync
    // graph1: 1->2, 2->3
    // graph2: 2->1, 3->2
    // graph3: 1->3
    it('graph1: 1->2, 2->3, graph2: 2->1, 3->2, graph3: 1->3', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');

        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');

        yMatrix3.addEdge('node1', 'node3', 'edge1-3');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);
        
        expect(yMatrix1.edgeCount).toEqual(yMatrix2.edgeCount);
        expect(yMatrix1.edgeCount).toEqual(yMatrix3.edgeCount);
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());

    })

    // Six cycles after sync
    // graph1: 1->2, 2->3
    // graph2: 1->3
    // graph3: 2->1, 2->3, 3->1
    it('graph1: 1->2, 2->3, graph2: 1->3, graph3: 2->1, 2->3, 3->1', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');

        yMatrix2.addEdge('node1', 'node3', 'edge1-3');

        yMatrix3.addEdge('node2', 'node1', 'edge2-1');
        yMatrix3.addEdge('node2', 'node3', 'edge2-3');
        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.edgeCount).toEqual(yMatrix2.edgeCount);
        expect(yMatrix1.edgeCount).toEqual(yMatrix3.edgeCount);
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // Scenario: Two graphs sync, and sync later deleted edges

    // graph1: 1->2, 2->3
    // graph2: 2->3
    it('Scenario: Two graphs sync, and sync later deleted edges', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-33');
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        sync12Concurrently();

        yMatrix1.addEdge('node1', 'node3', 'edge1-3');
        sync12Concurrently();

        yMatrix2.removeEdge('node2', 'node3');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
    })


    // Scenario: Two graphs sync, third graph is offline and syncs later

    // graph1: 1->2, 2->3
    // graph2: 3->2
    // graph3: 3->2
    it('Scenario third graph syncs later: graph1: 1->2, 2->3, graph2: 3->2, graph3: 3->2', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');

        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        sync12Concurrently();

        yMatrix3.addEdge('node3', 'node2', 'edge3-2');
        syncThreeConcurrently();
    
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // graph1: 1->2 
    // graph2: 2->3
    // graph3: 3->1
    it('Scenario third graph syncs later: graph1: 1->2, graph2: 2->3, graph3: 3->1', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        sync12Concurrently();

        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // graph1: 1->2, 2->3
    // graph2: 2->3, 3->1
    // graph3: 3->1, 1->2
    it('Scenario third graph syncs later: graph1: 1->2, 2->3 graph2: 2->3, 3->1 graph3: 3->1, 1->2', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node3', 'node1', 'edge3-1');
        sync12Concurrently();

        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        yMatrix3.addEdge('node1', 'node2', 'edge1-2');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // graph1: 1->2, 2->3, 3->1 
    // graph2: 2->3, 3->1, 1->2
    // graph3: 3->1, 2->1, 1->3
    it('Scenario third graph syncs later: graph1: 1->2, 2->3, 3->1 graph2: 2->3, 3->1, 1->2 graph3: 3->1, 2->1, 1->3', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix1.addEdge('node3', 'node1', 'edge3-1');

        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node3', 'node1', 'edge3-1');
        yMatrix2.addEdge('node1', 'node2', 'edge1-2');
        sync12Concurrently();
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(2);

        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        yMatrix3.addEdge('node2', 'node1', 'edge2-1');
        yMatrix3.addEdge('node1', 'node3', 'edge1-3');
        expect(yMatrix3.edgeCount).toBe(2);
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        
        expect(yMatrix1.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        console.log('yMatrix1', yMatrix1.getYEdgesAsJson());
        console.log('yMatrix3', yMatrix3.getYEdgesAsJson());

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // graph1: 1->2, 2->3, 3->1 
    // graph2: 1->2, 2->3, 3->1
    // graph3: 1->2, 2->3, 3->1
    it('Scenario third graph syncs later: graph1: 1->2, 2->3, 3->1 graph2: 1->2, 2->3, 3->1 graph3: 1->2, 2->3, 3->1', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix1.addEdge('node3', 'node1', 'edge3-1');

        yMatrix2.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node3', 'node1', 'edge3-1');
        sync12Concurrently();

        yMatrix3.addEdge('node1', 'node2', 'edge1-2');
        yMatrix3.addEdge('node2', 'node3', 'edge2-3');
        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // graph1: 1->2, 2->3
    // graph2: 2->1, 3->2
    // graph3: 3->1
    // possible outcomes after sync: 
    // 1->2, 2->3, 3->1 => cycle | 3->2, 2->1, 3->1 | 1->2, 3->2, 3->1 | 2->1, 2->3, 3->1
    // if a cycle exists, the resulting graph has two edges, otherwise three edges
    it('Scenario third graph syncs later: graph1: 1->2, 2->3 graph2: 2->1, 3->2 graph3: 3->1', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');

        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        sync12Concurrently();

        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // graph1: 1->2, 2->3
    // graph2: 2->1, 3->2
    // graph3: 1->3
    // possible outcomes after sync: 
    // 1->2, 2->3, 1->3  | 3->2, 2->1, 1->3 => cycle | 1->2, 3->2, 1->3 | 2->1, 2->3, 1->3
    // if a cycle exists, the resulting graph has two edges, otherwise three edges
    it('Scenario third graph syncs later: graph1: 1->2, 2->3 graph2: 2->1, 3->2 graph3: 1->3', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');

        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        sync12Concurrently();

        yMatrix3.addEdge('node1', 'node3', 'edge1-3');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // graph1: 1->2, 2->3, 1->3
    // graph2: 2->1, 3->2, 3->1
    // graph3: 1->3
    it('Scenario third graph syncs later: graph1: 1->2, 2->3, 1->3 graph2: 2->1, 3->2, 3->1 graph3: 1->3', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix1.addEdge('node1', 'node3', 'edge1-3');

        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        yMatrix2.addEdge('node3', 'node1', 'edge3-1');
        sync12Concurrently();

        yMatrix3.addEdge('node1', 'node3', 'edge1-3');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(3);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // Third graph creates two cycles after sync
    // graph1: 1->2
    // graph2: 2->3
    // graph3: 2->1, 3->2
    it('Scenario third graph syncs later: graph1: 1->2 graph2: 2->3 graph3: 2->1, 3->2', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        sync12Concurrently();

        yMatrix3.addEdge('node2', 'node1', 'edge2-1');
        yMatrix3.addEdge('node3', 'node2', 'edge3-2');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // Third graph creates six cycles after sync
    // graph1: 1->2
    // graph2: 3->2, 1->3
    // graph3: 2->1, 2->3, 3->1
    it('Scenario third graph syncs later: graph1: 1->2 graph2: 3->2, 1->3 graph3: 2->1, 2->3, 3->1', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        yMatrix2.addEdge('node1', 'node3', 'edge1-3');
        sync12Concurrently();

        yMatrix3.addEdge('node2', 'node1', 'edge2-1');
        yMatrix3.addEdge('node2', 'node3', 'edge2-3');
        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // Scenario: Two graphs sync, third graph is offline and syncs later but a synced edge is deleted

    // graph1: 1->2
    // graph2: 2->3
    // graph3: 3->1
    it('Scenario third graph syncs later but a synced edge is deleted: graph1: 1->2 graph2: 2->3 graph3: 3->1', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        syncThreeConcurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        sync12Concurrently();

        yMatrix2.removeEdge('node2', 'node3');
        yMatrix3.addEdge('node3', 'node1', 'edge3-1');
        syncThreeConcurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix3.getNode('node1')).toBeDefined();
        expect(yMatrix3.getNode('node2')).toBeDefined();
        expect(yMatrix3.getNode('node3')).toBeDefined();
        expect(yMatrix3.edgeCount).toBe(2);
        expect(yMatrix3.nodeCount).toBe(3);
        expect(yMatrix3.isAcyclic()).toBe(true);

        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix3.getYEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix3.getEdgesAsJson());
    })

    // Test case from the paper
    it('Scenario after sync two cycles occur, remove edge contributing to the most cycles', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        sync12Concurrently();
        yMatrix1.addEdge('node2', 'node1', 'edge2-1');
        yMatrix1.addEdge('node3', 'node1', 'edge3-1');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix2.addEdge('node1', 'node2', 'edge1-2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix1.nodesAsFlow()).toEqual(yMatrix2.nodesAsFlow());
        expect(yMatrix1.edgesAsFlow()).toEqual(yMatrix2.edgesAsFlow());
        expect(yMatrix1.yEdgeCount).toEqual(yMatrix2.yEdgeCount);
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
    })

    it('Can create graph with event emitter', () => {
        let ydoc = new Y.Doc()
        let yMatrix = new DirectedAcyclicGraph(ydoc.getMap('adjacency map'), ydoc.getArray('edges'), new EventEmitter());
        expect(yMatrix).toBeDefined();
        yMatrix.observe(() => { });
        yMatrix.addNode('node1', 'node1', { x: 0, y: 0 });
    });
    
    it('Nodelist to edgelist with one element', () => {
        const res = nodeListToEdgeList(['node1'])
        expect(res).toHaveLength(0);
    });

    it('Execute not implemented methods', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        expect(() => yMatrix1.changeNodeDimension('node1', { width: 10, height: 10 })).toThrow();
        expect(() => yMatrix1.changeNodePosition('node1', { x: 10, y: 10 })).toThrow();
        expect(() => yMatrix1.changeNodeSelection('node1', true)).toThrow();
        expect(() => yMatrix1.changeEdgeSelection('node1+node2', true)).toThrow();
        expect(yMatrix1.isNodeSelected('node1')).toBe(false);
        expect(yMatrix1.isEdgeSelected('node1', 'node2')).toBe(false);
        expect(yMatrix1.selectedEdgesCount).toBe(0);
        expect(yMatrix1.selectedNodesCount).toBe(0);
    });

    it('Scenario large graph with 15 nodes', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addNode('node4', 'node4', { x: 10, y: 10 });
        yMatrix1.addNode('node5', 'node5', { x: 0, y: 20 });
        yMatrix1.addNode('node6', 'node6', { x: 10, y: 20 });
        yMatrix1.addNode('node7', 'node7', { x: 0, y: 30 });
        yMatrix1.addNode('node8', 'node8', { x: 10, y: 30 });
        yMatrix1.addNode('node9', 'node9', { x: 0, y: 40 });
        yMatrix1.addNode('node10', 'node10', { x: 10, y: 40 });
        yMatrix1.addNode('node11', 'node11', { x: 0, y: 50 });
        yMatrix1.addNode('node12', 'node12', { x: 10, y: 50 });
        yMatrix1.addNode('node13', 'node13', { x: 0, y: 60 });
        yMatrix1.addNode('node14', 'node14', { x: 10, y: 60 });
        yMatrix1.addNode('node15', 'node15', { x: 0, y: 70 });
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node1', 'node3', 'edge1-3');
        yMatrix1.addEdge('node1', 'node4', 'edge1-4');
        yMatrix1.addEdge('node1', 'node5', 'edge1-5');
        yMatrix1.addEdge('node1', 'node6', 'edge1-6');
        yMatrix1.addEdge('node1', 'node7', 'edge1-7');
        yMatrix1.addEdge('node1', 'node8', 'edge1-8');
        yMatrix1.addEdge('node1', 'node9', 'edge1-9');
        yMatrix1.addEdge('node1', 'node10', 'edge1-10');
        yMatrix1.addEdge('node1', 'node11', 'edge1-11');
        yMatrix1.addEdge('node1', 'node12', 'edge1-12');
        yMatrix1.addEdge('node1', 'node13', 'edge1-13');

        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        yMatrix1.addEdge('node3', 'node4', 'edge3-4');
        yMatrix1.addEdge('node4', 'node5', 'edge4-5');
        yMatrix1.addEdge('node5', 'node6', 'edge5-6');
        yMatrix1.addEdge('node6', 'node7', 'edge6-7');
        yMatrix2.addEdge('node7', 'node1', 'edge7-1');
        sync12Concurrently();

        expect(yMatrix1.nodeCount).toBe(15);
        expect(yMatrix1.isAcyclic()).toBe(true);

        expect(yMatrix2.nodeCount).toBe(15);
        expect(yMatrix2.isAcyclic()).toBe(true);

        expect(yMatrix1.nodesAsFlow()).toEqual(yMatrix2.nodesAsFlow());
        expect(yMatrix1.edgesAsFlow()).toEqual(yMatrix2.edgesAsFlow());
        expect(yMatrix1.yEdgeCount).toEqual(yMatrix2.yEdgeCount);
        expect(yMatrix1.getYEdgesAsJson()).toEqual(yMatrix2.getYEdgesAsJson());
    })



/*     it('select node', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.changeNodeSelection('node1', true);
        syncConcurrently();

        expect(yMatrix1.isNodeSelected('node1')).toBe(true);
        expect(yMatrix2.isNodeSelected('node1')).toBe(false);
    })

    it('deselect node', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.changeNodeSelection('node1', true);
        yMatrix1.changeNodeSelection('node1', false);
        syncConcurrently();

        expect(yMatrix1.isNodeSelected('node1')).toBe(false);
        expect(yMatrix2.isNodeSelected('node1')).toBe(false);
    })

    it('select edge', () => { 
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.changeEdgeSelection('node1+node2', true);
        syncConcurrently();

        expect(yMatrix1.isEdgeSelected('node1', 'node2')).toBe(true);
        expect(yMatrix2.isEdgeSelected('node1', 'node2')).toBe(false);
    })

    it('deselect edge', () => { 
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.changeEdgeSelection('node1+node2', true);
        yMatrix1.changeEdgeSelection('node1+node2', false);
        syncConcurrently();

        expect(yMatrix1.isEdgeSelected('node1', 'node2')).toBe(false);
        expect(yMatrix2.isEdgeSelected('node1', 'node2')).toBe(false);
    })

    it('select nodes and edges', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 0, y: 10 });
        yMatrix1.addNode('node3', 'node3', { x: 10, y: 0 });
        yMatrix1.addNode('node4', 'node4', { x: 10, y: 10 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node1', 'node2', 'edge3-4');
        yMatrix1.changeNodeSelection('node1', true);
        yMatrix1.changeNodeSelection('node2', true);
        yMatrix1.changeNodeSelection('node3', true);
        yMatrix1.changeEdgeSelection('node1+node2', true);
        yMatrix1.changeEdgeSelection('node3+node4', true);
        syncConcurrently();

        expect(yMatrix1.isNodeSelected('node1')).toBe(true);
        expect(yMatrix1.isNodeSelected('node2')).toBe(true);
        expect(yMatrix1.isNodeSelected('node3')).toBe(true);
        expect(yMatrix1.isNodeSelected('node4')).toBe(false);
        expect(yMatrix1.isEdgeSelected('node1', 'node2')).toBe(true);
        expect(yMatrix1.isEdgeSelected('node3', 'node4')).toBe(true);
        expect(yMatrix1.selectedEdgesCount).toBe(2);
        expect(yMatrix1.selectedNodesCount).toBe(3);

        expect(yMatrix2.selectedEdgesCount).toBe(0);
        expect(yMatrix2.selectedNodesCount).toBe(0);
    })

    it('select and deselect nodes and edges', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 0, y: 10 });
        yMatrix1.addNode('node3', 'node3', { x: 10, y: 0 });
        yMatrix1.addNode('node4', 'node4', { x: 10, y: 10 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node1', 'node2', 'edge3-4');
        yMatrix1.changeNodeSelection('node1', true);
        yMatrix1.changeNodeSelection('node2', true);
        yMatrix1.changeNodeSelection('node3', true);
        yMatrix1.changeEdgeSelection('node1+node2', true);
        yMatrix1.changeEdgeSelection('node3+node4', true);
        yMatrix1.changeNodeSelection('node1', false);
        yMatrix1.changeEdgeSelection('node1+node2', false);
        syncConcurrently();

        expect(yMatrix1.isNodeSelected('node1')).toBe(false);
        expect(yMatrix1.isNodeSelected('node2')).toBe(true);
        expect(yMatrix1.isNodeSelected('node3')).toBe(true);
        expect(yMatrix1.isNodeSelected('node4')).toBe(false);
        expect(yMatrix1.isEdgeSelected('node1', 'node2')).toBe(false);
        expect(yMatrix1.isEdgeSelected('node3', 'node4')).toBe(true);
        expect(yMatrix1.selectedEdgesCount).toBe(1);
        expect(yMatrix1.selectedNodesCount).toBe(2);

        expect(yMatrix2.selectedEdgesCount).toBe(0);
        expect(yMatrix2.selectedNodesCount).toBe(0);
    })  */
})