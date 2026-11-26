<template>
    <div class="page-content" tabindex="-1">
        <div class="policy-page">
            <h1>{{ $t("Cookies policy") }}</h1>
            <p>{{ $t("This cookie policy explains how Nubemsystems uses cookies and similar technologies on our platform.") }}</p>

            <h2>{{ $t("What are cookies") }}</h2>
            <p>
                {{
                    $t(
                        "Cookies are small text files stored on your device when you visit a website. They help us improve your browsing experience.",
                    )
                }}
            </p>

            <h2>{{ $t("Types of cookies we use") }}</h2>
            <p>
                {{
                    $t(
                        "We use essential cookies for platform functionality, analytics cookies to understand usage patterns, and preference cookies to remember your settings.",
                    )
                }}
            </p>

            <h2>{{ $t("Third-party cookies") }}</h2>
            <p>
                {{
                    $t(
                        "We may use third-party services that set cookies on your device. These services include analytics providers and payment processors.",
                    )
                }}
            </p>

            <h2>{{ $t("Managing cookies") }}</h2>
            <p>
                {{
                    $t(
                        "You can control and manage cookies through your browser settings. Please note that disabling certain cookies may affect platform functionality.",
                    )
                }}
            </p>

            <h2>{{ $t("Changes to this policy") }}</h2>
            <p>{{ $t("We may update this cookie policy from time to time. We will notify you of any material changes.") }}</p>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "CookiePolicyPage",
});
</script>

<style>
@import "@/style/layout/policy-page.css";
</style>
