<#import "field.ftl" as field>
<#import "cookies-modal.ftl" as cookiesModal>
<#macro username>
  <#assign label>
    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
  </#assign>
  <@field.group name="username" label=label>
    <div class="${properties.kcInputGroup}">
      <div class="${properties.kcInputGroupItemClass} ${properties.kcFill}">
        <span class="${properties.kcInputClass} ${properties.kcFormReadOnlyClass}">
          <input id="kc-attempted-username" value="${auth.attemptedUsername}" readonly>
        </span>
      </div>
      <div class="${properties.kcInputGroupItemClass}">
        <button id="reset-login" class="${properties.kcFormPasswordVisibilityButtonClass} kc-login-tooltip" type="button"
              aria-label="${msg('restartLoginTooltip')}" onclick="location.href='${url.loginRestartFlowUrl}'">
            <i class="fa-sync-alt fas" aria-hidden="true"></i>
            <span class="kc-tooltip-text">${msg("restartLoginTooltip")}</span>
        </button>
      </div>
    </@field.group>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}"<#if realm.internationalizationEnabled> lang="${locale.currentLanguageTag}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" type="image/png" sizes="32x32" href="${url.resourcesPath}/img/favicon.png" />
    <link rel="shortcut icon" type="image/png" href="${url.resourcesPath}/img/favicon.png" />
    <link rel="apple-touch-icon" href="${url.resourcesPath}/img/favicon.png" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#-- Theme/locale sync with Marketplace (shared/nubem-sso-cookies.js). Runs before paint. -->
    <script>
        (function () {
            var C = window.NubemSsoCookies;
            if (!C) return;
            C.applyThemeClass(C.resolveTheme());
            window.__nubemApplyTheme = C.applyTheme;
            C.syncLocaleFromCookie();
        })();
    </script>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <script type="module">
        import { checkCookiesAndSetTimer } from "${url.resourcesPath}/js/authChecker.js";

        checkCookiesAndSetTimer(
            "${url.ssoLoginInOtherTabsUrl?no_esc}"
        );
    </script>
</head>

<body id="keycloak-bg" class="${properties.kcBodyClass!} nubem-auth-page">

<div class="${properties.kcLogin!}">
  <div class="${properties.kcLoginContainer!}">
    <main class="${properties.kcLoginMain!}">
      <div class="${properties.kcLoginMainHeader!}">
        <div id="kc-header-wrapper" class="nubem-brand-logo">
          <img class="nubem-logo-light" src="${url.resourcesPath}/img/logo-navy.png" alt="${realm.displayName!''}" />
          <img class="nubem-logo-dark" src="${url.resourcesPath}/img/logo-white.png" alt="${realm.displayName!''}" />
        </div>
        <h1 class="${properties.kcLoginMainTitle!}" id="kc-page-title"><#nested "header"></h1>
        <#nested "subtitle">
      </div>
      <div class="${properties.kcLoginMainBody!}">
        <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
            <#if displayRequiredFields>
                <div class="${properties.kcContentWrapperClass!}">
                    <div class="${properties.kcLabelWrapperClass!} subtitle">
                        <span class="${properties.kcInputHelperTextItemTextClass!}">
                          <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                        </span>
                    </div>
                </div>
            </#if>
        <#else>
            <#if displayRequiredFields>
                <div class="${properties.kcContentWrapperClass!}">
                    <div class="${properties.kcLabelWrapperClass!} subtitle">
                        <span class="${properties.kcInputHelperTextItemTextClass!}">
                          <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                        </span>
                    </div>
                    <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                        <#nested "show-username">
                        <@username />
                    </div>
                </div>
            <#else>
                <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                  <#nested "show-username">
                  <@username />
                </div>
            </#if>
        </#if>

        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <div class="${properties.kcAlertClass!} pf-m-${(message.type = 'error')?then('danger', message.type)}">
                <div class="${properties.kcAlertIconClass!}">
                    <#if message.type = 'success'><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
                    <#if message.type = 'warning'><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
                    <#if message.type = 'error'><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
                    <#if message.type = 'info'><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
                </div>
                <span class="${properties.kcAlertTitleClass!} kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
            </div>
        </#if>

        <#nested "form">

        <#if auth?has_content && auth.showTryAnotherWayLink()>
          <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
              <input type="hidden" name="tryAnotherWay" value="on"/>
              <a id="try-another-way" href="javascript:document.forms['kc-select-try-another-way-form'].submit()"
                  class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass} ${properties.kcMarginTopClass}">
                    ${kcSanitize(msg("doTryAnotherWay"))?no_esc}
              </a>
          </form>
        </#if>

        <#if displayInfo>
          <div id="kc-info" class="${properties.kcSignUpClass!}">
              <div id="kc-info-wrapper" class="${properties.kcInfoAreaWrapperClass!}">
                  <#nested "info">
              </div>
          </div>
        </#if>
      </div>
      <div class="pf-v5-c-login__main-footer">
        <#nested "socialProviders">
        <div class="nubem-auth-footer">
        <#if realm.internationalizationEnabled && locale.supported?size gt 1>
          <#list locale.supported?sort_by("label") as l>
            <#if l.languageTag != locale.currentLanguageTag>
              <a
                id="nubem-lang-toggle"
                class="nubem-footer-btn"
                href="${l.url}"
                onclick="window.__nubemSetLocale && window.__nubemSetLocale('${l.languageTag}');"
                hreflang="${l.languageTag}"
                aria-label="${msg('languages')}"
                title="${msg('languages')}"
              ><i class="fas fa-language" aria-hidden="true"></i></a>
            </#if>
          </#list>
        <#else>
          <button type="button" class="nubem-footer-btn" aria-label="${msg('languages')}" title="${msg('languages')}" disabled>
            <i class="fas fa-language" aria-hidden="true"></i>
          </button>
        </#if>
        <button type="button" id="nubem-theme-toggle" class="nubem-footer-btn" aria-label="${msg('doSwitchTheme')}" title="${msg('doSwitchTheme')}">
          <i class="fas fa-moon nubem-icon-dark" aria-hidden="true"></i>
          <i class="fas fa-sun nubem-icon-light" aria-hidden="true"></i>
        </button>
        <button type="button" id="nubem-cookies-open" class="nubem-footer-btn" aria-label="${msg('nubemCookiesPreferences')}" title="${msg('nubemCookiesPreferences')}">
          <i class="fas fa-cookie" aria-hidden="true"></i>
        </button>
        </div>
      </div>
    </main>
  </div>
</div>
<@cookiesModal.cookiesModal />
<script>
    (function () {
        var C = window.NubemSsoCookies;
        window.__nubemSetLocale = function (tag) {
            if (C) {
                C.setLocale(tag);
            }
        };
        var btn = document.getElementById("nubem-theme-toggle");
        if (btn) {
            btn.addEventListener("click", function () {
                var isDark = document.documentElement.classList.contains("pf-v5-theme-dark");
                if (window.__nubemApplyTheme) {
                    window.__nubemApplyTheme(isDark ? "light" : "dark");
                }
            });
        }
    })();
</script>
</body>
</html>
</#macro>
