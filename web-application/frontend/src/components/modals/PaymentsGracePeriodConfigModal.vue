<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-md" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ $t("Grace period settings") }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div class="modal-body modal-detail-body">
                <p class="payments-grace-period-modal-intro">
                    {{
                        $t(
                            "Days after a failed renewal before a suspended subscription is cancelled. Does not change grace periods already in progress.",
                        )
                    }}
                </p>

                <div v-if="loading" class="table-feedback">{{ $t("Loading") }}...</div>

                <div v-else class="dashboard-settings-list">
                    <article class="dashboard-settings-row payments-grace-period-settings-row">
                        <p class="dashboard-settings-label">{{ $t("Grace period (days)") }}</p>
                        <input
                            :value="gracePeriodDaysInputValue"
                            class="dashboard-settings-field"
                            type="text"
                            inputmode="numeric"
                            maxlength="3"
                            :disabled="saving"
                            :aria-invalid="gracePeriodDaysError ? 'true' : undefined"
                            :aria-describedby="gracePeriodDaysError ? 'grace-period-days-error' : undefined"
                            @input="onGracePeriodDaysInput"
                        />
                        <div
                            v-if="gracePeriodDaysError"
                            id="grace-period-days-error"
                            class="form-error payments-grace-period-days-error"
                            role="alert"
                        >
                            {{ gracePeriodDaysError }}
                        </div>
                    </article>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-tertiary" :disabled="saving" @click="close">
                    {{ $t("Cancel") }}
                </button>
                <button type="button" class="btn btn-primary" :disabled="loading || saving" @click="saveConfig">
                    <i class="fas fa-save" aria-hidden="true"></i>
                    {{ saving ? $t("Saving") + "..." : $t("Save changes") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { ApiPaymentsPlatformConfig } from "@/api/api-group-payments-platform-config";
import type { PaymentsPlatformConfig, PaymentsPlatformConfigUpdateBody } from "@/api/definitions";
import ModalDialogContainer from "@/components/utils/ModalDialogContainer.vue";
import { getUniqueStringId } from "@/utils/unique-id";
import { useVModel } from "@/utils/v-model";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";

const GRACE_PERIOD_MIN = 0;
const GRACE_PERIOD_MAX = 365;

export default defineComponent({
    name: "PaymentsGracePeriodConfigModal",
    components: {
        ModalDialogContainer,
    },
    emits: ["update:display", "saved"],
    props: {
        display: Boolean,
    },
    setup: function (props) {
        return {
            displayStatus: useVModel(props, "display"),
            loadRequestId: getUniqueStringId(),
            saveRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            loading: false,
            saving: false,
            form: {
                subscriptionGracePeriodDays: null as number | null,
            },
            gracePeriodDaysError: "",
        };
    },
    computed: {
        gracePeriodDaysInputValue: function (): string {
            const value = this.form.subscriptionGracePeriodDays;
            if (value === null || !Number.isFinite(value)) {
                return "";
            }
            return String(value);
        },
    },
    methods: {
        getGracePeriodRangeError: function (): string {
            return this.$t("Grace period must be between {min} and {max} days.")
                .replace("{min}", String(GRACE_PERIOD_MIN))
                .replace("{max}", String(GRACE_PERIOD_MAX));
        },
        clearGracePeriodDaysError: function () {
            this.gracePeriodDaysError = "";
        },
        onGracePeriodDaysInput: function (e: Event) {
            this.clearGracePeriodDaysError();
            const digitsOnly = (e.target as HTMLInputElement).value.replace(/\D/g, "");
            if (digitsOnly === "") {
                this.form.subscriptionGracePeriodDays = null;
                return;
            }
            const parsed = Number.parseInt(digitsOnly, 10);
            this.form.subscriptionGracePeriodDays = Math.min(GRACE_PERIOD_MAX, Math.max(GRACE_PERIOD_MIN, parsed));
        },
        applyConfigToForm: function (config: PaymentsPlatformConfig) {
            const raw = config as PaymentsPlatformConfig & { subscription_grace_period_days?: number };
            const days = config.subscriptionGracePeriodDays ?? raw.subscription_grace_period_days;
            const parsed = Number(days);
            this.form.subscriptionGracePeriodDays = Number.isFinite(parsed) ? parsed : null;
        },
        loadConfig: function () {
            Request.Abort(this.loadRequestId);
            this.loading = true;
            Request.Pending(this.loadRequestId, ApiPaymentsPlatformConfig.GetAdminPaymentsPlatformConfig())
                .onSuccess((config) => {
                    this.applyConfigToForm(config);
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    this.loading = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to load grace period settings."));
                            this.close();
                        },
                        temporalError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Unable to load grace period settings."));
                            this.close();
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Unable to load grace period settings."));
                            this.close();
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Unable to load grace period settings."));
                            this.close();
                        },
                    });
                })
                .onUnexpectedError(() => {
                    this.loading = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unable to load grace period settings."));
                    this.close();
                });
        },
        saveConfig: function () {
            this.clearGracePeriodDaysError();

            if (this.loading) {
                return;
            }

            if (this.form.subscriptionGracePeriodDays === null || !Number.isFinite(this.form.subscriptionGracePeriodDays)) {
                this.gracePeriodDaysError = this.$t("Grace period is required.");
                return;
            }

            const days = Math.floor(Number(this.form.subscriptionGracePeriodDays));
            if (days < GRACE_PERIOD_MIN || days > GRACE_PERIOD_MAX) {
                this.gracePeriodDaysError = this.getGracePeriodRangeError();
                return;
            }

            Request.Abort(this.saveRequestId);
            this.saving = true;

            const payload: PaymentsPlatformConfigUpdateBody = {
                subscriptionGracePeriodDays: days,
            };

            Request.Pending(this.saveRequestId, ApiPaymentsPlatformConfig.UpdateAdminPaymentsPlatformConfig(payload))
                .onSuccess((config) => {
                    this.applyConfigToForm(config);
                    this.saving = false;
                    this.$showSnackBar(this.$t("Grace period settings were updated successfully."));
                    this.$emit("saved");
                    this.close();
                })
                .onRequestError((err, handleErr) => {
                    this.saving = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        forbidden: () =>
                            this.$showMessageModal(this.$t("Access denied"), this.$t("Unable to update grace period settings.")),
                        badRequest: () =>
                            this.$showMessageModal(this.$t("Invalid request"), this.$t("Unable to update grace period settings.")),
                        badRequestInvalidGracePeriodDays: () => {
                            this.gracePeriodDaysError = this.getGracePeriodRangeError();
                        },
                        temporalError: () => this.$showMessageModal(this.$t("Error"), this.$t("Unable to update grace period settings.")),
                        networkError: () => this.$showMessageModal(this.$t("Error"), this.$t("Unable to update grace period settings.")),
                        serverError: () => this.$showMessageModal(this.$t("Error"), this.$t("Unable to update grace period settings.")),
                    });
                })
                .onUnexpectedError(() => {
                    this.saving = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unable to update grace period settings."));
                });
        },
        close: function () {
            this.$closeModal();
        },
        stopPropagationEvent: function (e: Event) {
            e.stopPropagation();
        },
    },
    mounted: function () {
        this.loadConfig();
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
        Request.Abort(this.saveRequestId);
    },
});
</script>

<style scoped>
.payments-grace-period-modal-intro {
    margin: 0 0 var(--space-16);
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 1.5;
}

.payments-grace-period-days-error {
    grid-column: 1 / -1;
}
</style>
