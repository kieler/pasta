/**
 * Helper Set for STPANode and STPAEdge based on their IDs.
 * Two objects are considered equal if they have the same id (string).
 */
export class IdSet<T extends { id: string }> implements Set<T> {
    private map: Map<string, T> = new Map();

    constructor(iterable?: Iterable<T>) {
        if (iterable) {
            for (const item of iterable) {
                this.add(item);
            }
        }
    }

    add(value: T): this {
        this.map.set(value.id, value);
        return this;
    }

    clear(): void {
        this.map.clear();
    }

    delete(value: T): boolean {
        return this.map.delete(value.id);
    }

    has(value: T): boolean {
        return this.map.has(value.id);
    }

    get size(): number {
        return this.map.size;
    }

    forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
        for (const value of this.map.values()) {
            callbackfn.call(thisArg, value, value, this);
        }
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.map.values();
    }

    entries(): IterableIterator<[T, T]> {
        return Array.from(this.map.values()).map(v => [v, v] as [T, T])[Symbol.iterator]();
    }

    keys(): IterableIterator<T> {
        return this.map.values();
    }

    values(): IterableIterator<T> {
        return this.map.values();
    }

    get [Symbol.toStringTag](): string {
        return 'IdSet';
    }
}

/**
 * Helper Map for STPANode, keyed by node id.
 * Two keys are considered the same if they have the same id (not object reference).
 */
export class IdMap<K extends { id: string }, V> implements Map<K, V> {
    private map: Map<string, { key: K, value: V }> = new Map();

    constructor(entries?: readonly (readonly [K, V])[] | null) {
        if (entries) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
        }
    }

    clear(): void {
        this.map.clear();
    }

    delete(key: K): boolean {
        return this.map.delete(key.id);
    }

    get(key: K): V | undefined {
        const entry = this.map.get(key.id);
        return entry && entry.value;
    }

    has(key: K): boolean {
        return this.map.has(key.id);
    }

    set(key: K, value: V): this {
        this.map.set(key.id, { key, value });
        return this;
    }

    get size(): number {
        return this.map.size;
    }

    entries(): IterableIterator<[K, V]> {
        return Array.from(this.map.values()).map(({ key, value }) => [key, value] as [K, V])[Symbol.iterator]();
    }

    keys(): IterableIterator<K> {
        return Array.from(this.map.values()).map(({ key }) => key)[Symbol.iterator]();
    }

    values(): IterableIterator<V> {
        return Array.from(this.map.values()).map(({ value }) => value)[Symbol.iterator]();
    }

    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
        for (const { key, value } of this.map.values()) {
            callbackfn.call(thisArg, value, key, this);
        }
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    get [Symbol.toStringTag](): string {
        return 'IdMap';
    }
}


