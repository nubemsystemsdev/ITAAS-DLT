// Shared BFF upstream error handlers for ITAAS Marketplace requests

"use strict";

export function itaasBffUpstreamErrorHandlers(onUnavailable: () => void): {
    status502: () => void;
    status502BffBadGateway: () => void;
    status502UpstreamUnreachable: () => void;
    status502UpstreamUnauthorized: () => void;
    status502IdentityResolverUnavailable: () => void;
    status503: () => void;
    status503BffUnavailable: () => void;
    status504: () => void;
    status504UpstreamTimeout: () => void;
} {
    return {
        status502: onUnavailable,
        status502BffBadGateway: onUnavailable,
        status502UpstreamUnreachable: onUnavailable,
        status502UpstreamUnauthorized: onUnavailable,
        status502IdentityResolverUnavailable: onUnavailable,
        status503: onUnavailable,
        status503BffUnavailable: onUnavailable,
        status504: onUnavailable,
        status504UpstreamTimeout: onUnavailable,
    };
}
