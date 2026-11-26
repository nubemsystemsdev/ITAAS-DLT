<template>
    <div class="modal-container modal-container-signup modal-container-opaque no-transition" tabindex="-1">
        <div class="modal-dialog modal-md">
            <div class="modal-header">
                <div class="modal-title no-close">{{ $t("Account created") }}</div>
            </div>
            <div class="modal-body">
                <div class="">
                    <p>
                        {{
                            $t("Your account has been successfully registered.") +
                            " " +
                            $t("Check your email box, we have sent you a link to verify your account.")
                        }}
                    </p>
                </div>
            </div>
            <div class="modal-footer">
                <router-link :to="{ name: 'login' }">
                    <button type="button" class="btn btn-login"><i class="fa fa-check"></i> {{ $t("Done") }}</button>
                </router-link>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "SignupSuccessPage",
    components: {},
    data: function () {
        return {
            error: "",
        };
    },
});
</script>

<style></style>
