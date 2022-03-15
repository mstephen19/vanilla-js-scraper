import { Hook, ProxyConfigurationOptions, CheerioCrawler, QueueOperationInfo, RequestOptions, Request } from 'apify';
import { DOMWindow } from 'jsdom';
import KVStore from './KVStore';

export type PageFunction = <T extends Record<string, unknown>>(context: PageFunctionContext) => Promise<T>;

export type Hooks = Hook[];

export interface Schema {
    requests: RequestOptions[];
    pageFunction: string;
    preNavigationHooks?: string;
    postNavigationHooks?: string;
    linkSelector?: string;
    pseudoUrls?: string[];
    proxy?: ProxyConfigurationOptions;
    debug: boolean;
    datasetName?: string;
    keyValueStoreName?: string;
    maxRequestRetries: number;
    ignoreSslErrors: boolean;
    additionalMimeTypes: string[];
    maxConcurrency: number;
    pageLoadTimeoutSecs: number;
    pageFunctionTimeoutSecs: number;
    customData: Record<string, unknown>;
}

export interface PageFunctionContext {
    window: DOMWindow;
    document: Document;
    crawler: CheerioCrawler;
    enqueueRequest: (req: string | RequestOptions) => Promise<QueueOperationInfo>;
    request: Request;
    response: unknown;
    userData: Record<string, unknown>;
    json: Record<string, unknown> | undefined;
    kvStore: KVStore;
    customData: Record<string, unknown>
    body: string | Buffer
}
