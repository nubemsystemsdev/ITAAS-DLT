// Export this project's generated Swagger 2.0 operations without executing example templates.
/* eslint-env node */
"use strict";

const METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

function generatePostmanCollection(spec) {
    if (String(spec.swagger) !== "2.0" || !spec.paths) {
        throw new Error("Expected the project's generated Swagger 2.0 definition");
    }

    function resolve(value) {
        const seen = new Set();
        while (value?.$ref) {
            if (!value.$ref.startsWith("#/")) throw new Error("External schema references are not supported");
            if (seen.has(value.$ref)) throw new Error("Circular schema reference: " + value.$ref);
            seen.add(value.$ref);
            value = value.$ref.slice(2).split("/").reduce((parent, key) => {
                const name = key.replace(/~1/g, "/").replace(/~0/g, "~");
                if (!parent || !Object.hasOwn(parent, name)) throw new Error("Unknown schema reference: " + value.$ref);
                return parent[name];
            }, spec);
        }
        return value || {};
    }

    function example(schema, depth = 0) {
        if (depth > 8) return null;
        const value = resolve(schema);
        if (Object.hasOwn(value, "example")) return value.example;
        if (Object.hasOwn(value, "default")) return value.default;
        if (value.enum?.length) return value.enum[0];
        if (value.allOf) return Object.assign({}, ...value.allOf.map(item => example(item, depth + 1)));
        if (value.type === "array") return [example(value.items, depth + 1)];
        if (value.properties || value.type === "object") {
            return Object.fromEntries(Object.entries(value.properties || {}).map(([name, item]) => [name, example(item, depth + 1)]));
        }
        if (value.type === "boolean") return false;
        if (value.type === "integer" || value.type === "number") return value.minimum ?? 0;
        return "";
    }

    const folders = new Map();
    const variables = new Map([["baseUrl", `${spec.schemes?.[0] || "http"}://${spec.host || "localhost"}${spec.basePath || ""}`]]);

    for (const [path, pathItem] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
            if (!METHODS.has(method)) continue;
            const parameters = new Map();
            for (const parameter of [...(pathItem.parameters || []), ...(operation.parameters || [])]) {
                const value = resolve(parameter);
                parameters.set(value.in + ":" + value.name, value);
            }
            const params = [...parameters.values()];
            const query = params.filter(p => p.in === "query").map(p => ({
                key: p.name, value: String(example(p)), description: p.description || "", disabled: !p.required,
            }));
            const header = params.filter(p => p.in === "header").map(p => ({
                key: p.name, value: String(example(p)), description: p.description || "", disabled: !p.required,
            }));
            const cookieHeaders = [];
            // Swagger security arrays describe alternatives; use the first supported alternative.
            const security = operation.security ?? spec.security ?? [];
            if (security.length) {
                const requirement = security[0];
                for (const name of Object.keys(requirement)) {
                    const scheme = spec.securityDefinitions?.[name];
                    if (!scheme && name === "BearerAuth") {
                        // These documented routes use BearerAuth, but the generated Swagger definition omits the scheme.
                        variables.set(name, "");
                        header.push({ key: "Authorization", value: "Bearer {{" + name + "}}" });
                        continue;
                    }
                    if (scheme?.type !== "apiKey") throw new Error("Unsupported security scheme: " + name);
                    variables.set(name, "");
                    const entry = { key: scheme.name, value: "{{" + name + "}}" };
                    if (scheme.in === "header") header.push(entry);
                    else if (scheme.in === "query") query.push(entry);
                    else if (scheme.in === "cookie") cookieHeaders.push(entry.key + "=" + entry.value);
                    else throw new Error("Unsupported API key location: " + scheme.in);
                }
            }
            if (cookieHeaders.length) header.push({ key: "Cookie", value: cookieHeaders.join("; ") });
            const urlPath = path.replace(/\{([^}]+)\}/g, ":$1");
            const request = {
                method: method.toUpperCase(),
                description: operation.description || "",
                header,
                url: {
                    raw: "{{baseUrl}}" + urlPath,
                    host: ["{{baseUrl}}"],
                    path: urlPath.split("/").filter(Boolean),
                    query,
                    variable: params.filter(p => p.in === "path").map(p => ({
                        key: p.name, value: String(example(p)), description: p.description || "",
                    })),
                },
            };
            const body = params.find(p => p.in === "body");
            const form = params.filter(p => p.in === "formData");
            if (body && form.length) throw new Error("An operation cannot contain both body and form parameters");
            if (body) {
                request.body = { mode: "raw", raw: JSON.stringify(example(body.schema), null, 2), options: { raw: { language: "json" } } };
                if (!header.some(h => h.key.toLowerCase() === "content-type")) header.push({ key: "Content-Type", value: "application/json" });
            } else if (form.length) {
                const multipart = form.some(p => p.type === "file") || (operation.consumes || spec.consumes || []).includes("multipart/form-data");
                const entries = form.map(p => p.type === "file"
                    ? { key: p.name, type: "file", src: [], description: p.description || "" }
                    : { key: p.name, value: String(example(p)), type: "text", description: p.description || "" });
                request.body = multipart ? { mode: "formdata", formdata: entries } : { mode: "urlencoded", urlencoded: entries };
            }
            const folder = operation.tags?.[0] || "API";
            if (!folders.has(folder)) folders.set(folder, []);
            folders.get(folder).push({ name: operation.summary || method.toUpperCase() + " " + path, request, response: [] });
        }
    }

    return {
        info: { name: spec.info?.title || "API", description: spec.info?.description || "", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        variable: [...variables].map(([key, value]) => ({ key, value, type: "string" })),
        item: [...folders].map(([name, item]) => ({ name, item })),
    };
}

module.exports = { generatePostmanCollection };
