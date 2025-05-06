import * as Y from 'yjs'
import { FixedRootConnectedUndirectedGraph } from '../graphs/FixedRootWeaklyConnectedUndirectedGraph'
 /* 
 Assumptions: 
 1. It is not allowed to add nodes with the same id
 2. It is not possible by implementation to add several edges between the same nodes, 
 as edge ids are generated from node ids connected by the edge
 3. The graph should always be connected, the fixed root is not deletable
 */
describe('Fixed Root Connected Undirected Graph', () => {
    let ydoc1: Y.Doc
    let yMatrix1: FixedRootConnectedUndirectedGraph
    let ydoc2: Y.Doc
    let yMatrix2: FixedRootConnectedUndirectedGraph
    let ydoc3: Y.Doc
    let yMatrix3: FixedRootConnectedUndirectedGraph


    beforeEach(() => {
        ydoc1 = new Y.Doc()
        yMatrix1 = new FixedRootConnectedUndirectedGraph(ydoc1)
        ydoc2 = new Y.Doc()
        yMatrix2 = new FixedRootConnectedUndirectedGraph(ydoc2)
        ydoc3 = new Y.Doc()
        yMatrix3 = new FixedRootConnectedUndirectedGraph(ydoc3)      
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3])
    })

    
    // Basic tests
    it('should add a node with edge to root from yMatrix1 to both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        const node1LabelForMatrix1 = yMatrix1.getNode('node1')?.nodeData.get('label');
        const node1LabelForMatrix2 = yMatrix2.getNode('node1')?.nodeData.get('label');
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(node1LabelForMatrix1).toBe('node1');
        expect(node1LabelForMatrix2).toBe('node1');
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);   
    })
    it('should add a node with edge to root from yMatrix2 to both maps', () => {
        yMatrix2.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        const node1LabelForMatrix1 = yMatrix1.getNode('node1')?.nodeData.get('label');
        const node1LabelForMatrix2 = yMatrix2.getNode('node1')?.nodeData.get('label');
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(node1LabelForMatrix1).toBe('node1');
        expect(node1LabelForMatrix2).toBe('node1');
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);  
    })
    it('should delete edge from root node with its target node in both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    it('should delete edge from root node with its target node (containing a self loop) in both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addEdge('node1', 'node1', 'self loop');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.isWeaklyConnected()).toBe(true);
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    it('should delete edge to root node with its source node in both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.isWeaklyConnected()).toBe(true);
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    it('should delete edge to root node with its source node (containing a self loop) in both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addEdge('node1', 'node1', 'self loop');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.isWeaklyConnected()).toBe(true);
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    it('should delete an edge (not connected to root node) with its target node in both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'node2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.isWeaklyConnected()).toBe(true);
        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    it('should delete an edge (not connected to root node) with its target node (containing a self loop) in both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2');
        yMatrix1.addEdge('node2', 'node2', 'self loop');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'node2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    it('should delete an edge (not connected to root node) with its source node in both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node2', 'node1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    it('should delete an edge (not connected to root node) with its source node (containing a self loop) in both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2');
        yMatrix1.addEdge('node2', 'node2', 'self loop');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node2', 'node1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })

    it('should delete an edge to root with deleting a node', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addEdge('root', 'node1', 'back edge');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeUndefined();

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    it('should not delete an edge important for connectedness', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // Tests checking weakly connectness property in a local graph
    it('try to add a single node not connected to the graph, should not work', () => {
        yMatrix1.addNodeWithEdge('node1', 'nodeX', 'node1', { x: 0, y: 0 }, 'edge1');
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    it('try to delete an edge, that is important for connectedness', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2');
        yMatrix1.removeEdge('root', 'node1');
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    it('try to add an edge with node, where the target node of the edge does not exist in the graph', () => {
        yMatrix1.addEdge('root', 'node1', 'edge1');
        expect(yMatrix1.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    it('try to add an edge with node, where the source node of the edge does not exist in the graph', () => {
        yMatrix1.addEdge('node1', 'root', 'edge1');
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    it('try to remove an edge, that is not important for connectedness, should work', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2');
        
        // adding this edge will not change the graph layout, but only change the label
        yMatrix1.addEdge('node2', 'node1', 'edge21')
        expect(yMatrix1.getEdge('node1', 'node2')!.label).toBe('edge21');
        yMatrix1.addEdge('root', 'node2', 'connection')

        yMatrix1.removeEdge('node2', 'node1');
        expect(yMatrix1.getEdge('node2', 'node1')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    // addNode(m), addNode(n), m != n
    it('add node1 in one map and node2 in the other map)', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        yMatrix2.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // addNode(m), addEdge(n1,n2), m == n2, but not synchronously
    it('add node1 in one map and then node2 with edge1-2 in the other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node1')?.label).toBe('edge2-1');
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node1')?.label).toBe('edge2-1');
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // addNodeWithEdge(n = n1, n2), addNodeWithEdge(m = m1, m2), n != m && n2 == m1
    it('add node1 with edge1-r in one map and then node2 with edge2-r in the other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix2.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // addNodeWithEdge(n = n1, n2), addNodeWithEdge(m = m1, m2), n != m && n2 != m1
    it('add node3 with edge3-2 in one map and then node4 with edge4-1 in the other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge3-2');
        yMatrix2.addNodeWithEdge('node4', 'node1', 'node4', { x: 0, y: 0 }, 'edge4-1');
        console.log(yMatrix1.nodeCount);
        console.log(yMatrix1.edgeCount);
        console.log(yMatrix2.nodeCount);
        console.log(yMatrix2.edgeCount);
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node4', 'node1')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(5);
        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node4', 'node1')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(5);
        expect(yMatrix2.edgeCount).toBe(4);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // addEdge(n1, n2), addNodeWithEdge(m = m1, m2), n1 != m1 && n2 == m2
    it('add edge 1-r with node1 in one map and edge 2-r in other map', () => {
        yMatrix1.addNodeWithEdge('node3', 'root', 'node1', { x: 0, y: 0 }, 'edge3-r');
        yMatrix1.addNodeWithEdge('node2', 'node3', 'node2', { x: 0, y: 0 }, 'edge2-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix2.addEdge('node2', 'root', 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(4);
        expect(yMatrix2.edgeCount).toBe(4);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // addEdge(n1, n2), addNodeWithEdge(m = m1, m2), n1 != m1 && n2 != m2
    it('add edge 1-r with node1 in one map and edge 3-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node2', 'root', 'node1', { x: 0, y: 0 }, 'edge2-r');
        yMatrix1.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(4);
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    }) 
    // addEdge(n1, n2), addEdge(m1, m2), n1 == m1 && n2 == m2
    it('add edge r-1 in both maps', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('root', 'node1', 'edger-1');
        yMatrix2.addEdge('root', 'node1', 'edger-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);      
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // addEdge(n1, n2), addEdge(m1, m2), n1 != m1 && n2 == m2
    it('add edge 1-r in one map and edge 2-r in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'root', 'edge1-r');
        yMatrix2.addEdge('node2', 'root', 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);      
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // addEdge(n1, n2), addEdge(m1, m2), n1 = m1 && n2 != m2
    it('add edge r-1 in one map and edge r-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('root', 'node1', 'edge1-r');
        yMatrix2.addEdge('root', 'node2', 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);      
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // addEdge(n1, n2), addEdge(m1, m2), n1 != m1 && n2 != m2
    it('add edge 1-3 in one map and edge 2-4 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        yMatrix1.addNodeWithEdge('node3', 'node1', 'node3', { x: 0, y: 0 }, 'edge3-1');
        yMatrix1.addNodeWithEdge('node4', 'node2', 'node4', { x: 0, y: 0 }, 'edge4-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node1', 'node3', 'edge1-3');
        yMatrix2.addEdge('node2', 'node4', 'edge2-4');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);      
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node4', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node4')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(5);
        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node4', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node3')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node4')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(5);
        expect(yMatrix2.edgeCount).toBe(4);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addNodeWithEdge(m = m1, m2), n1 != m1 && n2 = m2 && n = n1
    it('remove edge 1-r in one map and add node2 with edge2-r in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addNodeWithEdge(m = m1, m2), n1 != m1 && n2 != m2 && n = n1
    it('remove edge 1-r in one map and add node3 with edge3-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addNodeWithEdge(m = m1, m2), n1 != m1 && n2 != m2 && n = n2
    it('remove edge r-1 in one map and add node3 with edge3-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addNodeWithEdge(m = m1, m2), n1 != m1 && n2 = m2 && n = n2
    it('remove edge r-1 in one map and add node2 with edge2-1 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addNodeWithEdge(m = m1, m2), n2 != m1 && n1 = m2 && n = n1
    it('remove edge 1-r in one map and add node2 with edge2-1 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2-1');
        console.log('before second sync');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addNodeWithEdge(m1, m = m2), n1 = m1 && n2 != m2 && n = n1
    it('remove edge 1-r in one map and add node2 with edge1-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addNodeWithEdge(m1, m = m2), n2 = m1 && n1 != m2 && n = n2
    it('remove edge r-1 in one map and add node2 with edge1-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n = n1, n2), addEdge(m1,m2), n1 != m1 && n2 = m2 
    it('remove edge 1-r in one map and add edge 2-r in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addEdge('node2', 'root', 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n = n1, n2), addEdge(m1,m2), n1 = m1 && n2 != m2 
    it('remove edge 1-r in one map and add edge 1-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addEdge('node1', 'root', 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n = n1, n2), addEdge(m1,m2), n1 != m1 && n2 != m2 
    it('remove edge 1-r in one map and add edge 3-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        yMatrix1.addNodeWithEdge('node3', 'root', 'node3', { x: 0, y: 0 }, 'edge3-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addEdge('node3', 'node2', 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined()
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix2.getEdge('node3', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node3', 'root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n = n2), addEdge(m1,m2), n1 != m1 && n2 = m2 
    it('remove edge r-1 in one map and add edge 2-1 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n = n2), addEdge(m1,m2), n1 = m1 && n2 != m2 
    it('remove edge r-1 in one map and add edge r-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addEdge('root', 'node2', 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n = n2), addEdge(m1,m2), n1 != m1 && n2 != m2 
    it('remove edge r-1 in one map and add edge 2-3 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node3', 'root', 'node3', { x: 0, y: 0 }, 'edger-3');
        yMatrix1.addNodeWithEdge('node2', 'node3', 'node2', { x: 0, y: 0 }, 'edge2-3');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addEdge('root', 'node2', 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node3')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node3')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n = n1, n2), addEdge(m1,m2), n1 = m2 && n2 = m1, remove node wins in this case
    it('remove edge 1-r in one map and add edge r-1 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addEdge('root', 'node1', 'edger-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n = n2), addEdge(m1,m2), n1 = m2 && n2 = m1, remove node wins in this case
    it('remove edge r-1 in one map and add edge 1-r in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addEdge('node1', 'root', 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n = n1, n2), addEdge(m1,m2), n1 = m2 && n2 != m1
    it('remove edge 1-r in one map and add edge 2-1 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addEdge('node2', 'node1', 'edge2-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n = n2), addEdge(m1,m2), n1 = m2 && n2 != m1
    it('remove edge r-1 in one map and add edge 2-r in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addEdge('node2', 'root', 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })  
    // removeEdge(n = n1, n2), addEdge(m1,m2), n1 != m2 && n2 = m1
    it('remove edge 1-r in one map and add edge r-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.addEdge('root', 'node2', 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n = n2), addEdge(m1,m2), n1 != m2 && n2 = m1
    it('remove edge r-1 in one map and add edge 1-2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addEdge('node1', 'node2', 'edge1-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addEdge(m1,m2), n1 = m2 && n2 != m2, without node deletion
    it('remove edge r-1 in one map and add edge r-2 in other map without node deletion', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('root', 'node2', 'edger-2');
        yMatrix2.removeEdge('root', 'node1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addEdge(m1,m2), n1 != m2 && n2 = m2, without node deletion
    it('remove edge 1-r in one map and add edge 2-r in other map without node deletion', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node2', 'root', 'edge2-r');
        yMatrix2.removeEdge('node1', 'root');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), addEdge(m1,m2), n1 != m2 && n2 != m2, without node deletion
    it('remove edge 1-3 in one map and add edge 2-r in other map without node deletion', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        yMatrix1.addNodeWithEdge('node3', 'node1', 'node3', { x: 0, y: 0 }, 'edge1-3');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.addEdge('node2', 'root', 'edge2-r');
        yMatrix2.removeEdge('node1', 'node3');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n = m && n1 = m1 && n2 = m2, remove same node
    it('remove edge r-1 in one map and remove edge r-1 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.removeEdge('root', 'node1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n != m && n = n2 && m = m2 &&  n1 = m1 && n2 != m2, remove different nodes
    it('remove edge r-2 in one map and remove edge r-1 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.removeEdge('root', 'node2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n != m && n = n1 && m = m1 &&  n1 != m1 && n2 = m2, remove different nodes
    it('remove edge 1-r in one map and remove edge 2-r in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.removeEdge('node2', 'root');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n != m && n = n2 && m = m1 &&  n1 = m1 && n2 != m2, remove different nodes
    it('remove edge r-1 in one map and remove edge 2-r in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edge2-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.removeEdge('node2', 'root');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(1);
        expect(yMatrix1.edgeCount).toBe(0);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(1);
        expect(yMatrix2.edgeCount).toBe(0);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n1 = m2 && n2 != m1, remove one of the nodes (n)
    it('remove edge 1-r in one map and remove edge 1-2 with node 2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        yMatrix1.addEdge('node1', 'root', 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.removeEdge('node1', 'node2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n1 = m1 && n2 != m2, remove one of the nodes (n)
    it('remove edge r-1 in one map and remove edge 1-2 with node 2 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        yMatrix1.addEdge('node1', 'root', 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.removeEdge('node1', 'node2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(2);
        expect(yMatrix1.edgeCount).toBe(1);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(2);
        expect(yMatrix2.edgeCount).toBe(1);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n1 != m1 && n2 = m2, remove one of the nodes (n)
    it('remove edge 2-r in one map and remove edge 1-r with node 1 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        yMatrix1.addNodeWithEdge('node3', 'root', 'node3', { x: 0, y: 0 }, 'edge3-r');
        yMatrix1.addEdge('node2', 'root', 'edge2-r');
        yMatrix1.addEdge('node3', 'node2', 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.removeEdge('node2', 'root');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n1 != m2 && n2 = m1, remove one of the nodes (n)
    it('remove edge r-2 in one map and remove edge 1-r with node 1 in other map', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        yMatrix1.addNodeWithEdge('node3', 'root', 'node3', { x: 0, y: 0 }, 'edger-3');
        yMatrix1.addEdge('node2', 'root', 'edge2-r');
        yMatrix1.addEdge('node3', 'node2', 'edge2-3');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.removeEdge('root', 'node2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'root')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'root')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n1 = m2 && n2 = m1, without node deletion, does not work for undirected graphs

    // removeEdge(n1, n2), removeEdge(m1,m2), n1 != m1 && n2 = m2, without node deletion
    it('remove edge 2-1 in one map and remove edge r-1 in other map, without node deletion, one of the edges is restored', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        yMatrix1.addEdge('node2', 'node1', 'edge2-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node2', 'node1');
        yMatrix2.removeEdge('root', 'node1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n1 = m1 && n2 != m2, without node deletion
    it('remove edge 1-2 in one map and remove edge 1-r in other map, without node deletion, one of the edges is restored', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        yMatrix1.addEdge('node1', 'node2', 'edge1-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix2.removeEdge('node1', 'root');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(3);
        expect(yMatrix1.edgeCount).toBe(2);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(3);
        expect(yMatrix2.edgeCount).toBe(2);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n1 = m1 && n2 = m2, without node deletion, does not work for undirected graphs

    // removeEdge(n1, n2), removeEdge(m1,m2), n1 != m2 && n2 = m1, without node deletion
    it('remove edge r-1 in one map and remove edge 1-2 in other map, without node deletion', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        yMatrix1.addNodeWithEdge('node3', 'root', 'node3', { x: 0, y: 0 }, 'edger-3');
        yMatrix1.addEdge('node2', 'node1', 'edge2-1');
        yMatrix1.addEdge('node1', 'root', 'edge1-r');
        yMatrix1.addEdge('node3', 'node1', 'edge3-1');
        yMatrix1.addEdge('node3', 'node2', 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.removeEdge('node1', 'node2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node1')).toBeUndefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node1')).toBeUndefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(4);
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n1 = m2 && n2 != m1, without node deletion
    it('remove edge r-1 in one map and remove edge r-2 in other map, without node deletion', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        yMatrix1.addNodeWithEdge('node3', 'root', 'node3', { x: 0, y: 0 }, 'edger-3');
        yMatrix1.addEdge('node3', 'node1', 'edge3-1');
        yMatrix1.addEdge('node3', 'node2', 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.removeEdge('root', 'node2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(4);
        expect(yMatrix2.edgeCount).toBe(3);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // removeEdge(n1, n2), removeEdge(m1,m2), n1 != m1 && n2 != m2, without node deletion
    it('remove edge r-1 in one map and remove edge 3-2 in other map, without node deletion', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'root', 'node2', { x: 0, y: 0 }, 'edger-2');
        yMatrix1.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge2-3');
        yMatrix1.addNodeWithEdge('node4', 'root', 'node4', { x: 0, y: 0 }, 'edge4-r');
        yMatrix1.addEdge('node4', 'node1', 'edge4-1');
        yMatrix1.addEdge('node4', 'node3', 'edge4-3');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.removeEdge('node3', 'node2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix1.nodeCount).toBe(5);
        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'root')).toBeUndefined();
        expect(yMatrix2.getEdge('root', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node3')).toBeUndefined();
        expect(yMatrix2.nodeCount).toBe(5);
        expect(yMatrix2.edgeCount).toBe(4);
        expect(yMatrix2.isWeaklyConnected()).toBe(true);

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
    // Restore connectedness with a path 1- 2 - 3
    it('restore connectedness with a path', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix2, yMatrix3]);
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.removeEdge('node1', 'node2');
        yMatrix3.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge2-3');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    // 3 -> 2 -> 1 -> root
    it('restore connectedness with a reversed path', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix2, yMatrix3]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.removeEdge('node2', 'node1');
        yMatrix3.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    // 3 -> 2 <- 1 -> root
    it('restore connectedness with a path containing different edge directions', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix2, yMatrix3]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.removeEdge('node1', 'node2');
        yMatrix3.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    // 3 -> 2 <- 1 <-> root, currently only one of the loop edges are restored
    it('restore connectedness with a path containing a loop', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addEdge('root', 'node1', 'edger-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix2, yMatrix3]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.removeEdge('node1', 'node2');
        yMatrix3.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    // 3 -> 2 -> 1{self loop} -> root, self loop not restored
    it('restore connectedness with a path containing self loop', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edge1-r');
        yMatrix1.addEdge('node1', 'node1', 'edge1-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        yMatrix2.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge2-1');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix2, yMatrix3]);
        yMatrix1.removeEdge('node1', 'root');
        yMatrix2.removeEdge('node2', 'node1');
        yMatrix3.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge3-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(4);
        expect(yMatrix1.edgeCount).toBe(3);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    it('restore connectedness with the newest path', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        yMatrix1.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge2-3');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);      
        yMatrix1.removeEdge('node2', 'node3');
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addNodeWithEdge('node4', 'node2', 'node4', { x: 0, y: 0 }, 'edge4-2');
        yMatrix2.addEdge('root', 'node4', 'edger-4');
        yMatrix3.addNodeWithEdge('node5', 'node3', 'node5', { x: 0, y: 0 }, 'edge3-5');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getNode('node5')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node4', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node5')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(5);
        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    it('restore connectedness with the newest path, second variant', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        yMatrix1.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge2-3');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);      
        yMatrix1.removeEdge('node2', 'node3');
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addNodeWithEdge('node4', 'node2', 'node4', { x: 0, y: 0 }, 'edge4-2');
        yMatrix2.addEdge('root', 'node4', 'edger-4');
        yMatrix3.addNodeWithEdge('node5', 'node3', 'node5', { x: 0, y: 0 }, 'edge3-5');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeUndefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getNode('node5')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeUndefined();
        expect(yMatrix1.getEdge('root', 'node4')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeUndefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node4', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node3', 'node5')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(5);
        expect(yMatrix1.edgeCount).toBe(4);
        expect(yMatrix1.isWeaklyConnected()).toBe(true);
    })
    it('restore connectedness with a paths connecting three components', () => {
        yMatrix1.addNodeWithEdge('node1', 'root', 'node1', { x: 0, y: 0 }, 'edger-1');
        yMatrix1.addNodeWithEdge('node2', 'node1', 'node2', { x: 0, y: 0 }, 'edge1-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);      
        yMatrix1.removeEdge('node1', 'node2');
        yMatrix1.removeEdge('root', 'node1');
        yMatrix2.addNodeWithEdge('node3', 'node2', 'node3', { x: 0, y: 0 }, 'edge2-3');
        yMatrix2.addNodeWithEdge('node4', 'node2', 'node4', { x: 0, y: 0 }, 'edge2-4');
        yMatrix2.addEdge('node4', 'node3', 'edge4-3');
        yMatrix2.addNodeWithEdge('node5', 'node2', 'node5', { x: 0, y: 0 }, 'edge5-2');
        FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
        expect(yMatrix1.getNode('root')).toBeDefined();
        expect(yMatrix1.getNode('node1')).toBeDefined();
        expect(yMatrix1.getNode('node2')).toBeDefined();
        expect(yMatrix1.getNode('node3')).toBeDefined();
        expect(yMatrix1.getNode('node4')).toBeDefined();
        expect(yMatrix1.getNode('node5')).toBeDefined();
        expect(yMatrix1.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix1.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node5', 'node2')).toBeDefined();
        expect(yMatrix1.getEdge('node4', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node4')).toBeDefined();
        expect(yMatrix1.nodeCount).toBe(6);
        expect(yMatrix1.edgeCount).toBe(6);
        expect(yMatrix1.isWeaklyConnected()).toBe(true); 
        expect(yMatrix2.getNode('root')).toBeDefined();
        expect(yMatrix2.getNode('node1')).toBeDefined();
        expect(yMatrix2.getNode('node2')).toBeDefined();
        expect(yMatrix2.getNode('node3')).toBeDefined();
        expect(yMatrix2.getNode('node4')).toBeDefined();
        expect(yMatrix2.getNode('node5')).toBeDefined();
        expect(yMatrix2.getEdge('root', 'node1')).toBeDefined();
        expect(yMatrix2.getEdge('node1', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node5', 'node2')).toBeDefined();
        expect(yMatrix2.getEdge('node4', 'node3')).toBeDefined();
        expect(yMatrix1.getEdge('node2', 'node3')).toBeDefined();
        expect(yMatrix2.getEdge('node2', 'node4')).toBeDefined();
        expect(yMatrix2.nodeCount).toBe(6);
        expect(yMatrix2.edgeCount).toBe(6);
        expect(yMatrix2.isWeaklyConnected()).toBe(true); 

        expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
        expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
    })
/*     2,removeEdge,0 -> root
0,addNodeWithEdge,1 <- 0
0,addEdge,0 -> 0
2,removeEdge,root -> root
0,addNodeWithEdge,2 -> 1
0,addNodeWithEdge,3 -> 1
,sync,"0,1"
1,addEdge,1 -> 2
0,addNodeWithEdge,4 <- 0
0,removeEdge,3 -> 4 */
it('failed in property test', () => {
    yMatrix1.addNodeWithEdge('0', 'root', `$node0`, { x: 0, y: 0 }, `$edge0+root`);
    FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);  
    yMatrix3.removeEdge('0', 'root');
    yMatrix1.addNodeWithEdge('1', '0', `$node0`, { x: 0, y: 0 }, `$edge0+1`);
    yMatrix1.addEdge('0', '0', 'edge0-0');
    yMatrix3.removeEdge('root', 'root');
    yMatrix1.addNodeWithEdge('2', '1', `$node1`, { x: 0, y: 0 }, `$edge2+1`);
    yMatrix1.addNodeWithEdge('3', '1', `$node1`, { x: 0, y: 0 }, `$edge3+1`);
    FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2]);
    yMatrix2.addEdge('1', '2', 'edge1-2');
    yMatrix1.addNodeWithEdge('4', '0', `$node0`, { x: 0, y: 0 }, `$edge0+4`);
    yMatrix1.removeEdge('3', '4');
    FixedRootConnectedUndirectedGraph.syncDefault([yMatrix1, yMatrix2, yMatrix3]);
    expect(yMatrix1.isWeaklyConnected()).toBe(true); 
    expect(yMatrix2.isWeaklyConnected()).toBe(true);   
    expect(yMatrix1.getEdgesAsJson()).toEqual(yMatrix2.getEdgesAsJson());
    expect(yMatrix1.getYRemovedGraphElementsAsJson()).toEqual(yMatrix2.getYRemovedGraphElementsAsJson());
})
}) 