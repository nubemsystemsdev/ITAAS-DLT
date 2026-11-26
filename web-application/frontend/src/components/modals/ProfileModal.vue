<template>
    <ModalDialogContainer ref="modalContainer" v-model:display="displayStatus">
        <div class="modal-dialog modal-md" @click="stopPropagationEvent">
            <div class="modal-header">
                <div class="modal-title">{{ modalTitle }}</div>
                <button type="button" class="modal-close-btn" :title="$t('Close')" :aria-label="$t('Close')" @click="close">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>

            <div class="modal-body modal-body-profile">
                <ComponentLoader v-if="loading"></ComponentLoader>

                <p v-else-if="notFound" class="profile-modal-not-found">
                    {{ $t("The user you are looking for does not exist or was deleted from the platform.") }}
                </p>

                <article v-else class="profile-modal-card" :aria-label="modalTitle">
                    <div class="profile-modal-card-media">
                        <img v-if="image" :src="image" :alt="$t('User profile image')" />
                        <img v-else src="@/assets/user.png" :alt="$t('User profile image')" />
                    </div>
                    <div class="profile-modal-card-body">
                        <h2 class="profile-modal-name">{{ name || username }}</h2>
                        <p class="profile-modal-username">{{ "@" + username }}</p>
                        <p v-if="bio" class="profile-modal-bio">{{ bio }}</p>
                        <ul v-if="hasFacts" class="profile-modal-facts" role="list">
                            <li v-if="joinDate">
                                <i class="fas fa-calendar" aria-hidden="true"></i>
                                <span>{{ $t("Join date") }}: {{ renderDate(joinDate) }}</span>
                            </li>
                            <li v-if="location">
                                <i class="fas fa-location-dot" aria-hidden="true"></i>
                                <span>{{ location }}</span>
                            </li>
                            <li v-if="website">
                                <i class="fas fa-link" aria-hidden="true"></i>
                                <a :href="website" target="_blank" rel="noopener noreferrer">{{ website }}</a>
                            </li>
                        </ul>
                    </div>
                </article>
            </div>

            <div class="modal-footer" v-if="!loading">
                <button type="button" class="btn btn-tertiary" @click="close">
                    {{ $t("Close") }}
                </button>
            </div>
        </div>
    </ModalDialogContainer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useVModel } from "../../utils/v-model";
import { Timeouts } from "@/utils/timeout";
import { Request } from "@asanrom/request-browser";
import { getUniqueStringId } from "@/utils/unique-id";
import { ApiProfile } from "@/api/api-group-profile";
import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import { renderDate } from "@/utils/time-utils";

export default defineComponent({
    name: "ProfileModal",
    components: {
        ComponentLoader,
    },
    emits: ["update:display"],
    props: {
        display: Boolean,
        uid: String,
    },
    setup(props) {
        return {
            displayStatus: useVModel(props, "display"),
            loadRequestId: getUniqueStringId(),
        };
    },
    data: function () {
        return {
            loading: true,
            notFound: false,

            username: "",
            joinDate: "",
            name: "",
            bio: "",
            image: "",
            location: "",
            website: "",
        };
    },
    computed: {
        hasFacts: function (): boolean {
            return !!(this.joinDate || this.location || this.website);
        },

        modalTitle: function (): string {
            if (this.loading) {
                return this.$t("Loading profile") + "...";
            }
            if (this.notFound) {
                return this.$t("User not found");
            }
            return this.$t("Public profile");
        },
    },
    methods: {
        close: function () {
            this.$closeModal();
        },

        escapeToClose: function (event) {
            if (event.key === "Escape") {
                this.close();
            }
        },

        stopPropagationEvent: function (e) {
            e.stopPropagation();
        },

        renderDate: function (date: string) {
            return renderDate(date, this.$t);
        },

        load: function () {
            Timeouts.Abort(this.loadRequestId);
            Request.Abort(this.loadRequestId);

            this.loading = true;

            Request.Pending(this.loadRequestId, ApiProfile.GetProfile(this.uid))
                .onSuccess((profile) => {
                    this.loading = false;
                    this.notFound = false;
                    this.image = profile.image || "";
                    this.name = profile.name || "";
                    this.username = profile.username || "";
                    this.joinDate = profile.joinDate || "";
                    this.bio = profile.bio || "";
                    this.location = profile.location || "";
                    this.website = profile.website || "";
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        notFound: () => {
                            this.loading = false;
                            this.notFound = true;
                        },
                        temporalError: () => {
                            Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    console.error(err);
                    Timeouts.Set(this.loadRequestId, 1500, this.load.bind(this));
                });
        },
    },
    mounted: function () {
        if (this.display) {
            this.load();
            this.$autoFocus();
        }
    },
    beforeUnmount: function () {
        Timeouts.Abort(this.loadRequestId);
        Request.Abort(this.loadRequestId);
    },
    watch: {
        display: function () {
            if (this.display) {
                this.load();
                this.$autoFocus();
            }
        },
        uid: function () {
            if (this.display) {
                this.load();
            }
        },
    },
});
</script>

<style scoped>
@import "@/style/profile-modal.css";
</style>
