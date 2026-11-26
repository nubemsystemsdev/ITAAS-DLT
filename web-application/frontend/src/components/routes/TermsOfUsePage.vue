<template>
    <div class="page-content" tabindex="-1">
        <div class="policy-page">
            <h1>{{ $t("Terms of use") }}</h1>
            <p>{{ $t("These terms of use govern your use of the Nubemsystems platform and services.") }}</p>

            <h2>{{ $t("Acceptance of terms") }}</h2>
            <p>
                {{
                    $t(
                        "By accessing or using our platform, you agree to be bound by these terms. If you do not agree, please do not use our services.",
                    )
                }}
            </p>

            <h2>{{ $t("Description of service") }}</h2>
            <p>
                {{
                    $t(
                        "Nubemsystems provides a blockchain-based traceability and digital ledger platform for businesses and organizations.",
                    )
                }}
            </p>

            <h2>{{ $t("User obligations") }}</h2>
            <p>
                {{
                    $t(
                        "You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.",
                    )
                }}
            </p>

            <h2>{{ $t("Intellectual property") }}</h2>
            <p>
                {{ $t("All content, trademarks, and intellectual property on this platform are owned by Nubemsystems or its licensors.") }}
            </p>

            <h2>{{ $t("Limitation of liability") }}</h2>
            <p>
                {{
                    $t(
                        "Nubemsystems shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.",
                    )
                }}
            </p>

            <h2>{{ $t("Governing law") }}</h2>
            <p>{{ $t("These terms shall be governed by and construed in accordance with the laws of the applicable jurisdiction.") }}</p>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "TermsOfUsePage",
});
</script>

<style>
@import "@/style/layout/policy-page.css";
</style>
