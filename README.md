# Vanilla JS Scraper

Vanilla JS Scraper is a ready-made solution for crawling websites using plain HTTP requests with support for familiar JavaScript syntax. It runs on top of [Apify CheerioCrawler](https://sdk.apify.com/docs/api/cheerio-crawler) and utilizes the [JSDOM](https://github.com/jsdom/jsdom) package to retrieve the HTML pages, parse them, and extract any data from them. Fast.

Vanilla JS Scraper is ideal for scraping web pages that do not rely on client-side JavaScript to serve their content, and can be up to 20 times faster than using a full-browser solution such as Puppeteer.

If you're unfamiliar with web scraping or web development in general, you might prefer to start with the [**Web scraping tutorial**](https://apify.com/docs/scraping/web-scraper-tutorial) from the Apify documentation.

## Table of Contents

<!-- toc -->

-   [Usage](#usage)
-   [Content types](#content-types)
-   [Limitations](#limitations)
-   [Input configuration](#input-configuration)
    -   [Start URLs](#start-urls)
    -   [Link selector](#link-selector)
    -   [Pseudo-URLs](#pseudo-urls)
    -   [Page function](#page-function)
        -   **[`window: Object`](#window-object)**
        -   **[`body: String | Buffer`](#body-string-buffer)**
        -   **[`document: Object`](#document-object)**
        -   **[`crawler: Object`](#crawler-object)**
        -   **[`userData: Object`](#userdata-object)**
        -   **[`customData: Object`](#customdata-object)**
        -   **[`enqueueRequest(request, [options]): AsyncFunction`](#enqueuerequest-request-options-asyncfunction)**
        -   **[`kvStore: Object`](#kvstore-object)**
        -   **[`json: Object`](#json-object)**
        -   **[`request: Object`](#request-object)**
        -   **[`response: Object`](#response-object)**
-   [Proxy configuration](#proxy-configuration)
-   [Results](#results)
-   [Additional resources](#additional-resources)
-   [Upgrading](#upgrading)

<!-- tocstop -->

## Usage

To get started with Vanilla JS Scraper, you only need two things. First, tell the scraper which web pages it should load. Second, tell it how to extract data from each page.

The scraper starts by loading the pages specified in the [**Start URLs**](#start-urls) field. You can make the scraper follow page links on the fly by setting a [**Link selector**](#link-selector) and/or [**Pseudo URLs**](#pseudo-urls) to tell the scraper which links it should add to the crawling queue. This is useful for the recursive crawling of entire websites, e.g. to find all products in an online store.

To tell the scraper how to extract data from web pages, you need to provide a [**Page function**](#page-function). This is JavaScript code that is executed for every web page loaded. Since the scraper does not use the full web browser, writing the **Page function** is equivalent to writing server-side Node.js code.

In summary, Vanilla JS Scraper works as follows:

1. Adds each [Start URL](#start-urls) to the crawling queue.
2. Fetches the first URL from the queue and constructs a DOM from the fetched HTML string.
3. Executes the [**Page function**](#page-function) on the loaded page and saves its results.
4. Optionally, finds all links from the page using the [**Link selector**](#link-selector). If a link matches any of the [**Pseudo URLs**](#pseudo-urls) and has not yet been visited, adds it to the queue.
5. If there are more items in the queue, repeats step 2, otherwise finishes.

## Content Types

By default, Vanilla JS Scraper only processes web pages with the `text/html` and `application/xhtml+xml` MIME content types (as reported by the `Content-Type` HTTP header),
and skips pages with other content types. If you want the crawler to process other content types, use the **Additional MIME types** (`additionalMimeTypes`) input option.

Note that while the default `Accept` HTTP header will allow any content type to be received, HTML and XML are preferred over JSON and other types. Thus, if you're allowing additional MIME types and you're still receiving invalid responses, be sure to override the `Accept` HTTP header setting in the requests from the scraper, either in [**Start URLs**](#start-urls), [**Pseudo URLs**](#pseudo-urls) or in the **Pre-Navigation Hooks**.

The web pages with various content types are parsed differently and thus the `context` parameter of the [**Page function**](#page-function) will have different values:

| **Content types**                                         | [`context.body`](#body-string-buffer) | [`context.document`](#document-object) | [`context.json`](#json-object) |
| --------------------------------------------------------- | ------------------------------------- | -------------------------------------- | ------------------------------ |
| `text/html`, `application/xhtml+xml` or `application/xml` | `String`                              | `Object`                               | `null`                         |
| `application/json`                                        | `String`                              | `Object`                               | `Object`                       |
| Other                                                     | `Buffer`                              | `Object`                               | `null`                         |

## Limitations

The actor does not employ a full-featured web browser such as Chromium or Firefox, so it will not be sufficient for web pages that render their content dynamically using client-side JavaScript. To scrape such sites, you might prefer to use **[Web Scraper](https://apify.com/apify/web-scraper)** (`apify/web-scraper`), which loads pages in a full browser and renders dynamic content.

Since Vanilla JS Scraper's **Page function** is executed in the context of the server, it only supports server-side code running in Node.js. If you need to combine client-side and server-side libraries in Chromium using the [Puppeteer](https://github.com/GoogleChrome/puppeteer/) library, you might prefer to use **[PuppeteerScraper](https://apify.com/apify/puppeteer-scraper)** (`apify/puppeteer-scraper`). For even more flexibility and control, you might develop a new actor from scratch in Node.js using the [Apify SDK](https://sdk.apify.com).

In the **[Page function](#page-function)**, **Pre-Navigation Hooks**, and **Post-Navigation Hooks**, you can only use NPM modules that are already installed in this actor. If you require other modules for your scraping, you'll need to develop a completely new actor. You can use the [`CheerioCrawler`](https://sdk.apify.com/docs/api/cheerio-crawler) class from Apify SDK to get most of the functionality of Vanilla JS Scraper out of the box.

## Input configuration

As input, the Vanilla JS Scraper actor accepts a number of configurations. These can be entered either manually in the user interface in [Apify Console](https://console.apify.com), or programmatically in a JSON object using the [Apify API](https://apify.com/docs/api/v2#/reference/actors/run-collection/run-actor). For a complete list of input fields and their types, please visit the [Input](https://apify.com/apify/vanilla-js-scraper?section=input-schema) tab.

### Start URLs

The **Start URLs** (`startUrls`) field represents the initial list of pages that the scraper will visit. You can either enter the URLs manually one by one, upload them in a CSV file, or [link URLs from a Google Sheet](https://help.apify.com/en/articles/2906022-scraping-a-list-of-urls-from-google-spreadsheet) document.Each URL must start with either a `http://` or `https://` protocol prefix.

The scraper supports adding new URLs to scrape on the fly, either using the [**Link selector**](#link-selector) and [**Pseudo-URLs**](#pseudo-urls) options or by calling `context.enqueueRequest()` inside the [**Page function**](#page-function).

Optionally, each URL can be associated with custom user data - a JSON object that can be referenced from your JavaScript code in the [**Page function**](#page-function) under `context.request.userData`. This is useful for determining which start URL is currently loaded, in order to perform some page-specific actions. For example, when crawling an online store, you might want to perform different actions on a page listing the products vs. a product detail page. For details, see the [**Web scraping tutorial**](https://apify.com/docs/scraping/tutorial/introduction#the-start-url) in the Apify documentation.

### Link selector

The **Link selector** (`linkSelector`) field contains a CSS selector that is used to find links to other web pages, i.e. `<a>` elements with the `href` attribute. On every page loaded, the scraper looks for all links matching the **Link selector**. It checks that the target URL matches one of the [**Pseudo-URLs**](#pseudo-urls), and if so then adds the URL to the request queue, to be loaded by the scraper later.

By default, new scrapers are created with the following selector that matches all links:

```
a[href]
```

If the **Link selector** is empty, page links are ignored, and the scraper only loads pages that were specified in the [**Start URLs**](#start-urls) input or that were manually added to the request queue by calling `context.enqueueRequest()` in the [**Page function**](#page-function).

### Pseudo-URLs

The **Pseudo-URLs** (`pseudoUrls`) field specifies what kind of URLs found by [**Link selector**](#link-selector) should be added to the request queue.

A pseudo-URL is simply a URL with special directives enclosed in `[]` brackets. Currently, the only supported directive is `[regexp]`, which defines a JavaScript-style regular expression to match against the URL.

For example, the pseudo-URL `http://www.example.com/pages/[(\w|-)*]` will match all of the following URLs:

-   `http://www.example.com/pages/`
-   `http://www.example.com/pages/my-awesome-page`
-   `http://www.example.com/pages/something`

If either `[` or `]` is part of the normal query string, it must be encoded as `[\x5B]` or `[\x5D]`, respectively. For example, the following pseudo-URL:

```
http://www.example.com/search?do[\x5B]load[\x5D]=1
```

will match the URL:

```
http://www.example.com/search?do[load]=1
```

Optionally, each pseudo-URL can be associated with user data that can be referenced from your [**Page function**](#page-function) using `context.request.userData` to determine what kind of page is currently loaded in the browser.

Note that you don't have to use the **Pseudo-URLs** setting at all because you can completely control which pages the scraper will access by calling `context.enqueuePage()` from your [**Page function**](#page-function).

### Page function

The **Page function** (`pageFunction`) field contains a single JavaScript function that enables the user to extract data from the web page, access its DOM, add new URLs to the request queue, and otherwise control Vanilla JS Scraper's operation.

Example:

```javascript
async function pageFunction(context) {
    const { $, request, log } = context;

    // The "$" property contains the Cheerio object which is useful
    // for querying DOM elements and extracting data from them.
    const pageTitle = $('title').first().text();

    // The "request" property contains various information about the web page loaded.
    const url = request.url;

    // Use "log" object to print information to actor log.
    log.info('Page scraped', { url, pageTitle });

    // Return an object with the data extracted from the page.
    // It will be stored to the resulting dataset.
    return {
        url,
        pageTitle,
    };
}
```

The code runs in [Node.js 12](https://nodejs.org/) and the function accepts a single argument, the `context` object, whose properties are listed below.

The return value of the page function is an object (or an array of objects) representing the data extracted from the web page. The return value must be stringify-able to JSON, i.e. it can only contain basic types and no circular references. If you prefer not to extract any data from the page and skip it in the clean results, simply return `null` or `undefined`.

The **Page function** supports the JavaScript ES6 syntax and is asynchronous, which means you can use the `await` keyword to wait for background operations to finish. To learn more about `async` functions,
visit the [Mozilla documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function).

**Properties of the `context` object:**

-   ##### **`$: Function`**

    A reference to the [Cheerio](https://cheerio.js.org/)'s function representing the root scope of the DOM
    of the current HTML page.

    This function is the starting point for traversing the DOM document and extracting data from it.
    Like with [jQuery](https://jquery.com/), it is the primary method for selecting elements in the document,
    but unlike jQuery it is built on top of the [`css-select`](https://www.npmjs.com/package/css-select) library,
    which implements most of the [`Sizzle`](https://github.com/jquery/sizzle/wiki) selectors.

    For more information, see the [Cheerio](https://cheerio.js.org/) documentation.

    Example:

    ```html
    <ul id="movies">
        <li class="fun-movie">Fun Movie</li>
        <li class="sad-movie">Sad Movie</li>
        <li class="horror-movie">Horror Movie</li>
    </ul>
    ```

    ```javascript
    $('.movies', '#fun-movie').text();
    //=> Fun Movie
    $('ul .sad-movie').attr('class');
    //=> sad-movie
    $('li[class=horror-movie]').html();
    //=> Horror Movie
    ```

-   ##### **`crawler: Object`**

    A reference to the `CheerioCrawler` object, see [Apify SDK docs](https://sdk.apify.com/docs/api/cheerio-crawler) for more information.

-   ##### **`body: String|Buffer`**

    The body from the target web page. If the web page is in HTML or XML format, the `body` will be a string that contains the HTML or XML content.
    In other cases, the `body` with be a [Buffer](https://nodejs.org/api/buffer.html).
    If you need to process the `body` as a string, you can use the information from `contentType` property to convert
    the binary data into a string.

    Example:

    ```javascript
    const stringBody = context.body.toString(context.contentType.encoding);
    ```

-   ##### **`cheerio: Object`**

    Reference to the [`Cheerio`](https://cheerio.js.org) module. Being the server-side version of the [jQuery](https://jquery.com) library, Cheerio features a very similar API with nearly identical selector implementation. This means DOM traversing, manipulation, querying, and data extraction are just as easy as with jQuery.

    This is equivalent to:

    ```javascript
    const cheerio = require('cheerio');
    ```

-   ##### **`contentType: Object`**

    The `Content-Type` HTTP header parsed into an object with 2 properties, `type` and `encoding`.

    Example:

    ```javascript
    // Content-Type: application/json; charset=utf-8
    const mimeType = contentType.type; // "application/json"
    const encoding = contentType.encoding; // "utf-8"
    ```

-   ##### **`customData: Object`**

    Contains the object provided in the **Custom data** (`customData`) input field, which is useful for passing dynamic parameters to your scraper using API.

-   ##### **`enqueueRequest(request, [options]): AsyncFunction`**

    Adds a new URL to the request queue, if it wasn't already there.

    The `request` parameter is an object containing details of the request, with properties such as `url`, `userData`, `headers` etc. For the full list of the supported properties, see the [`Request`](https://sdk.apify.com/docs/api/request) object's constructor in the Apify SDK documentation.

    The optional `options` parameter is an object with additional options. Currently, it only supports the `forefront` boolean flag. If `true`, the request is added to the beginning of the queue. By default, requests are added to the end.

    Example:

    ```javascript
    await context.enqueueRequest({ url: 'https://www.example.com' });
    await context.enqueueRequest({ url: 'https://www.example.com/first' }, { forefront: true });
    ```

-   ##### **`env: Object`**

    A map of all relevant values set by the Apify platform to the actor run via the `APIFY_` environment variable. For example, here you can find information such as actor run ID, timeouts, actor run memory, etc.
    For the full list of available values, see the [`Apify.getEnv()`](https://sdk.apify.com/docs/api/apify#getenv) function in the Apify SDK documentation.

    Example:

    ```javascript
    console.log(`Actor run ID: ${context.env.actorRunId}`);
    ```

-   ##### **`getValue(key): AsyncFunction`**

    Gets a value from the default key-value store associated with the actor run. The key-value store is useful for persisting named data records, such as state objects, files, etc. The function is very similar to the [`Apify.getValue()`](https://sdk.apify.com/docs/api/apify#getvalue) function in the Apify SDK documentation.

    To set the value, use the dual function `context.setValue(key, value)`.

    Example:

    ```javascript
    const value = await context.getValue('my-key');
    console.dir(value);
    ```

-   ##### **`globalStore: Object`**

    Represents an in-memory store that can be used to share data across page function invocations, e.g. state variables, API responses, or other data. The `globalStore` object has an interface similar to JavaScript's [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) object, with a few important differences:

    -   All `globalStore` functions are `async`; use `await` when calling them.
    -   Keys must be strings and values must be JSON stringify-able.
    -   The `forEach()` function is not supported.

    Note that stored data is not persisted. If the actor run is restarted or migrated to another worker server,
    the content of `globalStore` is reset. Therefore, never depend on a specific value to be present
    in the store.

    Example:

    ```javascript
    let movies = await context.globalStore.get('cached-movies');
    if (!movies) {
        movies = await fetch('http://example.com/movies.json');
        await context.globalStore.set('cached-movies', movies);
    }
    console.dir(movies);
    ```

-   ##### **`json: Object`**

    The parsed object from a JSON string if the response contains the content type `application/json`.

-   ##### **`log: Object`**

    An object containing logging functions, with the same interface as provided by the
    [`Apify.utils.log`](https://sdk.apify.com/docs/api/log) object in the Apify SDK. The log messages are written directly to the actor run log, which is useful for monitoring and debugging.
    Note that `log.debug()` only logs messages if the **Debug log** input setting is set.

    Example:

    ```javascript
    const log = context.log;
    log.debug('Debug message', { hello: 'world!' });
    log.info('Information message', { all: 'good' });
    log.warning('Warning message');
    log.error('Error message', { details: 'This is bad!' });
    try {
        throw new Error('Not good!');
    } catch (e) {
        log.exception(e, 'Exception occurred', { details: 'This is really bad!' });
    }
    ```

-   ##### **`saveSnapshot(): AsyncFunction`**

    Saves the full HTML of the current page to the key-value store
    associated with the actor run, under the `SNAPSHOT-BODY` key.
    This feature is useful when debugging your scraper.

    Note that each snapshot overwrites the previous one and the `saveSnapshot()` calls are throttled to at most one call in two seconds, in order to avoid excess consumption of resources and slowdown of the actor.

-   ##### **`setValue(key, data, options): AsyncFunction`**

    Sets a value to the default key-value store associated with the actor run. The key-value store is useful for persisting named data records, such as state objects, files, etc. The function is very similar to the [`Apify.setValue()`](https://sdk.apify.com/docs/api/apify#setvalue) function in the Apify SDK documentation.

    To get the value, use the dual function `context.getValue(key)`.

    Example:

    ```javascript
    await context.setValue('my-key', { hello: 'world' });
    ```

-   ##### **`skipLinks(): AsyncFunction`**

    Calling this function ensures that page links from the current page will not be added to the request queue, even if they match the [**Link selector**](#link-selector) and/or [**Pseudo-URLs**](#pseudo-urls) settings. This is useful to programmatically stop recursive crawling, e.g. if you know there are no more interesting links on the current page to follow.

-   ##### **`request: Object`**

    An object containing information about the currently loaded web page, such as the URL, number of retries, a unique key, etc. Its properties are equivalent to the [`Request`](https://sdk.apify.com/docs/api/request) object in the Apify SDK.

-   ##### **`response: Object`**

    An object containing information about the HTTP response from the web server. Currently, it only contains the `status` and `headers` properties. For example:

    ```javascript
    {
      // HTTP status code
      status: 200,

      // HTTP headers
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'date': 'Wed, 06 Nov 2019 16:01:53 GMT',
        'cache-control': 'no-cache',
        'content-encoding': 'gzip',
      }
    }
    ```

<!-- TODO: We're missing more detailed description for prepareRequestFunction, what is it good for?
Give some example, also better prefill -->

## Proxy configuration

The **Proxy configuration** (`proxyConfiguration`) option enables you to set
proxies that will be used by the scraper in order to prevent its detection by target web pages.
You can use both the [Apify Proxy](https://apify.com/proxy) and custom HTTP or SOCKS5 proxy servers.

The following table lists the available options of the proxy configuration setting:

<table class="table table-bordered table-condensed">
    <tbody>
    <tr>
        <th><b>None</b></td>
        <td>
            The scraper will not use any proxies.
            All web pages will be loaded directly from IP addresses of Apify servers running on Amazon Web Services.
        </td>
    </tr>
    <tr>
        <th><b>Apify&nbsp;Proxy&nbsp;(automatic)</b></td>
        <td>
            The scraper will load all web pages using the <a href="https://apify.com/proxy">Apify Proxy</a>
            in automatic mode. In this mode, the proxy uses all proxy groups that are available to the user. For each new web page it automatically selects the proxy that hasn't been used in the longest time for the specific hostname in order to reduce the chance of detection by the web page.
            You can view the list of available proxy groups on the <a href="https://console.apify.com/proxy" target="_blank" rel="noopener">Proxy</a> page in Apify Console.
        </td>
    </tr>
    <tr>
        <th><b>Apify&nbsp;Proxy&nbsp;(selected&nbsp;groups)</b></td>
        <td>
            The scraper will load all web pages using the <a href="https://apify.com/proxy">Apify Proxy</a>
            with specific groups of target proxy servers.
        </td>
    </tr>
    <tr>
        <th><b>Custom&nbsp;proxies</b></td>
        <td>
            <p>
            The scraper will use a custom list of proxy servers.
            The proxies must be specified in the <code>scheme://user:password@host:port</code> format.
            Multiple proxies should be separated by a space or new line. The URL scheme can be either <code>http</code> or <code>socks5</code>. User and password might be omitted, but the port must always be present.
            </p>
            <p>
                Example:
            </p>
            <pre><code class="language-none">http://bob:password@proxy1.example.com:8000
            http://bob:password@proxy2.example.com:8000</code></pre>
        </td>
    </tr>
    </tbody>
</table>

The proxy configuration can be set programmatically when calling the actor using the API
by setting the `proxyConfiguration` field.
It accepts a JSON object with the following structure:

```javascript
{
    // Indicates whether to use the Apify Proxy or not.
    "useApifyProxy": Boolean,

    // Array of Apify Proxy groups, only used if "useApifyProxy" is true.
    // If missing or null, the Apify Proxy will use automatic mode.
    "apifyProxyGroups": String[],

    // Array of custom proxy URLs, in "scheme://user:password@host:port" format.
    // If missing or null, custom proxies are not used.
    "proxyUrls": String[],
}
```

## Results

The scraping results returned by [**Page function**](#page-function) are stored in the default dataset associated with the actor run, from where you can export them to formats such as JSON, XML, CSV or Excel.
For each object returned by the [**Page function**](#page-function), Vanilla JS Scraper pushes one record into the dataset and extends it with URL of the web page where the results come from.

For example, if your page function returned the following object:

```js
{
    message: 'Hello world!';
}
```

The full object stored in the dataset will look as follows
(in JSON format, including the metadata fields `#error` and `#debug`):

```json
{
    "message": "Hello world!",
    "#error": false,
    "#debug": {
        "requestId": "fvwscO2UJLdr10B",
        "url": "https://www.example.com/",
        "loadedUrl": "https://www.example.com/",
        "method": "GET",
        "retryCount": 0,
        "errorMessages": null,
        "statusCode": 200
    }
}
```

To download the results, call the
[Get dataset items](https://apify.com/docs/api/v2#/reference/datasets/item-collection)
API endpoint:

```
https://api.apify.com/v2/datasets/[DATASET_ID]/items?format=json
```

where `[DATASET_ID]` is the ID of the actor's run dataset, in which you can find the Run object returned when starting the actor. Alternatively, you'll find the download links for the results in Apify Console.

To skip the `#error` and `#debug` metadata fields from the results and not include empty result records,
simply add the `clean=true` query parameter to the API URL, or select the **Clean items** option when downloading the dataset in Apify Console.

To get the results in other formats, set the `format` query parameter to `xml`, `xlsx`, `csv`, `html`, etc.
For more information, see [Datasets](https://apify.com/docs/storage#dataset) in documentation
or the [Get dataset items](https://apify.com/docs/api/v2#/reference/datasets/item-collection)
endpoint in Apify API reference.

## Additional resources

Congratulations! You've learned how Cheerio Scraper works.
You might also want to see these other resources:

-   [Web scraping tutorial](https://apify.com/docs/scraping) -
    An introduction to web scraping with Apify.
-   [Scraping with Cheerio Scraper](https://docs.apify.com/scraping/cheerio-scraper) -
    A step-by-step tutorial on how to use Cheerio Scraper, with a detailed explanation and examples.
-   **Cheerio Scraper** ([apify/cheerio-scraper](https://apify.com/apify/cheerio-scraper)) -
    Apify's basic tool for web crawling and scraping. It uses a full Chrome browser to render dynamic content.
-   **Puppeteer Scraper** ([apify/puppeteer-scraper](https://apify.com/apify/puppeteer-scraper)) -
    An actor similar to Web Scraper, which provides lower-level control of the underlying
    [Puppeteer](https://github.com/GoogleChrome/puppeteer) library and the ability to use server-side libraries.
-   [Actors documentation](https://apify.com/docs/actor) -
    Documentation for the Apify Actors cloud computing platform.
-   [Apify SDK](https://sdk.apify.com) - Learn how to build a new web scraping actor from scratch using the world's most popular web crawling and scraping library for Node.js.

## Upgrading

v2 introduced several minor breaking changes, you can read about those in the
[migration guide](https://github.com/apify/actor-scraper/blob/master/MIGRATIONS.md).
