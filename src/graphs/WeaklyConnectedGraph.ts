import { MarkerType, XYPosition } from "@xyflow/react";
import { id, FlowNode, FlowEdge, ObjectYMap, EventEmitter, EdgeId, splitEdgeId } from "../Types";
import { Graph } from "./Graph";
import * as Y from 'yjs';

type EdgeInformation = {
    label: string
}
type NodeInformation = ObjectYMap<{
    flowNode: FlowNode
    // This map may contain dangling edges because of Yjs synchronization
    // Reading from this map should always takes this into account
    edgeInformation: Y.Map<EdgeInformation>
    incomingNodes: Y.Map<EdgeInformation>
}>

type EdgeInformationForRemovedEdges = {
    edgeId: EdgeId
    edgeLabel: string
}

type NodeInformationForRemovedNodes = {
    nodeId: id
    label: string
    position: XYPosition
    edgeInformation: Array<EdgeInformationForRemovedEdges>
    incomingNodes: Array<EdgeInformationForRemovedEdges>
}

type RemovedGraphElement = 
    | { type: "node", item: NodeInformationForRemovedNodes } 
    | { type: "edge", item: EdgeInformationForRemovedEdges }

export type AdjacencyMapGraph = Y.Map<NodeInformation>

export class WeaklyConnectedGraph implements Graph {
    private yMatrix: AdjacencyMapGraph;
    private yRemovedGraphElements: Y.Array<RemovedGraphElement>;

    private selectedNodes: Set<id>;
    private selectedEdges: Set<EdgeId>;
    private eventEmitter: EventEmitter | undefined;

    constructor(yMatrix: AdjacencyMapGraph, yRemovedGraphElements: Y.Array<RemovedGraphElement>, eventEmitter?: EventEmitter) {
        this.yMatrix = yMatrix;
        this.yRemovedGraphElements = yRemovedGraphElements;
        this.selectedNodes = new Set();
        this.selectedEdges = new Set();
        this.eventEmitter = eventEmitter;
        if (this.eventEmitter !== undefined) {
            this.yMatrix.observeDeep(() => this.eventEmitter?.fire());
        }
    }

    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda)
    }

    private makeNodeInformation(node: FlowNode, edges: Y.Map<EdgeInformation>, incomingNodes: Y.Map<EdgeInformation>) {
        const res = new Y.Map() as NodeInformation;
        res.set('flowNode', node);
        res.set('edgeInformation', edges);
        res.set('incomingNodes', incomingNodes);
        return res
    }

    private removeYEdge(edgeId: EdgeId) {
        this.yRemovedGraphElements.doc!.transact(() => {
            let nodeIndex;
            do {
                nodeIndex = this.yRemovedGraphElements.toArray().findIndex(x => x.type === 'edge'? x.item.edgeId === edgeId: false);  
                if (nodeIndex !== -1)
                    this.yRemovedGraphElements.delete(nodeIndex);   
            } while(nodeIndex >= 0);
        });
    }

    private removeYNode(nodeId: id) {
        this.yRemovedGraphElements.doc!.transact(() => {
            let nodeIndex;
            do {
                nodeIndex = this.yRemovedGraphElements.toArray().findIndex(x => x.type === 'node'? x.item.nodeId === nodeId: false);  
                if (nodeIndex !== -1)
                    this.yRemovedGraphElements.delete(nodeIndex);   
            } while(nodeIndex >= 0);
        });
    }

    private removeDanglingEdges() {
        this.yMatrix.doc!.transact(() => {
            for (const source of this.yMatrix.values()) {
                for (const target of source.get('edgeInformation').keys()) {
                    if (this.yMatrix.get(target) !== undefined)
                        continue

                    const edgeId: EdgeId = `${source.get('flowNode').id}+${target}`;
                    // Removes the edge and the corresponding incoming node
                    this.removeEdge(source.get('flowNode').id, target);
                    this.selectedEdges.delete(edgeId);
                }
                // Removes dangling incoming nodes
                for (const [incomingNode, edgeInformation] of source.get('incomingNodes').entries()) {
                    if (this.yMatrix.get(incomingNode) !== undefined)
                        continue
    
                    source.get('incomingNodes').delete(incomingNode);
                    this.yRemovedGraphElements.push([
                        { type: 'edge', 
                            item: { 
                                edgeId: `${incomingNode}+${source.get('flowNode').id}`, 
                                edgeLabel: edgeInformation.label } 
                        }]);
                }
            }
        });
    }

    private dfsVisitedNodes(nodeId: id, excludedEdges: Set<EdgeId> = new Set<EdgeId>()): Set<id> {
        const visited = new Set<string>();

        const dfs = (nodeId: id) => {
            visited.add(nodeId);
            const nodeInfo = this.yMatrix.get(nodeId);
            if (nodeInfo === undefined) {
                console.warn('Node does not exist (dfsVisitedNodes)', nodeId)
                return
            }

            const edges = nodeInfo.get('edgeInformation');
            edges.forEach((_, neighborId) => {
                if (!visited.has(neighborId) && (!excludedEdges.has(`${nodeId}+${neighborId}`))) {
                    dfs(neighborId);
                }
            });
            const incomingEdges = nodeInfo.get('incomingNodes');
            incomingEdges.forEach((_, neighborId) => {
                if (!visited.has(neighborId) && (!excludedEdges.has(`${neighborId}+${nodeId}`))) 
                    dfs(neighborId);
            });
        }
        dfs(nodeId);
        return visited;
    }

    private isConnectedAfterEdgeRemoval(source: id, target: id): boolean {
        const excludedEdge = new Set<EdgeId>([`${source}+${target}`, `${target}+${source}`]);
        const edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        const edgeReversed = this.yMatrix.get(target)?.get('edgeInformation').get(source);
        if ((edge !== undefined) && (edgeReversed !== undefined)) 
            return true;


        const visited = this.dfsVisitedNodes(source, excludedEdge);
        return visited.has(target);
    }
    private isConnectedAfterNodeRemoval(nodeId: id): boolean {
        const nodeInfo = this.yMatrix.get(nodeId);
        const allNodesWithoutRemovedNode = 
            Array.from(this.yMatrix.keys())
            .filter(x => x !== nodeId);

        if (allNodesWithoutRemovedNode.length === 0)
            return true;

        if (nodeInfo === undefined) {
            console.warn('Node does not exist (isConnectedAfterNodeRemoval)')
            return false
        }
        const outgoingEdges = 
            Array.from(nodeInfo.get('edgeInformation').keys())
            .map<EdgeId>(outgoingNodeId => `${nodeId}+${outgoingNodeId}`)

        const incomingEdges = 
            Array.from(nodeInfo.get('incomingNodes').keys())
            .map<EdgeId>(incomingNodeId => `${incomingNodeId}+${nodeId}`)

        let excludedEdges = new Set([...outgoingEdges, ...incomingEdges]);
        let visited = this.dfsVisitedNodes(allNodesWithoutRemovedNode[0], excludedEdges);
        return visited.size === this.yMatrix.size - 1;
    }
    private getConnectedComponents(): Set<Set<id>> {
        let connectedComponents = new Set<Set<id>>();
        let visited = new Set<id>();
        for (const nodeId of this.yMatrix.keys()) {
            console.log('getConnectedComponents for nodeId', nodeId);
            if (visited.has(nodeId))
                continue;
            let component = this.dfsVisitedNodes(nodeId);
            visited = new Set([...visited, ...component]);
            connectedComponents.add(component);
        }
        return connectedComponents;
    }
    private getEdgesInConnectedComponents(connectedComponents: Set<Set<id>>): Set<Set<id>> | undefined {
        let edges = new Set<Set<id>>();
        for (const component of connectedComponents) {
            let edgesForComponent = new Set<id>();
            for (const nodeId of component) {
                const nodeInfo = this.yMatrix.get(nodeId);
                if (nodeInfo === undefined) {
                    console.warn('Node does not exist')
                    return undefined
                }
                for (const neighborId of nodeInfo.get('edgeInformation').keys()) {
                    edgesForComponent.add(nodeId + '+' + neighborId);
                }
                edges.add(edgesForComponent);
            }
        }
        return edges;
    }
    public isWeaklyConnected(): boolean {
        this.removeDanglingEdges();
        return this.getConnectedComponents().size === 1;
    }
    private mergeComponents(connectedComponents: Set<Set<id>>, comp1: Set<id>, comp2: Set<id>): Set<Set<id>> {
        connectedComponents.delete(comp1);
        connectedComponents.delete(comp2);
        connectedComponents.add(new Set([...comp1, ...comp2]));
        return connectedComponents;
    }
    private getGraphElementIdxAndMergedComponents(connectedComponents: Set<Set<id>>): [number, Set<Set<id>>] | undefined {
        for (const [reversedGraphElementIndex, graphElement] of this.yRemovedGraphElements.toArray().toReversed().entries()) {  
            for (const component of connectedComponents) {
                for (const otherConnectedComponent of connectedComponents) {
                    if (component === otherConnectedComponent)
                        continue;
                    switch (graphElement.type) {
                        case 'node': {
                            const incomingSourceNodes = new Set(graphElement.item.incomingNodes.map(x => splitEdgeId(x.edgeId)[0]));
                            const targetNodes = new Set (graphElement.item.edgeInformation.map(x => splitEdgeId(x.edgeId)[1]));
                            const compAndSourceNodesIntersetion = component.intersection(incomingSourceNodes).size > 0;
                            const compAndTargetNodesIntersetion = component.intersection(targetNodes).size > 0;
                            const otherCompAndSourceNodesIntersetion = otherConnectedComponent.intersection(incomingSourceNodes).size > 0;
                            const otherCompAndTargetNodesIntersetion = otherConnectedComponent.intersection(targetNodes).size > 0;
                            
                            if ((compAndSourceNodesIntersetion && otherCompAndSourceNodesIntersetion) || 
                                (compAndSourceNodesIntersetion && otherCompAndTargetNodesIntersetion) || 
                                (compAndTargetNodesIntersetion && otherCompAndSourceNodesIntersetion) || 
                                (compAndTargetNodesIntersetion && otherCompAndTargetNodesIntersetion)) 
                                {
                                const mergedComponents = this.mergeComponents(connectedComponents, component, otherConnectedComponent);
                                const nodeIndex = this.yRemovedGraphElements.length - 1 - reversedGraphElementIndex
                                return [nodeIndex, mergedComponents];
                            }
                            break;
                        }
                        case 'edge': {
                            const [source, target] = splitEdgeId(graphElement.item.edgeId);
                            if ((component.has(source) && otherConnectedComponent.has(target)) || (otherConnectedComponent.has(source) && component.has(target))) {
                                const mergedComponents = this.mergeComponents(connectedComponents, component, otherConnectedComponent);
                                const edgeIndex = this.yRemovedGraphElements.length - 1 - reversedGraphElementIndex
                                return [edgeIndex, mergedComponents];
                            }
                            break;
                        }
                    }

                }
            }
        }
        return undefined;
    }

    private computeAllPathsFromANodeInRemovedNodes(node: NodeInformationForRemovedNodes, NodeExcludeSet: ReadonlySet<id> = new Set()): Set<Array<NodeInformationForRemovedNodes>> {
        let paths = new Set<Array<NodeInformationForRemovedNodes>>();
        const outgoingNodes = node.edgeInformation.map(x => splitEdgeId(x.edgeId)[1]).filter(x => !NodeExcludeSet.has(x));
        const incomingNodes = node.incomingNodes.map(x => splitEdgeId(x.edgeId)[0]).filter(x => !NodeExcludeSet.has(x));
        const nextNodes = this.yRemovedGraphElements.toArray()
            .filter((x): x is { type: 'node', item: NodeInformationForRemovedNodes } => x.type === 'node' && (outgoingNodes.includes(x.item.nodeId) || incomingNodes.includes(x.item.nodeId)))
            .map(x => x.item);

        for(const nextNode of nextNodes) {
            paths.add([node, nextNode]);
            const nextSubPaths = this.computeAllPathsFromANodeInRemovedNodes(nextNode, NodeExcludeSet.union(new Set([node.nodeId])));
            for (const nextSubPath of nextSubPaths) {
                paths.add([node, ...nextSubPath]);
            }
        }
        return paths;
    }   

    private computePathsInRemovedNodes(nodes: Array<NodeInformationForRemovedNodes>): Set<Array<NodeInformationForRemovedNodes>> {
        let paths = new Set<Array<NodeInformationForRemovedNodes>>();

        function getPathsWithoutDuplicates(allPaths: Set<Array<NodeInformationForRemovedNodes>>): Set<Array<NodeInformationForRemovedNodes>> {
            const uniquePaths = new Set<Array<NodeInformationForRemovedNodes>>();

            for (const path of allPaths) {
                const reversedPath = path.toReversed();
                const isDuplicate = [...uniquePaths].some(
                    (uniquePath) => JSON.stringify(uniquePath) === JSON.stringify(reversedPath)
                );
        
                if (!isDuplicate) {
                    uniquePaths.add(path);
                }
            }
        
            return uniquePaths;
        }
        for (const node of nodes) {
            const allPathsFromCurrentNode = this.computeAllPathsFromANodeInRemovedNodes(node);
            const filteredPaths = new Set([...allPathsFromCurrentNode].filter(x => x.length > 1));
            paths = paths.union(filteredPaths);
        }
        console.log('paths without duplicates', getPathsWithoutDuplicates(paths));
        return getPathsWithoutDuplicates(paths);
    }
    private createPathBetweenComponents(path: Array<NodeInformationForRemovedNodes>): Array<NodeInformationForRemovedNodes> | undefined{
        /**
        * This method creates a path between two components by only using necessary edges for connection. 
        * The first and last node have only edges to a neighbour node in the path or to existing nodes in the graph. 
        * Nodes in the middle of a path have only edges to their neighbours in the path.
        * All other edges are not used because they are not necessary for the connection of the two components or 
        * would be invalid edges, as the corresponding nodes are not in the graph anymore.
        */

        const firstNode = {
            ...path[0],
            edgeInformation: path[0].edgeInformation.filter(x => (this.yMatrix.get(splitEdgeId(x.edgeId)[1]) !== undefined) || (splitEdgeId(x.edgeId)[1]) === path[1].nodeId),
            incomingNodes: path[0].incomingNodes.filter(x => (this.yMatrix.get(splitEdgeId(x.edgeId)[0]) !== undefined) || (splitEdgeId(x.edgeId)[0]) === path[1].nodeId)
        };
        const lastNode = {
            ...path[path.length - 1],
            edgeInformation: path[path.length - 1].edgeInformation.filter(x => (this.yMatrix.get(splitEdgeId(x.edgeId)[1]) !== undefined) || (splitEdgeId(x.edgeId)[1]) === path[path.length - 2].nodeId),
            incomingNodes:  path[path.length - 1].incomingNodes.filter(x => (this.yMatrix.get(splitEdgeId(x.edgeId)[0]) !== undefined) || (splitEdgeId(x.edgeId)[0]) === path[path.length - 2].nodeId)
        };
        const res = [firstNode];
        for (let i = 1; i < path.length - 1; i++) {
            const nextEdgeInfo = path[i].edgeInformation.filter(x => (x.edgeId === `${path[i].nodeId}+${path[i + 1].nodeId}`) || (x.edgeId === `${path[i].nodeId}+${path[i - 1].nodeId}`));
            const nextIncomingInfo = path[i].incomingNodes.filter(x => (x.edgeId === `${path[i + 1].nodeId}+${path[i].nodeId}`) || (x.edgeId === `${path[i - 1].nodeId}+${path[i].nodeId}`));

            const nextNode = {
                ...path[i],
                edgeInformation: nextEdgeInfo,
                incomingNodes: nextIncomingInfo
            };
            res.push(nextNode);
        }
        return [...res, lastNode];
    }
    private getPathAndMergedComponents(connectedComponents: Set<Set<id>>): [Array<NodeInformationForRemovedNodes>, Set<Set<id>>] | undefined {
        const nodes = this.yRemovedGraphElements.toArray().filter(x => x.type === 'node').map(x => x.item);
        const allPaths = this.computePathsInRemovedNodes(nodes);
        const pathCost = (path: Array<NodeInformationForRemovedNodes>): BigInt => {
            let cost = 0n;
            for (let i = 0; i < path.length; i++) {
                const indexReversed = this.yRemovedGraphElements.toArray().toReversed().findIndex(x => (x.type === 'node') && (x.item.nodeId === path[i].nodeId));
                if (indexReversed === -1) {
                    console.warn('Node does not exist in the removed nodes list (getPathAndMergedComponents)', path[i].nodeId);
                }
                cost = cost + (1n << BigInt(indexReversed));
            }
            return cost;
        }
        const allPathsWithCost = Array.from(allPaths).map<[NodeInformationForRemovedNodes[], BigInt]>(x => [x, pathCost(x)]).sort((a, b) => a[1] < b[1] ? -1 : 1);
        console.log('all paths with cost sorted', allPathsWithCost.map(x => [x[0]?.map(y => y.nodeId), x[1]]));
        for (const [path, ] of allPathsWithCost) {
            for (const component of connectedComponents) {
                for (const otherComponent of connectedComponents) {
                    if (component === otherComponent)
                        continue;
                    const incomingSourceNodesOfFirstNodeInPath = new Set(
                        path[0].incomingNodes.map(x => splitEdgeId(x.edgeId)[0])
                        .concat(path[0].edgeInformation
                        .map(x => splitEdgeId(x.edgeId)[1]))
                    );
                    const targetNodesOfLastNodeInPath = new Set (path[path.length - 1].edgeInformation.map(x => splitEdgeId(x.edgeId)[1]).concat(path[path.length - 1].incomingNodes.map(x => splitEdgeId(x.edgeId)[0])));
                    const compAndSourceNodesIntersetion = component.intersection(incomingSourceNodesOfFirstNodeInPath).size > 0;
                    const compAndTargetNodesIntersetion = component.intersection(targetNodesOfLastNodeInPath).size > 0;
                    const otherCompAndSourceNodesIntersetion = otherComponent.intersection(incomingSourceNodesOfFirstNodeInPath).size > 0;
                    const otherCompAndTargetNodesIntersetion = otherComponent.intersection(targetNodesOfLastNodeInPath).size > 0;

                    if ((compAndSourceNodesIntersetion && otherCompAndSourceNodesIntersetion) || 
                        (compAndSourceNodesIntersetion && otherCompAndTargetNodesIntersetion) || 
                        (compAndTargetNodesIntersetion && otherCompAndSourceNodesIntersetion) || 
                        (compAndTargetNodesIntersetion && otherCompAndTargetNodesIntersetion)) 
                    {
                        // This path has only necessary nodes and edges to connect two components
                        const pathBetweenComponents = this.createPathBetweenComponents(path);
                        if (pathBetweenComponents === undefined) {
                            console.warn('Invalid path between components');
                            return undefined;
                        }
                        const mergedComponents = this.mergeComponents(connectedComponents, component, otherComponent);
                        console.log('path between components', pathBetweenComponents);
                        return [pathBetweenComponents, mergedComponents];
                    }
                }
            }
        }
        return undefined;
    }
    private addYRemovedNodeWithEdges(node: NodeInformationForRemovedNodes): void {
        console.log('addYRemovedNodeWithEdges', node);
        this.yMatrix.doc!.transact(() => {
            const innerMap = this.makeNodeInformation({ 
                id: node.nodeId, 
                data : { label: node.label }, 
                position: node.position, 
                deletable: true, 
                // type: 'editNodeLabel',
            }, 
            new Y.Map<EdgeInformation>(),
            new Y.Map<EdgeInformation>());
            this.yMatrix.set(node.nodeId, innerMap);
            for (const edge of node.edgeInformation) {
                const [source, target] = splitEdgeId(edge.edgeId);
                if (this.yMatrix.get(source) === undefined || this.yMatrix.get(target) === undefined) {
                    console.warn('Edge cannot be added (addYRemovedNodeWithEdges)', source, this.yMatrix.get(source), target, this.yMatrix.get(target));
                    continue;
                }
                this.addEdge(source, target, edge.edgeLabel);
            }
            for (const edge of node.incomingNodes) {
                const [source, target] = splitEdgeId(edge.edgeId);
                if (this.yMatrix.get(source) === undefined || this.yMatrix.get(target) === undefined) {
                    console.warn('Incoming edge cannot be added (addYRemovedNodeWithEdges), source, target', source, this.yMatrix.get(source), target, this.yMatrix.get(target));
                    continue;
                }
                this.addEdge(source, target, edge.edgeLabel);
            }
            this.removeYNode(node.nodeId);
        });
    }
    private addYRemovedPath(path: Array<NodeInformationForRemovedNodes>): void {
        this.yMatrix.doc!.transact(() => {
            for (const pathNode of path) {
                this.yMatrix.set(pathNode.nodeId, this.makeNodeInformation({
                    id: pathNode.nodeId,
                    data: {label: pathNode.label},
                    position: pathNode.position,
                    deletable: true,
                }, new Y.Map<EdgeInformation>(), new Y.Map<EdgeInformation>()));
                this.removeYNode(pathNode.nodeId);
            }
            console.log('path nodes added to repair connectedness', path);

            for (const pathNode of path) {
                for (const edge of pathNode.edgeInformation) {
                    const [source, target] = splitEdgeId(edge.edgeId);
                    if (this.yMatrix.get(source) === undefined || this.yMatrix.get(target) === undefined) {
                        if (pathNode.nodeId !== path[0].nodeId && pathNode.nodeId !== path[path.length - 1].nodeId) {
                            // These edges connect nodes added in the previous loop. So, they should always be addable.
                            console.warn('(Should not happen, destroys connectedness property) Edge is important for connectedness, but cannot be added', source,this.yMatrix.get(source) === undefined, target, this.yMatrix.get(target) === undefined);
                            continue;
                        } else {
                            console.log('Edge of first or last node in path has no connection to a node in the graph, it can be omitted', source, target);
                            continue;
                        }
                    }
                    if ((this.yMatrix.get(source)?.get('edgeInformation').get(target) !== undefined) && (this.yMatrix.get(target)?.get('incomingNodes').get(source) !== undefined)) 
                        continue;
                    this.addEdge(source, target, edge.edgeLabel);
                }
                for (const edge of pathNode.incomingNodes) {
                    const [source, target] = splitEdgeId(edge.edgeId);
                    if (this.yMatrix.get(source) === undefined || this.yMatrix.get(target) === undefined){
                        if (pathNode.nodeId !== path[0].nodeId || pathNode.nodeId !== path[path.length - 1].nodeId) {
                            // These edges connect nodes added in the previous loop. So, they should always be addable.
                            console.warn('(Should not happen, destroys connectedness property) Edge is important for connectedness, but cannot be added', source, target);
                            continue;
                        } else {
                            console.log('Edge of first or last node in path has no connection to a node in the graph, it can be omitted', source, target);
                            continue;
                        }
                    }
                    if ((this.yMatrix.get(target)?.get('incomingNodes').get(source) !== undefined) && (this.yMatrix.get(source)?.get('edgeInformation').get(target) !== undefined)) 
                        continue;
                    this.addEdge(source, target, edge.edgeLabel);
                }
            }
        });   
    }
    /**
     * This method ensures that the graph is weakly connected. It does so by adding nodes and edges from the removed nodes and edge list.
     * It means that at most 20 removed nodes can be used to make the graph weakly connected.
     * This is required to prevent yRemovedGraphElements from growing indefinitely as removed nodes are never deleted from there.
     */
    private makeYNodeCountAtMost20InYRemovedGraphElements() {
        this.yRemovedGraphElements.doc!.transact(() => {
            const yNodeCount = this.yRemovedGraphElements.toArray().filter(x => x.type === 'node').length;
            if (yNodeCount <= 20)
                return;

            const nodeCountToRemove = yNodeCount - 20;
            for (let i = 0; i < nodeCountToRemove; i++) {
                const nodeIndex = this.yRemovedGraphElements.toArray().findIndex(x => x.type === 'node');
                this.yRemovedGraphElements.delete(nodeIndex);
            }
        });
    }

    public makeGraphWeaklyConnected(): void {
        this.yRemovedGraphElements.doc!.transact(() => {
            this.removeDanglingEdges();
            this.makeYNodeCountAtMost20InYRemovedGraphElements();
            let connectedComponents = this.getConnectedComponents();
            console.log('connected components', connectedComponents, connectedComponents.size);

            while (connectedComponents.size > 1) {
                const tryToConnectComponentsWithGraphElement = this.getGraphElementIdxAndMergedComponents(connectedComponents);
                if (tryToConnectComponentsWithGraphElement !== undefined) {
                    const [graphElementIdxConnectingTwoComponents, mergedComponents] = tryToConnectComponentsWithGraphElement;

                    const graphElementConnectingTwoComponents = this.yRemovedGraphElements.get(graphElementIdxConnectingTwoComponents);
    
                    switch (graphElementConnectingTwoComponents.type) {
                        case 'node': {
                            const nodeConnectingTwoComponents = graphElementConnectingTwoComponents.item;
                            // Added node is removed from the removed nodes list in addYRemovedNodeWithEdges
                            this.addYRemovedNodeWithEdges(nodeConnectingTwoComponents);
                            break;
                        }
                        case 'edge': {
                            const edgeConnectingTwoComponents = graphElementConnectingTwoComponents.item;
                            const [source, target] = splitEdgeId(edgeConnectingTwoComponents.edgeId);
                            const edgeLabel = edgeConnectingTwoComponents.edgeLabel;
                            // Added edge is removed from the removed edges list in addEdge
                            this.addEdge(source, target, edgeLabel);
                            break;
                        }
                    }
                    
                    connectedComponents = mergedComponents;
                    break;
                }

                const tryToConnectComponentsWithPath = this.getPathAndMergedComponents(connectedComponents);
                if (tryToConnectComponentsWithPath !== undefined) {
                    const [path, mergedComponents] = tryToConnectComponentsWithPath;
                    this.addYRemovedPath(path);
                    connectedComponents = mergedComponents;
                    break;
                }

                if (tryToConnectComponentsWithGraphElement === undefined && tryToConnectComponentsWithPath === undefined) {
                    console.warn('Could not connect components');
                    return;
                }

            }
        });
    }

    addNode(nodeId: id, label: string, position: XYPosition): void {
        if (this.yMatrix.size > 0) {
            console.warn('Cannot add a single node to a non-empty graph');
            return; 
        }
        const innerMap = this.makeNodeInformation({ 
            id: nodeId, 
            data : { label }, 
            position, 
            deletable: true, 
            // type: 'editNodeLabel',
        }, 
        new Y.Map<EdgeInformation>(),
        new Y.Map<EdgeInformation>());
        this.yMatrix.doc!.transact(() => {
            this.yMatrix.set(nodeId, innerMap);
        });
    }
    addNodeWithEdge(nodeId: id, nodeLabel: string, nodePosition: XYPosition, edgeSource :id, edgeTarget: id, edgeLabel: string): void {
        if (this.yMatrix.size === 0 && edgeTarget !== edgeSource) {
            console.warn('Cannot add a single node with an edge to a non-existing node');
            return; 
        }

        if (edgeSource === edgeTarget) {
            console.warn('Cannot add an edge with the same source and target (addNodeWithEdge)');
            return;
        }

        if (!(edgeSource === nodeId || edgeTarget === nodeId)) {
            console.warn('Edge is not connected to the added node');
            return; 
        }

        if (this.yMatrix.get(edgeSource) === undefined && edgeSource !== nodeId && edgeTarget === nodeId) {
            console.warn('Invalid source node', edgeSource);
            return; 
        }

        if (this.yMatrix.get(edgeTarget) === undefined && edgeTarget !== nodeId && edgeSource === nodeId) {
            console.warn('Invalid target node', edgeTarget);
            return; 
        }

        const innerMap = this.makeNodeInformation({ 
            id: nodeId, 
            data : { label: nodeLabel }, 
            position: nodePosition, 
            deletable: true, 
            // type: 'editNodeLabel',
        }, new Y.Map<EdgeInformation>()
        , new Y.Map<EdgeInformation>());
        this.yMatrix.doc!.transact(() => {
            this.yMatrix.set(nodeId, innerMap);
            this.addEdge(edgeSource, edgeTarget, edgeLabel);
        });
    }
    addEdge(source: id, target: id, label: string): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.yMatrix.get(source);
            const nodeInfo2 = this.yMatrix.get(target);
            if (nodeInfo1 === undefined || nodeInfo2 === undefined) {
                console.warn('one of the edge nodes does not exist', source, target)
                return 
            }
            // 1. Add the edge from the source node to the target node
            // 2. Add the reversed edge to the incoming nodes
            // 3. Remove the edge from the removed edges list
            nodeInfo1.get('edgeInformation').set(target, {label});
            nodeInfo2.get('incomingNodes').set(source, {label});
            this.removeYEdge(`${source}+${target}`);
            console.log('added edge with label, edges', label, nodeInfo1.get('edgeInformation').get(target));
            console.log('added edge with label, incoming edges', label, nodeInfo2.get('incomingNodes').get(source));
        });
    }
    removeNode(nodeId: id): void {
        const nodeInfo = this.yMatrix.get(nodeId);
        if (nodeInfo === undefined) {
            console.log('Node does not exist (removeNode)', nodeId);
            return 
        }

        if (!this.isConnectedAfterNodeRemoval(nodeId)) {
            console.warn('Removing this node would disconnect the graph');
            return
        }
        // Edge information also includes edges that are not in the graph anymore, but are stored in yRemovedGraphElements
        const edgeInformation: EdgeInformationForRemovedEdges[] = 
            Array.from(nodeInfo.get('edgeInformation').entries())
            .map<EdgeInformationForRemovedEdges>(([target, {label}]) => ({ edgeId: `${nodeId}+${target}`, edgeLabel: label}))
            .concat(this.yRemovedGraphElements
                .toArray()
                .filter(x => (x.type === 'edge'))
                .filter(x => splitEdgeId(x.item.edgeId)[0] === nodeId)
                .map(x => x.item)
            )
        // Incoming nodes also includes edges that are not in the graph anymore, but are stored in yRemovedGraphElements
        const incomingNodes: EdgeInformationForRemovedEdges[] = 
            Array.from(nodeInfo.get('incomingNodes').entries())
            .map<EdgeInformationForRemovedEdges>(([source, {label}]) => ({ edgeId: `${source}+${nodeId}`, edgeLabel: label}))
            .concat(this.yRemovedGraphElements
                .toArray()
                .filter(x => (x.type === 'edge'))
                .filter(x => splitEdgeId(x.item.edgeId)[1] === nodeId)
                .map(x => x.item)
            )
        const nodeAsRemovedGraphElement: RemovedGraphElement = { 
            type: 'node', 
            item: {
                nodeId, 
                label: nodeInfo.get('flowNode').data.label, 
                position: nodeInfo.get('flowNode').position, 
                edgeInformation: edgeInformation,
                incomingNodes: incomingNodes
        }};
        console.log('node as removed graph element', nodeAsRemovedGraphElement);

        this.yMatrix.doc!.transact(() => {   
            const incomingNodes = nodeInfo.get('incomingNodes')
            
            for (const incomingNode of incomingNodes.keys()) {
                const incomingNodeInfo = this.yMatrix.get(incomingNode)
                if (incomingNodeInfo === undefined) {
                    console.warn('Node does not exist. It should have an edge to the removed node(removeNode)', incomingNode, nodeId);
                    return 
                }
                // 1. Remove the edge from the incoming node to the node being removed
                // 2. Remove the corresponding incoming node
                // 3. Add removed edge to the removed graph elements list 
                // 3. Remove it from the selected edges
                const edgeId: EdgeId = `${incomingNodeInfo.get('flowNode').id}+${nodeId}`;
                const edgeLabel = incomingNodeInfo.get('edgeInformation').get(nodeId)?.label ?? '';
                const edgeAsRemovedGraphElement: RemovedGraphElement = { type: 'edge', item: {edgeId, edgeLabel}};

                incomingNodeInfo.get('edgeInformation').delete(nodeId);
                this.yRemovedGraphElements.push([edgeAsRemovedGraphElement]);
                this.selectedEdges.delete(edgeId);
            }

            for (const target of nodeInfo.get('edgeInformation').keys()) {
                const targetNodeInfo = this.yMatrix.get(target);
                if (targetNodeInfo === undefined) {
                    /// This can happen, if a dangling edge is removed
                    return 
                }
                targetNodeInfo.get('incomingNodes').delete(nodeId);
            }


            this.yRemovedGraphElements.push([nodeAsRemovedGraphElement]);
            // Remove the node itself
            this.yMatrix.delete(nodeId);
            this.selectedNodes.delete(nodeId);

        });
    }
    removeEdge(source: id, target: id): void {
        this.yMatrix.doc!.transact(() => {
            const nodeInfo1 = this.yMatrix.get(source);
            const nodeInfo2 = this.yMatrix.get(target);

            if (nodeInfo1 !== undefined  && nodeInfo2 !== undefined && !this.isConnectedAfterEdgeRemoval(source, target)) {
                console.warn('Removing this edge would disconnect the graph');
                return
            }
            // 1. Remove the edge from the source node to the target node
            // 2. Remove the reversed edge from incoming nodes
            // 3. Add removed edge to the removed edges list
            // 4. Remove it from selected edges
            const edgeId: EdgeId = `${source}+${target}`;
            
            // This method is designed to handle dangling edges, i.e. one of the two nodes could no longer
            // exist. This method is robust against this case. If both nodes exist, the edge will be also
            // deleted normally, if the edge does not exist (i.e. is not stored in any of the two maps),
            // no action can be taken
            const node1EdgeInfo = nodeInfo1?.get('edgeInformation')
            const node2Incoming = nodeInfo2?.get('incomingNodes')
            const edgeLabel = node1EdgeInfo?.get(target)?.label ?? node2Incoming?.get(source)?.label;
            
            if (edgeLabel === undefined)
                // the edge does not exist in any way
                return

            node1EdgeInfo?.delete(target);
            node2Incoming?.delete(source);

            const edgeAsRemovedGraphElement: RemovedGraphElement = { type: 'edge', item: {edgeId, edgeLabel}};
            this.yRemovedGraphElements.push([edgeAsRemovedGraphElement]);
            this.selectedEdges.delete(edgeId);
            console.log('removed edge', source, target);
        });
    }
    changeNodePosition(nodeId: id, position: XYPosition): void {
        throw new Error("Method not implemented.");
    }
    changeNodeDimension(nodeId: id, dimensions: { width: number; height: number; }): void {
        throw new Error("Method not implemented.");
    }
    changeNodeSelection(nodeId: id, selected: boolean): void {
        throw new Error("Method not implemented.");
    }
    changeEdgeSelection(edgeId: id, selected: boolean): void {
        throw new Error("Method not implemented.");
    }
    nodesAsFlow(): FlowNode[] {
        if (this.yMatrix === undefined)
            console.log('this', this);
        return Array.from(this.yMatrix.values()).map(x => {
            const flowNode = x.get('flowNode');
            console.log('node is selected', this.selectedNodes.has(flowNode.id), this.selectedNodes);
            return {
                ...flowNode,
                selected: this.selectedNodes.has(flowNode.id)
            }
        })
    }
    edgesAsFlow(): FlowEdge[] {
        this.removeDanglingEdges();

        const nestedEdges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode, {label}]) => {
                    if (this.yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained');
                    return {
                        id: `${sourceNode}+${targetNode}`,
                        source: sourceNode,
                        target: targetNode,
                        deletable: true,
                        markerEnd: { type: MarkerType.Arrow},
                        data: { label },
                        label,
                        selected: this.selectedEdges.has(`${sourceNode}+${targetNode}`),
                    }
                })
            )

        return nestedEdges.flat()
    }
    getNode(nodeId: id): FlowNode | undefined {
        return this.yMatrix.get(nodeId)?.get('flowNode');
    }
    getEdge(source: id, target: id): FlowEdge | undefined {
        this.removeDanglingEdges();
        let edge = this.yMatrix.get(source)?.get('edgeInformation').get(target);
        if (edge === undefined)
            return undefined 
        return { 
                id: `${source}+${target}`, 
                source, 
                target, 
                deletable: true, 
                markerEnd: {type: MarkerType.Arrow}, 
                data: {label: edge.label }, 
                selected: this.selectedEdges.has(`${source}+${target}`), 
        }
    }
    getYRemovedGraphElementsAsJson(): string {
        return JSON.stringify(this.yRemovedGraphElements.toArray());
    }
    getEdgesAsJson(): string {
        this.removeDanglingEdges();
        let edges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('edgeInformation')).map(([targetNode,]) => {
                    if (this.yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained');
                    return [sourceNode + '+' + targetNode]
                })).flat()
        return JSON.stringify(edges.sort());
    }
    getIncomingNodesAsJson(): string {
        this.removeDanglingEdges();
        let edges = 
            Array.from(this.yMatrix.entries()).map(([sourceNode, nodeInfo]) =>
                Array.from(nodeInfo.get('incomingNodes')).map(([targetNode,]) => {
                    if (this.yMatrix.get(targetNode) === undefined)
                        throw new Error('target node still dangling and contained'); 
                    return [sourceNode + '+' + targetNode]
                })).flat()
        return JSON.stringify(edges.sort());
    }
    isNodeSelected(nodeId: id): boolean {
        return this.selectedNodes.has(nodeId);
    }
    isEdgeSelected(source: id, target: id): boolean {
        return this.selectedEdges.has(`${source}+${target}`);
    }
    get nodeCount(): number {
        return this.yMatrix.size;
    }
    get edgeCount(): number {
        this.removeDanglingEdges();
        return Array.from(this.yMatrix.values()).reduce((acc, x) => acc + x.get('edgeInformation').size, 0);
    }
    get selectedNodesCount(): number {
        return this.selectedNodes.size;
    }
    get selectedEdgesCount(): number {
        return this.selectedEdges.size;
    }
    
}

