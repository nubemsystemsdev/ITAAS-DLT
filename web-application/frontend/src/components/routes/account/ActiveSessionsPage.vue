<template>
    <div tabindex="-1">
        <ComponentLoader v-if="loading"></ComponentLoader>

        <div v-else>
            <div class="table-responsive">
                <table class="table table-wide table-stack">
                    <thead>
                        <tr>
                            <th scope="col">{{ $t("Date") }}</th>
                            <th scope="col">{{ $t("IP address") }}</th>
                            <th scope="col">{{ $t("Operating system") }}</th>
                            <th scope="col">{{ $t("Web browser") }}</th>
                            <th scope="col">{{ $t("Actions") }}</th>
                        </tr>
                    </thead>
                    <tbody v-if="sessions.length === 0">
                        <tr>
                            <td colspan="5" class="table-feedback">{{ $t("No active sessions found") }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-for="s in sessions" :key="s.session">
                            <td :data-label="$t('Date')" class="table-stack-row-primary">{{ renderDate(s.created) }}</td>
                            <td :data-label="$t('IP address')">{{ s.remote }}</td>
                            <td :data-label="$t('Operating system')">{{ s.os }}</td>
                            <td :data-label="$t('Web browser')">{{ s.browser }}</td>
                            <td v-if="s.current" :data-label="$t('Actions')" class="actions-cell text-center">
                                ({{ $t("Current session") }})
                            </td>
                            <td v-if="!s.current" :data-label="$t('Actions')" class="actions-cell text-center">
                                <button
                                    type="button"
                                    class="btn btn-secondary-danger btn-xs icon-only-button-mobile"
                                    :aria-label="$t('Close session')"
                                    :title="$t('Close session')"
                                    @click="closeSession(s.session)"
                                >
                                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                                    <span class="btn-label">{{ $t("Close session") }}</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="details-view-edit-actions">
                <button type="button" class="btn btn-secondary-danger" @click="closeAllSessions">
                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    {{ $t("Close all sessions") }}
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";
import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";

import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { ApiAccount } from "@/api/api-group-account";
import { renderDateAndTime } from "@/utils/time-utils";
import { SessionListItem } from "@/api/definitions";

export default defineComponent({
    name: "ActiveSessionsPage",
    components: {
        ComponentLoader,
    },
    setup: function () {
        return {
            loadRequestId: getUniqueStringId(),
            closeSessionRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            loading: true,

            sessions: [] as SessionListItem[],

            busy: false,
        };
    },
    methods: {
        load: function () {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            this.loading = true;

            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
                return;
            }

            Request.Pending(this.loadRequestId, ApiAccount.GetSessions())
                .onSuccess((sessions) => {
                    this.sessions = sessions;
                    this.loading = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
                        },
                        temporalError: () => {
                            // Retry
                            Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    // Retry
                    Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                });
        },

        renderDate: function (t: number): string {
            return renderDateAndTime(t, this.$t);
        },

        closeSession: function (s: string) {
            if (this.busy) {
                return;
            }

            this.busy = true;

            Request.Pending(this.closeSessionRequestId, ApiAccount.CloseSession(s))
                .onSuccess(() => {
                    this.busy = false;
                    this.sessions = this.sessions.filter((sessionData) => {
                        return sessionData.session !== s;
                    });
                    this.$showSnackBar(this.$t("Remote device session removed"));
                })
                .onCancel(() => {
                    this.busy = false;
                })
                .onRequestError((err, handleErr) => {
                    this.busy = false;
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
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
                    this.$showMessageModal(this.$t("Error"), err.message);
                    console.error(err);
                    this.busy = false;
                });
        },

        closeAllSessions: function () {
            this.$askUserConfirmation({
                title: this.$t("Close all sessions"),
                message: this.$t("Do you want to close all the active sessions?"),
                danger: true,
                callback: () => {
                    this.doCloseAllSessions();
                },
            });
        },

        doCloseAllSessions: function () {
            if (this.busy) {
                return;
            }

            this.busy = true;

            Request.Pending(this.closeSessionRequestId, ApiAccount.CloseAllSessions())
                .onSuccess(() => {
                    this.busy = false;
                    this.$showSnackBar(this.$t("All active sessions closed"));
                    this.load();
                })
                .onCancel(() => {
                    this.busy = false;
                })
                .onRequestError((err, handleErr) => {
                    this.busy = false;
                    handleErr(err, {
                        unauthorized: () => {
                            this.$requireLogin();
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
                    this.$showMessageModal(this.$t("Error"), err.message);
                    console.error(err);
                    this.busy = false;
                });
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.load.bind(this));

        this.load();
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadRequestId);
        Request.Abort(this.loadRequestId);

        Request.Abort(this.closeSessionRequestId);
    },
});
</script>

<style scoped>
@import "@/style/tables.css";
</style>
