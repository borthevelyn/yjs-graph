import * as Y from 'yjs'; 
import { EventEmitter } from 'events';

export class YSet<T> extends EventEmitter {
    yArray: Y.Array<T>;
    doc: Y.Doc;
    set: Set<T>;

    constructor(yArray: Y.Array<T>) {
        super();
        this.yArray = yArray;
        if (yArray.doc === null) {
            throw new Error("yArray.doc is null");
        }
        this.doc = yArray.doc;
        this.set = new Set();

        const arr = yArray.toArray();

        this.doc.transact(() => {        
            for (let i = arr.length - 1; i >= 0; i--) {
                this.set.add(arr[i]);
            }
        });

        this.yArray.observe((event: Y.YArrayEvent<T>) => {
            const changes: Map<string, 'add'| 'remove'> = new Map();

            event.changes.deleted.forEach((deletedItem) => {
                deletedItem.content.getContent().forEach((c) => {
                    if (this.set.has(c)) {
                        this.set.delete(c);
                        changes.set(c, 'remove');
                    }
                });
            });

            event.changes.added.forEach((addedItem) => {
                addedItem.content.getContent().forEach((c) => {
                    if (!this.set.has(c)) {
                        this.set.add(c);
                        changes.set(c, 'add');
                    }
                });
            });

            if (changes.size > 0) 
                this.emit('change', changes);
            
        });
    }

    public add(val: any) {
        if (this.set.has(val)) 
            return

        this.doc.transact(() => {
            this.yArray.push([val]);
        });    
    }

    public delete(val: any) {
        if (!this.set.has(val)) 
            return

        this.doc.transact(() => {
            for (let i = this.yArray.length - 1; i >= 0; i--) {
                if (this.yArray.get(i) === val) {
                    this.yArray.delete(i);
                }
            }
        }
        );
    }

    has (val: any) {
        return this.set.has(val);
    }

    get size(): number {
        return this.set.size;
    }

    keys(): SetIterator<T> {
        return this.set.keys();
    }


}