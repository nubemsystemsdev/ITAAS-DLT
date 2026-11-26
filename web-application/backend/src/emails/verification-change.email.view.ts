// Email change verification email

"use strict";

import Express from "express";
import { User } from "../models/users/user";
import { escapeDoubleQuotes, escapeHTML } from "../utils/text-utils";
import { InternationalizationService } from "../services/i18n-service";
import { Config } from "../config/config";

const PLATFORM_NAME = Config.getInstance().appName;

/**
 * Email: Verification for email address change
 */
export class VerificationChangeEmailView {
    public static getSubject(request: Express.Request, user: User): string {
        const translator = InternationalizationService.getInstance().getTranslatorFromRequestOrUser(request, user);
        return PLATFORM_NAME + " - " + translator.__("Confirm your new email");
    }

    public static render(request: Express.Request, user: User, urlToRedirect: string): string {
        const translator = InternationalizationService.getInstance().getTranslatorFromRequestOrUser(request, user);

        const navyColor = "#1C2659";
        const lightGrayColor = "#E5E5E5";
        const whiteColor = "#FFFFFF";
        const blueAccentColor = "#5A7BAE";

        const fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

        const changeMessage = translator.__("Hi {0}, you requested to change your email address to {1} on {2}. To confirm this change, follow the link below.")
            .replace("{0}", `<strong>${escapeHTML(user.username)}</strong>`)
            .replace("{1}", `<strong>${escapeHTML(user.emailRequest)}</strong>`)
            .replace("{2}", PLATFORM_NAME);

        let html = "";

        html += `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">`;
        html += `<html xmlns="http://www.w3.org/1999/xhtml">`;
        html += `<head>`;
        html += `   <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />`;
        html += `   <meta name="viewport" content="width=device-width, initial-scale=1.0" />`;
        html += `   <meta http-equiv="Cache-control" content="no-cache">`;
        html += `   <title>${PLATFORM_NAME} - ${translator.__("Confirm your new email")}</title>`;
        html += `</head>`;
        html += `<body style="margin: 0; padding: 0; background-color: ${lightGrayColor}; font-family: ${fontFamily}; -webkit-font-smoothing: antialiased;">`;

        html += `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${lightGrayColor};">`;
        html += `   <tr>`;
        html += `       <td align="center" style="padding: 40px 10px;">`;

        html += `           <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${whiteColor}; border-radius: 8px; overflow: hidden;">`;

        html += `               <tr>`;
        html += `                   <td align="left" style="padding: 40px 40px 20px 40px;">`;
        html += `                       <h1 style="margin: 0; font-family: ${fontFamily}; font-size: 40px; line-height: 48px; font-weight: 700; color: ${navyColor};">${PLATFORM_NAME}</h1>`;
        html += `                   </td>`;
        html += `               </tr>`;

        html += `               <tr>`;
        html += `                   <td style="padding: 0 40px 24px 40px;">`;
        html += `                       <p style="margin: 0; font-family: ${fontFamily}; font-size: 16px; line-height: 24px; font-weight: 400; color: ${navyColor};">`;
        html += `                           ${changeMessage}`;
        html += `                       </p>`;
        html += `                   </td>`;
        html += `               </tr>`;

        html += `               <tr>`;
        html += `                   <td align="left" style="padding: 0 40px 40px 40px;">`;
        html += `                       <table border="0" cellpadding="0" cellspacing="0">`;
        html += `                           <tr>`;
        html += `                               <td align="center" bgcolor="${blueAccentColor}" style="border-radius: 6px;">`;
        html += `                                   <a href="${escapeDoubleQuotes(urlToRedirect)}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: ${fontFamily}; font-size: 16px; font-weight: 600; color: ${whiteColor}; text-decoration: none;">`;
        html += `                                       ${translator.__("Confirm your new email")}`;
        html += `                                   </a>`;
        html += `                               </td>`;
        html += `                           </tr>`;
        html += `                       </table>`;
        html += `                   </td>`;
        html += `               </tr>`;

        html += `               <tr>`;
        html += `                   <td style="padding: 32px; background-color: #F3F4F6; border-top: 1px solid ${lightGrayColor}; text-align: left;">`;
        html += `                       <p style="margin: 0; font-family: ${fontFamily}; font-size: 14px; line-height: 20px; font-weight: 400; color: ${navyColor}; opacity: 0.8;">`;
        html += `                           ${translator.__("If you have problems with the button, copy and paste this link:")}<br />`;
        html += `                           <a href="${escapeDoubleQuotes(urlToRedirect)}" style="color: ${blueAccentColor}; text-decoration: underline;">${escapeHTML(urlToRedirect)}</a>`;
        html += `                       </p>`;
        html += `                       <p style="margin: 20px 0 0 0; font-family: ${fontFamily}; font-size: 14px; line-height: 20px; font-weight: 400; color: ${navyColor}; opacity: 0.6;">`;
        html += `                           &copy; ${new Date().getFullYear()} ${PLATFORM_NAME}. ${translator.__("All rights reserved.")}`;
        html += `                       </p>`;
        html += `                   </td>`;
        html += `               </tr>`;

        html += `           </table>`;
        html += `       </td>`;
        html += `   </tr>`;
        html += `</table>`;

        html += `</body>`;
        html += `</html>`;

        return html;
    }

    public static renderText(request: Express.Request, user: User, urlToRedirect: string): string {
        const translator = InternationalizationService.getInstance().getTranslatorFromRequestOrUser(request, user);
        let text = "";

        text += `${PLATFORM_NAME} - ${translator.__("Confirm your new email")}` + `\n`;
        text += `` + `\n`;
        text += `${translator.__("Hi {0}, you requested to change your email address to {1} on {2}. To confirm this change, follow the link below.")
            .replace("{0}", user.username)
            .replace("{1}", user.emailRequest)
            .replace("{2}", PLATFORM_NAME)}` + `\n`;
        text += `${urlToRedirect}` + `\n`;

        return text;
    }
}
