import * as Y from 'yjs'
import { AdjacencyMapWithFasterNodeDeletion } from '../graphs/AdjacencyMapWithFasterNodeDeletion'

/* 
Assumptions: 
1. It is not allowed to add nodes with the same id
2. It is not possible by implementation to add several edges between the same nodes, 
as edge ids are generated from node ids connected by the edge
*/

describe('useAdjacencyMapWithFasterNodeDeletion', () => {
    let ydoc1: Y.Doc
    let yMatrix1: AdjacencyMapWithFasterNodeDeletion
    let ydoc2: Y.Doc
    let yMatrix2: AdjacencyMapWithFasterNodeDeletion

    beforeEach(() => {
        ydoc1 = new Y.Doc()
        yMatrix1 = new AdjacencyMapWithFasterNodeDeletion(ydoc1)
        ydoc2 = new Y.Doc()
        yMatrix2 = new AdjacencyMapWithFasterNodeDeletion(ydoc2)
    })

    it('should add a node from yMatrix1 to both maps', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();

        expect(yMatrix1.getNode('node1')?.data.label).toBe('node1');
        expect(yMatrix2.getNode('node1')?.data.label).toBe('node1');

        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(1);
    })

    it('should add a node from yMatrix2 to both maps', () => {
        yMatrix2.addNode('node1', 'node1', { x: 0, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();

        expect(yMatrix1.getNode('node1')?.data.label).toBe('node1');
        expect(yMatrix2.getNode('node1')?.data.label).toBe('node1');

        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(1);
    })

    it('should delete a node in both maps', () => {
        yMatrix1.addNode('node2', 'node2', { x: 0, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeNode('node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

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
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode1InMatrix1 = yMatrix1.getIncomingNodes('node1');
        const incomingNodesForNode1Matrix2 = yMatrix2.getIncomingNodes('node1');
        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2Matrix2 = yMatrix2.getIncomingNodes('node2');

        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge 1');
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge 1');

        expect(incomingNodesForNode1InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode1Matrix2?.size).toBe(0);

        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2Matrix2).toBeDefined();

        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2Matrix2?.size).toBe(1);

        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode2Matrix2?.has('node1')).toBe(true);

        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(2);

        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(1);
    })

    it('should add an edge from yMatrix2 to both maps', () => {
        yMatrix2.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 0, y: 0 });
        yMatrix2.addEdge('node1', 'node2', 'edge1');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
 
        const incomingNodesForNode1InMatrix1 = yMatrix1.getIncomingNodes('node1');
        const incomingNodesForNode1Matrix2 = yMatrix2.getIncomingNodes('node1');
        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2Matrix2 = yMatrix2.getIncomingNodes('node2');

        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1');
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1');

        expect(incomingNodesForNode1InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode1Matrix2?.size).toBe(0);

        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2Matrix2).toBeDefined();

        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2Matrix2?.size).toBe(1);

        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode2Matrix2?.has('node1')).toBe(true);

        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(2);

        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(1);
    })

    it('should delete an edge in both maps', () => {
        yMatrix1.addNode('node1', 'Node 1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'Node 2', { x: 0, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2Matrix2 = yMatrix2.getIncomingNodes('node2');

        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(false);
        expect(incomingNodesForNode2Matrix2?.has('node1')).toBe(false);
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode2Matrix2?.size).toBe(0);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix2.nodeCount).toBe(2);
    })    

// addNode(m), addNode(n), m != n
    it('add node1 in one map and node2 in the other map)', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

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
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addEdge('node1', 'node2', 'edge1-2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);   
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
    })

// addNode(m), removeNode(n), m == n, combination does not exist

// addNode(m), removeNode(n), m != n
    it('add node1 in one map and remove node2 the other map', () => {
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.removeNode('node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

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
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addNode('node3', 'node3', { x: 10, y: 0 });
        yMatrix2.removeEdge('node1', 'node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(false);
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(false);
        expect(incomingNodesForNode2InMatrix2?.size).toBe(0);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// addNode(m), removeEdge(n1,n2), m == n1,n2, combinations do not exist

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 != n2 
    it('add edge1-2 in one map and add edge1-3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 10, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node1', 'node3', 'edge1-3');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');
        const incomingNodesForNode3InMatrix1 = yMatrix1.getIncomingNodes('node3');
        const incomingNodesForNode3InMatrix2 = yMatrix2.getIncomingNodes('node3');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.getEdge('node1', 'node3')?.data?.label).toBe('edge1-3');
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode3InMatrix1).toBeDefined();
        expect(incomingNodesForNode3InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode3InMatrix1?.has('node1')).toBe(true);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.getEdge('node1', 'node3')?.data?.label).toBe('edge1-3');
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(incomingNodesForNode3InMatrix2).toBeDefined();
        expect(incomingNodesForNode3InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode3InMatrix2?.has('node1')).toBe(true);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and add edge3-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.getEdge('node3', 'node2')?.data?.label).toBe('edge3-2');
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(2);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode2InMatrix1?.has('node3')).toBe(true);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.getEdge('node3', 'node2')?.data?.label).toBe('edge3-2');
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(2);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(incomingNodesForNode2InMatrix2?.has('node3')).toBe(true);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and add edge3-4 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix2.addNode('node4', 'node4', { x: 10, y: 10 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node3', 'node4', 'edge3-4');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');
        const incomingNodesForNode4InMatrix1 = yMatrix1.getIncomingNodes('node4');
        const incomingNodesForNode4InMatrix2 = yMatrix2.getIncomingNodes('node4');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.getEdge('node3', 'node4')?.data?.label).toBe('edge3-4');
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode4InMatrix1).toBeDefined();
        expect(incomingNodesForNode4InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode4InMatrix1?.has('node3')).toBe(true);
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(2);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.getEdge('node3', 'node4')?.data?.label).toBe('edge3-4');
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(incomingNodesForNode4InMatrix2).toBeDefined();
        expect(incomingNodesForNode4InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode4InMatrix2?.has('node3')).toBe(true);
        expect(yMatrix2.nodeCount).toBe(4);
        expect(yMatrix2.edgeCount).toBe(2);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 == n2
    it('try to add edge twice', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix2.addEdge('node1', 'node2', 'second edge1-2');
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix1.getIncomingNodes('node2');

        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        // yjs decides which label to take for the edge
        // expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');

        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
    })


// addEdge(m1,m2), removeNode(n) m1 == n, m2 != n
// Dangling incoming nodes need to be removed here
    it('add edge1-2 in one map and remove node1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node1');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        // Garbage colection
        yMatrix1.edgesAsFlow();
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]); 

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        // Dangling incoming node appears here when executing without garbage collection
        expect(yMatrix1.getIncomingNodes('node2')?.size).toBe(0);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(1);

        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        // Dangling incoming node appears here when executing without garbage collection
        expect(yMatrix2.getIncomingNodes('node2')?.size).toBe(0);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(1);
    })

// addEdge(m1,m2), removeNode(n) m2 == n, m1 != n
// Dangling edges need to be removed here
    it('add edge1-2 in one map and remove node2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');  
        yMatrix2.removeNode('node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        // Garbage colection
        yMatrix1.edgesAsFlow();
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]); 

        const incomingNodesForNode1InMatrix1 = yMatrix1.getIncomingNodes('node1');
        const incomingNodesForNode1InMatrix2 = yMatrix2.getIncomingNodes('node1');

        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        // Dangling edge appears here when executing without garbage collection
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined(); 
        expect(incomingNodesForNode1InMatrix1?.size).toBe(0);
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        // Dangling edge appears here when executing without garbage collection
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined(); 
        expect(incomingNodesForNode1InMatrix2?.size).toBe(0);
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
    }) 

// addEdge(m1,m2), removeNode(n) m1 == n, m2 == n
    it('add edge1-1 in one map and remove node1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node1', 'edge1-1');
        yMatrix2.removeNode('node1');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(0);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// addEdge(m1,m2), removeNode(n) m1 != n, m2 != n
    it('add edge1-2 in one map and remove node3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 0, y: 10 });
        yMatrix1.addNode('node3', 'node3', { x: 10, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeNode('node3');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and remove edge3-4 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix2.addNode('node4', 'node4', { x: 10, y: 10 });
        yMatrix2.addEdge('node3', 'node4', 'edge3-4');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node3', 'node4');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');
        const incomingNodesForNode4InMatrix1 = yMatrix1.getIncomingNodes('node4');
        const incomingNodesForNode4InMatrix2 = yMatrix2.getIncomingNodes('node4');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node4')).toBeUndefined();
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode4InMatrix1?.size).toBe(0); 
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(1);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node4')).toBeUndefined();
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(incomingNodesForNode4InMatrix2?.size).toBe(0); 
        expect(yMatrix2.nodeCount).toBe(4);
        expect(yMatrix2.edgeCount).toBe(1);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('add edge1-2 in one map and remove edge1-3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addEdge('node1', 'node3', 'edge1-3');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node1', 'node3');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node3')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.edgeCount).toBe(1);
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.edgeCount).toBe(1);
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(yMatrix2.nodeCount).toBe(3);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and remove edge3-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addEdge('node3', 'node2', 'edge3-2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.removeEdge('node3', 'node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node3')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix1.edgeCount).toBe(1);
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(yMatrix1.getIncomingNodes('node3')?.size).toBe(0);
        expect(yMatrix1.nodeCount).toBe(3);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(yMatrix2.edgeCount).toBe(1);
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(yMatrix2.getIncomingNodes('node3')?.size).toBe(0);
        expect(yMatrix2.nodeCount).toBe(3);
    })

// removeNode(m), removeNode(n) n == m
    it('remove node1 in one map and remove node1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeNode('node1');
        yMatrix2.removeNode('node1');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(0);
    })

// removeNode(m), removeNode(n) n != m
    it('remove node1 in one map and remove node2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeNode('node1');
        yMatrix2.removeNode('node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

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
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node1', 'node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);


        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.getIncomingNodes('node2')?.size).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.getIncomingNodes('node2')?.size).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m != n1, m == n2
    it('remove node2 in one map and remove edge1-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeNode('node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.getIncomingNodes('node2')).toBeUndefined();

        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.getIncomingNodes('node2')).toBeUndefined();
    })

// removeNode(m), removeEdge(n1,n2) m != n1, m != n2
    it('remove node1 in one map and remove edge2-3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix2.addEdge('node2', 'node3', 'edge2-3');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node2', 'node3');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.getIncomingNodes('node3')?.size).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.getIncomingNodes('node3')?.size).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m == n1, m == n2
    it('remove node1 in one map and remove edge1-1 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix2.addEdge('node1', 'node1', 'edge1-1');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeNode('node1');
        yMatrix2.removeEdge('node1', 'node1');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

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
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addEdge('node1', 'node1', 'edge1-2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node1', 'node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getIncomingNodes('node2')?.size).toBe(0);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getIncomingNodes('node2')?.size).toBe(0);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 == n2
    it('remove edge1-2 in one map and remove edge3-2 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node3', 'node2');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeUndefined();
        expect(yMatrix1.getIncomingNodes('node2')?.size).toBe(0);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeUndefined();
        expect(yMatrix2.getIncomingNodes('node2')?.size).toBe(0);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(0);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('remove edge1-2 in one map and remove edge2-3 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.addEdge('node2', 'node3', 'edge2-3');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node2', 'node3');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');
        const incomingNodesForNode3InMatrix1 = yMatrix1.getIncomingNodes('node3');
        const incomingNodesForNode3InMatrix2 = yMatrix2.getIncomingNodes('node3');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode3InMatrix1?.size).toBe(0);


        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(incomingNodesForNode2InMatrix2?.size).toBe(0);
        expect(incomingNodesForNode3InMatrix2?.size).toBe(0);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('remove edge1-2 in one map and remove edge3-4 in the other map', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix2.addNode('node3', 'node3', { x: 0, y: 10 });
        yMatrix2.addNode('node4', 'node4', { x: 10, y: 10 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix2.addEdge('node3', 'node4', 'edge3-4');   
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node3', 'node4');
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        const incomingNodesForNode2InMatrix1 = yMatrix1.getIncomingNodes('node2');
        const incomingNodesForNode2InMatrix2 = yMatrix2.getIncomingNodes('node2');
        const incomingNodesForNode4InMatrix1 = yMatrix1.getIncomingNodes('node4');
        const incomingNodesForNode4InMatrix2 = yMatrix2.getIncomingNodes('node4');

        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node3', 'node4')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(4);
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode4InMatrix1?.size).toBe(0);

        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix2.getEdge('node3', 'node4')).toBeUndefined();
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.nodeCount).toBe(4);
        expect(incomingNodesForNode2InMatrix2?.size).toBe(0);
        expect(incomingNodesForNode4InMatrix2?.size).toBe(0);
    })

    it('select node', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.changeNodeSelection('node1', true);
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.isNodeSelected('node1')).toBe(true);
        expect(yMatrix2.isNodeSelected('node1')).toBe(false);
    })

    it('deselect node', () => {
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.changeNodeSelection('node1', true);
        yMatrix1.changeNodeSelection('node1', false);
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.isNodeSelected('node1')).toBe(false);
        expect(yMatrix2.isNodeSelected('node1')).toBe(false);
    })

    it('select edge', () => { 
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.changeEdgeSelection('node1+node2', true);
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.isEdgeSelected('node1', 'node2')).toBe(true);
        expect(yMatrix2.isEdgeSelected('node1', 'node2')).toBe(false);
    })

    it('deselect edge', () => { 
        yMatrix1.addNode('node1', 'node1', { x: 0, y: 0 });
        yMatrix1.addNode('node2', 'node2', { x: 10, y: 0 });
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        yMatrix1.changeEdgeSelection('node1+node2', true);
        yMatrix1.changeEdgeSelection('node1+node2', false);
        AdjacencyMapWithFasterNodeDeletion.syncDefault([yMatrix1, yMatrix2]);

        expect(yMatrix1.isEdgeSelected('node1', 'node2')).toBe(false);
        expect(yMatrix2.isEdgeSelected('node1', 'node2')).toBe(false);
    })
})