// Notification email

"use strict";

import Express from "express";
import { User } from "../models/users/user";
import { escapeDoubleQuotes, escapeHTML } from "../utils/text-utils";
import { InternationalizationService } from "../services/i18n-service";
import { Config } from "../config/config";


const PLATFORM_NAME = Config.getInstance().appName;

/**
 * Email: Generic notification for user
 */
export class NotificationEmailView {
    public static getSubject(request: Express.Request | null, user: User, notificationTitle?: string): string {
        const translator = InternationalizationService.getInstance().getTranslatorFromRequestOrUser(request, user);
        const base = PLATFORM_NAME + " - " + translator.__("New notification");
        if (notificationTitle && notificationTitle.trim().length > 0) {
            return base + ": " + notificationTitle;
        }
        return base;
    }

    /**
     * Renders the HTML version of the notification email.
     * @param request The HTTP request (can be null)
     * @param user The target user
     * @param urlToRedirect URL to view the notification in the platform
     * @param notificationTitle Short title of the notification (already localized)
     * @param notificationBody Detailed message of the notification (already localized)
     */
    public static render(
        request: Express.Request | null,
        user: User,
        urlToRedirect: string,
        notificationTitle: string,
        notificationBody: string
    ): string {
        const translator = InternationalizationService.getInstance().getTranslatorFromRequestOrUser(request, user);
        
        const navyColor = "#1C2659";
        const lightGrayColor = "#E5E5E5";
        const whiteColor = "#FFFFFF";
        const blueAccentColor = "#5A7BAE";
        
        const fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

        let html = "";

        html += `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">`;
        html += `<html xmlns="http://www.w3.org/1999/xhtml">`;
        html += `<head>`;
        html += `   <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />`;
        html += `   <meta name="viewport" content="width=device-width, initial-scale=1.0" />`;
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
        html += `                   <td style="padding: 0 40px 30px 40px;">`;
        html += `                       <p style="margin: 0; font-family: ${fontFamily}; font-size: 16px; line-height: 24px; font-weight: 400; color: ${navyColor};">`;
        html += `                           ${translator.__("Hi {0},").replace("{0}", `<strong>${escapeHTML(user.username)}</strong>`)}`;
        html += `                       </p>`;
        html += `                       <p style="margin: 16px 0 24px 0; font-family: ${fontFamily}; font-size: 16px; line-height: 24px; font-weight: 400; color: ${navyColor};">`;
        html += `                           ${translator.__("You have a new notification available in your dashboard:")}`;
        html += `                       </p>`;

        html += `                       <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F9FAFB; border-left: 4px solid ${navyColor}; border-radius: 4px;">`;
        html += `                           <tr>`;
        html += `                               <td style="padding: 24px;">`;
        
        if (notificationTitle) {
            html += `                               <p style="margin: 0 0 8px 0; font-family: ${fontFamily}; font-size: 16px; line-height: 24px; font-weight: 500; color: ${blueAccentColor}; text-transform: uppercase;">${translator.__("Subject")}</p>`;
            html += `                               <p style="margin: 0 0 12px 0; font-family: ${fontFamily}; font-size: 24px; line-height: 32px; font-weight: 600; color: ${navyColor};">${escapeHTML(notificationTitle)}</p>`;
        }
        
        if (notificationBody) {
            html += `                               <p style="margin: 0; font-family: ${fontFamily}; font-size: 16px; line-height: 24px; font-weight: 400; color: ${navyColor};">${escapeHTML(notificationBody)}</p>`;
        }
        
        html += `                               </td>`;
        html += `                           </tr>`;
        html += `                       </table>`;
        html += `                   </td>`;
        html += `               </tr>`;

        html += `               <tr>`;
        html += `                   <td align="left" style="padding: 0 40px 40px 40px;">`;
        html += `                       <table border="0" cellpadding="0" cellspacing="0">`;
        html += `                           <tr>`;
        html += `                               <td align="center" bgcolor="${blueAccentColor}" style="border-radius: 6px;">`;
        html += `                                   <a href="${escapeDoubleQuotes(urlToRedirect)}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: ${fontFamily}; font-size: 16px; font-weight: 600; color: ${whiteColor}; text-decoration: none;">`;
        html += `                                       ${translator.__("View in the platform")}`;
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
    /**
     * Renders the plain text version of the notification email.
     */
    public static renderText(
        request: Express.Request | null,
        user: User,
        urlToRedirect: string,
        notificationTitle: string,
        notificationBody: string
    ): string {
        const translator = InternationalizationService.getInstance().getTranslatorFromRequestOrUser(request, user);
        let text = "";

        text += `${PLATFORM_NAME} - ${translator.__("New notification")}` + `\n`;
        text += `` + `\n`;
        text += `${translator.__("Hi {0}, you have a new notification in {1}.").replace("{0}", user.username).replace("{1}", PLATFORM_NAME)}` + `\n`;
        if (notificationTitle && notificationTitle.trim().length > 0) {
            text += `${notificationTitle}` + `\n`;
        }
        if (notificationBody && notificationBody.trim().length > 0) {
            text += `${notificationBody}` + `\n`;
        }
        text += `${translator.__("You can view the details in the platform using the following link:")}` + `\n`;
        text += `${urlToRedirect}` + `\n`;

        return text;
    }
}
