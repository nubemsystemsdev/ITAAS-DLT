<#import "template.ftl" as layout>
<@layout.emailLayout>
    <tr>
        <td style="padding: 0 40px 40px 40px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #1C2659;">
            ${kcSanitize(msg("passwordResetBodyHtml",link, linkExpiration, realmName, linkExpirationFormatter(linkExpiration)))?no_esc}
        </td>
    </tr>
    <@layout.emailFooter></@layout.emailFooter>
</@layout.emailLayout>
