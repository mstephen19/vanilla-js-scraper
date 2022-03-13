import { Hook, ProxyConfigurationOptions, CheerioCrawler, QueueOperationInfo, RequestOptions, Request } from 'apify';
import { DOMWindow } from 'jsdom';

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
}
