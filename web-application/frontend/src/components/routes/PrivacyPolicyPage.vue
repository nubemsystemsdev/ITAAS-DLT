<template>
    <div class="page-content" tabindex="-1">
        <div class="policy-page">
            <h1>{{ $t("Privacy policy") }}</h1>
            <p>
                {{
                    $t(
                        "This privacy policy describes how Nubemsystems collects, uses, and protects your personal data when you use our platform.",
                    )
                }}
            </p>

            <h2>{{ $t("Information we collect") }}</h2>
            <p>
                {{
                    $t(
                        "We collect information you provide directly, such as your name, email address, and company details when you register for an account.",
                    )
                }}
            </p>
            <p>{{ $t("We also collect usage data automatically, including your IP address, browser type, and pages visited.") }}</p>

            <h2>{{ $t("How we use your information") }}</h2>
            <p>
                {{
                    $t(
                        "We use your information to provide, maintain, and improve our services, process transactions, and communicate with you.",
                    )
                }}
            </p>

            <h2>{{ $t("Data sharing") }}</h2>
            <p>{{ $t("We do not sell your personal data. We may share it with service providers who help us operate our platform.") }}</p>

            <h2>{{ $t("Your rights") }}</h2>
            <p>{{ $t("You have the right to access, correct, or delete your personal data. Contact us at privacy@nubemsystems.com.") }}</p>

            <h2>{{ $t("Contact us") }}</h2>
            <p>{{ $t("If you have any questions about this privacy policy, please contact us at privacy@nubemsystems.com.") }}</p>

            <h2>{{ $t("Changes to this policy") }}</h2>
            <p>{{ $t("We may update this policy from time to time. We will notify you of any material changes.") }}</p>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "PrivacyPolicyPage",
});
</script>

<style>
@import "@/style/layout/policy-page.css";
</style>
