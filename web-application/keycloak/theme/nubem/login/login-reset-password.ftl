<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>

    <#if section = "header">
        ${msg("nubemForgotPasswordTitle")}
    <#elseif section = "subtitle">
        <p class="nubem-card-subtitle">${msg("nubemForgotPasswordSubtitle")}</p>
    <#elseif section = "form">
        <form id="kc-reset-password-form" class="${properties.kcFormClass!} nubem-forgot-form" action="${url.loginAction}" method="post" novalidate="novalidate">
            <@field.input
                name="username"
                label=msg("nubemForgotPasswordEmail")
                value=auth.attemptedUsername!''
                autofocus=true
                autocomplete="email"
                inputType="email"
                placeholder=msg("nubemForgotPasswordPlaceholder")
            />

            <div class="${properties.kcFormGroupClass!} nubem-forgot-submit">
                <@buttons.button id="kc-form-buttons" label="nubemForgotPasswordSend" class=["kcButtonPrimaryClass", "kcButtonBlockClass"]/>
            </div>
        </form>
    <#elseif section = "info">
        <div class="nubem-links-block nubem-forgot-links-block">
            <p><a href="${url.loginUrl}" class="nubem-form-link">${msg("nubemForgotPasswordBack")}</a></p>
        </div>
    </#if>
</@layout.registrationLayout>
