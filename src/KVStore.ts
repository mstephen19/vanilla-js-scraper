import Apify, { KeyValueStore } from 'apify';

class KVStore {
    name: string;

    store: KeyValueStore;

    constructor(name?: string) {
        this.name = name;
    }

    async initialize(): Promise<void> {
        if (this.name) this.store = await Apify.openKeyValueStore(this.name);
        if (!this.name) this.store = await Apify.openKeyValueStore('default');
    }

    setValue(key: string, value: unknown): Promise<void> {
        return this.store.setValue(key, value);
    }

    getValue(key: string): unknown {
        return this.store.getValue(key);
    }
}

export default KVStore;
