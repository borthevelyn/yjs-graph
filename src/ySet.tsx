import * as Y from 'yjs'; 
import { EventEmitter } from 'events';

// Y.Map<YSet<T>> is ideal type
// not possible because of synchronization issue
// -> we store Y.Map<Y.Array<T>>
// for better usability and better runtime performance, sets are more desirable than arrays
// -> thus use YSet<T>
// Y.Map<YSet<T>> cannot really exist in a useful way
// -> to achieve mentioned benefits, it's required to use a different container for YSet<T>
// -> use ReadonlyMap<string, YSet<T>>

// disadvantages: 
// - duplicate data (not ideal both for performance and development)
//   - manual synchronization required (via observe)
//   - initialization (YSet constructor)
// advantages:
// - better runtime performance (via YSet.has)
// - possible to express the idea of a set

// -----------------------------------------------------------

export function wrapYMap<YJsT, DesiredT>(map: Y.Map<YJsT>, transformer: (yjsVal: YJsT) => DesiredT, updateTransformer: (yjsVal: YJsT, key:string, oldVal: DesiredT) => DesiredT): ReadonlyMap<string, DesiredT> {
    const result = new Map([...map.entries()].map(([k, v]) => [k, transformer(v)]))

    map.observe((event, transaction) => {
        for (const [key, { action, oldValue }] of event.changes.keys) {
            switch (action) {
                case 'add': 
                    result.set(key, transformer(map.get(key)!))
                    break
                case 'delete':
                    result.delete(key)
                    break
                case 'update':
                    result.set(key, updateTransformer(map.get(key)!, key, oldValue))
            }
        }
    })
    
    return result
}


export class YSet<T> extends EventEmitter {
    yArray: Y.Array<T>;
    backing: T[];
    doc: Y.Doc;
    set: Set<T>;

    constructor(yArray: Y.Array<T>) {
        super();
        this.yArray = yArray;
        this.backing = yArray.toArray();
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

            if (changes.size > 0)  {
                this.backing = this.yArray.toArray();
                this.emit('change', changes);
            }
            
        });
    }

    public add(val: T) {
        if (this.set.has(val)) 
            return

        this.doc.transact(() => {
            this.yArray.push([val]);
        });
    }

    public delete(val: T) {
        if (!this.set.has(val)) 
            return

        this.doc.transact(() => {
            const indices = new Set<number>();
            this.backing.forEach((v, idx) => {
                if (v === val) {
                    indices.add(idx);
                }
            })

            indices.forEach((idx) => {
                this.yArray.delete(idx);
            });
        });
        this.backing = this.yArray.toArray();
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