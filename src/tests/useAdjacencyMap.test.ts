import { renderHook, act } from '@testing-library/react-hooks'
import * as Y from 'yjs'
import { useAdjacencyMap, AdjacencyMap } from '../hooks/useAdjacencyMap'

/* 
Assumptions: 
1. It is not allowed to add nodes with the same id
2. It is not possible by implementation to add several edges between the same nodes, 
as edge ids are generated from node ids connected by the edge
*/

describe('useAdjacencyMap', () => {
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
        yMatrix1 = ydoc1.getMap('adjacency map') as AdjacencyMap
        ydoc2 = new Y.Doc()
        yMatrix2 = ydoc2.getMap('adjacency map') as AdjacencyMap
    })

    it('should add a node from graphApi1 to both maps', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            syncConcurrently();
        })
        const node1LabelForMatrix1 = yMatrix1.get('node1')?.get('flowNode').data.label;
        const node1LabelForMatrix2 = yMatrix2.get('node1')?.get('flowNode').data.label;

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix2.get('node1')).toBeDefined();

        expect(node1LabelForMatrix1).toBe('node1');
        expect(node1LabelForMatrix2).toBe('node1');

        expect(yMatrix1.size).toBe(1);
        expect(yMatrix2.size).toBe(1);
    })

    it('should add a node from graphApi2 to both maps', () => {
        renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi2.current.addNode('node1', 'node1', { x: 0, y: 0 });
            syncConcurrently();
        })
        const node1LabelForMatrix1 = yMatrix1.get('node1')?.get('flowNode').data.label;
        const node1LabelForMatrix2 = yMatrix2.get('node1')?.get('flowNode').data.label;

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix2.get('node1')).toBeDefined();

        expect(node1LabelForMatrix1).toBe('node1');
        expect(node1LabelForMatrix2).toBe('node1');

        expect(yMatrix1.size).toBe(1);
        expect(yMatrix2.size).toBe(1);
    })

    it('should delete a node in both maps', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node2', 'node2', { x: 0, y: 0 });
            syncConcurrently();
            graphApi1.current.removeNode('node2');
            syncConcurrently();
        })
        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix1.get('node2')).toBeUndefined();
        
        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node2')).toBeUndefined();

        expect(yMatrix1.size).toBe(0);
        expect(yMatrix2.size).toBe(0);
    })

    it('should add an edge from graphApi1 to both maps', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 0, y: 0 });
            graphApi1.current.addEdge('node1', 'node2', 'edge 1');
            syncConcurrently();
        })

        const edgeLabelForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2')?.label;
        const edgeLabelForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2')?.label;

        expect(edgeLabelForMatrix1).toBe('edge 1');
        expect(edgeLabelForMatrix2).toBe('edge 1');

        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
    })

    it('should add an edge from graphApi2 to both maps', () => {
        renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi2.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi2.current.addNode('node2', 'node2', { x: 0, y: 0 });
            graphApi2.current.addEdge('node1', 'node2', 'edge1');
            syncConcurrently();
        })

        const edgeLabelForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2')?.label;
        const edgeLabelForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2')?.label;

        expect(edgeLabelForMatrix1).toBe('edge1');
        expect(edgeLabelForMatrix2).toBe('edge1');

        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
    })

    it('should delete an edge in both maps', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'Node 1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'Node 2', { x: 0, y: 0 });
            graphApi1.current.addEdge('node1', 'node2', 'edge1');
            syncConcurrently();
            graphApi1.current.removeEdge('node1', 'node2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
    })

// addNode(m), addNode(n), m != n
    it('add node1 in one map and node2 in the other map)', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi2.current.addNode('node2', 'node2', { x: 10, y: 0 });
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
    })

// addNode(m), addEdge(n1,n2), m == n2, but not synchronously
    it('add node1 in one map and then node2 with edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            syncConcurrently();
            graphApi2.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')?.label).toBe('edge1-2');

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')?.label).toBe('edge1-2');
    })

// addNode(m), removeNode(n), m == n, combination does not exist

// addNode(m), removeNode(n), m != n
    it('add node1 in one map and remove node2 the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi2.current.addNode('node2', 'node2', { x: 10, y: 0 });
            syncConcurrently();
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi2.current.removeNode('node2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeUndefined();
        expect(yMatrix1.get('node1')?.get("flowNode").data.label).toBe('node1');

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeUndefined();
        expect(yMatrix2.get('node1')?.get("flowNode").data.label).toBe('node1');

    })

// addNode(m), removeEdge(n1,n2), m != n1,n2
    it('add node3 in one map and remove edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi2.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi2.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
            graphApi1.current.addNode('node3', 'node3', { x: 10, y: 0 });
            graphApi2.current.removeEdge('node1', 'node2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
    })

// addNode(m), removeEdge(n1,n2), m == n1,n2, combinations do not exist

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 != n2
    it('add edge1-2 in one map and add edge1-3 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addNode('node3', 'node3', { x: 10, y: 0 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.addEdge('node1', 'node3', 'edge1-3');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node3')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')!.label).toBe('edge1-2');
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node3')!.label).toBe('edge1-3');

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node3')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')!.label).toBe('edge1-2');
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node3')!.label).toBe('edge1-3');
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and add edge3-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addNode('node3', 'node3', { x: 0, y: 10 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.addEdge('node3', 'node2', 'edge3-2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node3')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')!.label).toBe('edge1-2');
        expect(yMatrix1.get('node3')?.get('edgeInformation').get('node2')!.label).toBe('edge3-2');

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node3')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')!.label).toBe('edge1-2');
        expect(yMatrix2.get('node3')?.get('edgeInformation').get('node2')!.label).toBe('edge3-2');
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and add edge3-4 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addNode('node3', 'node3', { x: 0, y: 10 });
            graphApi2.current.addNode('node4', 'node4', { x: 10, y: 10 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.addEdge('node3', 'node4', 'edge3-4');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node4')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')?.get('edgeInformation').get('node4')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')!.label).toBe('edge1-2');
        expect(yMatrix1.get('node3')?.get('edgeInformation').get('node4')!.label).toBe('edge3-4');

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node4')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')?.get('edgeInformation').get('node4')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')!.label).toBe('edge1-2');
        expect(yMatrix2.get('node3')?.get('edgeInformation').get('node4')!.label).toBe('edge3-4');
    })

// addEdge(m1,m2), addEdge(n1,n2) m1 == n1, m2 == n2
// TODO, not working yet
    it('try to add edge twice', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            syncConcurrently();
            graphApi2.current.addEdge('node1', 'node2', 'second edge1-2');
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
        })

        const edgeForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2');
        const edgeForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2');

        expect(edgeForMatrix1).toBeDefined();
        expect(edgeForMatrix2).toBeDefined();
        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(1);
        expect(yMatrix1.get('node1')?.get('edgeInformation').has('node2')).toBe(true);
        // expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')?.label).toBe('edge1-2');
    })

// addEdge(m1,m2), removeNode(n) m1 == n, m2 != n
    it('add edge1-2 in one map and remove node1 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.removeNode('node1');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();

        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
    })

// addEdge(m1,m2), removeNode(n) m1 != n, m2 == n
// This test requires garbage collection because of dangling edges
    it('add edge1-2 in one map and remove node2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.removeNode('node2');
            syncConcurrently();
            // this is only because edges as flow may trigger react updates
            graphApi1.current.edgesAsFlow();
            syncConcurrently();
        })

        expect(yMatrix1.get('node2')).toBeUndefined();
        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();

        expect(yMatrix2.get('node2')).toBeUndefined();
        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(graphApi1.current.edgesAsFlow().length).toBe(0);
    })

// addEdge(m1,m2), removeNode(n) m1 == n, m2 == n
    it('add edge1-1 in one map and remove node1 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node1', 'edge1-1');
            graphApi2.current.removeNode('node1');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix1.size).toBe(0);
        expect(yMatrix2.size).toBe(0);
    })

// addEdge(m1,m2), removeNode(n) m1 != n, m2 != n
    it('add edge1-2 in one map and remove node3 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 0, y: 10 });
            graphApi1.current.addNode('node3', 'node3', { x: 10, y: 0 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.removeNode('node3');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeUndefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(1);
        expect(yMatrix1.size).toBe(2);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeUndefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(1);
        expect(yMatrix2.size).toBe(2);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('add edge1-2 in one map and remove edge3-4 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addNode('node3', 'node3', { x: 0, y: 10 });
            graphApi2.current.addNode('node4', 'node4', { x: 10, y: 10 });
            graphApi2.current.addEdge('node3', 'node4', 'edge3-4');
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.removeEdge('node3', 'node4');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node4')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')?.get('edgeInformation').get('node4')).toBeUndefined();

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node4')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')?.get('edgeInformation').get('node4')).toBeUndefined();
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('add edge1-2 in one map and remove edge1-3 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addNode('node3', 'node3', { x: 0, y: 10 });
            graphApi1.current.addEdge('node1', 'node3', 'edge1-3');
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.removeEdge('node1', 'node3');
            syncConcurrently();
        })

        const edgeInformationFromNode1ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation');
        const edgeInformationFromNode1ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation');

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(edgeInformationFromNode1ForMatrix1?.get('node2')).toBeDefined();
        expect(edgeInformationFromNode1ForMatrix1?.get('node3')).toBeUndefined();
        expect(edgeInformationFromNode1ForMatrix1?.get('node2')?.label).toBe('edge1-2');
        expect(edgeInformationFromNode1ForMatrix1?.size).toBe(1);
        expect(yMatrix1.size).toBe(3);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(edgeInformationFromNode1ForMatrix2?.get('node2')).toBeDefined();
        expect(edgeInformationFromNode1ForMatrix2?.get('node3')).toBeUndefined();
        expect(edgeInformationFromNode1ForMatrix2?.get('node2')?.label).toBe('edge1-2');
        expect(edgeInformationFromNode1ForMatrix2?.size).toBe(1);
        expect(yMatrix2.size).toBe(3);
    })

// addEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 == n2
    it('add edge1-2 in one map and remove edge3-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addNode('node3', 'node3', { x: 0, y: 10 });
            graphApi1.current.addEdge('node3', 'node2', 'edge3-2');
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.removeEdge('node3', 'node2');
            syncConcurrently();
        })

        const edgeInformationFromNode1ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation');
        const edgeInformationFromNode1ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation');

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(edgeInformationFromNode1ForMatrix1?.get('node2')).toBeDefined();
        expect(edgeInformationFromNode1ForMatrix1?.get('node3')).toBeUndefined();
        expect(edgeInformationFromNode1ForMatrix1?.get('node2')?.label).toBe('edge1-2');
        expect(edgeInformationFromNode1ForMatrix1?.size).toBe(1);
        expect(yMatrix1.size).toBe(3);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(edgeInformationFromNode1ForMatrix2?.get('node2')).toBeDefined();
        expect(edgeInformationFromNode1ForMatrix2?.get('node3')).toBeUndefined();
        expect(edgeInformationFromNode1ForMatrix2?.get('node2')?.label).toBe('edge1-2');
        expect(edgeInformationFromNode1ForMatrix2?.size).toBe(1);
        expect(yMatrix2.size).toBe(3);
    })

// removeNode(m), removeNode(n) n == m
    it('remove node1 in one map and remove node1 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            syncConcurrently();
            graphApi1.current.removeNode('node1');
            graphApi2.current.removeNode('node1');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix1.size).toBe(0);
        expect(yMatrix2.size).toBe(0);
    })

// removeNode(m), removeNode(n) n != m
    it('remove node1 in one map and remove node2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi2.current.addNode('node2', 'node2', { x: 10, y: 0 });
            syncConcurrently();
            graphApi1.current.removeNode('node1');
            graphApi2.current.removeNode('node2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node2')).toBeUndefined();
        expect(yMatrix1.size).toBe(0);
        expect(yMatrix2.size).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m == n1, m != n2
    it('remove node1 in one map and remove edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
            graphApi1.current.removeNode('node1');
            graphApi2.current.removeEdge('node1', 'node2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.size).toBe(1);
        expect(yMatrix1.get('node2')?.get('edgeInformation').size).toBe(0);

        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.size).toBe(1);
        expect(yMatrix2.get('node2')?.get('edgeInformation').size).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m != n1, m == n2
    it('remove node2 in one map and remove edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
            graphApi1.current.removeEdge('node1', 'node2');
            graphApi2.current.removeNode('node2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node2')).toBeUndefined();
        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.size).toBe(1);
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(0);

        expect(yMatrix2.get('node2')).toBeUndefined();
        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.size).toBe(1);
        expect(yMatrix2.get('node1')?.get('edgeInformation').size).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m != n1, m != n2
    it('remove node1 in one map and remove edge2-3 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi2.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addNode('node3', 'node3', { x: 0, y: 10 });
            graphApi2.current.addEdge('node2', 'node3', 'edge2-3');
            syncConcurrently();
            graphApi1.current.removeNode('node1');
            graphApi2.current.removeEdge('node2', 'node3');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.size).toBe(2);
        expect(yMatrix1.get('node2')?.get('edgeInformation').size).toBe(0);

        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node2')?.get('edgeInformation').get('node3')).toBeUndefined();
        expect(yMatrix2.size).toBe(2);
        expect(yMatrix2.get('node2')?.get('edgeInformation').size).toBe(0);
    })

// removeNode(m), removeEdge(n1,n2) m == n1, m == n2
    it('remove node1 in one map and remove edge1-1 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi2.current.addEdge('node1', 'node1', 'edge1-1');
            syncConcurrently();
            graphApi1.current.removeNode('node1');
            graphApi2.current.removeEdge('node1', 'node1');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix1.size).toBe(0);

        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix2.size).toBe(0);
    })
// removeEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 == n2
    it('remove edge1-2 in one map and remove edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addEdge('node1', 'node1', 'edge1-2');
            syncConcurrently();
            graphApi1.current.removeEdge('node1', 'node2');
            graphApi2.current.removeEdge('node1', 'node2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.size).toBe(2);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.size).toBe(2);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 == n2
    it('remove edge1-2 in one map and remove edge3-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addEdge('node3', 'node2', 'edge3-2');
            syncConcurrently();
            graphApi1.current.removeEdge('node1', 'node2');
            graphApi2.current.removeEdge('node3', 'node2');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.get('node3')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.size).toBe(2);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.get('node3')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.size).toBe(2);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 == n1, m2 != n2
    it('remove edge1-2 in one map and remove edge2-3 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addNode('node3', 'node3', { x: 0, y: 10 });
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi1.current.addEdge('node2', 'node3', 'edge2-3');
            syncConcurrently();
            graphApi1.current.removeEdge('node1', 'node2');
            graphApi2.current.removeEdge('node2', 'node3');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.get('node2')?.get('edgeInformation').get('node3')).toBeUndefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix1.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix1.size).toBe(3);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.get('node2')?.get('edgeInformation').get('node3')).toBeUndefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix2.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix2.size).toBe(3);
    })

// removeEdge(m1,m2), removeEdge(n1,n2) m1 != n1, m2 != n2
    it('remove edge1-2 in one map and remove edge3-4 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMap({ yMatrix: yMatrix2 }));
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addNode('node3', 'node3', { x: 0, y: 10 });
            graphApi2.current.addNode('node4', 'node4', { x: 10, y: 10 });
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.addEdge('node3', 'node4', 'edge3-4');   
            syncConcurrently();
            graphApi1.current.removeEdge('node1', 'node2');
            graphApi2.current.removeEdge('node3', 'node4');
            syncConcurrently();
        })

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node4')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.get('node3')?.get('edgeInformation').get('node4')).toBeUndefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix1.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix1.get('node3')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix1.get('node4')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix1.size).toBe(4);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node4')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.get('node3')?.get('edgeInformation').get('node4')).toBeUndefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix2.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix2.get('node3')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix2.get('node4')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix2.size).toBe(4);
    })

})