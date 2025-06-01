import { next as automerge } from "@automerge/automerge";
import { EventEmitter } from './../Types';

type BenchmarkData = {
    time: number
}
export abstract class AutomergeObject<T> {
    private _doc: automerge.Doc<T>;
    private eventEmitter: EventEmitter | undefined;
    constructor(doc: automerge.Doc<T>, eventEmitter?: EventEmitter) {
        this._doc = doc;
        this.eventEmitter = eventEmitter;
    }
    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda);
    }
    static sync<T>(first: AutomergeObject<T>, second: AutomergeObject<T>) {
        first._doc = automerge.merge(first._doc, second._doc);
        second._doc = automerge.merge(second._doc, automerge.clone(first._doc));
        first.resolveConflicts();
        second.resolveConflicts();
        first.eventEmitter?.fire();
        second.eventEmitter?.fire();
        
    }
    static syncDefault<T>(autoObjs: AutomergeObject<T>[]): BenchmarkData[] {
        if (autoObjs.length === 0)
            return []

        let synced = autoObjs[0]._doc
        for (let i = 1; i < autoObjs.length; i++)
            synced = automerge.merge(synced, autoObjs[i]._doc)

        for (let i = 0; i < autoObjs.length; i++)
            autoObjs[i]._doc = automerge.clone(synced)

        return autoObjs.map<BenchmarkData>(x => {
            const start = performance.now()
            x.resolveConflicts()
            return { time: performance.now() - start }
        })
    }
    static syncFirstToSecond<T>(first: AutomergeObject<T>, second: AutomergeObject<T>) {
        second._doc = automerge.merge(second._doc, automerge.clone(first._doc));
        second.resolveConflicts();
        second.eventEmitter?.fire();
    }
    syncThisInto(other: AutomergeObject<T>) {
        other._doc = automerge.merge(other._doc, automerge.clone(this._doc));
        other.resolveConflicts();
        other.eventEmitter?.fire();
    }
    protected changeDoc(lambda: automerge.ChangeFn<T>) {
        try {
            this._doc = automerge.change(this._doc, lambda);
            this.eventEmitter?.fire();
        } catch (e) {
            console.warn('test', e)
        }


    }
    protected fireEventEmitter() {
        this.eventEmitter?.fire();
    }
    protected get doc() {
        return this._doc;
    }

    protected resolveConflicts() {

    }
}