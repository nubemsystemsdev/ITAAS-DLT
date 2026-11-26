<#macro cookiesModal>
<div id="nubem-cookies-modal" class="nubem-cookies-modal hidden" role="dialog" aria-modal="true" aria-labelledby="nubem-cookies-modal-title" aria-hidden="true">
  <div class="nubem-cookies-dialog">
    <div class="nubem-cookies-header">
      <h2 id="nubem-cookies-modal-title" class="nubem-cookies-title">${msg("nubemCookiesModalTitle")}</h2>
    </div>
    <div class="nubem-cookies-body">
      <section class="nubem-cookie-option">
        <h3 class="nubem-cookie-option-title">${msg("nubemCookiesEssentialTitle")}</h3>
        <p class="nubem-cookie-option-lead">${msg("nubemCookiesEssentialLead")}</p>
        <ul class="nubem-cookie-purposes">
          <li><i class="fas fa-key" aria-hidden="true"></i> ${msg("nubemCookiesPurposeAuth")}</li>
          <li><i class="fas fa-hand" aria-hidden="true"></i> ${msg("nubemCookiesPurposeSpam")}</li>
        </ul>
        <div class="nubem-cookie-option-actions">
          <button type="button" class="nubem-cookie-btn nubem-cookie-btn-primary" data-cookie-pref="essential">
            <i class="fas fa-check" aria-hidden="true"></i> ${msg("nubemCookiesEssentialTitle")}
          </button>
        </div>
      </section>
      <section class="nubem-cookie-option">
        <h3 class="nubem-cookie-option-title">${msg("nubemCookiesAllTitle")}</h3>
        <p class="nubem-cookie-option-lead">${msg("nubemCookiesAllLead")}</p>
        <ul class="nubem-cookie-purposes">
          <li><i class="fas fa-chart-column" aria-hidden="true"></i> ${msg("nubemCookiesPurposeAnalytics")}</li>
          <li><i class="fas fa-user-plus" aria-hidden="true"></i> ${msg("nubemCookiesPurposePersonalize")}</li>
          <li><i class="fas fa-rectangle-ad" aria-hidden="true"></i> ${msg("nubemCookiesPurposeAds")}</li>
        </ul>
        <div class="nubem-cookie-option-actions">
          <button type="button" class="nubem-cookie-btn nubem-cookie-btn-primary" data-cookie-pref="all">
            <i class="fas fa-check" aria-hidden="true"></i> ${msg("nubemCookiesAllTitle")}
          </button>
        </div>
      </section>
    </div>
    <div class="nubem-cookies-footer">
      <div class="nubem-cookies-footer-links">
        <a id="nubem-cookies-link-terms" class="nubem-cookies-footer-link" href="#" target="_blank" rel="noopener noreferrer">${msg("nubemTermsOfUse")}</a>
        <span class="nubem-cookies-footer-sep" aria-hidden="true">|</span>
        <a id="nubem-cookies-link-policy" class="nubem-cookies-footer-link" href="#" target="_blank" rel="noopener noreferrer">${msg("nubemCookiesPolicy")}</a>
        <span class="nubem-cookies-footer-sep" aria-hidden="true">|</span>
        <a id="nubem-cookies-link-privacy" class="nubem-cookies-footer-link" href="#" target="_blank" rel="noopener noreferrer">${msg("nubemPrivacyPolicy")}</a>
      </div>
    </div>
  </div>
</div>
</#macro>
