<template>
    <div tabindex="-1">
        <ComponentLoader v-if="loading"></ComponentLoader>

        <form v-if="!loading" class="details-view-edit-form" @submit="submit">
            <div class="details-view-edit-grid details-view-edit-grid--profile">
                <div class="details-view-edit-profile-top details-view-edit-field--full" @drop="onDropImage">
                    <label class="details-view-label details-view-edit-profile-top-label" for="profile-edit-image-upload">
                        <i class="fas fa-image details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("User profile image") }}
                    </label>
                    <label class="details-view-label details-view-edit-profile-top-label" for="profile-edit-name">
                        <i class="fas fa-signature details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Profile name") }}
                    </label>

                    <div class="details-view-edit-profile-top-media">
                        <div class="details-view-avatar-block details-view-avatar-block--row">
                            <div class="details-view-avatar">
                                <img class="details-view-avatar-image" :src="displayImage" :alt="$t('User profile image')" />
                            </div>
                            <input
                                id="profile-edit-image-upload"
                                type="file"
                                class="file-hidden file-image"
                                name="image-upload"
                                @change="imageFileChanged"
                                :aria-invalid="errorImage ? 'true' : undefined"
                                :aria-describedby="errorImage ? 'profile-edit-image-upload-error' : undefined"
                            />
                            <div class="details-view-avatar-actions">
                                <button
                                    v-if="!busyImage || imageUploadProgress <= 0"
                                    type="button"
                                    :disabled="busyImage"
                                    class="btn btn-primary"
                                    @click="selectImage"
                                >
                                    <i class="fas fa-upload" aria-hidden="true"></i>
                                    {{ $t("Upload new image") }}
                                </button>
                                <button v-if="busyImage && imageUploadProgress > 0" type="button" disabled class="btn btn-primary">
                                    <i class="fa fa-spinner fa-spin" aria-hidden="true"></i>
                                    {{ $t("Uploading image") }}... ({{ imageUploadProgress }}%)
                                </button>
                                <button
                                    v-if="image"
                                    type="button"
                                    :disabled="busyImage"
                                    class="btn btn-secondary-danger"
                                    @click="deleteProfileImage"
                                >
                                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                                    {{ $t("Delete image") }}
                                </button>
                            </div>
                        </div>
                        <div v-if="errorImage" id="profile-edit-image-upload-error" class="form-error" role="alert">{{ errorImage }}</div>
                    </div>

                    <div class="details-view-edit-profile-top-name">
                        <input
                            id="profile-edit-name"
                            v-model="name"
                            type="text"
                            :disabled="busy"
                            class="form-control form-control-full-width auto-focus"
                            name="profile-name"
                            maxlength="80"
                            :aria-invalid="errorName ? 'true' : undefined"
                            :aria-describedby="errorName ? 'profile-edit-name-error' : undefined"
                            @input="markDirty"
                        />
                        <div v-if="errorName" id="profile-edit-name-error" class="form-error" role="alert">{{ errorName }}</div>
                    </div>
                </div>

                <div class="details-view-edit-field details-view-edit-field--full">
                    <label class="details-view-label" for="profile-edit-bio">
                        <i class="fas fa-align-left details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Profile description") }}
                    </label>
                    <textarea
                        id="profile-edit-bio"
                        v-model="bio"
                        :disabled="busy"
                        class="form-control form-textarea form-control-full-width"
                        name="profile-bio"
                        rows="5"
                        maxlength="300"
                        :aria-invalid="errorBio ? 'true' : undefined"
                        :aria-describedby="errorBio ? 'profile-edit-bio-error' : undefined"
                        @input="markDirty"
                    ></textarea>
                    <div v-if="errorBio" id="profile-edit-bio-error" class="form-error" role="alert">{{ errorBio }}</div>
                </div>

                <div class="details-view-edit-field">
                    <label class="details-view-label" for="profile-edit-location">
                        <i class="fas fa-location-dot details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Location") }}
                    </label>
                    <input
                        id="profile-edit-location"
                        v-model="location"
                        type="text"
                        :disabled="busy"
                        class="form-control form-control-full-width"
                        name="profile-location"
                        maxlength="100"
                        :aria-invalid="errorLocation ? 'true' : undefined"
                        :aria-describedby="errorLocation ? 'profile-edit-location-error' : undefined"
                        @input="markDirty"
                    />
                    <div v-if="errorLocation" id="profile-edit-location-error" class="form-error" role="alert">{{ errorLocation }}</div>
                </div>

                <div class="details-view-edit-field">
                    <label class="details-view-label" for="profile-edit-website">
                        <i class="fas fa-link details-view-label-icon" aria-hidden="true"></i>
                        {{ $t("Website") }}
                    </label>
                    <input
                        id="profile-edit-website"
                        v-model="website"
                        type="text"
                        :disabled="busy"
                        class="form-control form-control-full-width"
                        name="profile-website"
                        maxlength="100"
                        :placeholder="$t('https://www.example.com')"
                        :aria-invalid="errorWebsite ? 'true' : undefined"
                        :aria-describedby="errorWebsite ? 'profile-edit-website-error' : undefined"
                        @input="markDirty"
                    />
                    <div v-if="errorWebsite" id="profile-edit-website-error" class="form-error" role="alert">{{ errorWebsite }}</div>
                </div>
            </div>

            <div class="details-view-edit-actions">
                <button type="submit" :disabled="busy || !dirty" class="btn btn-primary">
                    <i class="fas fa-save" aria-hidden="true"></i>
                    {{ $t("Save changes") }}
                </button>
            </div>
            <div v-if="errorSave" class="form-error" role="alert">{{ errorSave }}</div>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { getUniqueStringId } from "@/utils/unique-id";
import { Timeouts } from "@/utils/timeout";
import { ApiProfile } from "@/api/api-group-profile";
import { AuthController } from "@/control/auth";
import { Request } from "@asanrom/request-browser";

import ComponentLoader from "@/components/utils/ComponentLoader.vue";
import userPlaceholderImage from "@/assets/user.png";

const IMAGE_UPLOAD_MAX_SIZE = 20 * 1024 * 1024;

export default defineComponent({
    name: "EditProfilePage",
    components: {
        ComponentLoader,
    },
    setup: function () {
        return {
            loadRequestId: getUniqueStringId(),
            imageRequestId: getUniqueStringId(),
            saveRequestId: getUniqueStringId(),
            userPlaceholderImage,
        };
    },
    computed: {
        displayImage: function (): string {
            return this.image || AuthController.ProfileImage || this.userPlaceholderImage;
        },
    },
    data: function () {
        return {
            loading: true,

            dirty: false,

            busyImage: false,
            imageUploadProgress: 0,
            errorImage: "",

            busy: false,

            id: "",

            name: "",
            errorName: "",

            bio: "",
            errorBio: "",

            image: "",

            location: "",
            errorLocation: "",

            website: "",
            errorWebsite: "",

            errorSave: "",
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

            Request.Pending(this.loadRequestId, ApiProfile.GetProfile(AuthController.UID))
                .onSuccess((profile) => {
                    this.loading = false;
                    this.id = profile.id;
                    this.image = profile.image || AuthController.ProfileImage || "";
                    this.name = profile.name || profile.username;
                    this.bio = profile.bio;
                    this.location = profile.location;
                    this.website = profile.website;

                    this.dirty = false;
                })
                .onRequestError((err, handleErr) => {
                    handleErr(err, {
                        notFound: () => {
                            // Retry
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

        submit: function (e: Event) {
            e.preventDefault();

            if (this.busy) {
                return;
            }

            this.errorSave = "";

            this.errorName = "";
            this.errorBio = "";
            this.errorLocation = "";
            this.errorWebsite = "";

            this.busy = true;

            Request.Pending(
                this.saveRequestId,
                ApiProfile.UpdateProfile({ name: this.name, bio: this.bio, location: this.location, website: this.website }),
            )
                .onSuccess(() => {
                    this.busy = false;
                    this.dirty = false;
                    this.$showSnackBar(this.$t("Profile successfully updated!"));
                    AuthController.CheckAuthStatus();
                })
                .onRequestError((err, handleErr) => {
                    this.busy = false;
                    handleErr(err, {
                        unauthorized: () => {
                            this.errorSave = this.$t("Error") + ": " + this.$t("Unauthorized");
                            this.$requireLogin();
                        },
                        badRequestInvalidName: () => {
                            this.errorName = this.$t("Error") + ": " + this.$t("Invalid profile name");
                        },
                        badRequestInvalidBio: () => {
                            this.errorBio = this.$t("Error") + ": " + this.$t("Invalid profile description");
                        },
                        badRequestInvalidLocation: () => {
                            this.errorLocation = this.$t("Error") + ": " + this.$t("Invalid location");
                        },
                        badRequestInvalidWebsite: () => {
                            this.errorWebsite = this.$t("Error") + ": " + this.$t("Invalid website. Must be a valid URL.");
                        },
                        badRequest: () => {
                            this.errorSave = this.$t("Error") + ": " + this.$t("Bad request");
                        },
                        serverError: () => {
                            this.errorSave = this.$t("Error") + ": " + this.$t("Internal server error");
                        },
                        networkError: () => {
                            this.errorSave = this.$t("Error") + ": " + this.$t("Could not connect to the server");
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.busy = false;
                    console.error(err);
                    this.errorSave = err.message;
                });
        },

        markDirty: function () {
            this.dirty = true;
        },

        selectImage: function () {
            const fileElem = this.$el.querySelector(".file-image");

            if (fileElem) {
                fileElem.value = null;
                fileElem.click();
            }
        },

        imageFileChanged: function (e: Event) {
            const data = (e.target as any).files;
            if (data && data.length > 0) {
                const file = data[0] as File;
                this.uploadNewImage(file);
            }
        },

        onDropImage: function (e: Event) {
            e.preventDefault();
            const data = (e as any).dataTransfer.files;
            if (data && data.length > 0) {
                const file = data[0] as File;
                this.uploadNewImage(file);
            }
        },

        uploadNewImage: function (file: File) {
            if (this.busyImage) {
                return;
            }

            if (file.size > IMAGE_UPLOAD_MAX_SIZE) {
                this.errorImage =
                    this.$t("Error") +
                    ": " +
                    this.$t("The image must not be bigger than $SIZE.").replace("$SIZE", this.renderSize(IMAGE_UPLOAD_MAX_SIZE));
                return;
            }

            this.errorImage = "";
            this.imageUploadProgress = 0;
            this.busyImage = true;

            Request.Pending(this.imageRequestId, ApiProfile.UpdateImage({ image: file }))
                .onSuccess((res) => {
                    this.busyImage = false;
                    this.image = res.url;
                    this.$showSnackBar(this.$t("Profile image successfully changed!"));
                    AuthController.CheckAuthStatus();
                })
                .onUploadProgress((loaded, total) => {
                    this.imageUploadProgress = Math.round((loaded * 100) / total);
                })
                .onRequestError((err, handleErr) => {
                    this.busyImage = false;
                    handleErr(err, {
                        unauthorized: () => {
                            this.errorImage = this.$t("Error") + ": " + this.$t("Unauthorized");
                            this.$requireLogin();
                        },
                        badRequest: () => {
                            this.errorImage = this.$t("Error") + ": " + this.$t("Invalid image provided");
                        },
                        badRequestNoImage: () => {
                            this.errorImage = this.$t("Error") + ": " + this.$t("No image selected");
                        },
                        badRequestInvalidImage: () => {
                            this.errorImage = this.$t("Error") + ": " + this.$t("Invalid image provided");
                        },
                        serverError: () => {
                            this.errorImage = this.$t("Error") + ": " + this.$t("Internal server error");
                        },
                        networkError: () => {
                            this.errorImage = this.$t("Error") + ": " + this.$t("Could not connect to the server");
                        },
                    });
                })
                .onUnexpectedError((err) => {
                    this.busyImage = false;
                    console.error(err);
                    this.errorImage = err.message;
                });
        },

        renderSize: function (bytes: number): string {
            if (bytes > 1024 * 1024 * 1024) {
                let gb = bytes / (1024 * 1024 * 1024);
                gb = Math.floor(gb * 100) / 100;
                return gb + " GB";
            } else if (bytes > 1024 * 1024) {
                let mb = bytes / (1024 * 1024);
                mb = Math.floor(mb * 100) / 100;
                return mb + " MB";
            } else if (bytes > 1024) {
                let kb = bytes / 1024;
                kb = Math.floor(kb * 100) / 100;
                return kb + " KB";
            } else {
                return bytes + " Bytes";
            }
        },

        deleteProfileImage: function () {
            if (this.busyImage) {
                return;
            }

            this.$askUserConfirmation({
                title: this.$t("Delete profile image"),
                message: this.$t("Do you want to delete your current profile image?"),
                danger: true,
                deleteAction: true,
                callback: () => {
                    if (this.busyImage) {
                        return;
                    }

                    this.errorImage = "";
                    this.imageUploadProgress = 0;
                    this.busyImage = true;

                    Request.Pending(this.imageRequestId, ApiProfile.DeleteImage())
                        .onSuccess(() => {
                            this.busyImage = false;
                            this.$showSnackBar(this.$t("Profile image successfully deleted!"));
                            AuthController.CheckAuthStatus();
                        })
                        .onRequestError((err, handleErr) => {
                            this.busyImage = false;
                            handleErr(err, {
                                unauthorized: () => {
                                    this.errorImage = this.$t("Error") + ": " + this.$t("Unauthorized");
                                    this.$requireLogin();
                                },
                                serverError: () => {
                                    this.errorImage = this.$t("Error") + ": " + this.$t("Internal server error");
                                },
                                networkError: () => {
                                    this.errorImage = this.$t("Error") + ": " + this.$t("Could not connect to the server");
                                },
                            });
                        })
                        .onUnexpectedError((err) => {
                            this.busyImage = false;
                            console.error(err);
                            this.errorImage = err.message;
                        });
                },
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

        Request.Abort(this.imageRequestId);
        Request.Abort(this.saveRequestId);
    },
});
</script>

<style scoped></style>
