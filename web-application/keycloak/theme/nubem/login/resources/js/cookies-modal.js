(function () {
    var C = window.NubemSsoCookies;
    if (!C) {
        return;
    }

    function setPolicyLinks() {
        var base = C.getAppBaseUrl();
        var terms = document.getElementById("nubem-cookies-link-terms");
        var policy = document.getElementById("nubem-cookies-link-policy");
        var privacy = document.getElementById("nubem-cookies-link-privacy");
        var links = [terms, policy, privacy];
        if (!base) {
            links.forEach(function (el) {
                if (!el) return;
                el.removeAttribute("href");
                el.setAttribute("aria-disabled", "true");
                el.classList.add("nubem-cookies-footer-link--disabled");
            });
            return;
        }
        if (terms) {
            terms.href = base + "/terms";
            terms.removeAttribute("aria-disabled");
            terms.classList.remove("nubem-cookies-footer-link--disabled");
        }
        if (policy) {
            policy.href = base + "/cookies";
            policy.removeAttribute("aria-disabled");
            policy.classList.remove("nubem-cookies-footer-link--disabled");
        }
        if (privacy) {
            privacy.href = base + "/privacy";
            privacy.removeAttribute("aria-disabled");
            privacy.classList.remove("nubem-cookies-footer-link--disabled");
        }
    }

    function setPreference(value) {
        C.writeCookie(C.NAMES.COOKIE_PREF, value);
        try {
            localStorage.setItem(C.LS_COOKIE_PREF, value);
        } catch (e) {
            /* ignore */
        }
    }

    function openModal() {
        var modal = document.getElementById("nubem-cookies-modal");
        if (!modal) return;
        setPolicyLinks();
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("nubem-cookies-modal-open");
        var firstBtn = modal.querySelector("[data-cookie-pref]");
        if (firstBtn) firstBtn.focus();
    }

    function closeModal() {
        var modal = document.getElementById("nubem-cookies-modal");
        if (!modal) return;
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("nubem-cookies-modal-open");
        var openBtn = document.getElementById("nubem-cookies-open");
        if (openBtn) openBtn.focus();
    }

    window.__nubemOpenCookiesModal = openModal;
    window.__nubemCloseCookiesModal = closeModal;

    document.addEventListener("DOMContentLoaded", function () {
        setPolicyLinks();

        var openBtn = document.getElementById("nubem-cookies-open");
        if (openBtn) {
            openBtn.disabled = false;
            openBtn.addEventListener("click", openModal);
        }

        var modal = document.getElementById("nubem-cookies-modal");
        if (!modal) return;

        modal.querySelectorAll("[data-cookie-pref]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                setPreference(btn.getAttribute("data-cookie-pref"));
                closeModal();
            });
        });

        modal.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeModal();
        });
    });
})();
