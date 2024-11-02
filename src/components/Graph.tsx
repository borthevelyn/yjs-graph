
import React, { useState, useRef, useEffect, useCallback } from "react";
import { WebrtcProvider } from "y-webrtc";
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';

type id = string;
type Edge = [id, number];

function Graph() {
    const ydoc = useRef(new Y.Doc());
    let yMatrix = useRef(ydoc.current.getMap<Y.Array<Edge>>('adjacency list'))
    const [, rerenderHelper] = useState({})
    const rerender = useCallback(() => rerenderHelper({}), [])

    const addNode = (nodeId: id) => {
        yMatrix.current.set(nodeId, new Y.Array<Edge>());
      };
      
    const addEdge = (nodeId1: id, nodeId2: id, value: number) => {
        ydoc.current.transact(() => {
            let edges = yMatrix.current.get(nodeId1);
            if (edges === undefined) {
                console.warn("Node does not exist");
                return 
            }
            edges.push([[nodeId2, value]]);
        });
    }

    const removeNode = (nodeId: id) => {
        ydoc.current.transact(() => {   
            yMatrix.current.delete(nodeId);
            yMatrix.current.forEach((edges, ) => {
                edges.forEach(([otherId, ], index) => {
                    if (otherId === nodeId) {
                        edges.delete(index, 1);
                    }
                });
            });
        });
    }

    const removeEdge = (nodeId1: id, nodeId2: id) => {
        ydoc.current.transact(() => {
            let edges = yMatrix.current.get(nodeId1);
            if (edges === undefined) {
                console.warn("Edge does not exist");
                return 
            }
            edges.forEach(([otherId, ], index) => {
                if (otherId === nodeId2) {
                    edges!.delete(index, 1);
                }
            });
        });
    }

    useEffect(() => {
        const roomName = 'Room07'
        // node node_modules/y-webrtc/bin/server.js 
        try {
            new WebrtcProvider(roomName, ydoc.current, {signaling: ['ws://localhost:4444']});
        }
        catch (e) {
            console.log("Could not instantiate WebrtcProvider, probably because of React Strict Mode");
            console.log(e);
        }
        
        yMatrix.current.observe((m) => {
            console.log("observed")
            console.log(m)
            rerender() 
            console.log(yMatrix.current.size);
        });

        // Create nested yarray
        const nodeId1 = uuidv4();
        const nodeId2 = uuidv4();
        const nodeId3 = uuidv4();

        const yNested = new Y.Array<Edge>();
        yNested.push([[nodeId1, 1], [nodeId2, 2], [nodeId3, 3]]);
        const yNested2 = new Y.Array<Edge>();
        yNested2.push([[nodeId1, 1], [nodeId2, 2], [nodeId3, 3]]);

        yMatrix.current.clear();
        
        yMatrix.current.set(nodeId1, yNested);
        yMatrix.current.set(nodeId2, yNested2);  
        addNode(nodeId3);
        addEdge(nodeId3, nodeId1, 1);
        removeEdge(nodeId1, nodeId3);
        removeNode(nodeId3);
        console.log(yMatrix.current.size);
      }, []);

 
    return (
    <div>
        {Array.from(yMatrix.current.entries(), ([id, edges], i) => (
            <div key={i}>
                <p>Has {edges.length} edges</p>
                {edges.map(([otherId, value], j) => (
                    <span key={j}>{j < (edges.length - 1) ? value.toString() + ", " : value.toString() }</span>
                ))}
            </div>
        ))} 
    </div>
    );
}

export default Graph;