<#macro emailLayout>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${locale!'en'}">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Cache-control" content="no-cache" />
    <title>${msg("nubemEmailBrand")}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #E5E5E5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #E5E5E5;">
        <tr>
            <td align="center" style="padding: 40px 10px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td align="left" style="padding: 40px 40px 20px 40px;">
                            <h1 style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 40px; line-height: 48px; font-weight: 700; color: #1C2659;">${msg("nubemEmailBrand")}</h1>
                        </td>
                    </tr>
                    <#nested>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
</#macro>

<#macro emailFooter>
<tr>
    <td style="padding: 32px; background-color: #F3F4F6; border-top: 1px solid #E5E5E5; text-align: left;">
        <#nested>
        <p style="margin: 20px 0 0 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; line-height: 20px; font-weight: 400; color: #1C2659; opacity: 0.6;">
            &copy; ${.now?string("yyyy")} ${msg("nubemEmailBrand")}. ${msg("nubemEmailAllRightsReserved")}
        </p>
    </td>
</tr>
</#macro>
