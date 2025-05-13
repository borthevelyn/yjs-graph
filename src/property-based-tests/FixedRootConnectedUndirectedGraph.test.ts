import * as Y from 'yjs';
import { test, fc } from '@fast-check/jest'; 
import { FixedRootConnectedUndirectedGraph } from '../graphs/FixedRootConnectedUndirectedGraph';
import { assert } from 'console';
import { commandProperty } from './PropTestUtilities';



describe('properties', () => {
    fc.configureGlobal({ baseSize: 'medium' });

    function createGraph(graph: FixedRootConnectedUndirectedGraph, n: number) {
        graph.addNodeWithEdge('0', 'root', `$node0`, { x: 0, y: 0 }, `$edge0+root`);
        for (let i = 1; i <= (n - 2); i++) {
            for (let j = 0; j < i; j++) {
                if (j === 0) 
                    graph.addNodeWithEdge(`${i}`, `${j}`, `$node${i}`, { x: 0, y: 0 }, `$edge${i}+${j}`);
                else
                    graph.addEdge(`${i}`, `${j}`, `$edge${i}+${j}`);
            }
        }
    }

    test('Graph should be connected', async () => {
        const clientCount = 3;
        const initialGraphSize = 5;
        const maxGraphSize = 10;
        const maxOperationsPerRoundCount = 15;
        
        await fc.assert(
            commandProperty({
                clientCount,
                maxGraphSize,
                maxOperationCount: maxOperationsPerRoundCount,
                minOperationCount: 8,
            }, {
                addNodeWithEdge: 2,
                addEdge: 1,
                removeEdge: 4,
                sync: 2
            }, async (commands, iter) => {

            const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
            const yGraphs = yDocs.map((yDoc) => new FixedRootConnectedUndirectedGraph(yDoc))
            createGraph(yGraphs[0], initialGraphSize);
            expect(yGraphs[0].nodeCount).toBe(initialGraphSize);
            FixedRootConnectedUndirectedGraph.syncDefault(yGraphs);

            const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + (initialGraphSize - 2) + 1)

            for (const [clientIdx, operation, rnd1, rnd2] of commands) {
                const nodesInGraph = yGraphs[clientIdx].getNodes();
                const sourceNode = nodesInGraph[Math.floor(rnd1 * yGraphs[clientIdx].nodeCount)]; 
                const targetNode = nodesInGraph[Math.floor(rnd2 * yGraphs[clientIdx].nodeCount)];
                
                if (operation.op === 'addNodeWithEdge') {
                    if (freeNodeIds.length === 0) 
                        continue;
                    const nodeId = freeNodeIds.shift()!.toString();
                    yGraphs[clientIdx].addNodeWithEdge(nodeId, targetNode, nodeId, operation.position, `edge${nodeId} ${operation.edgeDirection} ${targetNode}`);
                } else if (operation.op === 'addEdge') {
                    yGraphs[clientIdx].addEdge(sourceNode, targetNode, `edge${sourceNode}+${targetNode}`);
                } else if (operation.op === 'removeEdge') {
                    yGraphs[clientIdx].removeEdge(sourceNode, targetNode);
                } else if (operation.op === 'sync') {
                    let graphs = yGraphs.filter((_, index) => operation.clients.includes(index))
                    FixedRootConnectedUndirectedGraph.syncDefault(graphs);
                }
            }
            FixedRootConnectedUndirectedGraph.syncDefault(yGraphs)
            for (let i = 0; i < yGraphs.length; i++) {
                expect(yGraphs[i].isConsistent()).toBeTruthy()
                expect(yGraphs[i].isConnected()).toBeTruthy();
                expect(yGraphs[i].nodeCount).toEqual(yGraphs[0].nodeCount);
                expect(yGraphs[i].edgeCount).toEqual(yGraphs[0].edgeCount);
                expect(yGraphs[i].getNode('root')).toBeDefined();
                expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
                expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
                expect(yGraphs[i].getYRemovedGraphElementsAsJson()).toEqual(yGraphs[0].getYRemovedGraphElementsAsJson());
            }
        }),
        { 
            numRuns: 3000,
            verbose: true,
        })
    }, 50000000);

    test('Graph should be connected, second variant', async () => {
        
        const clientCount = 5;
        const initialGraphSize = clientCount + 1;
        const maxGraphSize = 15;
        const maxOperationsPerRoundCount = 30;
        await fc.assert(
            commandProperty({
                clientCount,
                maxOperationCount: maxOperationsPerRoundCount,
                minOperationCount: 15,
                maxGraphSize
            }, {
                addNodeWithEdge: 2,
                addEdge: 2,
                removeEdge: 5,
                sync: 3
            }, async (commands, iter) => {
                const yDocs = Array.from({ length: clientCount }, () => new Y.Doc())
                const yGraphs = yDocs.map((yDoc) => new FixedRootConnectedUndirectedGraph(yDoc))
    
                yGraphs[0].addNodeWithEdge('0', 'root', `$node0`, { x: 0, y: 0 }, `$root+0`);
                FixedRootConnectedUndirectedGraph.syncDefault(yGraphs)
                for (let i = 1; i < yGraphs.length; i++) {
                    yGraphs[i].addNodeWithEdge(`${i}`, `${i - 1}`, `$node${i}`, { x: 0, y: 0 }, `$edge${i - 1}+${i}`);
                    let graphs = yGraphs.filter((_, index) => index > i - 1);
                    FixedRootConnectedUndirectedGraph.syncDefault(graphs)
                }
    
                yGraphs[0].removeEdge('root', '0');
                for (let i = 1; i < yGraphs.length; i++) {
                    yGraphs[i].removeEdge(`${i - 1}`, `${i}`);
                }
    
                const freeNodeIds = Array.from({ length: maxGraphSize - initialGraphSize }, (_, i) => i + (initialGraphSize - 2) + 1)
               
                for (const [clientIdx, operation, rnd1, rnd2] of commands) {
                    const nodesInGraph = yGraphs[clientIdx].getNodes();
                    const sourceNode = nodesInGraph[Math.floor(rnd1 * yGraphs[clientIdx].nodeCount)];
                    const targetNode = nodesInGraph[Math.floor(rnd2 * yGraphs[clientIdx].nodeCount)];
    
                    if (operation.op === 'addNodeWithEdge') {
                        if (freeNodeIds.length === 0) 
                            continue;
    
                        const nodeId = freeNodeIds.shift()!.toString();
                        assert(!yGraphs[clientIdx].getNodes().includes(nodeId), 'duplicate node')
                        yGraphs[clientIdx].addNodeWithEdge(nodeId, targetNode, nodeId, operation.position, `edge${nodeId} ${operation.edgeDirection} ${targetNode}`);
    
                    } else if (operation.op === 'addEdge') {
                        yGraphs[clientIdx].addEdge(sourceNode, targetNode, `edge${sourceNode}+${targetNode}`);
                    } else if (operation.op === 'removeEdge') {
                        yGraphs[clientIdx].removeEdge(sourceNode, targetNode);
                    } else if (operation.op === 'sync') {
                        let graphs = yGraphs.filter((_, index) => operation.clients.includes(index))
                        FixedRootConnectedUndirectedGraph.syncDefault(graphs)
                    }
                }
                
                FixedRootConnectedUndirectedGraph.syncDefault(yGraphs)
                for (let i = 0; i < yGraphs.length; i++) {
                    expect(yGraphs[i].isConsistent()).toBeTruthy()
                    expect(yGraphs[i].isConnected()).toBeTruthy();
                    expect(yGraphs[i].nodeCount).toEqual(yGraphs[0].nodeCount);
                    expect(yGraphs[i].edgeCount).toEqual(yGraphs[0].edgeCount);
                    expect(yGraphs[i].getNode('root')).toBeDefined();
                    expect(yGraphs[i].getNodesAsJson()).toEqual(yGraphs[0].getNodesAsJson());
                    expect(yGraphs[i].getEdgesAsJson()).toEqual(yGraphs[0].getEdgesAsJson());
                    expect(yGraphs[i].getYRemovedGraphElementsAsJson()).toEqual(yGraphs[0].getYRemovedGraphElementsAsJson());
                }
            }),
            { 
                numRuns: 10000,
                verbose: true,
            },
        )
    }, 5000000)
});