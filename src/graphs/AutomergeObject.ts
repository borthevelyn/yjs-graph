import * as automerge from '@automerge/automerge';
import { EventEmitter } from './../Types';

export abstract class AutomergeObject<T> {
    private _doc: automerge.next.Doc<T>;
    private eventEmitter: EventEmitter | undefined;
    constructor(doc: automerge.next.Doc<T>, eventEmitter?: EventEmitter) {
        this._doc = doc;
        this.eventEmitter = eventEmitter;
    }
    observe(lambda: () => void) {
        this.eventEmitter?.addListener(lambda);
    }
    static sync<T>(first: AutomergeObject<T>, second: AutomergeObject<T>) {
        first._doc = automerge.merge(first._doc, second._doc);
        second._doc = automerge.merge(second._doc, first._doc);
        first.eventEmitter?.fire();
        second.eventEmitter?.fire();
    }
    static syncFirstToSecond<T>(first: AutomergeObject<T>, second: AutomergeObject<T>) {
        second._doc = automerge.merge(second._doc, first._doc);
        second.eventEmitter?.fire();
    }
    syncThisInto(other: AutomergeObject<T>) {
        other._doc = automerge.merge(other._doc, this._doc);
        other.eventEmitter?.fire();
    }
    protected changeDoc(lambda: automerge.ChangeFn<T>) {
        this._doc = automerge.change(this._doc, lambda);
        this.eventEmitter?.fire();
    }
    protected fireEventEmitter() {
        this.eventEmitter?.fire();
    }
    protected get doc() {
        return this._doc;
    }
}