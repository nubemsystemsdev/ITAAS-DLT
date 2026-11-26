import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

import dotenv from "dotenv";
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        port: parseInt(process.env.DEV_PORT || "8080", 10) || 8080,
        warmup: {
            clientFiles: [
                "./index.html",
                "./src/main.ts",
                "./src/App.vue",
                "./src/app-events-plugin.ts",
                "./src/control/auth.ts",
                "./src/control/navigation-access-control.ts",
                "./src/components/layout/MainLayout.vue",
                "./src/components/layout/TopBar.vue",
                "./src/components/layout/MenuSideBar.vue",
                "./src/components/routes/HomePage.vue",
                "./src/components/routes/auth/LoginPage.vue",
                "./src/components/routes/dashboard/user/SubscriptionsPage.vue",
                "./src/components/routes/dashboard/DashboardPage.vue",
                "./src/components/routes/organization/OrganizationMemberPage.vue",
            ],
        },
    },
    optimizeDeps: {
        include: [
            "vue",
            "vue-router",
            "@asanrom/request-browser",
            "decimal.js",
            "check-password-strength",
            "vue-recaptcha-v3",
            "qrcode.vue",
            "vue-echarts",
            "echarts/core",
            "echarts/charts",
            "echarts/components",
            "echarts/renderers",
        ],
    },
    build: {
        assetsInlineLimit: 0,
        sourcemap: true,
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
            three: path.resolve(__dirname, "node_modules/three"),
        },
    },
});
