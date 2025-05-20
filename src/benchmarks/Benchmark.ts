/* eslint-disable no-unused-vars */

import { createObjectCsvWriter } from 'csv-writer'
import { CsvWriter } from "csv-writer/src/lib/csv-writer"
import { InitialGraph } from "./InitialGraphs"

const allHeaders = [{
    id: 'clientCount', title: 'Client count'
}, {
    id: 'cause', title: 'Log cause'
}, {
    id: 'graphVariant', title: 'Graph variant'
}, {
    id: 'cycleCount', title: 'Cycle count'
}, {
    id: 'syncClientCount', title: 'Client count participating in sync'
}, {
    id: 'iterationCount', title: 'Iteration count'
}, {
    id: 'syncid', title: 'Sync ID'
}, {
    id: 'copyTime', title: 'Copy time'
}, {
    id: 'hadConflicts', title: 'Had conflicts'
}, {
    id: 'waitingHelped', title: 'Waiting helped'
}, {
    id: 'randomTime', title: 'Randomized sleep time'
}, { 
    id: 'maxSleep', title: 'Maximal sleep time'
},{ 
    id: 'networkDelay', title: 'Network delay'
}, {
    id: 'executionMillis', title: 'Execution time (ms)'
}, {
    id: 'fullRun', title: 'Operation succeeded with full run'
}, {
    id: 'nodeCount', title: 'Node count'
}, { 
    id: 'edgeCount', title: 'Edge count'
}, { 
    id: 'deletedEdgeCount', title: 'Deleted edge count by removeNode'
}, { 
    id: 'initialGraph', title: 'Initial graph type'
}, { 
    id: 'crvariant', title: 'Conflict resolution variant'
}, { 
    id: 'crtime', title: 'Conflict resolution time'
},{ 
    id: 'danglingEdgeResolutionTime', title: 'Dangling edge resolution time'
},{ 
    id: 'crdanglingEdgeCount', title: 'Dangling edges handled'
}, { 
    id: 'cycleResolutionSteps', title: 'Steps required to resolve cycles'
}, { 
    id: 'yEdgesCount', title: 'Number of yEdges'
}, { 
    id: 'removedGraphElements', title: 'Removed graph elements count'
}, { 
    id: 'componentCount', title: 'Component count'
}, { 
    id: 'restoredPathLength', title: 'Length of restored path'
}, { 
    id: 'pathInitializationTime', title: 'Path initialization (ms)'
}, { 
    id: 'inputSize', title: 'Initial node count'
}, { 
    id: 'restoredNodesWithEdges', title: 'Restored nodes with edges'
}, { 
    id: 'restoredEdges', title: 'Restored edges'
}, { 
    id: 'restoredPaths', title: 'Restored paths'
}] as const

export type UpdateStormHeaders = {
    syncid: string,
    copyTime: number,
    syncClientCount: number,
    maxSleep: number,
    networkDelay: number,
} & ({
    hadConflicts: false
} | {
    hadConflicts: true
    waitingHelped: boolean,
    randomTime: number,
})

type AssertContainsKeys<G extends (typeof allHeaders)[number]['id']> = G
type AllHeadersIncludeUpdateStorm = AssertContainsKeys<keyof UpdateStormHeaders>

export type DAGHeaders = {
    cycleCount: number
    iterationCount: number
}
type AllHeadersIncludeDAG = AssertContainsKeys<keyof DAGHeaders>


export type BasicOpHeader = {
    executionMillis: number
    fullRun: boolean
    nodeCount: number
    edgeCount: number
    deletedEdgeCount?: number
}
type AllHeadersIncludeBasicOp = AssertContainsKeys<keyof BasicOpHeader>

export enum GraphVariant {
    DAG = 'DAG',
    AdjList = 'Adjacency List',
    AdjMap = 'Adjacency Map',
    AdjSet = 'Adjacency Set',
    AdjListAuto = 'Adjacency List Automerge',
    AdjMapAuto = 'Adjacency Map Automerge',
    AdjMapFasterDelete = 'Adjacency Map With Faster Node Deletion',
    AdjMapFasterDeleteAuto = 'Adjacency Map With Faster Node Deletion Automerge',
    FRWCG = 'Fixed Root Weakly Connected Graph',
    FRCUG = 'Fixed Root Connected Undirected Graph',
}
export enum Cause {
    OpSync = 'OpSync',
    OpConflictResolution = 'OpConflictResolution',
    OpAddEdge = 'OpAddEdge',
    OpAddNode = 'OpAddNode',
    OpRemoveEdge = 'OpRemoveEdge',
    OpRemoveNode = 'OpRemoveNode',
    OpAddNodeWithEdge = 'OpAddNodeWithEdge',
    OpRestorePath = 'OpRestorePath'
}

export type EssentialHeaders = {
    graphVariant: GraphVariant
    clientCount: number
    cause: Cause
    initialGraph: InitialGraph
}
type AllHeadersIncludeEssential = AssertContainsKeys<keyof EssentialHeaders>

export enum ConflictResolutionVariant {
    OneEdgePerRay = 'One edge per ray',
    AllEdgesToOneRay = 'All edges to one ray',
    Variant1 = 'Variant 1',
    Variant2 = 'Variant 2',
    Variant3 = 'Variant 3',
}
export type CRDanglingEdgeHeaders = {
    danglingEdgeResolutionTime: number
    crvariant: ConflictResolutionVariant
    crdanglingEdgeCount: number
}
type AllHeadersIncludeCRDanlingEdgeHeaders = AssertContainsKeys<keyof CRDanglingEdgeHeaders>

export type CRCyclesDAGHeaders = {
    crvariant: ConflictResolutionVariant,
    nodeCount: number, 
    edgeCount: number, 
    executionMillis: number,
    cycleCount: number,
    cycleResolutionSteps: number,
    yEdgesCount: number
}
type AllHeadersIncludeCRCyclesDAGHeaders = AssertContainsKeys<keyof CRCyclesDAGHeaders>



export type CRConnectednessHeaders = {
    crvariant: ConflictResolutionVariant,
    removedGraphElements: number,
    executionMillis: number,
    componentCount: number,
    restoredPathLength: number,
    pathInitializationTime: number,
    inputSize?: number
    restoredNodesWithEdges?: number
    restoredEdges?: number
    restoredPaths?: number

    // nodeCount: number, 
    // edgeCount: number, 
    // executionMillis: number,
    // componentCount: number,
    // resolutionSteps: number,
    // resolvedEdgeCount: number,
    // resolvedNodeWithEdgeCount: number,
    // resolvedPathCount: number,
}
type AllHeadersIncludeCRConnectednessHeaders = AssertContainsKeys<keyof CRConnectednessHeaders>

export function makeBenchmarkCsvWriter<T extends EssentialHeaders>(path: `${string}.csv`) {
    return createObjectCsvWriter({
        path: path,
        header: allHeaders as any
    }) as CsvWriter<T>
}





