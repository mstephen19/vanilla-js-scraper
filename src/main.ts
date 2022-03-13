import Apify, { RequestOptions } from 'apify';
import { JSDOM } from 'jsdom';
import { VM } from 'vm2';

import { Schema, PageFunction, Hooks, PageFunctionContext } from './types';

const vm2 = new VM();

const { log, enqueueLinks } = Apify.utils;

Apify.main(async () => {
    const {
        requests,
        pageFunction: stringFunction,
        preNavigationHooks: stringPreNav = '[]',
        postNavigationHooks: stringPostNav = '[]',
        linkSelector,
        pseudoUrls,
        proxy,
    } = (await Apify.getInput()) as Schema;

    let vmPageFunction: any;
    let preNavigationHooks: Hooks;
    let postNavigationHooks: Hooks;

    try {
        vmPageFunction = vm2.run(`() => ${stringFunction}`);
        preNavigationHooks = vm2.run(stringPreNav) as Hooks;
        postNavigationHooks = vm2.run(stringPostNav) as Hooks;
    } catch (err) {
        throw new Error(`Failed to evaluate code: ${err}`);
    }

    const pageFunction = vmPageFunction() as PageFunction;

    const requestList = await Apify.openRequestList('start-urls', requests);
    const requestQueue = await Apify.openRequestQueue();
    const proxyConfiguration = await Apify.createProxyConfiguration({ ...proxy });

    const crawler = new Apify.CheerioCrawler({
        requestList,
        requestQueue,
        proxyConfiguration,
        preNavigationHooks: [...preNavigationHooks],
        handlePageFunction: async ({ $, body, request, response, crawler: crawlerParam, json }) => {
            const { requestQueue: crawlerRq } = crawlerParam;
            const { userData } = request;

            const { window } = new JSDOM(body, { url: request.url, contentType: response.headers['content-type'] || '', storageQuota: 1000 });

            const enqueueRequest = async (req: string | RequestOptions) => {
                if (typeof request === 'string') {
                    return crawlerRq.addRequest({ url: req as string });
                }
                return crawlerRq.addRequest(req as RequestOptions);
            };

            let result: Record<string, unknown>;

            try {
                const context: PageFunctionContext = {
                    window,
                    document: window.document,
                    crawler: crawlerParam,
                    enqueueRequest,
                    request,
                    userData,
                    json,
                    response,
                };

                result = await pageFunction(context);

                if (!result) throw new Error('Must return an object from the pageFunction!');

                if (pseudoUrls.length || linkSelector) {
                    await enqueueLinks({
                        $,
                        requestQueue,
                        selector: linkSelector,
                        pseudoUrls,
                        baseUrl: request.url,
                    });
                }
            } catch (err) {
                log.error(`pageFunction failed with error: ${err}`);
            }

            return Apify.pushData({ page: request.url, ...result });
        },
        postNavigationHooks: [...postNavigationHooks],
    });

    log.info('Starting the crawl...');
    await crawler.run();
    log.info('Crawl finished.');
});
