import eslint from "@eslint/js";
import eslintPluginVue from "eslint-plugin-vue";
import typescriptEslint from "typescript-eslint";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

import requireFunctionInMethods from "./eslint-rules/require-function-in-methods.js";
import { noStyleSrc, requireStyleImportAlias } from "./eslint-rules/style-rules.js";

export default typescriptEslint.config(
    { ignores: ["*.d.ts", "**/coverage", "**/dist"] },
    {
        extends: [eslint.configs.recommended, ...typescriptEslint.configs.recommended, ...eslintPluginVue.configs["flat/recommended"]],
        files: ["**/*.{ts,vue}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.browser,
            parserOptions: {
                parser: typescriptEslint.parser,
            },
        },
        plugins: {
            local: {
                rules: {
                    "require-function-in-methods": requireFunctionInMethods,
                    "no-style-src": noStyleSrc,
                    "require-style-import-alias": requireStyleImportAlias,
                },
            },
        },
        rules: {
            "local/require-function-in-methods": "error",
            "local/no-style-src": "error",
            "local/require-style-import-alias": "error",
            "no-empty": "off",
            "no-console": "off",
            "no-debugger": "warn",
            "no-useless-escape": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
            ],
            indent: "off",
            "vue/require-default-prop": "off",
            "vue/no-v-html": "off",
            "vue/attributes-order": "off",
            "vue/v-on-event-hyphenation": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "vue/no-bare-strings-in-template": "error",
            "vue/block-order": [
                "error",
                {
                    order: ["template", "script", "style"],
                },
            ],
            "vue/order-in-components": [
                "error",
                {
                    order: [
                        "name",
                        "components",
                        "emits",
                        "props",
                        "setup",
                        "data",
                        "methods",
                        "created",
                        "mounted",
                        "beforeUnmount",
                        "watch",
                    ],
                },
            ],
            "vue/no-static-inline-styles": [
                "error",
                {
                    allowBinding: true,
                },
            ],
            "vue/no-use-v-else-with-v-for": ["error"],
            "vue/block-lang": [
                "error",
                {
                    script: {
                        lang: "ts",
                    },
                },
            ],
            "vue/match-component-file-name": [
                "error",
                {
                    extensions: ["vue"],
                    shouldMatchCase: false,
                },
            ],
            "vue/no-undef-components": [
                "error",
                {
                    ignorePatterns: ["RouterLink", "ModalDialogContainer", "RouterView"],
                },
            ],
            "vue/require-name-property": ["error"],
        },
    },
    eslintConfigPrettier,
);
