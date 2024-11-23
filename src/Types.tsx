import * as Y from 'yjs'; 
import { EdgeBase, NodeBase } from '@xyflow/system';

export interface NamedYMap<TypeMap extends object> extends Omit<Y.Map<TypeMap[keyof TypeMap]>, 'set' | 'get' | 'delete'> {
    get<Key extends keyof TypeMap>(x: Key): TypeMap[Key] | undefined
    set<Key extends keyof TypeMap>(key: Key, value: TypeMap[Key]): TypeMap[Key]
    // this method is theoretically supported by a ymap, but semantically for this type wrong
    delete(key: never): void
}
export interface ObjectYMap<TypeMap extends object> extends Omit<Y.Map<TypeMap[keyof TypeMap]>, 'set' | 'get' | 'delete'> {
    get<Key extends keyof TypeMap>(key: Key): TypeMap[Key]
    set<Key extends keyof TypeMap>(key: Key, value: TypeMap[Key]): TypeMap[Key]
    // this method is theoretically supported by a ymap, but semantically for this type wrong
    delete(key: never): void
}

export type id = string;
export type FlowNode = NodeBase<{label: string, setLabel: (nodeId: string, label: string) => void}>
export type FlowEdge = EdgeBase<{label: string, setLabel: (nodeId: string, label: string) => void}>;


export type GraphApi =  {
    addNode: (id: string, label: string, position: { x: number; y: number }) => void, 
    addEdge: (source: string, target: string, label: string) => void, 
    removeNode: (id: string) => void, 
    removeEdge: (source: string, target: string) => void, 
    changeNodePosition: (id: string, position: { x: number; y: number }) => void, 
    changeNodeDimension: (id: string, dimensions: { width: number; height: number }) => void, 
    changeNodeSelection: (id: string, selected: boolean) => void, 
    changeEdgeSelection: (id: string, selected: boolean) => void, 
    nodesAsFlow: () => FlowNode[], 
    edgesAsFlow: () => FlowEdge[]
}

export interface YSet extends Omit<Y.Map<undefined>, 'set' | 'get' | 'entries' | 'values'> {
    /*
    It seems that the Y.Map type handles `undefined` as a value for the second
    argument fine. That enables the consumer to omit the argument in the type specification
    and `set` now is a kind of `add`. However, this seems to go against the design
    principles of the `set` function and could potentially lead to errors.
    */
    set(value: id): undefined
}
export function makeYSet(): YSet {
    return new Y.Map<undefined>() as unknown as YSet;
}


export class EventEmitter {
    private lambdas: (() => void)[];

    constructor() {
        this.lambdas = [];
    }

    addListener(lambda: () => void) {
        this.lambdas.push(lambda);
    }

    fire() {
        for (const lambda of this.lambdas)
            lambda();
    }
}