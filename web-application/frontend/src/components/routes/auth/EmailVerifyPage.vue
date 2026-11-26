<template>
    <div class="modal-container modal-container-signup modal-container-opaque no-transition" tabindex="-1">
        <div @submit="submit" class="modal-dialog modal-md">
            <div class="modal-header">
                <div class="modal-title no-close">{{ $t("Email verification") }}</div>
            </div>
            <div class="modal-body">
                <div class="" v-if="busy">
                    <p><i class="fa fa-spinner fa-spin" aria-hidden="true"></i> {{ $t("Verifying your email") }}...</p>
                </div>
                <div class="" v-if="!busy && !error">
                    <p>{{ $t("Your email has been successfully verified") }}</p>
                </div>
                <div class="form-error" v-if="!busy && error" role="alert">{{ error }}</div>
            </div>
            <div class="modal-footer">
                <router-link :to="{ name: 'login' }">
                    <button type="button" :disabled="busy" class="btn btn-login"><i class="fas fa-check"></i> {{ $t("Done") }}</button>
                </router-link>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { ApiAuth } from "@/api/api-group-auth";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

export default defineComponent({
    name: "EmailVerifyPage",
    components: {},
    data: function () {
        return {
            busy: true,
            error: "",
        };
    },
    methods: {
        submit: function () {
            Request.Do(ApiAuth.VerifyEmail({ uid: this.$route.params.uid + "", verification: this.$route.params.token + "" }))
                .onSuccess(() => {
                    this.busy = false;
                })
                .onCancel(() => {
                    this.busy = false;
                })
                .onRequestError((err, handleErr) => {
                    this.busy = false;
                    handleErr(err, {
                        notFound: () => {
                            this.error =
                                this.$t("This verification link is either invalid or has expired.") +
                                " " +
                                this.$t("Try resetting you password if you lost access to your account.");
                        },
                        notFoundInvalidVerificationCode: () => {
                            this.error =
                                this.$t("This verification link is either invalid or has expired.") +
                                " " +
                                this.$t("Try resetting you password if you lost access to your account.");
                        },
                        forbiddenEmailInUse: () => {
                            this.error = this.$t("The provided email is already in use");
                        },
                        forbidden: () => {
                            this.error =
                                this.$t("This verification link is either invalid or has expired.") +
                                " " +
                                this.$t("Try resetting you password if you lost access to your account.");
                        },
                        badRequestKeycloakUnavailable: () => {
                            this.error =
                                this.$t("Could not complete email verification") +
                                ". " +
                                this.$t("You can try again by reloading the page");
                        },
                        badRequest: () => {
                            this.error =
                                this.$t("Could not complete email verification") +
                                ". " +
                                this.$t("You can try again by reloading the page");
                        },
                        serverError: () => {
                            this.error = this.$t("Internal server error") + ". " + this.$t("You can try again by reloading the page");
                        },
                        networkError: () => {
                            this.error =
                                this.$t("Could not connect to the server") + ". " + this.$t("You can try again by reloading the page");
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.error = this.$t("Internal server error") + ". " + this.$t("You can try again by reloading the page");
                    console.error(err);
                    this.busy = false;
                });
        },
    },
    mounted: function () {
        // Keep this page available under Keycloak SSO: email-change verification is Marketplace-owned.
        this.submit();
    },
    beforeUnmount: function () {},
});
</script>

<style></style>
