<template>
    <div class="content-inner" tabindex="-1">
        <div>
            <h2>{{ $t("Active sessions") }}</h2>
            <div class="table-responsive">
                <table class="table table-stack">
                    <thead>
                        <tr>
                            <th>{{ $t("Date") }}</th>
                            <th>{{ $t("IP address") }}</th>
                            <th>{{ $t("Operating system") }}</th>
                            <th>{{ $t("Web browser") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="sessions.length === 0">
                            <td colspan="5" class="table-feedback">{{ $t("No active sessions found") }}</td>
                        </tr>
                        <tr v-for="s in sessions" :key="s.session">
                            <td :data-label="$t('Date')" class="table-stack-row-primary">{{ renderDate(s.created) }}</td>
                            <td :data-label="$t('IP address')">{{ s.remote }}</td>
                            <td :data-label="$t('Operating system')">{{ s.os }}</td>
                            <td :data-label="$t('Web browser')">{{ s.browser }}</td>
                            <td class="table-stack-skip"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import { AuthController } from "@/control/auth";
import { renderDateAndTime } from "@/utils/time-utils";
import { SessionListItem } from "@/api/definitions";

export default defineComponent({
    name: "UserSessionsPage",
    components: {},
    props: {
        sessions: Array as PropType<SessionListItem[]>,
    },
    methods: {
        onAuthChanged: function () {
            if (!AuthController.isAuthenticated()) {
                this.$requireLogin();
            }
        },

        renderDate: function (ts: number) {
            return renderDateAndTime(ts, this.$t);
        },
    },
    mounted: function () {
        this.$listenOnAppEvent("auth-status-changed", this.onAuthChanged.bind(this));

        if (AuthController.isAuthenticated()) {
            this.$autoFocus();
        } else {
            this.$requireLogin();
        }
    },
});
</script>

<style></style>
