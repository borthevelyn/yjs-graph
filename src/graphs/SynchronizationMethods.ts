import { randomUUID } from 'crypto';
import * as Y from 'yjs';
import { UpdateStormHeaders } from '../benchmarks/Benchmark';
import { assert } from 'console';

export function syncDefault<T, G>(graphs: T[], yDocs: Y.Doc[], makeValid: (graph: T) => G): G[] {
    let updatesMap = new Map<number, Array<Uint8Array<ArrayBufferLike>>>()
    for (let i = 0; i < yDocs.length; i++) {
        let updates = new Array<Uint8Array<ArrayBufferLike>>()
        for (let j = 0; j < yDocs.length; j++) {
            if (i !== j) {
                updates.push(Y.encodeStateAsUpdate(yDocs[j], Y.encodeStateVector(yDocs[i])))
            }
        }
        updatesMap.set(i, updates);
    }
    for (const [idx, updates] of updatesMap.entries()) {
        for (const update of updates) {
            Y.applyUpdate(yDocs[idx], update)
        }
    }

    // this both mutates and generates data
    return graphs.map(makeValid)
}

export async function syncPUSPromAll<T, G extends object>(
    graphs: T[], 
    yDocs: Y.Doc[], 
    rnd: (idx: number) => number,
    makeGraph: (copiedDoc: Y.Doc) => T,
    isValid: (graph: T) => boolean,
    makeValid: (graph: T) => G,
    maxSleepDur: number): Promise<[UpdateStormHeaders, undefined | G][]> {

    const id = randomUUID().substring(0, 7)

    // parallel for such that each peer runs concurrently
    return await Promise.all(
        Array.from(new Array(yDocs.length).keys()).map<Promise<[UpdateStormHeaders, undefined | G]>>(async idx => {
            // from here, the graph might be invalid, thus operate on a copy
            const firstCopyStart = performance.now()
            const copy = new Y.Doc()
            Y.applyUpdate(copy, Y.encodeStateAsUpdate(yDocs[idx]))
            const copyTime = performance.now() - firstCopyStart

            
            const updates = Array.from(new Array(yDocs.length).keys())
                .filter(i => i !== idx)
                .map(i => Y.encodeStateAsUpdate(yDocs[i], Y.encodeStateVector(yDocs[idx])))

            for (const update of updates) {
                Y.applyUpdate(copy, update)
            }
            const copiedGraph = makeGraph(copy)
            
            if (!isValid(copiedGraph)) {
                // the graph is valid, but not up to date
                const sleepDur = rnd(idx) * maxSleepDur
                await new Promise(resolve => setTimeout(resolve, sleepDur)) // sleep random
                // recalculate missing updates (some might have been applied, other updates might have arrived)
                const newUpdates = Array.from(new Array(yDocs.length).keys())
                    .filter(i => i !== idx)
                    .map(i => Y.encodeStateAsUpdate(yDocs[i], Y.encodeStateVector(yDocs[idx])))
                
                // try to apply again
                // if successful, simply continue
                // if still unsuccessful, resolve conflicts, calculate resolving transaction
                newUpdates.forEach(up => Y.applyUpdate(yDocs[idx], up))
                const waitingHelped = isValid(graphs[idx])
                const data = makeValid(graphs[idx])
                return [{
                    syncid: id,
                    copyTime: copyTime,
                    hadConflicts: true,
                    waitingHelped: waitingHelped,
                    randomTime: sleepDur,
                    syncClientCount: yDocs.length,
                    maxSleep: maxSleepDur
                }, data]
            }
            // the graph is valid and up to date
            else {
                console.log('updates were applied without conflict')
                updates.forEach(up => Y.applyUpdate(yDocs[idx], up))
                return [{
                    syncid: id,
                    copyTime: copyTime,
                    hadConflicts: false,
                    syncClientCount: yDocs.length,
                    maxSleep: maxSleepDur
                }, undefined]
            }
        })
    );
}


type ThreadState<T, G extends object> = {
    state: 'sleeping'
    copyTime: number
    copiedGraph: T
    rndSleep: number,
    updates: Uint8Array<ArrayBufferLike>[]
} | {
    state: 'finished'
    finishedTime: number
    data: [UpdateStormHeaders, undefined | G]
}

function max(a: number, b: number) {
    return a > b ? a : b
}

export async function syncPUSParSim<T, G extends object>(
    graphs: T[], 
    yDocs: Y.Doc[], 
    rnd: (idx: number) => number,
    makeGraph: (copiedDoc: Y.Doc) => T,
    isValid: (graph: T) => boolean,
    makeValid: (graph: T) => G,
    maxSleepDur: number,
    networkDelay: number = 0): Promise<[UpdateStormHeaders, undefined | G][]> {

    const id = randomUUID().substring(0, 7)
    const initTime = performance.now()

    const states = graphs.map<ThreadState<T, G>>((graph, idx) => {
        // from here, the graph might be invalid, thus operate on a copy
        const firstCopyStart = performance.now()
        const copy = new Y.Doc()
        Y.applyUpdate(copy, Y.encodeStateAsUpdate(yDocs[idx]))
        const copyTime = performance.now() - firstCopyStart

        
        const updates = Array.from(new Array(yDocs.length).keys())
            .filter(i => i !== idx)
            .map(i => Y.encodeStateAsUpdate(yDocs[i], Y.encodeStateVector(yDocs[idx])))

        for (const update of updates) {
            Y.applyUpdate(copy, update)
        }
        const copiedGraph = makeGraph(copy)

        if (isValid(copiedGraph)) {
            updates.forEach(up => Y.applyUpdate(yDocs[idx], up))
            return {
                state: 'finished',
                finishedTime: initTime,
                data: [{
                    copyTime,
                    hadConflicts: false,
                    maxSleep: maxSleepDur,
                    syncClientCount: graphs.length,
                    syncid: id
                }, undefined]
            }
        }
        else {
            return {
                state: 'sleeping',
                copiedGraph,
                copyTime,
                rndSleep: rnd(idx) * maxSleepDur,
                updates
            }
        }
    })

    const nextInit = performance.now()

    while (states.some(x => x.state === 'sleeping')) {
        const now = performance.now()
        const statesToDo = states.map<[ThreadState<T, G>, number]>((v, i) => [v, i]).filter(
            (x): x is [ThreadState<T, G> & { state: 'sleeping' }, number] => 
                x[0].state === 'sleeping' && x[0].rndSleep + nextInit < now
        )

        for (const [state, idx] of statesToDo) {
           

            // apply missing updates (some might have been applied, other updates might have arrived)
            // w.r.t. network delay
            const receivedFinishedStates =
                Array.from(new Array(states.length).keys())
                .map<[ThreadState<T, G>, number]>(i => [states[i], i])
                .filter((otherstate): otherstate is [ThreadState<T, G> & { state: 'finished'}, number] => 
                    otherstate[1] !== idx && 
                    otherstate[0].state === 'finished' && 
                    otherstate[0].data[0].hadConflicts &&
                    !otherstate[0].data[0].waitingHelped &&
                    max(otherstate[0].finishedTime, nextInit) + networkDelay < state.rndSleep + nextInit
                )

            if (receivedFinishedStates.length === 0) {
                state.updates.forEach(up => Y.applyUpdate(yDocs[idx], up))
                // assert(!isValid(graphs[idx]), 'graph is valid?')
            }
            else {
                receivedFinishedStates
                    .forEach(state => Y.applyUpdate(yDocs[idx], Y.encodeStateAsUpdate(yDocs[state[1]], Y.encodeStateVector(yDocs[idx]))))
            }

            const waitingHelped = isValid(graphs[idx])
            assert(receivedFinishedStates.length > 0 || !waitingHelped, 'Waiting can only help with updates')
            const data = waitingHelped ? undefined : makeValid(graphs[idx])
            states[idx] = {
                state: 'finished',
                data: [{
                    syncid: id,
                    copyTime: state.copyTime,
                    hadConflicts: true,
                    waitingHelped: waitingHelped,
                    randomTime: state.rndSleep,
                    syncClientCount: yDocs.length,
                    maxSleep: maxSleepDur
                }, data],
                finishedTime: nextInit + state.rndSleep
            }
        }

        // await new Promise(resolve => setTimeout(resolve, 1))
    }

    const retData = 
        states
        .filter(x => x.state === 'finished')
        .map(x => x.data)

    // assert(retData.length === yDocs.length, 'every client has finished')
    
    // if (retData.some(d => d[0].hadConflicts)) {
    //     assert(retData.some(d => d[0].hadConflicts && !d[0].waitingHelped), 'waiting must be false for at least one')
    // }
    return retData
}