import * as Y from 'yjs'
import { WeaklyConnectedGraph } from '../graphs/WeaklyConnectedGraph'

/* 
Assumptions: 
1. It is not allowed to add nodes with the same id
2. It is not possible by implementation to add several edges between the same nodes, 
as edge ids are generated from node ids connected by the edge
3. Cycles are not allowed in the graph. After a synchronization cycles can be created
and should be removed locally afterwards.
*/

describe('WeaklyConnectedGraph', () => {
    let ydoc1: Y.Doc
    let yMatrix1: WeaklyConnectedGraph
    let ydoc2: Y.Doc
    let yMatrix2: WeaklyConnectedGraph
    let ydoc3: Y.Doc
    let yMatrix3: WeaklyConnectedGraph


    function sync12Concurrently() {
        let updates1to2 = Y.encodeStateAsUpdate(ydoc1, Y.encodeStateVector(ydoc2))
        let updates2to1 = Y.encodeStateAsUpdate(ydoc2, Y.encodeStateVector(ydoc1))
        Y.applyUpdate(ydoc1, updates2to1)
        Y.applyUpdate(ydoc2, updates1to2)

        // console.log('expecting to contain node3', (ydoc1.get('node2') as any).get('edgeInformation').has('node3'))
        console.log('---', yMatrix1.isWeaklyConnected())
        console.log('---', yMatrix2.isWeaklyConnected())

        yMatrix1.makeGraphWeaklyConnected()
        yMatrix2.makeGraphWeaklyConnected()
        // Should not be necessary, because makeGraphWeaklyConnected() should create the same result in both graphs
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

        yMatrix1.makeGraphWeaklyConnected()
        yMatrix3.makeGraphWeaklyConnected()
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

        yMatrix1.makeGraphWeaklyConnected()
        yMatrix2.makeGraphWeaklyConnected()
        yMatrix3.makeGraphWeaklyConnected()
    }
  
    beforeEach(() => {
        ydoc1 = new Y.Doc()
        yMatrix1 = new WeaklyConnectedGraph(ydoc1.getMap('adjacency map'), ydoc1.getArray('graphElements'))
        ydoc2 = new Y.Doc()
        yMatrix2 = new WeaklyConnectedGraph(ydoc2.getMap('adjacency map'), ydoc2.getArray('graphElements'))
        ydoc3 = new Y.Doc()
        yMatrix3 = new WeaklyConnectedGraph(ydoc3.getMap('adjacency map'), ydoc3.getArray('graphElements'))
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
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node1', 'node2', 'edge 1');
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
        yMatrix2.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node1', 'node2', 'edge1');
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

// Tests checking weakly connectness property in a local graph
    it('try to add a single node to an existing graph, should not work', () => {
        yMatrix1.addNode('node1', 'node 1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node 2', { x: 0, y: 0 });

        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.getNode('node1')).toBeDefined();
    })

    it('try to delete an edge, that is important for connectedness', () => {
        yMatrix1.addNode('node1', 'node 1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node 2', { x: 0, y: 0 }, 'node1', 'node2', 'edge1');
        yMatrix1.removeEdge('node1', 'node2');

        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
    })

    it('try to add an edge with node, where the source node of the edge does not exist in the graph', () => {
        yMatrix1.addNode('node1', 'node 1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node 2', { x: 0, y: 0 }, 'node3', 'node2', 'edge1');

        expect(yMatrix1.getEdge('node3', 'node2')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(1);
    })

    it('try to add an edge with node, where the target node of the edge does not exist in the graph', () => {
        yMatrix1.addNode('node1', 'node 1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node 2', { x: 0, y: 0 }, 'node2', 'node3', 'edge1');

        expect(yMatrix1.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(1);
    })

    it('try to add an edge with node, where the edgeId does not contain the currently added node', () => {
        yMatrix1.addNode('node1', 'node 1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node 2', { x: 0, y: 0 }, 'node1', 'node1', 'edge1');

        expect(yMatrix1.getEdge('node1', 'node1')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(1);
    })

    it('try to remove an edge, that is not important for connectedness, should work', () => {
        yMatrix1.addNode('node1', 'node 1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node 2', { x: 0, y: 0 }, 'node1', 'node2', 'edge1');
        yMatrix1.addEdge('node2', 'node1', 'edge2');
        yMatrix1.removeEdge('node2', 'node1');

        expect(yMatrix1.getEdge('node2', 'node1')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
    })

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
        yMatrix2.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
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

// addNode(m), removeNode(n), m != n, violates weakly connected graph property
    it('add node1 in one map and remove node2 in the other map', () => {
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.removeNode('node2');
        sync12Concurrently();

        expect(yMatrix1.nodeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(0);
    })

// addNode(m), removeEdge(n1,n2), m != n1,n2, violates weakly connected graph property
    it('add node3 in one map and remove edge1-2 in the other map', () => {
        yMatrix2.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
        sync12Concurrently();
        // Cannot add this single node to an existing graph
        yMatrix1.addNode('node3', 'node3', { x: 10, y: 0 });
        // Removing this edge violates weakly connected graph property
        yMatrix2.removeEdge('node1', 'node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
    })

// addNode(m), removeEdge(n1,n2), m == n1,n2, combinations do not exist

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 != n2
    it('add edge1-2 in one map and add edge1-3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node2', 'node1', 'edge2-1');
        yMatrix2.addNode('node3', 'node3', { x: 10, y: 0 });
        yMatrix2.addNodeWithEdge('node1', 'node1', { x: 0, y: 0 }, 'node3', 'node1', 'edge3-1');
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
        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.getEdge('node1', 'node3')?.data?.label).toBe('edge1-3');
        expect(yMatrix2.edgeCount).toBe(4);
        expect(yMatrix2.nodeCount).toBe(3);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and add edge3-2 in the other map', () => {
        yMatrix1.addNode('node2', 'node2', { x: 0, y: 0 });
        sync12Concurrently();
        yMatrix1.addNodeWithEdge('node1', 'node1', { x: 10, y: 0 }, 'node2', 'node1', 'edge2-1');
        yMatrix2.addNodeWithEdge('node3', 'node3', { x: 0, y: 0 }, 'node2', 'node3', 'edge2-3');
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
        expect(yMatrix1.getEdge('node2', 'node1')?.data?.label).toBe('edge2-1');
        expect(yMatrix1.getEdge('node3', 'node2')?.data?.label).toBe('edge3-2');
        expect(yMatrix1.getEdge('node2', 'node3')?.data?.label).toBe('edge2-3');

        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.getEdge('node2', 'node1')?.data?.label).toBe('edge2-1');
        expect(yMatrix2.getEdge('node3', 'node2')?.data?.label).toBe('edge3-2');
        expect(yMatrix2.getEdge('node2', 'node3')?.data?.label).toBe('edge2-3');
        expect(yMatrix2.edgeCount).toBe(4);
        expect(yMatrix2.nodeCount).toBe(3);
    })
    
// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and add edge3-4 in the other map', () => {
        // Additional edges are required here to generate an initial weakly connected graph
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node3', 'node3', { x: 0, y: 0 }, 'node1', 'node3', 'edge1-3');
        yMatrix1.addNodeWithEdge('node4', 'node4', { x: 0, y: 0 }, 'node1', 'node4', 'edge1-4');
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node2', 'node4', 'edge2-4');
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
        expect(yMatrix1.edgeCount).toBe(5);
        expect(yMatrix1.nodeCount).toBe(4);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.getEdge('node3', 'node4')?.data?.label).toBe('edge3-4');
        expect(yMatrix2.edgeCount).toBe(5);
        expect(yMatrix2.nodeCount).toBe(4);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 == n2
    it('try to add edge twice', () => {
        // Additional edges are required here to generate an initial weakly connected graph
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node3', 'node3', { x: 0, y: 0 }, 'node1', 'node3', 'edge1-3');
        yMatrix1.addNodeWithEdge('node4', 'node4', { x: 0, y: 0 }, 'node1', 'node4', 'edge1-4');
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node2', 'node4', 'edge2-4');
        sync12Concurrently();
        yMatrix2.addEdge('node1', 'node2', 'second edge1-2');
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        sync12Concurrently();

        const edgeForMatrix1 = yMatrix1.getEdge('node1', 'node2');
        const edgeForMatrix2 = yMatrix2.getEdge('node1', 'node2');

        expect(edgeForMatrix1).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.nodeCount).toBe(4);

        expect(edgeForMatrix2).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(4);
        expect(yMatrix2.nodeCount).toBe(4);
    })

// addEdge(m1,m2), removeNode(n) m1 == n, m2 != n
    it('add edge1-2 in one map and remove node1 in the other map', () => {
        // Additional edge is required here to generate an initial weakly connected graph
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node2', 'node1', 'edge2-1');
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
        // Additional edge is required here to generate an initial weakly connected graph
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node2', 'node1', 'edge2-1');
        sync12Concurrently();

        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node2');
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

// TODO
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
        // Additional edges are required here to generate an initial weakly connected graph
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node2', 'node1', 'edge2-1');
        yMatrix1.addNodeWithEdge('node3', 'node3', { x: 0, y: 0 }, 'node3', 'node1', 'edge3-1');
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node3');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(2);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(2);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and remove edge3-4 in the other map', () => {
        // Additional edges are required here to generate an initial weakly connected graph
        yMatrix1.addNode('node4', 'node4', { x: 10, y: 10 });
        yMatrix1.addNodeWithEdge('node1', 'node1', { x: 0, y: 0 }, 'node4', 'node1', 'edge4-1');
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node4', 'node2', 'edge4-2');
        yMatrix1.addNodeWithEdge('node3', 'node3', { x: 0, y: 0 }, 'node4', 'node3', 'edge4-3');
        yMatrix1.addEdge('node1', 'node3', 'edge1-3');
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
        expect(yMatrix1.edgeCount).toBe(5);
        expect(yMatrix1.nodeCount).toBe(4);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node4')).toBeUndefined();
        expect(yMatrix2.edgeCount).toBe(5);
        expect(yMatrix2.nodeCount).toBe(4);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('add edge1-2 in one map and remove edge1-3 in the other map', () => {
        // Additional edges are required here to generate an initial weakly connected graph
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addNodeWithEdge('node1', 'node1', { x: 0, y: 0 }, 'node1', 'node3', 'edge1-3');
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node2', 'node3', 'edge2-3');
        yMatrix1.addEdge('node2', 'node1', 'edge2-1');
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
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.nodeCount).toBe(3);
    })
// TODO Check this in other tests 3-2
// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and remove edge3-2 in the other map', () => {
        // Additional edges are required here to generate an initial weakly connected graph
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addNodeWithEdge('node1', 'node1', { x: 0, y: 0 }, 'node1', 'node3', 'edge1-3');
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node3', 'node2', 'edge3-2');
        yMatrix1.addEdge('node2', 'node1', 'edge2-1');
        sync12Concurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node3', 'node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1','node2')).toBeDefined();
        expect(yMatrix1.getEdge('node3','node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node1','node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1','node2')).toBeDefined();
        expect(yMatrix2.getEdge('node3','node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node1','node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.nodeCount).toBe(3);
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
        // Additional edge is required here to generate an initial weakly connected graph
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
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
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
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
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
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
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 0, y: 0 }, 'node2', 'node3', 'edge2-3');
        yMatrix1.addNodeWithEdge('node1', 'node1', { x: 0, y: 0 }, 'node2', 'node1', 'edge2-1');
        yMatrix1.addEdge('node3', 'node2', 'edge3-2');
        
        sync12Concurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node2', 'node3');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1',  'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);

        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
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
        // Additional edges are required here to generate an initial weakly connected graph
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node2', 'node1', 'edge2-1');
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addNodeWithEdge('node3', 'node3', { x: 0, y: 10 }, 'node2', 'node3', 'edge2-3');
        yMatrix1.addEdge('node3', 'node2', 'edge3-2');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node3', 'node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1',  'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
    })

// TODO: Check this in other tests 2-3 to 1-3
// removeEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('remove edge1-2 in one map and remove edge1-3 in the other map', () => {
        // Additional edges are required here to generate an initial weakly connected graph
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node2', 'node1', 'edge2-1');
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addNodeWithEdge('node3', 'node3', { x: 0, y: 10 }, 'node1', 'node3', 'edge1-3');
        yMatrix1.addEdge('node3', 'node1', 'edge3-1');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node1', 'node3');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node3')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeUndefined();
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(3);
    })

// TODO duplicate edgecount
// removeEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('remove edge1-2 in one map and remove edge3-4 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node2', 'node1', 'edge2-1');
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addNodeWithEdge('node3', 'node3', { x: 0, y: 10 }, 'node3', 'node1', 'edge3-1');
        yMatrix1.addNodeWithEdge('node4', 'node4', { x: 10, y: 10 }, 'node4', 'node1', 'edge4-1');
        yMatrix1.addEdge('node3', 'node4', 'edge3-4');   
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
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.nodeCount).toBe(4);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node3', 'node4')).toBeUndefined();
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.nodeCount).toBe(4);
    })

    // Testing weakly connectedness property of the graph after synchronization of two graphs
    // Connectedness is violated after yjs synchronization and should be fixed by makeGraphWeaklyConnected in sync12Concurrently

    // Conflict should be resolved by the user
    it('add node1 in one map and add node2 in the other map, conflict should be resolved by the user', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(2);
        // Should be resolved by the user
        expect(yMatrix1.isWeaklyConnected()).toBe(false);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(false);
    })

    it('add same edges and remove same edges in both maps, connectedness is not violated', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
        sync12Concurrently();
        yMatrix1.addEdge('node2', 'node1', 'edge2-1');
        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node1', 'node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);
    })

    it('remove different edges in both maps, connectedness is violated afer yjs sync', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node1', 'edge2-1');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node2', 'node1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);
    })

    it('remove different nodes in both maps, connectedness is violated after yjs sync', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
        yMatrix1.addNodeWithEdge('node3', 'node3', { x: 0, y: 10 }, 'node1', 'node3', 'edge1-3');
        yMatrix1.addNodeWithEdge('node4', 'node4', { x: 10, y: 10 }, 'node3', 'node4', 'edge3-4');
        yMatrix1.addEdge('node2', 'node4', 'edge2-4');
        sync12Concurrently();
        console.log('first sync');
        yMatrix1.removeNode('node2');
        yMatrix2.removeNode('node3');
        console.log('after remove');
        sync12Concurrently();
        console.log('after second sync');
        console.log('mat1',yMatrix1.nodesAsFlow());
        console.log('mat2',yMatrix2.nodesAsFlow());
        console.log('mat1 edges',yMatrix1.getEdgesAsJson());
        console.log('mat2 edges',yMatrix2.getEdgesAsJson());
        console.log('mat1 incoming',yMatrix1.getIncomingNodesAsJson());
        console.log('mat2 incoming',yMatrix2.getIncomingNodesAsJson());

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);
    })

    it('remove edge1-3 in one map and remove node2 in the other map, connectedness is violated after yjs sync', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
        yMatrix1.addNodeWithEdge('node3', 'node3', { x: 0, y: 10 }, 'node1', 'node3', 'edge1-3');
        yMatrix1.addNodeWithEdge('node4', 'node4', { x: 10, y: 10 }, 'node3', 'node4', 'edge3-4');
        yMatrix1.addEdge('node2', 'node4', 'edge2-4');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node3');
        yMatrix2.removeNode('node2');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.nodeCount).toBeGreaterThanOrEqual(3);
        expect(yMatrix1.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.nodeCount).toBeGreaterThanOrEqual(3);
        expect(yMatrix2.edgeCount).toBeGreaterThanOrEqual(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })

    it('remove edges in both maps, also edges that are not use to make graph connected again, connectedness is violated after yjs sync', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node1', 'edge2-1');
        yMatrix1.addEdge('node1', 'node1', 'edge1-1');
        yMatrix1.addEdge('node2', 'node2', 'edge2-2');
        sync12Concurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix1.removeEdge('node2', 'node2');
        yMatrix2.removeEdge('node2', 'node1');
        yMatrix2.removeEdge('node1', 'node1');
        sync12Concurrently();

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);
    })

    // Conflict should be resolved by the user
    it('both graphs are completely out of sync, connectedness is violated after yjs sync, conflict should be resolved by the user', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNodeWithEdge('node2', 'node2', { x: 10, y: 0 }, 'node1', 'node2', 'edge1-2');
        yMatrix2.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix2.addNodeWithEdge('node4', 'node4', { x: 10, y: 10 }, 'node3', 'node4', 'edge3-4');
        sync12Concurrently();

        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(false);

        expect(yMatrix2.nodeCount).toBe(4);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(false);
    })

    it('test yarray', () => {
        const doc1 = new Y.Doc();
        const yArray1 = doc1.getArray('array');
        const doc2 = new Y.Doc();
        const yArray2 = doc2.getArray('array');

        // The content of a client seems to be always connected and ordered in the resulting array
        // It means for the connectedness, that it first tries to solve the connectedness problem 
        // by adding removed elements from one client and then from the other client
        yArray1.push(['a']);
        yArray2.push(['d']);
        yArray2.push(['e']);

        yArray1.push(['b']);
        yArray1.push(['c']);
        yArray2.push(['f']);

        let updates1to2 = Y.encodeStateAsUpdate(doc1, Y.encodeStateVector(doc2))
        let updates2to1 = Y.encodeStateAsUpdate(doc2, Y.encodeStateVector(doc1))
        Y.applyUpdate(doc1, updates2to1)
        Y.applyUpdate(doc2, updates1to2)
        console.log(yArray1.toJSON());
        console.log(yArray2.toJSON());
    })

    it('test yarray deletion', () => {
        const doc1 = new Y.Doc();
        const yArray1 = doc1.getArray('array');
        const doc2 = new Y.Doc();
        const yArray2 = doc2.getArray('array');
        const doc3 = new Y.Doc();
        const yArray3 = doc3.getArray('array');

        // The content of a client seems to be always connected and ordered in the resulting array
        // It means for the connectedness, that it first tries to solve the connectedness problem 
        // by adding removed elements from one client and then from the other client
        yArray1.push(['a']);
        yArray2.push(['d']);
        yArray2.push(['e']);

        yArray1.push(['b']);
        yArray1.push(['c']);
        yArray2.push(['f']);

        let updates1to2 = Y.encodeStateAsUpdate(doc1, Y.encodeStateVector(doc2))
        let updates2to1 = Y.encodeStateAsUpdate(doc2, Y.encodeStateVector(doc1))
        Y.applyUpdate(doc1, updates2to1)
        Y.applyUpdate(doc2, updates1to2)
        console.log(yArray1.toJSON());
        console.log(yArray2.toJSON());

        yArray1.delete(1);

        updates1to2 = Y.encodeStateAsUpdate(doc1, Y.encodeStateVector(doc3))
        updates2to1 = Y.encodeStateAsUpdate(doc3, Y.encodeStateVector(doc1))
        Y.applyUpdate(doc1, updates2to1)
        Y.applyUpdate(doc3, updates1to2)
        console.log('arr1',yArray1.toJSON());
        console.log('arr2',yArray2.toJSON());
        console.log('arr3', yArray3.toJSON());

        yArray2.insert(1, ['g']);
        updates1to2 = Y.encodeStateAsUpdate(doc1, Y.encodeStateVector(doc2))
        updates2to1 = Y.encodeStateAsUpdate(doc2, Y.encodeStateVector(doc1))
        Y.applyUpdate(doc1, updates2to1)
        Y.applyUpdate(doc2, updates1to2)
        console.log('arr1',yArray1.toJSON());
        console.log('arr2',yArray2.toJSON());
        console.log('arr3', yArray3.toJSON());
    })
})