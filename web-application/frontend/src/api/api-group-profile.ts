// API bindings: profile (Auto generated)

"use strict";

import { RequestErrorHandler, RequestParams, CommonErrorHandler, CommonAuthenticatedErrorHandler } from "@asanrom/request-browser";
import { getApiUrl } from "./utils";
import { UserProfile, UpdateProfileBody, UploadProfileImageResponse } from "./definitions";

export class ApiProfile {
    /**
     * Method: GET
     * Path: /profile/{username}
     * Gets profile
     * @param username Username or UID. If username, add the at (@) prefix.
     * @returns The request parameters
     */
    public static GetProfile(username: string): RequestParams<UserProfile, GetProfileErrorHandler> {
        return {
            method: "GET",
            url: getApiUrl(`/profile/${encodeURIComponent(username)}`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(404, "*", handler.notFound)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /profile
     * Updates profile
     * @param body Body parameters
     * @returns The request parameters
     */
    public static UpdateProfile(body: UpdateProfileBody): RequestParams<void, UpdateProfileErrorHandler> {
        return {
            method: "POST",
            url: getApiUrl(`/profile`),
            json: body,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "INVALID_WEBSITE", handler.badRequestInvalidWebsite)
                    .add(400, "INVALID_LOCATION", handler.badRequestInvalidLocation)
                    .add(400, "INVALID_BIO", handler.badRequestInvalidBio)
                    .add(400, "INVALID_NAME", handler.badRequestInvalidName)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: POST
     * Path: /profile/image
     * Updates profile image
     * @param formParams FromData parameters
     * @returns The request parameters
     */
    public static UpdateImage(formParams: UpdateImageFormParameters): RequestParams<UploadProfileImageResponse, UpdateImageErrorHandler> {
        const formData = new FormData();

        formParams.image !== undefined && formData.append("image", formParams.image);

        return {
            method: "POST",
            url: getApiUrl(`/profile/image`),
            form: formData,
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(400, "INVALID_IMAGE", handler.badRequestInvalidImage)
                    .add(400, "NO_IMAGE", handler.badRequestNoImage)
                    .add(400, "*", handler.badRequest)
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }

    /**
     * Method: DELETE
     * Path: /profile/image
     * Deletes profile image
     * @returns The request parameters
     */
    public static DeleteImage(): RequestParams<void, CommonAuthenticatedErrorHandler> {
        return {
            method: "DELETE",
            url: getApiUrl(`/profile/image`),
            handleError: (err, handler) => {
                new RequestErrorHandler()
                    .add(401, "*", handler.unauthorized)
                    .add(500, "*", "serverError" in handler ? handler.serverError : handler.temporalError)
                    .add("*", "*", "networkError" in handler ? handler.networkError : handler.temporalError)
                    .handle(err);
            },
        };
    }
}

/**
 * Error handler for GetProfile
 */
export type GetProfileErrorHandler = CommonErrorHandler & {
    /**
     * General handler for status = 404
     */
    notFound: () => void;
};

/**
 * Error handler for UpdateProfile
 */
export type UpdateProfileErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = INVALID_NAME
     */
    badRequestInvalidName: () => void;

    /**
     * Handler for status = 400 and code = INVALID_BIO
     */
    badRequestInvalidBio: () => void;

    /**
     * Handler for status = 400 and code = INVALID_LOCATION
     */
    badRequestInvalidLocation: () => void;

    /**
     * Handler for status = 400 and code = INVALID_WEBSITE
     */
    badRequestInvalidWebsite: () => void;
};

/**
 * Error handler for UpdateImage
 */
export type UpdateImageErrorHandler = CommonAuthenticatedErrorHandler & {
    /**
     * General handler for status = 400
     */
    badRequest: () => void;

    /**
     * Handler for status = 400 and code = NO_IMAGE
     */
    badRequestNoImage: () => void;

    /**
     * Handler for status = 400 and code = INVALID_IMAGE
     */
    badRequestInvalidImage: () => void;
};

/**
 * Form parameters for UpdateImage
 */
export interface UpdateImageFormParameters {
    /**
     * Image to upload - Max 20MB
     */
    image?: File;
}

