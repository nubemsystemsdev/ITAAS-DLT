<template>
    <div class="details-view-panels details-view-panels--credentials" tabindex="-1">
        <article class="details-view-panel">
            <div class="details-view-edit-header">
                <h3 class="details-view-panel-title">{{ $t("Change username") }}</h3>
                <p class="details-view-edit-description">{{ $t("Choose a new username for your account.") }}</p>
            </div>
            <ChangeUsernamePage />
        </article>

        <article class="details-view-panel">
            <div class="details-view-edit-header">
                <h3 class="details-view-panel-title">{{ $t("Change email") }}</h3>
                <p class="details-view-edit-description">
                    {{ $t("Request a change to the email address linked to your account.") }}
                </p>
            </div>
            <ChangeEmailPage />
        </article>

        <article class="details-view-panel details-view-panel--wide">
            <div class="details-view-edit-header">
                <h3 class="details-view-panel-title">{{ $t("Change password") }}</h3>
                <p class="details-view-edit-description">{{ $t("Set a new password for your account.") }}</p>
            </div>
            <ChangePasswordPage />
        </article>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import ChangeUsernamePage from "./ChangeUsernamePage.vue";
import ChangeEmailPage from "./ChangeEmailPage.vue";
import ChangePasswordPage from "./ChangePasswordPage.vue";

export default defineComponent({
    name: "AccountCredentialsPage",
    components: {
        ChangeUsernamePage,
        ChangeEmailPage,
        ChangePasswordPage,
    },
});
</script>
