<#import "template.ftl" as layout>
<#assign username = (user.username)!((user.email)!'')>
<#assign brand = msg("nubemEmailBrand")>
<@layout.emailLayout>
    <tr>
        <td style="padding: 0 40px 24px 40px;">
            <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 16px; line-height: 24px; font-weight: 400; color: #1C2659;">
                ${kcSanitize(msg("nubemEmailVerificationBodyHtml", username, brand))?no_esc}
            </p>
        </td>
    </tr>
    <tr>
        <td align="left" style="padding: 0 40px 40px 40px;">
            <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" bgcolor="#5A7BAE" style="border-radius: 6px;">
                        <a href="${link}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 16px; font-weight: 600; color: #FFFFFF; text-decoration: none;">
                            ${msg("nubemEmailVerifyButton")}
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <@layout.emailFooter>
        <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; line-height: 20px; font-weight: 400; color: #1C2659; opacity: 0.8;">
            ${msg("nubemEmailCopyLink")}<br />
            <a href="${link}" style="color: #5A7BAE; text-decoration: underline; word-break: break-all;">${link}</a>
        </p>
        <#if linkExpiration??>
        <p style="margin: 16px 0 0 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; line-height: 20px; font-weight: 400; color: #1C2659; opacity: 0.8;">
            ${msg("nubemEmailLinkExpiration", linkExpirationFormatter(linkExpiration))}
        </p>
        </#if>
    </@layout.emailFooter>
</@layout.emailLayout>
