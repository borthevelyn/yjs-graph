import * as automerge from '@automerge/automerge'
import { AdjacencyMapAutomerge, AdjacencyMapAutomergeGraph} from '../graphs/AdjacencyMapAutomerge'


/* 
Assumptions: 
1. It is not allowed to add nodes with the same id
2. It is not possible by implementation to add several edges between the same nodes, 
as edge ids are generated from node ids connected by the edge
*/

describe('AdjacencyMapAutomerge', () => {
    let graph1: AdjacencyMapAutomerge
    let graph2: AdjacencyMapAutomerge

    beforeEach(() => {
        let amdoc1 = automerge.init<AdjacencyMapAutomergeGraph>()
        amdoc1 = automerge.change(amdoc1, d => {
            d.map = {};
        });
        graph1 = new AdjacencyMapAutomerge(amdoc1)

        let amdoc2 = automerge.init<AdjacencyMapAutomergeGraph>()
        amdoc2 = automerge.merge(amdoc2, automerge.clone(amdoc1))
        graph2 = new AdjacencyMapAutomerge(amdoc2)
    })

    it('should add a node from yMatrix1 to both maps', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);

        const node1LabelForMatrix1 = graph1.getNode('node1')?.data.label;
        const node1LabelForMatrix2 = graph2.getNode('node1')?.data.label;

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node1')).toBeDefined();

        expect(node1LabelForMatrix1).toBe('node1');
        expect(node1LabelForMatrix2).toBe('node1');

        expect(graph1.nodeCount).toBe(1);
        expect(graph2.nodeCount).toBe(1);
    })

    it('should add a node from yMatrix2 to both maps', () => {
        graph2.addNode('node1', 'node1', { x: 0, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);

        const node1LabelForMatrix1 = graph1.getNode('node1')?.data.label;
        const node1LabelForMatrix2 = graph2.getNode('node1')?.data.label;

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node1')).toBeDefined();

        expect(node1LabelForMatrix1).toBe('node1');
        expect(node1LabelForMatrix2).toBe('node1');

        expect(graph1.nodeCount).toBe(1);
        expect(graph2.nodeCount).toBe(1);
    })

    it('should delete a node in both maps', () => {
        graph1.addNode('node2', 'node2', { x: 0, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeNode('node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeUndefined();
        expect(graph1.getNode('node2')).toBeUndefined();
        
        expect(graph2.getNode('node1')).toBeUndefined();
        expect(graph2.getNode('node2')).toBeUndefined();

        expect(graph1.nodeCount).toBe(0);
        expect(graph2.nodeCount).toBe(0);
    })

    it('should add an edge from yMatrix1 to both maps', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 0, y: 0 });
        graph1.addEdge('node1', 'node2', 'edge 1');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        const edgeLabelForMatrix1 = graph1.getEdge('node1', 'node2')?.data?.label;
        const edgeLabelForMatrix2 = graph2.getEdge('node1', 'node2')?.data?.label;

        expect(edgeLabelForMatrix1).toBe('edge 1');
        expect(edgeLabelForMatrix2).toBe('edge 1');

        expect(graph1.getEdge('node1', 'node2')?.data?.label).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')?.data?.label).toBeDefined();

        expect(graph1.edgeCount).toBe(1);
        expect(graph2.edgeCount).toBe(1);
        expect(graph1.nodeCount).toBe(2);
        expect(graph2.nodeCount).toBe(2);
    })

    it('should add an edge from yMatrix2 to both maps', () => {
        graph2.addNode('node1', 'node1', { x: 0, y: 0 });
        graph2.addNode('node2', 'node2', { x: 0, y: 0 });
        graph2.addEdge('node1', 'node2', 'edge1');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        const edgeLabelForMatrix1 = graph1.getEdge('node1', 'node2')?.data?.label;
        const edgeLabelForMatrix2 = graph2.getEdge('node1', 'node2')?.data?.label;

        expect(edgeLabelForMatrix1).toBe('edge1');
        expect(edgeLabelForMatrix2).toBe('edge1');

        expect(graph1.getEdge('node1', 'node2')?.data?.label).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')?.data?.label).toBeDefined();

        expect(graph1.edgeCount).toBe(1);
        expect(graph2.edgeCount).toBe(1);
        expect(graph1.nodeCount).toBe(2);
        expect(graph2.nodeCount).toBe(2);
    })

    it('should delete an edge in both maps', () => {
        graph1.addNode('node1', 'Node 1', { x: 0, y: 0 });
        graph1.addNode('node2', 'Node 2', { x: 0, y: 0 });
        graph1.addEdge('node1', 'node2', 'edge1');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeEdge('node1', 'node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph2.getEdge('node1', 'node2')).toBeUndefined();

        expect(graph1.edgeCount).toBe(0);
        expect(graph2.edgeCount).toBe(0);
        expect(graph1.nodeCount).toBe(2);
        expect(graph2.nodeCount).toBe(2);
    })

// addNode(m), addNode(n), m != n
    it('add node1 in one map and node2 in the other map)', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph2.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph1.nodeCount).toBe(2);
        expect(graph2.nodeCount).toBe(2);
    })

// addNode(m), addEdge(n1,n2), m == n2, but not synchronously
    it('add node1 in one map and then node2 with edge1-2 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph2.addNode('node2', 'node2', { x: 10, y: 0 });
        graph2.addEdge('node1', 'node2', 'edge1-2');
        AdjacencyMapAutomerge.sync(graph1, graph2);


        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
    })

// addNode(m), removeNode(n), m == n, combination does not exist

// addNode(m), removeNode(n), m != n
    it('add node1 in one map and remove node2 the other map', () => {
        graph2.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph2.removeNode('node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeUndefined();
        expect(graph1.getNode('node1')?.data.label).toBe('node1');
        expect(graph1.nodeCount).toBe(1);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeUndefined();
        expect(graph2.getNode('node1')?.data.label).toBe('node1');
        expect(graph2.nodeCount).toBe(1);
    })

// addNode(m), removeEdge(n1,n2), m != n1,n2
    it('add node3 in one map and remove edge1-2 in the other map', () => {
        graph2.addNode('node1', 'node1', { x: 0, y: 0 });
        graph2.addNode('node2', 'node2', { x: 10, y: 0 });
        graph2.addEdge('node1', 'node2', 'edge1-2');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addNode('node3', 'node3', { x: 10, y: 0 });
        graph2.removeEdge('node1', 'node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph1.nodeCount).toBe(3);
        expect(graph1.edgeCount).toBe(0);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph2.nodeCount).toBe(3);
        expect(graph2.edgeCount).toBe(0);
    })

// addNode(m), removeEdge(n1,n2), m == n1,n2, combinations do not exist

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 != n2
    it('add edge1-2 in one map and add edge1-3 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph2.addNode('node3', 'node3', { x: 10, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.addEdge('node1', 'node3', 'edge1-3');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeDefined();
        expect(graph1.getEdge('node1', 'node3')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(graph1.getEdge('node1', 'node3')?.data?.label).toBe('edge1-3');
        expect(graph1.edgeCount).toBe(2);
        expect(graph1.nodeCount).toBe(3);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeDefined();
        expect(graph2.getEdge('node1', 'node3')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(graph2.getEdge('node1', 'node3')?.data?.label).toBe('edge1-3');
        expect(graph2.edgeCount).toBe(2);
        expect(graph2.nodeCount).toBe(3);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and add edge3-2 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addNode('node3', 'node3', { x: 0, y: 10 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.addEdge('node3', 'node2', 'edge3-2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getEdge('node3', 'node2')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(graph1.getEdge('node3', 'node2')?.data?.label).toBe('edge3-2');
        expect(graph1.edgeCount).toBe(2);
        expect(graph1.nodeCount).toBe(3);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getEdge('node3', 'node2')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(graph2.getEdge('node3', 'node2')?.data?.label).toBe('edge3-2');
        expect(graph2.edgeCount).toBe(2);
        expect(graph2.nodeCount).toBe(3);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and add edge3-4 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph2.addNode('node3', 'node3', { x: 0, y: 10 });
        graph2.addNode('node4', 'node4', { x: 10, y: 10 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.addEdge('node3', 'node4', 'edge3-4');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getNode('node4')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeDefined();
        expect(graph1.getEdge('node3', 'node4')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(graph1.getEdge('node3', 'node4')?.data?.label).toBe('edge3-4');
        expect(graph1.edgeCount).toBe(2);
        expect(graph1.nodeCount).toBe(4);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getNode('node4')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeDefined();
        expect(graph2.getEdge('node3', 'node4')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(graph2.getEdge('node3', 'node4')?.data?.label).toBe('edge3-4');
        expect(graph2.edgeCount).toBe(2);
        expect(graph2.nodeCount).toBe(4);
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 == n2
    it('try to add edge twice', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph2.addEdge('node1', 'node2', 'second edge1-2');
        graph1.addEdge('node1', 'node2', 'edge1-2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        const edgeForMatrix1 = graph1.getEdge('node1', 'node2');
        const edgeForMatrix2 = graph2.getEdge('node1', 'node2');

        expect(edgeForMatrix1).toBeDefined();
        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.edgeCount).toBe(1);
        expect(graph1.nodeCount).toBe(2);
        // yjs decides which label to take for the edge
        // expect(yMatrix1.getEdge('node1',  'node2')?.label).toBe('edge1-2');

        expect(edgeForMatrix2).toBeDefined();
        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.edgeCount).toBe(1);
        expect(graph2.nodeCount).toBe(2);
    })

// addEdge(m1,m2), removeNode(n) m1 == n, m2 != n
    it('add edge1-2 in one map and remove node1 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.removeNode('node1');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeUndefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph1.nodeCount).toBe(1);

        expect(graph2.getNode('node1')).toBeUndefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph2.nodeCount).toBe(1);
    })

// addEdge(m1,m2), removeNode(n) m1 != n, m2 == n
// This test requires garbage collection because of dangling edges
    it('add edge1-2 in one map and remove node2 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.removeNode('node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        // dangling edges are removed here
        graph1.edgesAsFlow();
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node2')).toBeUndefined();
        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph1.edgeCount).toBe(0);
        expect(graph1.nodeCount).toBe(1);

        expect(graph2.getNode('node2')).toBeUndefined();
        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph2.edgeCount).toBe(0);
        expect(graph2.nodeCount).toBe(1);
    })

// addEdge(m1,m2), removeNode(n) m1 == n, m2 == n
    it('add edge1-1 in one map and remove node1 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node1', 'edge1-1');
        graph2.removeNode('node1');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeUndefined();
        expect(graph2.getNode('node1')).toBeUndefined();
        expect(graph1.nodeCount).toBe(0);
        expect(graph2.nodeCount).toBe(0);
    })

// addEdge(m1,m2), removeNode(n) m1 != n, m2 != n
    it('add edge1-2 in one map and remove node3 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 0, y: 10 });
        graph1.addNode('node3', 'node3', { x: 10, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.removeNode('node3');
        AdjacencyMapAutomerge.sync(graph1, graph2);


        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeUndefined();
        expect(graph1.getEdge('node1', 'node2')).toBeDefined();
        expect(graph1.edgeCount).toBe(1);
        expect(graph1.nodeCount).toBe(2);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeUndefined();
        expect(graph2.getEdge('node1', 'node2')).toBeDefined();
        expect(graph1.edgeCount).toBe(1);
        expect(graph2.nodeCount).toBe(2);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and remove edge3-4 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph2.addNode('node3', 'node3', { x: 0, y: 10 });
        graph2.addNode('node4', 'node4', { x: 10, y: 10 });
        graph2.addEdge('node3', 'node4', 'edge3-4');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.removeEdge('node3', 'node4');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getNode('node4')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeDefined();
        expect(graph1.getEdge('node3', 'node4')).toBeUndefined();
        expect(graph1.edgeCount).toBe(1);
        expect(graph1.nodeCount).toBe(4);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getNode('node4')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeDefined();
        expect(graph2.getEdge('node3', 'node4')).toBeUndefined();
        expect(graph2.edgeCount).toBe(1);
        expect(graph2.nodeCount).toBe(4);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('add edge1-2 in one map and remove edge1-3 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addNode('node3', 'node3', { x: 0, y: 10 });
        graph1.addEdge('node1', 'node3', 'edge1-3');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.removeEdge('node1', 'node3');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeDefined();
        expect(graph1.getEdge('node1', 'node3')).toBeUndefined();
        expect(graph1.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(graph1.edgeCount).toBe(1);
        expect(graph1.nodeCount).toBe(3);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeDefined();
        expect(graph2.getEdge('node1', 'node3')).toBeUndefined();
        expect(graph2.getEdge('node1', 'node2')?.data?.label).toBe('edge1-2');
        expect(graph2.edgeCount).toBe(1);
        expect(graph2.nodeCount).toBe(3);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and remove edge3-2 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addNode('node3', 'node3', { x: 0, y: 10 });
        graph1.addEdge('node3', 'node2', 'edge3-2');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.removeEdge('node3', 'node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getEdge('node1','node2')).toBeDefined();
        expect(graph1.getEdge('node1','node3')).toBeUndefined();
        expect(graph1.getEdge('node1','node2')?.data?.label).toBe('edge1-2');
        expect(graph1.edgeCount).toBe(1);
        expect(graph1.nodeCount).toBe(3);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getEdge('node1','node2')).toBeDefined();
        expect(graph2.getEdge('node1','node3')).toBeUndefined();
        expect(graph2.getEdge('node1','node2')?.data?.label).toBe('edge1-2');
        expect(graph2.edgeCount).toBe(1);
        expect(graph2.nodeCount).toBe(3);
    })

// removeNode(m), removeNode(n) n == m
    it('remove node1 in one map and remove node1 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeNode('node1');
        graph2.removeNode('node1');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeUndefined();
        expect(graph2.getNode('node1')).toBeUndefined();
        expect(graph1.nodeCount).toBe(0);
        expect(graph2.nodeCount).toBe(0);
    })

// removeNode(m), removeNode(n) n != m
    it('remove node1 in one map and remove node2 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph2.addNode('node2', 'node2', { x: 10, y: 0 });
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeNode('node1');
        graph2.removeNode('node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeUndefined();
        expect(graph2.getNode('node2')).toBeUndefined();
        expect(graph1.nodeCount).toBe(0);
        expect(graph2.nodeCount).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m == n1, m != n2
    it('remove node1 in one map and remove edge1-2 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeNode('node1');
        graph2.removeEdge('node1', 'node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeUndefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph1.nodeCount).toBe(1);
        expect(graph1.edgeCount).toBe(0);

        expect(graph2.getNode('node1')).toBeUndefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph2.nodeCount).toBe(1);
        expect(graph2.edgeCount).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m != n1, m == n2
    it('remove node2 in one map and remove edge1-2 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeEdge('node1', 'node2');
        graph2.removeNode('node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node2')).toBeUndefined();
        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph1.nodeCount).toBe(1);
        expect(graph1.edgeCount).toBe(0);

        expect(graph2.getNode('node2')).toBeUndefined();
        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph2.nodeCount).toBe(1);
        expect(graph2.edgeCount).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m != n1, m != n2
    it('remove node1 in one map and remove edge2-3 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph2.addNode('node2', 'node2', { x: 10, y: 0 });
        graph2.addNode('node3', 'node3', { x: 0, y: 10 });
        graph2.addEdge('node2', 'node3', 'edge2-3');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeNode('node1');
        graph2.removeEdge('node2', 'node3');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeUndefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getEdge('node1',  'node2')).toBeUndefined();
        expect(graph1.nodeCount).toBe(2);
        expect(graph1.edgeCount).toBe(0);

        expect(graph2.getNode('node1')).toBeUndefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getEdge('node2', 'node3')).toBeUndefined();
        expect(graph2.nodeCount).toBe(2);
        expect(graph2.edgeCount).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m == n1, m == n2
    it('remove node1 in one map and remove edge1-1 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph2.addEdge('node1', 'node1', 'edge1-1');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeNode('node1');
        graph2.removeEdge('node1', 'node1');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeUndefined();
        expect(graph1.nodeCount).toBe(0);
        expect(graph1.edgeCount).toBe(0);

        expect(graph2.getNode('node1')).toBeUndefined();
        expect(graph2.nodeCount).toBe(0);
        expect(graph2.edgeCount).toBe(0);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 == n2
    it('remove edge1-2 in one map and remove edge1-2 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph2.addEdge('node1', 'node1', 'edge1-1');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeEdge('node1', 'node1');
        graph2.removeEdge('node1', 'node1');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getEdge('node1', 'node1')).toBeUndefined();
        expect(graph1.nodeCount).toBe(1);
        expect(graph1.edgeCount).toBe(0);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getEdge('node1', 'node1')).toBeUndefined();
        expect(graph2.nodeCount).toBe(1);
        expect(graph2.edgeCount).toBe(0);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 == n2
    it('remove edge1-2 in one map and remove edge3-2 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph2.addEdge('node3', 'node2', 'edge3-2');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeEdge('node1', 'node2');
        graph2.removeEdge('node3', 'node2');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getEdge('node1',  'node2')).toBeUndefined();
        expect(graph1.getEdge('node3', 'node2')).toBeUndefined();
        expect(graph1.nodeCount).toBe(2);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph2.getEdge('node3', 'node2')).toBeUndefined();
        expect(graph2.nodeCount).toBe(2);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('remove edge1-2 in one map and remove edge2-3 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addNode('node3', 'node3', { x: 0, y: 10 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph1.addEdge('node2', 'node3', 'edge2-3');
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeEdge('node1', 'node2');
        graph2.removeEdge('node2', 'node3');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph1.getEdge('node2', 'node3')).toBeUndefined();
        expect(graph1.edgeCount).toBe(0);
        expect(graph1.nodeCount).toBe(3);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph2.getEdge('node2', 'node3')).toBeUndefined();
        expect(graph2.edgeCount).toBe(0);
        expect(graph2.nodeCount).toBe(3);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('remove edge1-2 in one map and remove edge3-4 in the other map', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph2.addNode('node3', 'node3', { x: 0, y: 10 });
        graph2.addNode('node4', 'node4', { x: 10, y: 10 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph2.addEdge('node3', 'node4', 'edge3-4');   
        AdjacencyMapAutomerge.sync(graph1, graph2);
        graph1.removeEdge('node1', 'node2');
        graph2.removeEdge('node3', 'node4');
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.getNode('node1')).toBeDefined();
        expect(graph1.getNode('node2')).toBeDefined();
        expect(graph1.getNode('node3')).toBeDefined();
        expect(graph1.getNode('node4')).toBeDefined();
        expect(graph1.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph1.getEdge('node3', 'node4')).toBeUndefined();
        expect(graph1.edgeCount).toBe(0);
        expect(graph1.edgeCount).toBe(0);
        expect(graph1.nodeCount).toBe(4);

        expect(graph2.getNode('node1')).toBeDefined();
        expect(graph2.getNode('node2')).toBeDefined();
        expect(graph2.getNode('node3')).toBeDefined();
        expect(graph2.getNode('node4')).toBeDefined();
        expect(graph2.getEdge('node1', 'node2')).toBeUndefined();
        expect(graph2.getEdge('node3', 'node4')).toBeUndefined();
        expect(graph2.edgeCount).toBe(0);
        expect(graph2.edgeCount).toBe(0);
        expect(graph2.nodeCount).toBe(4);
    })

    it('select node', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph1.changeNodeSelection('node1', true);
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.isNodeSelected('node1')).toBe(true);
        expect(graph2.isNodeSelected('node1')).toBe(false);
    })

    it('deselect node', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph1.changeNodeSelection('node1', true);
        graph1.changeNodeSelection('node1', false);
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.isNodeSelected('node1')).toBe(false);
        expect(graph2.isNodeSelected('node1')).toBe(false);
    })

    it('select edge', () => { 
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph1.changeEdgeSelection('node1+node2', true);
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.isEdgeSelected('node1', 'node2')).toBe(true);
        expect(graph2.isEdgeSelected('node1', 'node2')).toBe(false);
    })

    it('deselect edge', () => { 
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 10, y: 0 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph1.changeEdgeSelection('node1+node2', true);
        graph1.changeEdgeSelection('node1+node2', false);
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.isEdgeSelected('node1', 'node2')).toBe(false);
        expect(graph2.isEdgeSelected('node1', 'node2')).toBe(false);
    })

    it('select nodes and edges', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 0, y: 10 });
        graph1.addNode('node3', 'node3', { x: 10, y: 0 });
        graph1.addNode('node4', 'node4', { x: 10, y: 10 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph1.addEdge('node1', 'node2', 'edge3-4');
        graph1.changeNodeSelection('node1', true);
        graph1.changeNodeSelection('node2', true);
        graph1.changeNodeSelection('node3', true);
        graph1.changeEdgeSelection('node1+node2', true);
        graph1.changeEdgeSelection('node3+node4', true);
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.isNodeSelected('node1')).toBe(true);
        expect(graph1.isNodeSelected('node2')).toBe(true);
        expect(graph1.isNodeSelected('node3')).toBe(true);
        expect(graph1.isNodeSelected('node4')).toBe(false);
        expect(graph1.isEdgeSelected('node1', 'node2')).toBe(true);
        expect(graph1.isEdgeSelected('node3', 'node4')).toBe(true);
        expect(graph1.selectedEdgesCount).toBe(2);
        expect(graph1.selectedNodesCount).toBe(3);

        expect(graph2.selectedEdgesCount).toBe(0);
        expect(graph2.selectedNodesCount).toBe(0);
    })

    it('select and deselect nodes and edges', () => {
        graph1.addNode('node1', 'node1', { x: 0, y: 0 });
        graph1.addNode('node2', 'node2', { x: 0, y: 10 });
        graph1.addNode('node3', 'node3', { x: 10, y: 0 });
        graph1.addNode('node4', 'node4', { x: 10, y: 10 });
        graph1.addEdge('node1', 'node2', 'edge1-2');
        graph1.addEdge('node1', 'node2', 'edge3-4');
        graph1.changeNodeSelection('node1', true);
        graph1.changeNodeSelection('node2', true);
        graph1.changeNodeSelection('node3', true);
        graph1.changeEdgeSelection('node1+node2', true);
        graph1.changeEdgeSelection('node3+node4', true);
        graph1.changeNodeSelection('node1', false);
        graph1.changeEdgeSelection('node1+node2', false);
        AdjacencyMapAutomerge.sync(graph1, graph2);

        expect(graph1.isNodeSelected('node1')).toBe(false);
        expect(graph1.isNodeSelected('node2')).toBe(true);
        expect(graph1.isNodeSelected('node3')).toBe(true);
        expect(graph1.isNodeSelected('node4')).toBe(false);
        expect(graph1.isEdgeSelected('node1', 'node2')).toBe(false);
        expect(graph1.isEdgeSelected('node3', 'node4')).toBe(true);
        expect(graph1.selectedEdgesCount).toBe(1);
        expect(graph1.selectedNodesCount).toBe(2);

        expect(graph2.selectedEdgesCount).toBe(0);
        expect(graph2.selectedNodesCount).toBe(0);
    })

})