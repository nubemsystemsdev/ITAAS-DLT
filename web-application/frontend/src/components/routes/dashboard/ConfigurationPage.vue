<template>
    <div class="page-content configuration-page" tabindex="-1">
        <!-- Hidden temporarily.
        <section class="configuration-header">
            <p class="configuration-eyebrow">{{ $t("Superadmin") }}</p>
            <h1 class="configuration-title">{{ $t("Global configuration") }}</h1>
            <p class="configuration-subtitle">
                {{ $t("Sensitive settings. All actions require MFA and double confirmation.") }}
            </p>
        </section>

        <section class="configuration-grid">
            <button
                v-for="option in options"
                :key="option.key"
                type="button"
                class="configuration-card"
                :title="$t(option.title)"
                :aria-label="$t(option.title)"
                :disabled="!option.enabled"
                @click="onOptionClick(option)"
            >
                <span class="configuration-card-icon" aria-hidden="true">
                    <i :class="option.icon"></i>
                </span>
                <span class="configuration-card-body">
                    <span class="configuration-card-title">{{ $t(option.title) }}</span>
                    <span class="configuration-card-description">{{ $t(option.description) }}</span>
                </span>
                <span class="configuration-card-arrow" aria-hidden="true">
                    <i class="fas fa-arrow-right"></i>
                </span>
            </button>
        </section>
        -->
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

type ConfigurationOption = {
    key: string;
    title: string;
    description: string;
    icon: string;
    enabled: boolean;
};

export default defineComponent({
    name: "ConfigurationPage",
    data: function () {
        return {
            options: [
                {
                    key: "security",
                    title: "Security & RBAC",
                    description: "Mandatory MFA, password policy, sessions",
                    icon: "fas fa-shield-halved",
                    enabled: false,
                },
                {
                    key: "tenants",
                    title: "Tenants and multi-organization",
                    description: "Tenant creation, segregation and isolation",
                    icon: "fas fa-building",
                    enabled: false,
                },
                {
                    key: "integrations",
                    title: "Integrations",
                    description: "Stripe, blockchain network, Flowise, agent runtime",
                    icon: "fas fa-link",
                    enabled: false,
                },
                {
                    key: "notifications",
                    title: "Notifications",
                    description: "Transactional email, webhooks and internal alerts",
                    icon: "fas fa-bell",
                    enabled: false,
                },
                {
                    key: "backups",
                    title: "Backups & retention",
                    description: "GDPR policies and evidence preservation",
                    icon: "fas fa-file-shield",
                    enabled: false,
                },
                {
                    key: "availability",
                    title: "Service availability",
                    description: "Blockchain: controlled degradation + queues",
                    icon: "fas fa-chart-line",
                    enabled: false,
                },
            ] as ConfigurationOption[],
        };
    },
    methods: {
        onOptionClick: function (_option: ConfigurationOption) {
            // Options do not have a destination view yet. They will be wired in upcoming iterations.
        },
    },
    mounted: function () {
        this.$setSubTitle(this.$t("Configuration"));
        this.$autoFocus();
    },
});
</script>

<style scoped>
.configuration-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-24);
    padding: var(--space-24);
    background: var(--color-bg-surface);
    color: var(--color-text-primary);
}

.configuration-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.configuration-eyebrow {
    margin: 0;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-muted);
    letter-spacing: 0.5px;
}

.configuration-title {
    margin: 0;
    font-size: 32px;
    line-height: 40px;
    font-weight: 700;
    color: var(--color-text-primary);
}

.configuration-subtitle {
    margin: 0;
    font-size: 16px;
    line-height: 24px;
    color: var(--color-text-muted);
    max-width: 720px;
}

.configuration-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-16);
}

.configuration-card {
    display: flex;
    align-items: center;
    gap: var(--space-16);
    width: 100%;
    min-height: 88px;
    padding: var(--space-16);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-neutral-light);
    border-radius: var(--radius-lg);
    box-shadow: var(--elevation-1);
    color: var(--color-text-primary);
    text-align: left;
    cursor: pointer;
    font-family: "Comfortaa", sans-serif;
    transition:
        box-shadow 0.25s ease,
        transform 0.25s ease,
        border-color 0.2s ease;
}

.configuration-card:hover:not(:disabled),
.configuration-card:focus-visible:not(:disabled) {
    box-shadow: var(--elevation-3);
    transform: translateY(-2px);
    border-color: var(--color-brand-secondary);
    outline: none;
}

.configuration-card:focus-visible {
    outline: 2px solid var(--color-brand-secondary);
    outline-offset: 2px;
}

.configuration-card:disabled {
    cursor: not-allowed;
    opacity: 0.85;
}

.configuration-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-neutral-light);
    color: var(--color-text-primary);
    font-size: 18px;
    line-height: 26px;
}

.configuration-card-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    flex: 1;
    min-width: 0;
}

.configuration-card-title {
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: var(--color-text-primary);
}

.configuration-card-description {
    font-size: 14px;
    line-height: 20px;
    font-weight: 400;
    color: var(--color-text-muted);
}

.configuration-card-arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    color: var(--color-text-muted);
    font-size: 14px;
    line-height: 20px;
    transition:
        color 0.2s ease,
        transform 0.2s ease;
}

.configuration-card:hover:not(:disabled) .configuration-card-arrow,
.configuration-card:focus-visible:not(:disabled) .configuration-card-arrow {
    color: var(--color-text-primary);
    transform: translateX(2px);
}

@media (max-width: 1024px) {
    .configuration-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}

@media (max-width: 640px) {
    .configuration-page {
        padding: var(--space-16);
    }

    .configuration-title {
        font-size: 24px;
        line-height: 32px;
    }

    .configuration-card {
        padding: var(--space-12);
    }
}
</style>
