<template>
    <div class="organization-fiscal-data" tabindex="-1">
        <ComponentLoader v-if="loading"></ComponentLoader>

        <template v-else-if="notFound">
            <p class="organization-fiscal-state-message">{{ $t("Organization not found") }}</p>
        </template>

        <form v-else class="organization-fiscal-form" @submit="submit">
            <header class="organization-fiscal-header">
                <h2 class="organization-fiscal-title">{{ $t("Edit organization") }}</h2>
                <p class="organization-fiscal-description">
                    {{ $t("Edit the organization information.") }}
                </p>
            </header>

            <div class="organization-fiscal-grid">
                <div class="organization-fiscal-field">
                    <label class="organization-fiscal-label" for="org-fiscal-company-name">{{ $t("Legal name") }}</label>
                    <input
                        id="org-fiscal-company-name"
                        v-model="editCompanyName"
                        type="text"
                        maxlength="255"
                        class="organization-fiscal-input"
                        :disabled="saving"
                        :aria-invalid="companyNameError ? 'true' : undefined"
                        :aria-describedby="companyNameError ? 'org-fiscal-company-name-error' : undefined"
                    />
                    <div v-if="companyNameError" id="org-fiscal-company-name-error" class="form-error" role="alert">
                        {{ companyNameError }}
                    </div>
                </div>

                <div class="organization-fiscal-field">
                    <label class="organization-fiscal-label" for="org-fiscal-cif-nif">{{ $t("CIF / NIF") }}</label>
                    <input
                        id="org-fiscal-cif-nif"
                        :value="cifNif"
                        type="text"
                        readonly
                        class="organization-fiscal-input organization-fiscal-input-readonly"
                        :aria-label="$t('CIF / NIF')"
                    />
                </div>

                <div class="organization-fiscal-field">
                    <label class="organization-fiscal-label" for="org-fiscal-address">{{ $t("Fiscal address") }}</label>
                    <input
                        id="org-fiscal-address"
                        v-model="editFiscalAddress"
                        type="text"
                        maxlength="255"
                        class="organization-fiscal-input"
                        :disabled="saving"
                        :aria-invalid="fiscalAddressError ? 'true' : undefined"
                        :aria-describedby="fiscalAddressError ? 'org-fiscal-address-error' : undefined"
                    />
                    <div v-if="fiscalAddressError" id="org-fiscal-address-error" class="form-error" role="alert">
                        {{ fiscalAddressError }}
                    </div>
                </div>

                <div class="organization-fiscal-field">
                    <label class="organization-fiscal-label" for="org-fiscal-country">{{ $t("Country") }}</label>
                    <input
                        id="org-fiscal-country"
                        v-model="editCountry"
                        type="text"
                        maxlength="255"
                        class="organization-fiscal-input"
                        :disabled="saving"
                        :aria-invalid="countryError ? 'true' : undefined"
                        :aria-describedby="countryError ? 'org-fiscal-country-error' : undefined"
                    />
                    <div v-if="countryError" id="org-fiscal-country-error" class="form-error" role="alert">{{ countryError }}</div>
                </div>

                <div class="organization-fiscal-field">
                    <label class="organization-fiscal-label" for="org-fiscal-email">{{ $t("Billing email") }}</label>
                    <input
                        id="org-fiscal-email"
                        v-model="editEmail"
                        type="email"
                        maxlength="255"
                        class="organization-fiscal-input"
                        :disabled="saving"
                        :aria-invalid="emailError ? 'true' : undefined"
                        :aria-describedby="emailError ? 'org-fiscal-email-error' : undefined"
                    />
                    <div v-if="emailError" id="org-fiscal-email-error" class="form-error" role="alert">{{ emailError }}</div>
                </div>
            </div>

            <div class="organization-fiscal-actions">
                <button type="submit" class="btn btn-primary" :disabled="saving || !organizationHasChanges">
                    <i class="fas fa-save" aria-hidden="true"></i>
                    {{ $t("Save changes") }}
                </button>
            </div>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Request } from "@asanrom/request-browser";
import { ApiOrganizations } from "@/api/api-group-organizations";
import { OrgItem } from "@/api/definitions";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { OrganizationController } from "@/control/organization";
import { getUniqueStringId } from "@/utils/unique-id";

export default defineComponent({
    name: "OrganizationFiscalDataPage",
    components: {
        ComponentLoader,
    },
    data: function () {
        return {
            loadRequestId: getUniqueStringId(),
            updateRequestId: getUniqueStringId(),
            loading: true,
            notFound: false,
            saving: false,
            organizationId: "",
            companyName: "",
            cifNif: "",
            country: "",
            fiscalAddress: "",
            email: "",
            editCompanyName: "",
            editFiscalAddress: "",
            editEmail: "",
            editCountry: "",
            companyNameError: "",
            fiscalAddressError: "",
            emailError: "",
            countryError: "",
        };
    },
    computed: {
        organizationHasChanges: function (): boolean {
            return (
                this.editCompanyName !== this.companyName ||
                this.editFiscalAddress !== this.fiscalAddress ||
                this.editEmail !== this.email ||
                this.editCountry !== this.country
            );
        },
    },
    methods: {
        applyOrganization: function (org: OrgItem): void {
            this.organizationId = org.id || "";
            this.companyName = org.companyName || "";
            this.cifNif = org.cifNif || "";
            this.country = org.country || "";
            this.fiscalAddress = org.fiscalAddress || "";
            this.email = org.email || "";
            this.syncEditForm();
        },

        syncEditForm: function (): void {
            this.editCompanyName = this.companyName;
            this.editFiscalAddress = this.fiscalAddress;
            this.editEmail = this.email;
            this.editCountry = this.country;
            this.companyNameError = "";
            this.fiscalAddressError = "";
            this.emailError = "";
            this.countryError = "";
        },

        load: function (): void {
            Request.Abort(this.loadRequestId);
            this.loading = true;
            this.notFound = false;

            Request.Pending(this.loadRequestId, ApiOrganizations.GetMyOrganization())
                .onSuccess((org) => {
                    this.loading = false;
                    this.applyOrganization(org);
                })
                .onCancel(() => {
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        notFoundOrganizationNotFound: () => {
                            this.loading = false;
                            this.notFound = true;
                        },
                        notFound: () => {
                            this.loading = false;
                            this.notFound = true;
                        },
                        temporalError: () => {
                            this.load();
                        },
                        networkError: () => {
                            this.loading = false;
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                        },
                        serverError: () => {
                            this.loading = false;
                            this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.loading = false;
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },

        submit: function (event: Event): void {
            event.preventDefault();
            if (!this.organizationId || this.saving || !this.organizationHasChanges) {
                return;
            }

            this.companyNameError = "";
            this.fiscalAddressError = "";
            this.emailError = "";
            this.countryError = "";
            this.saving = true;

            Request.Abort(this.updateRequestId);
            Request.Pending(
                this.updateRequestId,
                ApiOrganizations.UpdateOrganization(this.organizationId, {
                    companyName: (this.editCompanyName || "").trim(),
                    fiscalAddress: (this.editFiscalAddress || "").trim(),
                    email: (this.editEmail || "").trim(),
                    country: (this.editCountry || "").trim(),
                }),
            )
                .onSuccess(() => {
                    this.saving = false;
                    this.$showSnackBar(this.$t("Organization successfully updated"));
                    void OrganizationController.Refresh().then(() => {
                        this.load();
                    });
                })
                .onCancel(() => {
                    this.saving = false;
                })
                .onRequestError((err, handleErr) => {
                    this.saving = false;
                    handleErr(err, {
                        unauthorized: () => this.$requireLogin(),
                        badRequestInvalidCompanyName: () => {
                            this.companyNameError = this.$t("Invalid organization name");
                        },
                        badRequestInvalidFiscalAddress: () => {
                            this.fiscalAddressError = this.$t("Invalid fiscal address");
                        },
                        badRequestInvalidEmail: () => {
                            this.emailError = this.$t("Invalid email provided");
                        },
                        badRequestInvalidCountry: () => {
                            this.countryError = this.$t("Invalid country provided");
                        },
                        badRequest: () => {
                            this.companyNameError = this.$t("Bad request");
                        },
                        notFoundOrganizationNotFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
                            this.load();
                        },
                        notFound: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Organization not found"));
                            this.load();
                        },
                        forbidden: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Access denied"));
                        },
                        serverError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Internal server error"));
                        },
                        networkError: () => {
                            this.$showMessageModal(this.$t("Error"), this.$t("Could not connect to the server"));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.saving = false;
                    this.$showMessageModal(this.$t("Error"), err.message || this.$t("Internal server error"));
                });
        },
    },
    mounted: function () {
        this.load();
        this.$autoFocus();
    },
    beforeUnmount: function () {
        Request.Abort(this.loadRequestId);
        Request.Abort(this.updateRequestId);
    },
});
</script>

<style scoped>
.organization-fiscal-data {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
}

.organization-fiscal-state-message {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-muted);
}

.organization-fiscal-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-24);
}

.organization-fiscal-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
}

.organization-fiscal-title {
    margin: 0;
    font-size: 20px;
    line-height: 28px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.organization-fiscal-description {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-text-muted);
}

.organization-fiscal-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-16);
}

.organization-fiscal-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    min-width: 0;
}

.organization-fiscal-label {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    color: var(--color-text-muted);
}

.organization-fiscal-input {
    width: 100%;
    min-height: 44px;
    padding: var(--space-8) var(--space-12);
    border: 1px solid var(--theme-border-color);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    color: var(--color-text-primary);
    font-family: inherit;
    font-size: 14px;
    line-height: 20px;
    font-weight: 400;
}

.organization-fiscal-input::placeholder {
    font-family: inherit;
    font-size: 14px;
    line-height: 20px;
    font-weight: 400;
    color: var(--color-text-muted);
}

.organization-fiscal-input:focus-visible {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}

.organization-fiscal-input-readonly {
    cursor: default;
    color: var(--color-text-muted);
}

.organization-fiscal-actions {
    display: flex;
    justify-content: flex-end;
}

.organization-fiscal-actions .btn {
    min-height: 48px;
    min-width: 48px;
}

@media (max-width: 640px) {
    .organization-fiscal-grid {
        grid-template-columns: 1fr;
    }

    .organization-fiscal-actions {
        justify-content: stretch;
    }

    .organization-fiscal-actions .btn {
        width: 100%;
    }
}
</style>
