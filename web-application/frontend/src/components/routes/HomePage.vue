<template>
    <div class="page-content home-page" tabindex="-1">
        <section class="hero">
            <div class="hero-blob" aria-hidden="true"></div>
            <div class="hero-inner">
                <span class="hero-pill">{{ $t("Official marketplace") }}</span>
                <h1 class="hero-title">
                    {{ $t("We transform the Hospitality sector through advanced IT solutions.") }}
                </h1>
                <p class="hero-subtitle">
                    {{
                        $t("Catalog of services, digital products and ITAAS agents ready to deploy in your hotel or restaurant operation.")
                    }}
                </p>
                <div class="hero-actions">
                    <button type="button" class="btn btn-primary" @click="goToRoute('nubem-catalog')">
                        {{ $t("Explore catalog") }}
                    </button>
                    <button type="button" class="btn btn-secondary" @click="goToRoute('plans')">
                        {{ $t("View plans") }}
                    </button>
                </div>
            </div>
        </section>
        <section class="section section-catalog">
            <div class="section-inner">
                <span class="eyebrow">{{ $t("CATALOG") }}</span>
                <h2 class="section-title">{{ $t("What you can deploy today") }}</h2>

                <div class="catalog-grid">
                    <article class="home-catalog-card">
                        <div class="home-catalog-card-head">
                            <div class="catalog-icon">
                                <i class="fas fa-cog" aria-hidden="true"></i>
                            </div>
                            <span class="tag">{{ $t("Subscription") }}</span>
                        </div>
                        <h3 class="home-catalog-card-title">{{ $t("Recurring services") }}</h3>
                        <p class="home-catalog-card-desc">{{ $t("Management, 24/7 support, maintenance") }}</p>
                    </article>

                    <article class="home-catalog-card">
                        <div class="home-catalog-card-head">
                            <div class="catalog-icon">
                                <i class="fas fa-layer-group" aria-hidden="true"></i>
                            </div>
                            <span class="tag">{{ $t("SaaS") }}</span>
                        </div>
                        <h3 class="home-catalog-card-title">{{ $t("Digital products") }}</h3>
                        <p class="home-catalog-card-desc">{{ $t("PMS, channel manager, POS and back-office modules") }}</p>
                    </article>

                    <article class="home-catalog-card home-catalog-card-featured">
                        <div class="home-catalog-card-head">
                            <div class="catalog-icon catalog-icon-featured">
                                <i class="fas fa-robot" aria-hidden="true"></i>
                            </div>
                            <span class="tag tag-featured">{{ $t("New") }}</span>
                        </div>
                        <h3 class="home-catalog-card-title">{{ $t("ITAAS Agents") }}</h3>
                        <p class="home-catalog-card-desc">{{ $t("Predefined AI agents: check-in, ...") }}</p>
                    </article>

                    <article class="home-catalog-card">
                        <div class="home-catalog-card-head">
                            <div class="catalog-icon">
                                <i class="fas fa-building" aria-hidden="true"></i>
                            </div>
                            <span class="tag">{{ $t("Business") }}</span>
                        </div>
                        <h3 class="home-catalog-card-title">{{ $t("Business plans") }}</h3>
                        <p class="home-catalog-card-desc">
                            {{ $t("Per-organization licenses, multi-property, centralized administration.") }}
                        </p>
                    </article>

                    <article class="home-catalog-card">
                        <div class="home-catalog-card-head">
                            <div class="catalog-icon">
                                <i class="fas fa-users" aria-hidden="true"></i>
                            </div>
                            <span class="tag">{{ $t("Custom") }}</span>
                        </div>
                        <h3 class="home-catalog-card-title">{{ $t("Professional services") }}</h3>
                        <p class="home-catalog-card-desc">
                            {{ $t("Custom personalization, integrations and dedicated consultancy.") }}
                        </p>
                    </article>

                    <article class="home-catalog-card">
                        <div class="home-catalog-card-head">
                            <div class="catalog-icon">
                                <i class="fas fa-coins" aria-hidden="true"></i>
                            </div>
                            <span class="tag">{{ $t("Loyalty") }}</span>
                        </div>
                        <h3 class="home-catalog-card-title">{{ $t("Loyalty program") }}</h3>
                        <p class="home-catalog-card-desc">
                            {{ $t("Nubem ERC20 token: 1 token = 1 EUR discount on future purchases.") }}
                        </p>
                    </article>
                </div>
            </div>
        </section>

        <section class="section section-business">
            <div class="section-inner">
                <div class="business-banner">
                    <div class="business-banner-content">
                        <span class="hero-pill business-pill">{{ $t("For companies · Organization") }}</span>
                        <h2 class="business-title">{{ $t("Manage a company? Request an organization") }}</h2>
                        <p class="business-desc">
                            {{
                                $t(
                                    "Submit your company and fiscal data for platform approval, then invite members, purchase Business licenses from the catalog and manage billing in one place.",
                                )
                            }}
                        </p>
                        <div class="hero-actions">
                            <button type="button" class="btn btn-business-primary" @click="goToOrganizationRequest">
                                {{ $t("Request organization") }}
                            </button>
                            <button type="button" class="btn btn-secondary" @click="$router.push({ name: 'plans' })">
                                {{ $t("View plans") }}
                            </button>
                        </div>
                    </div>

                    <div class="business-features">
                        <div class="business-feature">
                            <div class="business-feature-icon">
                                <i class="fas fa-user-friends" aria-hidden="true"></i>
                            </div>
                            <h3 class="business-feature-title">{{ $t("Organization members") }}</h3>
                            <p class="business-feature-desc">{{ $t("Invite members with organization admin or member roles") }}</p>
                        </div>
                        <div class="business-feature">
                            <div class="business-feature-icon">
                                <i class="fas fa-key" aria-hidden="true"></i>
                            </div>
                            <h3 class="business-feature-title">{{ $t("Business licenses") }}</h3>
                            <p class="business-feature-desc">{{ $t("Each Business license grants access to one active member") }}</p>
                        </div>
                        <div class="business-feature">
                            <div class="business-feature-icon">
                                <i class="fas fa-th" aria-hidden="true"></i>
                            </div>
                            <h3 class="business-feature-title">{{ $t("License assignments") }}</h3>
                            <p class="business-feature-desc">{{ $t("Assign catalog products and plans to each member") }}</p>
                        </div>
                        <div class="business-feature">
                            <div class="business-feature-icon">
                                <i class="fas fa-file-invoice" aria-hidden="true"></i>
                            </div>
                            <h3 class="business-feature-title">{{ $t("Organization billing") }}</h3>
                            <p class="business-feature-desc">{{ $t("Payments, renewals and downloadable invoices for your company") }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="section section-stats">
            <div class="section-inner stats-inner">
                <div class="stats-text">
                    <span class="eyebrow">{{ $t("VERIFIABLE TRACEABILITY") }}</span>
                    <h2 class="section-title">{{ $t("Blockchain evidence for every relevant operation") }}</h2>
                </div>
                <div class="stats-grid">
                    <div class="stat">
                        <div class="stat-value">{{ stats.subscriptions }}</div>
                        <div class="stat-label">{{ $t("Subscriptions") }}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">{{ stats.anchoredEvents }}</div>
                        <div class="stat-label">{{ $t("Anchored events") }}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">{{ stats.tokensIssued }}</div>
                        <div class="stat-label">{{ $t("Tokens issued") }}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">{{ stats.gdprCompliance }}</div>
                        <div class="stat-label">{{ $t("GDPR compliance") }}</div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { AuthController } from "@/control/auth";

export default defineComponent({
    name: "HomePage",
    components: {},
    data: function () {
        return {
            stats: {
                subscriptions: "12.4k",
                anchoredEvents: "98.3k",
                tokensIssued: "1.2M",
                gdprCompliance: "100%",
            },
        };
    },
    methods: {
        goToRoute: function (routeName: string): void {
            this.$router.push({ name: routeName });
        },
        goToOrganizationRequest: function (): void {
            if (AuthController.isAuthenticated()) {
                void this.$router.push({ name: "organization-request" });
                return;
            }
            void this.$router.push({ name: "login" });
        },
    },
    mounted: function () {},
    beforeUnmount: function () {},
});
</script>

<style scoped>
@import "@/style/layout/home-page.css";
</style>
