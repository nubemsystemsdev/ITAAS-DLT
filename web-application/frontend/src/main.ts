// Vue entry point

"use strict";

import { AuthController } from "./control/auth";
import { NotificationsController } from "./control/notifications";
import { OrganizationController } from "./control/organization";
import { WalletsController } from "./control/wallets";

// Global event handlers

document.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
});

import { createApp } from "vue";

import { getLanguage, i18n } from "./i18n";
import { appEventsPlugin } from "./app-events-plugin";
import { makeApplicationRouter } from "./routes";
import { applyNavigationAccessControl } from "./control/navigation-access-control";

import App from "./App.vue";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";

const COMFORTAA_FONT_STYLESHEET_ID = "comfortaa-font-stylesheet";
const COMFORTAA_FONT_PRECONNECT_HOSTS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];
const COMFORTAA_FONT_STYLESHEET_HREF = "https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap";

/**
 * Applies stored language preference before the app mounts.
 */
function applyStoredLanguage(): void {
    document.documentElement.setAttribute("lang", getLanguage());
}

/**
 * Loads the external Comfortaa stylesheet without blocking the initial render.
 */
function loadComfortaaFontStylesheet(): void {
    if (document.getElementById(COMFORTAA_FONT_STYLESHEET_ID)) {
        return;
    }

    COMFORTAA_FONT_PRECONNECT_HOSTS.forEach((href) => {
        const alreadyPresent = Array.from(document.head.querySelectorAll("link[rel='preconnect']")).some((link) => {
            return (link as HTMLLinkElement).href === href + "/";
        });
        if (alreadyPresent) {
            return;
        }

        const preconnectLink = document.createElement("link");
        preconnectLink.rel = "preconnect";
        preconnectLink.href = href;
        if (href.includes("gstatic")) {
            preconnectLink.crossOrigin = "anonymous";
        }
        document.head.appendChild(preconnectLink);
    });

    const stylesheetLink = document.createElement("link");
    stylesheetLink.id = COMFORTAA_FONT_STYLESHEET_ID;
    stylesheetLink.rel = "stylesheet";
    stylesheetLink.href = COMFORTAA_FONT_STYLESHEET_HREF;
    stylesheetLink.media = "print";
    stylesheetLink.onload = () => {
        stylesheetLink.media = "all";
    };
    document.head.appendChild(stylesheetLink);
}

/**
 * Main entry point
 */
async function main() {
    applyStoredLanguage();
    loadComfortaaFontStylesheet();
    await AuthController.Initialize();
    NotificationsController.Initialize();
    OrganizationController.Initialize();
    WalletsController.Initialize();

    // Setup App
    const app = createApp(App);

    app.use(i18n); // Multi-language

    app.use(appEventsPlugin); // Events plugin

    const router = makeApplicationRouter();
    applyNavigationAccessControl(router);

    app.use(router); // Router

    // reCaptcha
    if (import.meta.env.VITE__CAPTCHA_SERVICE === "reCAPTCHA") {
        const VueReCaptcha = (await import("vue-recaptcha-v3")).VueReCaptcha;
        app.use(VueReCaptcha, { siteKey: import.meta.env.VITE__RECAPTCHA_SITE_KEY || "", loaderOptions: { autoHideBadge: true } });
    }

    // Global components

    app.component("ModalDialogContainer", ModalDialogContainer);

    // Mount app

    app.mount("#app");

    // Add listener for reload

    window.addEventListener("vite:preloadError", () => {
        window.location.reload();
    });
}

main();
