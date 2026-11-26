// HTTP request

import HTTP from "http";
import HTTPS from "https";
import QueryString from "querystring";
import FormData from "form-data";
import { URL } from "url";
import { Monitor } from "../monitor";

export interface RequestOptions {
    url: string;
    method: string;
    headers?: { [header: string]: string };
    body?: any;
    formData?: FormData;
    bodyType?: "raw" | "form" | "json" | "multipart";
    maxSize?: number;
    timeout?: number;
    skipDebugLog?: boolean;
}

export interface RequestGetOptions {
    headers?: { [header: string]: string };
    maxSize?: number;
    timeout?: number;
    skipDebugLog?: boolean;
}

export interface RequestPostOptions {
    headers?: { [header: string]: string };
    form?: any,
    multipart?: FormData,
    body?: string,
    json?: any,
    maxSize?: number;
    timeout?: number;
    skipDebugLog?: boolean;
}

export interface RequestResponse {
    statusCode: number;
    headers: any;
}

export type RequestCallback = (error: Error, response: RequestResponse, body: string) => void;

export class Request {
    public static request(opts: RequestOptions, callback: RequestCallback) {
        const url = opts.url;
        let parsedBody = "";

        let urlO: URL;

        try {
            urlO = new URL(url);
        } catch (ex) {
            return callback(ex, { statusCode: 0, headers: {} }, null);
        }

        const options = {
            method: opts.method,
            headers: opts.headers || {},
            timeout: opts.timeout || 0,
        };

        if (opts.bodyType) {
            switch (opts.bodyType) {
                case "raw":
                    parsedBody = opts.body || "";
                    break;
                case "form":
                    parsedBody = QueryString.stringify(opts.body || {});
                    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
                    break;
                case "json":
                    parsedBody = JSON.stringify(opts.body || {});
                    options.headers["Content-Type"] = "application/json";
                    break;
                case "multipart":
                    {
                        for (const key of Object.keys(opts.body || {})) {
                            opts.formData.append(key, opts.body[key]);
                        }
                        const fH = opts.formData.getHeaders();
                        for (const key of Object.keys(fH)) {
                            options.headers[key] = fH[key];
                        }
                    }
                    break;
            }
        }

        let request;
        let settled = false;

        const settle: RequestCallback = function (error, response, body) {
            if (settled) {
                return;
            }
            settled = true;
            callback(error, response, body);
        };

        const responseHandler = function (response) {
            let data = "";

            response.on("data", function (chunk) {
                data += chunk;

                if (opts.maxSize && data.length > opts.maxSize) {
                    settle(new Error("Data received from remote host was too large."), { statusCode: 0, headers: {} }, null);
                    request.destroy();
                    return;
                }
            });

            response.on("end", function () {
                settle(null, { statusCode: response.statusCode, headers: response.headers }, data);
            });
        };

        if (urlO.protocol === "https:") {
            request = HTTPS.request(url, options, responseHandler);
        } else {
            request = HTTP.request(url, options, responseHandler);
        }

        request.on("error", function (err) {
            settle(err, { statusCode: 0, headers: {} }, null);
        });

        // Node's timeout option only emits 'timeout'; it does not abort.
        // Destroy the request so hung remotes cannot block callers indefinitely.
        if (opts.timeout && opts.timeout > 0) {
            request.setTimeout(opts.timeout, function () {
                request.destroy(new Error("Request timeout"));
            });
        }

        if (parsedBody) {
            request.write(parsedBody);
            request.end();
        } else if (opts.formData) {
            opts.formData.pipe(request);
        } else {
            request.end();
        }
    }

    public static get(url: string, opts: RequestGetOptions, callback: RequestCallback) {
        opts = opts || {};
        Request.request({
            url: url,
            method: "GET",
            headers: opts.headers,
            maxSize: opts.maxSize || 0,
            timeout: opts.timeout,
            skipDebugLog: opts.skipDebugLog,
        }, callback);
    }

    public static custom(method: string, url: string, opts: RequestPostOptions, callback: RequestCallback) {
        opts = opts || {};
        if (opts.multipart) {
            Request.request({
                url: url,
                method: method,
                headers: opts.headers,
                maxSize: opts.maxSize || 0,
                timeout: opts.timeout,
                skipDebugLog: opts.skipDebugLog,
                bodyType: "multipart",
                formData: opts.multipart,
            }, callback);
        } else if (opts.json) {
            Request.request({
                url: url,
                method: method,
                headers: opts.headers,
                maxSize: opts.maxSize || 0,
                timeout: opts.timeout,
                skipDebugLog: opts.skipDebugLog,
                bodyType: "json",
                body: opts.json,
            }, callback);
        } else if (opts.form) {
            Request.request({
                url: url,
                method: method,
                headers: opts.headers,
                maxSize: opts.maxSize || 0,
                timeout: opts.timeout,
                skipDebugLog: opts.skipDebugLog,
                bodyType: "form",
                body: opts.form,
            }, callback);
        } else {
            Request.request({
                url: url,
                method: method,
                headers: opts.headers,
                maxSize: opts.maxSize || 0,
                timeout: opts.timeout,
                skipDebugLog: opts.skipDebugLog,
                bodyType: "raw",
                body: opts.body || "",
            }, callback);
        }
    }

    public static post(url: string, opts: RequestPostOptions, callback: RequestCallback) {
        Request.custom("POST", url, opts, callback);
    }

    public static put(url: string, opts: RequestPostOptions, callback: RequestCallback) {
        Request.custom("PUT", url, opts, callback);
    }

    public static delete(url: string, opts: RequestPostOptions, callback: RequestCallback) {
        Request.custom("DELETE", url, opts, callback);
    }

    public static options(url: string, opts: RequestPostOptions, callback: RequestCallback) {
        Request.custom("OPTIONS", url, opts, callback);
    }
}
