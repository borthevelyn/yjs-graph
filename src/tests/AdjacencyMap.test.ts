import * as Y from 'yjs'
import { AdjacencyMap } from '../graphs/AdjacencyMap'

/* 
Assumptions: 
1. It is not allowed to add nodes with the same id
2. It is not possible by implementation to add several edges between the same nodes, 
as edge ids are generated from node ids connected by the edge
*/

describe('AdjacencyMap', () => {
    let ydoc1: Y.Doc
    let yMatrix1: AdjacencyMap
    let ydoc2: Y.Doc
    let yMatrix2: AdjacencyMap

    function syncConcurrently() {
        const updates1to2 = Y.encodeStateAsUpdate(ydoc1, Y.encodeStateVector(ydoc2))
        const updates2to1 = Y.encodeStateAsUpdate(ydoc2, Y.encodeStateVector(ydoc1))
        Y.applyUpdate(ydoc1, updates2to1)
        Y.applyUpdate(ydoc2, updates1to2)
      }
  
    beforeEach(() => {
        ydoc1 = new Y.Doc()
        yMatrix1 = new AdjacencyMap(ydoc1.getMap('adjacency map'))
        ydoc2 = new Y.Doc()
        yMatrix2 = new AdjacencyMap(ydoc2.getMap('adjacency map'))
    })

    it('should add a node from yMatrix1 to both maps', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        syncConcurrently();

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
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeNode('node2');
        syncConcurrently();

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
        syncConcurrently();

        const edgeLabelForMatrix1 = yMatrix1.getEdge('node1', 'node2')?.data?.label;
        const edgeLabelForMatrix2 = yMatrix2.getEdge('node1', 'node2')?.data?.label;

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
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeEdge('node1', 'node2');
        syncConcurrently();

        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();

        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(2);
    })

// addNode(m), addNode(n), m != n
    it('add node1 in one map and node2 in the other map)', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        syncConcurrently();

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
        syncConcurrently();
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addEdge('node1', 'node2', 'edge1-2');
        syncConcurrently();


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
        syncConcurrently();
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.removeNode('node2');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addNode('node3', 'node3', { x: 10, y: 0 });
        yMatrix2.removeEdge('node1', 'node2');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node1', 'node3', 'edge1-3');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node3', 'node4', 'edge3-4');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix2.addEdge('node1', 'node2', 'second edge1-2');
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node1');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node2');
        syncConcurrently();
        // this is only because edges as flow may trigger react updates
        yMatrix1.edgesAsFlow();
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node1', 'edge1-1');
        yMatrix2.removeNode('node1');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node3');
        syncConcurrently();


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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node3', 'node4');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node1', 'node3');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node3', 'node2');
        syncConcurrently();

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

// removeNode(m), removeNode(n) n == m
    it('remove node1 in one map and remove node1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        syncConcurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeNode('node1');
        syncConcurrently();

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(0);
    })

// removeNode(m), removeNode(n) n != m
    it('remove node1 in one map and remove node2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        syncConcurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeNode('node2');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node1', 'node2');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeNode('node2');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node2', 'node3');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node1', 'node1');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeEdge('node1', 'node1');
        yMatrix2.removeEdge('node1', 'node1');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node3', 'node2');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node2', 'node3');
        syncConcurrently();

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
        syncConcurrently();
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node3', 'node4');
        syncConcurrently();

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

    it('select node', () => {
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
    })

})