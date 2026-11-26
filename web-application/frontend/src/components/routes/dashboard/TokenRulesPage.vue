<template>
    <div class="page-content token-rules-page" tabindex="-1">
        <DashboardPageHeader
            :eyebrow="$t('Admin marketplace')"
            :title="$t('Tokens rules')"
            :subtitle="$t('Parameters for issuance and burn. Any change requires double confirmation and auditing.')"
        />
        <section class="token-rules-card">
            <h2 class="details-view-panel-title">{{ $t("Issuance") }}</h2>
            <div class="dashboard-settings-list">
                <article class="dashboard-settings-row" v-for="rule in earnRules" :key="rule.id">
                    <p class="dashboard-settings-label">{{ rule.label }}</p>
                    <input
                        v-if="rule.inputType === 'number'"
                        v-model.number="form[rule.modelKey]"
                        class="dashboard-settings-field"
                        type="number"
                        :min="rule.min"
                        :step="rule.step"
                        :disabled="loading || saving"
                    />
                    <select v-else v-model="form[rule.modelKey]" class="dashboard-settings-field" :disabled="loading || saving">
                        <option v-for="option in rule.options || []" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                    <p class="dashboard-settings-hint">{{ rule.hint }}</p>
                </article>
            </div>
        </section>

        <section class="token-rules-card">
            <h2 class="details-view-panel-title">{{ $t("Burn") }}</h2>
            <div class="dashboard-settings-list">
                <article class="dashboard-settings-row" v-for="rule in burnRules" :key="rule.id">
                    <p class="dashboard-settings-label">{{ rule.label }}</p>
                    <input
                        v-if="rule.inputType === 'number'"
                        v-model.number="form[rule.modelKey]"
                        class="dashboard-settings-field"
                        type="number"
                        :min="rule.min"
                        :step="rule.step"
                        :disabled="loading || saving"
                    />
                    <select v-else v-model="form[rule.modelKey]" class="dashboard-settings-field" :disabled="loading || saving">
                        <option v-for="option in rule.options || []" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                    <p class="dashboard-settings-hint">{{ rule.hint }}</p>
                </article>
            </div>
        </section>

        <div class="details-view-edit-actions token-rules-save-actions">
            <button type="button" class="btn btn-primary" :disabled="loading || saving" @click="saveRules">
                <i class="fas fa-save" aria-hidden="true"></i>
                {{ saving ? $t("Saving") + "..." : $t("Save changes") }}
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import { ApiTokenRules } from "@/api/api-group-token-rules";
import { TokenRulesConfig } from "@/api/definitions";
import { TokenRulesUpdateBody } from "@/api/definitions";
import { HOME_ROUTE } from "@/app-events-plugin";
import { getUniqueStringId } from "@/utils/unique-id";
import { Request } from "@asanrom/request-browser";
import { defineComponent } from "vue";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader.vue";

type RuleOption = {
    value: string;
    label: string;
};

type TokenRule = {
    id: string;
    label: string;
    hint: string;
    inputType: "number" | "select";
    modelKey: keyof TokenRulesForm;
    min?: number;
    step?: number;
    options?: RuleOption[];
};

type TokenRulesForm = {
    emissionRatePct: number | null;
    minPurchaseEur: number | null;
    minPurchaseRedeemEur: number | null;
    allowedProductKinds: string;
    tokenValueEur: number | null;
    maxRedeemPct: number | null;
    stackWithPromotions: string;
    expirationMonths: number | null;
};

export default defineComponent({
    name: "TokenRulesPage",
    components: {
        DashboardPageHeader,
    },
    setup: function () {
        return {
            loadRequestId: getUniqueStringId(),
            saveRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            loading: true,
            saving: false,
            form: {
                emissionRatePct: null,
                minPurchaseEur: null,
                minPurchaseRedeemEur: null,
                allowedProductKinds: "",
                tokenValueEur: null,
                maxRedeemPct: null,
                stackWithPromotions: "",
                expirationMonths: null,
            } as TokenRulesForm,
        };
    },
    computed: {
        earnRules: function (): TokenRule[] {
            return [
                {
                    id: "earn-rate",
                    label: this.$t("tokens per validated purchase"),
                    hint: this.$t("% of net amount"),
                    inputType: "number",
                    modelKey: "emissionRatePct",
                    min: 0,
                    step: 0.1,
                },
                {
                    id: "earn-min",
                    label: this.$t("Minimum eligible amount"),
                    hint: this.$t("EUR - below this, no issuance"),
                    inputType: "number",
                    modelKey: "minPurchaseEur",
                    min: 0,
                    step: 1,
                },
                {
                    id: "earn-type",
                    label: this.$t("Applicable product type"),
                    hint: this.$t("Agents, services, products"),
                    inputType: "select",
                    modelKey: "allowedProductKinds",
                    options: [
                        { value: "all", label: this.$t("All") },
                        { value: "agents", label: this.$t("Agents") },
                        { value: "services", label: this.$t("Services") },
                        { value: "products", label: this.$t("Products") },
                    ],
                },
            ];
        },
        burnRules: function (): TokenRule[] {
            return [
                {
                    id: "burn-equivalence",
                    label: this.$t("Equivalence"),
                    hint: this.$t("1 token = 1 EUR discount"),
                    inputType: "number",
                    modelKey: "tokenValueEur",
                    min: 0.01,
                    step: 0.01,
                },
                {
                    id: "burn-min",
                    label: this.$t("Minimum amount to redeem"),
                    hint: this.$t("EUR - below this, no burn"),
                    inputType: "number",
                    modelKey: "minPurchaseRedeemEur",
                    min: 0,
                    step: 1,
                },
                {
                    id: "burn-limit",
                    label: this.$t("Discount cap per purchase"),
                    hint: this.$t("% of total"),
                    inputType: "number",
                    modelKey: "maxRedeemPct",
                    min: 0,
                    step: 0.1,
                },
                {
                    id: "burn-stackable",
                    label: this.$t("Combinable with promotions"),
                    hint: this.$t("Cannot stack with external campaigns"),
                    inputType: "select",
                    modelKey: "stackWithPromotions",
                    options: [
                        { value: "yes", label: this.$t("Yes") },
                        { value: "no", label: this.$t("No") },
                    ],
                },
                {
                    id: "burn-expiry",
                    label: this.$t("Expiry"),
                    hint: this.$t("Months from issuance"),
                    inputType: "number",
                    modelKey: "expirationMonths",
                    min: 1,
                    step: 1,
                },
            ];
        },
    },
    methods: {
        applyRulesToForm: function (rules: TokenRulesConfig) {
            this.form.emissionRatePct = Number(rules.emissionRatePct);
            this.form.minPurchaseEur = Math.round(Number(rules.minPurchaseEurCentsToEarn) / 100);
            this.form.minPurchaseRedeemEur = Math.round(Number(rules.minPurchaseEurCentsToRedeem) / 100);
            this.form.allowedProductKinds = String(rules.allowedProductKinds).toLowerCase();
            this.form.tokenValueEur = Number((Number(rules.tokenValueEurCents) / 100).toFixed(2));
            this.form.maxRedeemPct = Number(rules.maxRedeemPct);
            this.form.stackWithPromotions = rules.stackWithPromotions ? "yes" : "no";
            this.form.expirationMonths = Number(rules.expirationMonths);
        },
        loadRules: function () {
            Request.Abort(this.loadRequestId);
            this.loading = true;
            Request.Pending(this.loadRequestId, ApiTokenRules.GetAdminTokenRules())
                .onSuccess((rules) => {
                    this.applyRulesToForm(rules);
                    this.loading = false;
                })
                .onRequestError(() => {
                    this.loading = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unable to load token rules."));
                    this.$router.push({ name: HOME_ROUTE });
                })
                .onUnexpectedError(() => {
                    this.loading = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unable to load token rules."));
                });
        },
        saveRules: function () {
            Request.Abort(this.saveRequestId);
            this.saving = true;

            const payload: TokenRulesUpdateBody = {
                emissionRatePct: Number(this.form.emissionRatePct) || 0,
                minPurchaseEurCentsToEarn: Math.max(0, Math.round((Number(this.form.minPurchaseEur) || 0) * 100)),
                minPurchaseEurCentsToRedeem: Math.max(0, Math.round((Number(this.form.minPurchaseRedeemEur) || 0) * 100)),
                tokenValueEurCents: Math.max(1, Math.round((Number(this.form.tokenValueEur) || 0) * 100)),
                maxRedeemPct: Number(this.form.maxRedeemPct) || 0,
                expirationMonths: Math.max(1, Math.round(Number(this.form.expirationMonths) || 1)),
                stackWithPromotions: this.form.stackWithPromotions === "yes",
                allowedProductKinds: this.form.allowedProductKinds || "all",
            };

            if (
                this.form.emissionRatePct === null ||
                this.form.minPurchaseEur === null ||
                this.form.minPurchaseRedeemEur === null ||
                this.form.tokenValueEur === null ||
                this.form.maxRedeemPct === null ||
                this.form.expirationMonths === null ||
                !this.form.stackWithPromotions
            ) {
                this.saving = false;
                this.$showMessageModal(this.$t("Error"), this.$t("Rules are not loaded yet."));
                return;
            }

            Request.Pending(this.saveRequestId, ApiTokenRules.UpdateAdminTokenRules(payload))
                .onSuccess((rules) => {
                    this.applyRulesToForm(rules);
                    this.saving = false;
                    this.$showMessageModal(this.$t("Saved"), this.$t("Token rules were updated successfully."));
                })
                .onRequestError(() => {
                    this.saving = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unable to update token rules."));
                })
                .onUnexpectedError(() => {
                    this.saving = false;
                    this.$showMessageModal(this.$t("Error"), this.$t("Unable to update token rules."));
                });
        },
    },
    mounted: function () {
        this.loadRules();
        this.$setSubTitle(this.$t("Tokens rules"));
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
        Request.Abort(this.saveRequestId);
    },
});
</script>

<style scoped>
.token-rules-save-actions {
    justify-content: flex-end;
}

@media (max-width: 640px) {
    .token-rules-save-actions {
        flex-direction: row;
        align-items: center;
    }

    .token-rules-save-actions .btn {
        width: auto;
        margin-left: auto;
    }
}
</style>
