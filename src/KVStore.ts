import Apify, { KeyValueStore } from 'apify';

class KVStore {
    name: string;

    store: KeyValueStore;

    constructor(name?: string) {
        this.name = name;
    }

    async initialize(): Promise<void> {
        if (this.name) this.store = await Apify.openKeyValueStore(this.name);
    }

    set(key: string, value: unknown): Promise<void> {
        if (this.store) return this.store.setValue(key, value);
        return Apify.setValue(key, value);
    }

    get(key: string): unknown {
        if (this.store) return this.store.getValue(key);
        return Apify.getValue(key);
    }
}

export default KVStore;
