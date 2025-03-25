import * as Y from 'yjs';
import { YSet } from '../ySet';

describe('YSet', () => {
    let doc1: Y.Doc;
    let doc2: Y.Doc;
    let ySet1: YSet<string>;
    let ySet2: YSet<string>;

    function syncConcurrently(yDocs: Y.Doc[]) {
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
    }

    beforeEach(() => {
        doc1 = new Y.Doc();
        doc2 = new Y.Doc();
        ySet1 = new YSet(doc1.getArray('array'));
        ySet2 = new YSet(doc2.getArray('array'));
    });
    it('should add an element to the set', () => {
        ySet1.add('element1');
        expect(ySet1.has('element1')).toBe(true);
    });

    it('should remove an element from the set', () => {
        ySet1.add('element1');
        ySet1.delete('element1');
        expect(ySet1.has('element1')).toBe(false);
    });

    it('should check if the set has an element', () => {
        ySet1.add('element1');
        expect(ySet1.has('element1')).toBe(true);
        expect(ySet1.has('element2')).toBe(false);
    });

    it('should return the correct size of the set', () => {
        ySet1.add('element1');
        ySet1.add('element2');
        expect(ySet1.size).toBe(2);
    });

    it('should add two elements concurrently', () => {
        ySet1.add('element1');
        ySet2.add('element2');
        syncConcurrently([doc1, doc2]);
        expect(ySet1.size).toBe(2);
        expect(ySet2.size).toBe(2);
        expect(ySet1.has('element1')).toBe(true);
        expect(ySet1.has('element2')).toBe(true);
        expect(ySet2.has('element1')).toBe(true);
        expect(ySet2.has('element2')).toBe(true);
    });

    it('add and remove same element concurrently', () => {
        ySet1.add('element1');
        ySet2.delete('element1');
        syncConcurrently([doc1, doc2]);
        expect(ySet1.size).toBe(1);
        expect(ySet2.size).toBe(1);
        expect(ySet1.has('element1')).toBe(true);
        expect(ySet2.has('element1')).toBe(true);
    });

    it('add and remove same element concurrently, second variant', () => {
        ySet1.add('element1');
        syncConcurrently([doc1, doc2]);
        ySet1.add('element1');
        ySet2.delete('element1');
        syncConcurrently([doc1, doc2]);
        expect(ySet1.size).toBe(0);
        expect(ySet2.size).toBe(0);
    });
});