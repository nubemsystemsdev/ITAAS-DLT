<#ftl output_format="plainText">
<#assign username = (user.username)!((user.email)!'')>
<#assign brand = msg("nubemEmailBrand")>
${brand} - ${msg("nubemEmailVerifyButton")}

${msg("nubemEmailVerificationBody", username, brand)}

${link}

<#if linkExpiration??>
${msg("nubemEmailLinkExpiration", linkExpirationFormatter(linkExpiration))}
</#if>
