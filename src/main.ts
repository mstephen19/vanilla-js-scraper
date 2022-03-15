import Apify, { Dataset, RequestOptions } from 'apify';
import { JSDOM } from 'jsdom';
import { VM } from 'vm2';

import { Schema, PageFunction, Hooks, PageFunctionContext } from './types';
import KVStore from './KVStore';

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
        debug,
        datasetName,
        keyValueStoreName,
        maxRequestRetries,
        ignoreSslErrors,
        additionalMimeTypes,
        maxConcurrency,
        pageLoadTimeoutSecs,
        pageFunctionTimeoutSecs,
        customData,
    } = (await Apify.getInput()) as Schema;

    if (debug) log.setLevel(log.LEVELS.DEBUG);

    let dataset: Dataset;

    if (datasetName) dataset = await Apify.openDataset(datasetName);

    const kvStore = new KVStore(keyValueStoreName);
    await kvStore.initialize();

    let vmPageFunction;
    let preNavigationHooks: Hooks;
    let postNavigationHooks: Hooks;

    try {
        log.debug('Evaluating provided code...');
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
        maxRequestRetries,
        ignoreSslErrors,
        additionalMimeTypes,
        maxConcurrency,
        requestTimeoutSecs: pageLoadTimeoutSecs,
        handlePageTimeoutSecs: pageFunctionTimeoutSecs,
        preNavigationHooks: [...preNavigationHooks],
        handlePageFunction: async ({ $, body, request, response, crawler: crawlerParam, json }) => {
            log.debug(`Running request for ${request.url}`);
            const { requestQueue: crawlerRq } = crawlerParam;
            const { userData } = request;

            const { window } = new JSDOM(body, { url: request.url, contentType: response.headers['content-type'] || '', storageQuota: 1000 });

            const enqueueRequest = async (req: string | RequestOptions) => {
                if (typeof request === 'string') {
                    return crawlerRq.addRequest({ url: req as string });
                }
                return crawlerRq.addRequest(req as RequestOptions);
            };

            let result: Record<string, unknown> = null;

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
                    kvStore,
                    customData,
                };

                log.debug('Running custom pageFunction...');
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

            if (dataset) {
                log.debug(`Pushing data to the dataset with name ${datasetName}...`);
                return dataset.pushData({ page: request.url, ...result });
            }
            log.debug('Pushing data to the default dataset...');
            return Apify.pushData({ page: request.url, ...result });
        },
        postNavigationHooks: [...postNavigationHooks],
    });

    log.info('Starting the crawl...');
    await crawler.run();
    log.info('Crawl finished.');
});
