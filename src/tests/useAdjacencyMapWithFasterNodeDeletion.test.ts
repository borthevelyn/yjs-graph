import { renderHook, act } from '@testing-library/react-hooks'
import * as Y from 'yjs'
import { useAdjacencyMapWithFasterNodeDeletion, AdjacencyMapWithFasterNodeDeletion } from '../hooks/useAdjacencyMapWithFasterNodeDeletion'

describe('useAdjacencyMapWithFasterNodeDeletion', () => {
    let ydoc1: Y.Doc
    let yMatrix1: AdjacencyMapWithFasterNodeDeletion
    let ydoc2: Y.Doc
    let yMatrix2: AdjacencyMapWithFasterNodeDeletion

    function syncConcurrently() {
        const updates1to2 = Y.encodeStateAsUpdate(ydoc1, Y.encodeStateVector(ydoc2))
        const updates2to1 = Y.encodeStateAsUpdate(ydoc2, Y.encodeStateVector(ydoc1))
        Y.applyUpdate(ydoc1, updates2to1)
        Y.applyUpdate(ydoc2, updates1to2)
      }
    
    beforeEach(() => {
        ydoc1 = new Y.Doc()
        yMatrix1 = ydoc1.getMap('adjacency map with faster node deletion') as AdjacencyMapWithFasterNodeDeletion
        ydoc2 = new Y.Doc()
        yMatrix2 = ydoc2.getMap('adjacency map with faster node deletion') as AdjacencyMapWithFasterNodeDeletion
    })

    it('should add a node from graphApi1 to both maps', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
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
        renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
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
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
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
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 0, y: 0 });
            graphApi1.current.addEdge('node1', 'node2', 'edge 1');
            syncConcurrently();
        })

        const edgeLabelForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2')?.label;
        const edgeLabelForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2')?.label;
        const incomingNodesForNode1InMatrix1 = yMatrix1.get('node1')?.get('incomingNodes');
        const incomingNodesForNode1Matrix2 = yMatrix2.get('node1')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2Matrix2 = yMatrix2.get('node2')?.get('incomingNodes');

        expect(edgeLabelForMatrix1).toBe('edge 1');
        expect(edgeLabelForMatrix2).toBe('edge 1');

        expect(incomingNodesForNode1InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode1Matrix2?.size).toBe(0);

        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2Matrix2).toBeDefined();

        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2Matrix2?.size).toBe(1);

        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode2Matrix2?.has('node1')).toBe(true);

        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
    })

    it('should add an edge from graphApi2 to both maps', () => {
        renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi2.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi2.current.addNode('node2', 'node2', { x: 0, y: 0 });
            graphApi2.current.addEdge('node1', 'node2', 'edge1');
            syncConcurrently();
        })

        const edgeLabelForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2')?.label;
        const edgeLabelForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2')?.label;
        const incomingNodesForNode1InMatrix1 = yMatrix1.get('node1')?.get('incomingNodes');
        const incomingNodesForNode1Matrix2 = yMatrix2.get('node1')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2Matrix2 = yMatrix2.get('node2')?.get('incomingNodes');

        expect(edgeLabelForMatrix1).toBe('edge1');
        expect(edgeLabelForMatrix2).toBe('edge1');

        expect(incomingNodesForNode1InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode1Matrix2?.size).toBe(0);

        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2Matrix2).toBeDefined();

        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2Matrix2?.size).toBe(1);

        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode2Matrix2?.has('node1')).toBe(true);

        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
    })

    it('should delete an edge in both maps', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'Node 1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'Node 2', { x: 0, y: 0 });
            graphApi1.current.addEdge('node1', 'node2', 'edge1');
            syncConcurrently();
            graphApi1.current.removeEdge('node1', 'node2');
            syncConcurrently();
        })
        const edge12ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2');
        const edge12ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2');
        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2Matrix2 = yMatrix2.get('node2')?.get('incomingNodes');

        expect(edge12ForMatrix1).toBeUndefined();
        expect(edge12ForMatrix2).toBeUndefined();
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(false);
        expect(incomingNodesForNode2Matrix2?.has('node1')).toBe(false);
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode2Matrix2?.size).toBe(0);
    })    

    it('add node1 in one map and node2 in the other map)', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
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

    it('add node1 in one map and then node2 with edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            syncConcurrently();
            graphApi2.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
        })

        const edge12ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2');
        const edge12ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2');
        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(edge12ForMatrix1).toBeDefined();
        expect(edge12ForMatrix1?.label).toBe('edge1-2');
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(edge12ForMatrix2).toBeDefined();
        expect(edge12ForMatrix2?.label).toBe('edge1-2');
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);   
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);

    })

    it('add node1 in one map and node2 with edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            syncConcurrently();
            graphApi2.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
        })
        
        const edge12ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2');
        const edge12ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2');

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(edge12ForMatrix1).toBeDefined();
        expect(edge12ForMatrix1?.label).toBe('edge1-2');
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(1);
        expect(yMatrix1.get('node2')?.get('incomingNodes').size).toBe(1);
        expect(yMatrix1.get('node2')?.get('incomingNodes').has('node1')).toBe(true);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(edge12ForMatrix2).toBeDefined();
        expect(edge12ForMatrix2?.label).toBe('edge1-2');
        expect(yMatrix2.get('node1')?.get('edgeInformation').size).toBe(1);
        expect(yMatrix2.get('node2')?.get('incomingNodes').size).toBe(1);
        expect(yMatrix1.get('node2')?.get('incomingNodes').size).toBe(1);
        expect(yMatrix1.get('node2')?.get('incomingNodes').has('node1')).toBe(true);
    })

    it('add node1 with edge1-2 in one map and node3 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
            graphApi2.current.addNode('node3', 'node3', { x: 10, y: 0 });
            syncConcurrently();
        })

        const edge12ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2');
        const edge12ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2');
        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(edge12ForMatrix1).toBeDefined();
        expect(edge12ForMatrix1?.label).toBe('edge1-2');
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(1);
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(edge12ForMatrix2).toBeDefined();
        expect(edge12ForMatrix2?.label).toBe('edge1-2');
        expect(yMatrix2.get('node1')?.get('edgeInformation').size).toBe(1);
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
    })

    it('add node1 in one map and remove node2 the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
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

    it('add node3 in one map and remove edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi2.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi2.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
            graphApi1.current.addNode('node3', 'node3', { x: 10, y: 0 });
            graphApi2.current.removeEdge('node1', 'node2');
            syncConcurrently();
        })

        const edgesForNode1InMatrix1 = yMatrix1.get('node1')?.get('edgeInformation');
        const edgesForNode1InMatrix2 = yMatrix2.get('node1')?.get('edgeInformation');
        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(edgesForNode1InMatrix1?.get('node2')).toBeUndefined();
        expect(edgesForNode1InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(false);
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(edgesForNode1InMatrix2?.get('node2')).toBeUndefined();
        expect(edgesForNode1InMatrix2?.size).toBe(0);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(false);
        expect(incomingNodesForNode2InMatrix2?.size).toBe(0);
    })

    it('add edge1-2 in one map and add edge1-3 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi2.current.addNode('node3', 'node3', { x: 10, y: 0 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.addEdge('node1', 'node3', 'edge1-3');
            syncConcurrently();
        })

        const edge12ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2');
        const edge13ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node3');
        const edge12ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2');
        const edge13ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node3');

        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');
        const incomingNodesForNode3InMatrix1 = yMatrix1.get('node3')?.get('incomingNodes');
        const incomingNodesForNode3InMatrix2 = yMatrix2.get('node3')?.get('incomingNodes');

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(edge12ForMatrix1).toBeDefined();
        expect(edge13ForMatrix1).toBeDefined();
        expect(edge12ForMatrix1!.label).toBe('edge1-2');
        expect(edge13ForMatrix1!.label).toBe('edge1-3');
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode3InMatrix1).toBeDefined();
        expect(incomingNodesForNode3InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode3InMatrix1?.has('node1')).toBe(true);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(edge12ForMatrix2).toBeDefined();
        expect(edge13ForMatrix2).toBeDefined();
        expect(edge12ForMatrix2!.label).toBe('edge1-2');
        expect(edge13ForMatrix2!.label).toBe('edge1-3');
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(incomingNodesForNode3InMatrix2).toBeDefined();
        expect(incomingNodesForNode3InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode3InMatrix2?.has('node1')).toBe(true);
    })

    it('add edge1-2 in one map and add edge3-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addNode('node3', 'node3', { x: 0, y: 10 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.addEdge('node3', 'node2', 'edge3-2');
            syncConcurrently();
        })

        const edge12ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2');
        const edge32ForMatrix1 = yMatrix1.get('node3')?.get('edgeInformation').get('node2');
        const edge12ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2');
        const edge32ForMatrix2 = yMatrix2.get('node3')?.get('edgeInformation').get('node2');

        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');


        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(edge12ForMatrix1).toBeDefined();
        expect(edge32ForMatrix1).toBeDefined();
        expect(edge12ForMatrix1!.label).toBe('edge1-2');
        expect(edge32ForMatrix1!.label).toBe('edge3-2');
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(2);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode2InMatrix1?.has('node3')).toBe(true);

        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(edge12ForMatrix2).toBeDefined();
        expect(edge32ForMatrix2).toBeDefined();
        expect(edge12ForMatrix2!.label).toBe('edge1-2');
        expect(edge32ForMatrix2!.label).toBe('edge3-2');
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(2);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(incomingNodesForNode2InMatrix2?.has('node3')).toBe(true);
    })

    it('add edge1-2 in one map and add edge3-4 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
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

        const edge12ForMatrix1 = yMatrix1.get('node1')?.get('edgeInformation').get('node2');
        const edge34ForMatrix1 = yMatrix1.get('node3')?.get('edgeInformation').get('node4');
        const edge12ForMatrix2 = yMatrix2.get('node1')?.get('edgeInformation').get('node2');
        const edge34ForMatrix2 = yMatrix2.get('node3')?.get('edgeInformation').get('node4');

        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');
        const incomingNodesForNode4InMatrix1 = yMatrix1.get('node4')?.get('incomingNodes');
        const incomingNodesForNode4InMatrix2 = yMatrix2.get('node4')?.get('incomingNodes');


        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node4')).toBeDefined();
        expect(edge12ForMatrix1).toBeDefined();
        expect(edge34ForMatrix1).toBeDefined();
        expect(edge12ForMatrix1!.label).toBe('edge1-2');
        expect(edge34ForMatrix1!.label).toBe('edge3-4');
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode4InMatrix1).toBeDefined();
        expect(incomingNodesForNode4InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode4InMatrix1?.has('node3')).toBe(true);


        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node4')).toBeDefined();
        expect(edge12ForMatrix2).toBeDefined();
        expect(edge34ForMatrix2).toBeDefined();
        expect(edge12ForMatrix2!.label).toBe('edge1-2');
        expect(edge34ForMatrix2!.label).toBe('edge3-4');
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(incomingNodesForNode4InMatrix2).toBeDefined();
        expect(incomingNodesForNode4InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode4InMatrix2?.has('node3')).toBe(true);
    })

    // Dangling incoming nodes need to be removed here
    it('add edge1-2 in one map and remove node1 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            graphApi2.current.removeNode('node1');
            syncConcurrently();
            // Garbage colection
            graphApi1.current.edgesAsFlow();
            syncConcurrently(); 
        })

        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');

        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        // Dangling incoming node appears here when executing without garbage collection
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);

        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        // Dangling incoming node appears here when executing without garbage collection
        expect(incomingNodesForNode2InMatrix2?.size).toBe(0);

        
        expect(graphApi1.current.edgesAsFlow().length).toBe(0);
    })

    // Dangling edges need to be removed here
    it('add edge1-2 in one map and remove node2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            syncConcurrently();
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');  
            graphApi2.current.removeNode('node2');
            syncConcurrently();
            // Garbage colection
           graphApi1.current.edgesAsFlow();
            syncConcurrently(); 
        })

        const incomingNodesForNode1InMatrix1 = yMatrix1.get('node1')?.get('incomingNodes');
        const incomingNodesForNode1InMatrix2 = yMatrix2.get('node1')?.get('incomingNodes');

        expect(yMatrix1.get('node2')).toBeUndefined();
        expect(yMatrix1.get('node1')).toBeDefined();
        // Dangling edge appears here when executing without garbage collection
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined(); 
        expect(incomingNodesForNode1InMatrix1?.size).toBe(0);

        expect(yMatrix2.get('node2')).toBeUndefined();
        expect(yMatrix2.get('node1')).toBeDefined();
        // Dangling edge appears here when executing without garbage collection
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined(); 
        expect(incomingNodesForNode1InMatrix2?.size).toBe(0);
        expect(graphApi1.current.edgesAsFlow().length).toBe(0);
    }) 

    it('add edge1-2 in one map and remove edge3-4 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
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

        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');
        const incomingNodesForNode4InMatrix1 = yMatrix1.get('node4')?.get('incomingNodes');
        const incomingNodesForNode4InMatrix2 = yMatrix2.get('node4')?.get('incomingNodes');

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node4')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')?.get('edgeInformation').get('node4')).toBeUndefined();
        expect(incomingNodesForNode2InMatrix1).toBeDefined();
        expect(incomingNodesForNode2InMatrix1?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix1?.has('node1')).toBe(true);
        expect(incomingNodesForNode4InMatrix1?.size).toBe(0); 


        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node4')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')?.get('edgeInformation').get('node4')).toBeUndefined();
        expect(incomingNodesForNode2InMatrix2).toBeDefined();
        expect(incomingNodesForNode2InMatrix2?.size).toBe(1);
        expect(incomingNodesForNode2InMatrix2?.has('node1')).toBe(true);
        expect(incomingNodesForNode4InMatrix2?.size).toBe(0); 
    })

    it('remove node1 in one map and remove node1 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
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

    it('remove node1 in one map and remove node2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
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

    it('remove node1 in one map and remove edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
            graphApi1.current.removeNode('node1');
            graphApi2.current.removeEdge('node1', 'node2');
            syncConcurrently();
        })

        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');


        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.size).toBe(1);
        expect(yMatrix1.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);

        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.size).toBe(1);
        expect(yMatrix2.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(incomingNodesForNode2InMatrix2?.size).toBe(0);
    })
    
    it('remove node2 in one map and remove edge1-2 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
        
        act(() => {
            graphApi1.current.addNode('node1', 'node1', { x: 0, y: 0 });
            graphApi1.current.addNode('node2', 'node2', { x: 10, y: 0 });
            graphApi1.current.addEdge('node1', 'node2', 'edge1-2');
            syncConcurrently();
            graphApi1.current.removeEdge('node1', 'node2');
            graphApi2.current.removeNode('node2');
            syncConcurrently();
        })

        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');

        expect(yMatrix1.get('node2')).toBeUndefined();
        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.size).toBe(1);
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(0);
        expect(incomingNodesForNode2InMatrix1).toBeUndefined();

        expect(yMatrix2.get('node2')).toBeUndefined();
        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.size).toBe(1);
        expect(yMatrix2.get('node1')?.get('edgeInformation').size).toBe(0);
        expect(incomingNodesForNode2InMatrix2).toBeUndefined();
    })

    it('remove node1 in one map and remove edge2-3 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
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

        const incomingNodesForNode3InMatrix1 = yMatrix1.get('node3')?.get('incomingNodes');
        const incomingNodesForNode3InMatrix2 = yMatrix2.get('node3')?.get('incomingNodes');

        expect(yMatrix1.get('node1')).toBeUndefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.size).toBe(2);
        expect(yMatrix1.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(incomingNodesForNode3InMatrix1?.size).toBe(0);

        expect(yMatrix2.get('node1')).toBeUndefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node2')?.get('edgeInformation').get('node3')).toBeUndefined();
        expect(yMatrix2.size).toBe(2);
        expect(yMatrix2.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(incomingNodesForNode3InMatrix2?.size).toBe(0);
    })

    it('remove edge1-2 in one map and remove edge2-3 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
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

        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');
        const incomingNodesForNode3InMatrix1 = yMatrix1.get('node3')?.get('incomingNodes');
        const incomingNodesForNode3InMatrix2 = yMatrix2.get('node3')?.get('incomingNodes');

        expect(yMatrix1.get('node1')).toBeDefined();
        expect(yMatrix1.get('node2')).toBeDefined();
        expect(yMatrix1.get('node3')).toBeDefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix1.get('node2')?.get('edgeInformation').get('node3')).toBeUndefined();
        expect(yMatrix1.get('node1')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix1.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix1.size).toBe(3);
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode3InMatrix1?.size).toBe(0);


        expect(yMatrix2.get('node1')).toBeDefined();
        expect(yMatrix2.get('node2')).toBeDefined();
        expect(yMatrix2.get('node3')).toBeDefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').get('node2')).toBeUndefined();
        expect(yMatrix2.get('node2')?.get('edgeInformation').get('node3')).toBeUndefined();
        expect(yMatrix2.get('node1')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix2.get('node2')?.get('edgeInformation').size).toBe(0);
        expect(yMatrix2.size).toBe(3);
        expect(incomingNodesForNode2InMatrix2?.size).toBe(0);
        expect(incomingNodesForNode3InMatrix2?.size).toBe(0);
    })

    it('remove edge1-2 in one map and remove edge3-4 in the other map', () => {
        const { result: graphApi1 } = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix1 }));
        const { result: graphApi2} = renderHook(() => useAdjacencyMapWithFasterNodeDeletion({ yMatrix: yMatrix2 }));
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

        const incomingNodesForNode2InMatrix1 = yMatrix1.get('node2')?.get('incomingNodes');
        const incomingNodesForNode2InMatrix2 = yMatrix2.get('node2')?.get('incomingNodes');
        const incomingNodesForNode4InMatrix1 = yMatrix1.get('node4')?.get('incomingNodes');
        const incomingNodesForNode4InMatrix2 = yMatrix2.get('node4')?.get('incomingNodes');

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
        expect(incomingNodesForNode2InMatrix1?.size).toBe(0);
        expect(incomingNodesForNode4InMatrix1?.size).toBe(0);

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
        expect(incomingNodesForNode2InMatrix2?.size).toBe(0);
        expect(incomingNodesForNode4InMatrix2?.size).toBe(0);
    })
})