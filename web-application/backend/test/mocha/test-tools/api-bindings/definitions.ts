// API definitions (Auto generated)

"use strict"

export interface WalletInfo {
    /**
     * Internal wallet ID
     */
    id: string;

    /**
     * Wallet address
     */
    address: string;

    /**
     * DID asignado (se crea al crear la wallet)
     */
    did?: string;
}

export interface WalletCreateBody {
    /**
     * Password to protect the wallet (min 8 characters)
     */
    password: string;

    /**
     * ECDSA private key (HEX, 32 bytes). If neither EC nor ML keys are provided, a random mixed wallet is generated.
     */
    privateKeyEc?: string;

    /**
     * ML-DSA secret key (HEX). Required together with publicKeyMl to import an ML-DSA key.
     */
    privateKeyMl?: string;

    /**
     * ML-DSA public key (HEX). Required together with privateKeyMl to import an ML-DSA key.
     */
    publicKeyMl?: string;
}

export interface WalletChangePasswordBody {
    /**
     * Current wallet password
     */
    password: string;

    /**
     * New wallet password (min 8 characters)
     */
    new_password: string;
}

export interface WalletExportBody {
    /**
     * Current wallet password
     */
    password: string;
}

export interface WalletExportResponse {
    /**
     * ECDSA private key in uppercase HEX (empty string if the wallet has no ECDSA key)
     */
    privateKeyEc: string;

    /**
     * ML-DSA secret key in uppercase HEX (empty string if the wallet has no ML-DSA key)
     */
    privateKeyMl: string;

    /**
     * ML-DSA public key in uppercase HEX (empty string if the wallet has no ML-DSA key)
     */
    publicKeyMl: string;
}

export interface VCRequest {
    /**
     * VC request identifier
     */
    id: string;

    /**
     * VC request status
     */
    status: string;

    /**
     * Username of the requester
     */
    requestedBy: string;

    /**
     * Date of the request
     */
    requestDate: string;

    /**
     * DID of the requester
     */
    requesterDid: string;

    /**
     * Credential ID
     */
    credentialId: string;

    /**
     * Credential type
     */
    credentialType: string;

    /**
     * Credential data
     */
    credentialData: string;

    /**
     * Credential status
     */
    credentialStatus: string;
}

export interface RoleRequestListResponse {
    items: RoleRequestItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Total number of role requests
     */
    total: number;
}

export interface RoleRequestItem {
    /**
     * VC request identifier
     */
    id: string;

    /**
     * VC request status
     */
    status: string;

    /**
     * Username of the requester
     */
    requestedBy: string;

    /**
     * Date of the request
     */
    requestDate: string;

    /**
     * DID of the requester
     */
    requesterDid: string;

    /**
     * Credential ID
     */
    credentialId: string;

    /**
     * Credential type
     */
    credentialType: string;

    /**
     * Credential data
     */
    credentialData: any;

    /**
     * Credential status
     */
    credentialStatus: string;
}

export interface RevokeCredentialBody {
    /**
     * Revocation reason
     */
    reason: string;
}

export interface RequestVCRequest {
    /**
     * Applicant's Decentralized Identifier (DID)
     */
    did: string;
}

export interface CredentialRevocationStatusResponse {
    /**
     * Operation successful
     */
    success: boolean;

    /**
     * Credential ID
     */
    credentialId: number;

    /**
     * Revocation status from blockchain (or local if contract not deployed)
     */
    revoked: boolean;

    /**
     * Local credential status if available
     */
    status?: string;
}

export interface DidRevokeCredentialBody {
    /**
     * Revocation reason
     */
    reason: string;
}

export interface RevokeCredentialResponse {
    /**
     * Operation successful
     */
    success: boolean;

    /**
     * Revoked credential ID
     */
    credentialId: string;

    /**
     * Status: "revoked"
     */
    status: string;

    /**
     * Confirmation message
     */
    message?: string;
}

export interface DidVerifyBody {
    /**
     * JWT credential to verify
     */
    vcJwt: string;
}

export interface UserAdminListItem {
    /**
     * User ID
     */
    id: string;

    /**
     * User role
     */
    role: string;

    /**
     * Username
     */
    username: string;

    /**
     * Email
     */
    email: string;

    /**
     * Verified
     */
    verified: boolean;

    /**
     * Banned
     */
    banned: boolean;

    /**
     * Creation timestamp (Unix milliseconds)
     */
    created: number;
}

export interface UserAdminList {
    users: UserAdminListItem[];

    /**
     * Page number (starting by 1)
     */
    page: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total?: number;
}

export interface UserAdminTokenBalance {
    /**
     * Available token balance
     */
    available_tokens: number;

    /**
     * Locked token balance
     */
    locked_tokens: number;

    /**
     * Value of one token in euro cents
     */
    token_value_eur_cents: number;

    /**
     * Fiat equivalent for available tokens
     */
    equivalent_eur_cents: number;
}

export interface UserAdminOrganizationItem {
    /**
     * Organization ID
     */
    organizationId: string;

    /**
     * Organization display name
     */
    companyName: string;
}

export interface UserAdminDetails {
    /**
     * User ID
     */
    id: string;

    /**
     * User role
     */
    role: string;

    /**
     * Username
     */
    username: string;

    /**
     * Email
     */
    email: string;

    /**
     * Verified
     */
    verified: boolean;

    /**
     * Banned
     */
    banned: boolean;

    /**
     * Creation timestamp (Unix milliseconds)
     */
    created: number;

    /**
     * Immune to moderation
     */
    modImmune: boolean;

    /**
     * Has TFA enabled
     */
    tfa: boolean;

    /**
     * User locale
     */
    locale: string;

    sessions: SessionListItem[];

    tokenBalance: UserAdminTokenBalance;

    organizations: UserAdminOrganizationItem[];
}

export interface AdminSetRoleBody {
    /**
     * Role to set
     */
    role: string;
}

export interface UserAdminEmailChange {
    /**
     * New email
     */
    email: string;
}

export interface UserAdminUsernameChange {
    /**
     * New username
     */
    username: string;
}

export interface UserAdminPasswordChange {
    /**
     * New password
     */
    password: string;
}

export interface AdminRoleResponse {
    /**
     * Successful operation
     */
    success: boolean;

    /**
     * Descriptive message
     */
    message: string;

    /**
     * Blockchain transaction hash (if applicable)
     */
    txHash?: string;
}

export interface TraceEventIngestBody {
    /**
     * Event identifier (UUID or bytes32)
     */
    eventId: string;

    /**
     * Organization / tenant identifier
     */
    organizationId?: string;

    /**
     * Actor Keycloak subject (`sub`); alias: userSub
     */
    actor: string;

    /**
     * Alias of actor (Keycloak subject)
     */
    userSub?: string;

    /**
     * Flow / agent flow identifier
     */
    flowId?: string;

    /**
     * Execution identifier
     */
    executionId?: string;

    /**
     * Canonical business event type
     */
    event_type: string;

    /**
     * Execution status (`success` or `error`)
     */
    status?: string;

    /**
     * Execution start timestamp in ms
     */
    startedAt?: number;

    /**
     * Execution finish timestamp in ms
     */
    finishedAt?: number;

    /**
     * Execution output / result payload
     */
    output?: string;
}

export interface TraceEventIngestResponse {
    /**
     * True if event was accepted
     */
    accepted: boolean;

    /**
     * True if event was duplicated
     */
    duplicated: boolean;

    /**
     * Event identifier
     */
    event_id: string;

    /**
     * Event type
     */
    event_type: string;

    /**
     * Actor identifier
     */
    actor: string;

    /**
     * Blockchain transaction hash
     */
    tx_hash: string;

    /**
     * On-chain anchor timestamp
     */
    anchored_at: number;
}

export interface TraceEventItem {
    /**
     * Trace row identifier
     */
    id: string;

    /**
     * Event identifier
     */
    eventId: string;

    /**
     * Event type
     */
    eventType: string;

    /**
     * Event domain
     */
    domain: string;

    /**
     * Subject identifier
     */
    subjectId: string;

    /**
     * Correlation identifier
     */
    correlationId: string;

    /**
     * Actor identifier hash
     */
    actorIdHash: string;

    /**
     * Payload hash
     */
    payloadHash: string;

    /**
     * Serialized payload
     */
    payloadJson: string;

    /**
     * Event timestamp
     */
    occurredAt: number;

    /**
     * Emitted timestamp
     */
    emittedAt: number;

    /**
     * Trace status
     */
    status: string;

    /**
     * Blockchain transaction hash
     */
    txHash: string;

    /**
     * Blockchain block number
     */
    blockNumber: number;

    /**
     * Retry count
     */
    retries: number;

    /**
     * Error message
     */
    errorMessage: string;

    /**
     * Creation timestamp
     */
    createdAt: number;

    /**
     * Update timestamp
     */
    updatedAt: number;
}

export interface TokenTraceEventItem {
    /**
     * Trace row identifier
     */
    id: string;

    /**
     * Operation identifier
     */
    operationId: string;

    /**
     * Token action kind
     */
    actionKind: string;

    /**
     * Wallet identifier
     */
    walletId: string;

    /**
     * Scope type
     */
    scopeType: string;

    /**
     * Scope identifier
     */
    scopeId: string;

    /**
     * Actor user identifier
     */
    actorUid: string;

    /**
     * Payment identifier
     */
    paymentId: string;

    /**
     * Checkout session identifier
     */
    checkoutSessionId: string;

    /**
     * Token amount
     */
    amountTokens: number;

    /**
     * Amount in euro cents
     */
    amountEurCents: number;

    /**
     * Payload hash
     */
    payloadHash: string;

    /**
     * Chain name
     */
    chainName: string;

    /**
     * Blockchain transaction hash
     */
    txHash: string;

    /**
     * Trace status
     */
    status: string;

    /**
     * Retry count
     */
    retries: number;

    /**
     * Error message
     */
    errorMessage: string;

    /**
     * Serialized payload
     */
    payloadJson: string;

    /**
     * Creation timestamp
     */
    createdAt: number;

    /**
     * Update timestamp
     */
    updatedAt: number;
}

export interface AgentTraceEventItem {
    /**
     * Trace row identifier
     */
    id: string;

    /**
     * Event identifier
     */
    eventId: string;

    /**
     * Organization / tenant identifier
     */
    organizationId: string;

    /**
     * Actor Keycloak subject
     */
    actor: string;

    /**
     * Flow / agent flow identifier
     */
    flowId: string;

    /**
     * Execution identifier
     */
    executionId: string;

    /**
     * Event type
     */
    eventType: string;

    /**
     * Execution status
     */
    status: string;

    /**
     * Execution start timestamp in ms
     */
    startedAt: number;

    /**
     * Execution finish timestamp in ms
     */
    finishedAt: number;

    /**
     * Effective occurrence timestamp (`finishedAt` or `startedAt`)
     */
    occurredAt: number;

    /**
     * Execution output / result payload
     */
    output: string;

    /**
     * On-chain anchor timestamp
     */
    anchoredAt: number;

    /**
     * Blockchain transaction hash
     */
    txHash: string;

    /**
     * Creation timestamp
     */
    createdAt: number;

    /**
     * Update timestamp
     */
    updatedAt: number;
}

export interface TraceEventsPageResponse {
    traceability_events: TraceEventItem[];

    /**
     * Total number of traceability events
     */
    total: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Current page number
     */
    page: number;

    /**
     * Items per page
     */
    pageSize: number;
}

export interface TokenTraceEventsPageResponse {
    token_traceability_events: TokenTraceEventItem[];

    /**
     * Total number of token traceability events
     */
    total: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Current page number
     */
    page: number;

    /**
     * Items per page
     */
    pageSize: number;
}

export interface AgentTraceEventsPageResponse {
    agent_trace_events: AgentTraceEventItem[];

    /**
     * Total number of agent trace events
     */
    total: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Current page number
     */
    page: number;

    /**
     * Items per page
     */
    pageSize: number;
}

export interface AgentTraceExecutionTimelineResponse {
    /**
     * Execution identifier
     */
    execution_id: string;

    /**
     * Flow / agent flow identifier
     */
    flow_id: string;

    events: AgentTraceEventItem[];

    /**
     * Number of events in the timeline
     */
    total: number;
}

export interface TraceOverviewResponse {
    /**
     * Combined total events across general, token and agent traceability (organization is a subset of general)
     */
    total: number;

    /**
     * Combined events anchored on-chain
     */
    confirmed: number;

    /**
     * Combined events waiting for on-chain confirmation
     */
    pending: number;

    /**
     * Combined events that failed anchoring
     */
    failed: number;

    /**
     * General traceability total (all domains)
     */
    generalTotal: number;

    /**
     * Organization-domain traceability total
     */
    organizationTotal: number;

    /**
     * Token traceability total
     */
    tokenTotal: number;

    /**
     * Agent trace events total
     */
    agentTotal: number;
}

export interface TokenRedeemQuoteBody {
    /**
     * Purchase amount in cents
     */
    amount_eur_cents: number;

    /**
     * Requested tokens to redeem
     */
    requested_tokens?: number;
}

export interface TokensOnChainBalanceResponse {
    /**
     * Formatted token amount with currency symbol
     */
    token: string;
}

export interface TokensBalanceResponse {
    /**
     * Scope type for the wallet
     */
    scope_type: string;

    /**
     * Scope identifier
     */
    scope_id: string;

    /**
     * Available token balance
     */
    available_tokens: number;

    /**
     * Locked token balance
     */
    locked_tokens: number;

    /**
     * Value of one token in euro cents
     */
    token_value_eur_cents: number;

    /**
     * Fiat equivalent for available tokens
     */
    equivalent_eur_cents: number;
}

export interface TokenHistoryEntry {
    /**
     * Trace row identifier
     */
    id: string;

    /**
     * Operation identifier
     */
    operationId: string;

    /**
     * Trace action kind
     */
    actionKind: string;

    /**
     * Wallet identifier
     */
    walletId: string;

    /**
     * Scope type
     */
    scopeType: string;

    /**
     * Scope identifier
     */
    scopeId: string;

    /**
     * Actor user identifier
     */
    actorUid: string;

    /**
     * Related payment identifier
     */
    paymentId: string;

    /**
     * Checkout session identifier
     */
    checkoutSessionId: string;

    /**
     * Token amount involved in this trace
     */
    amountTokens: number;

    /**
     * Fiat amount in euro cents
     */
    amountEurCents: number;

    /**
     * Payload hash
     */
    payloadHash: string;

    /**
     * Blockchain network name
     */
    chainName: string;

    /**
     * Blockchain transaction hash
     */
    txHash: string;

    /**
     * Trace status
     */
    status: string;

    /**
     * Retry counter
     */
    retries: number;

    /**
     * Error message (if any)
     */
    errorMessage: string;

    /**
     * Creation timestamp (ms)
     */
    createdAt: number;

    /**
     * Last update timestamp (ms)
     */
    updatedAt: number;

    /**
     * Parsed payload data
     */
    payloadJson: string;

    /**
     * Resolved human-readable concept name (nullable)
     */
    conceptName?: string;
}

export interface TokensHistoryResponse {
    /**
     * Wallet identifier
     */
    wallet_id: string;

    /**
     * Scope type for the wallet
     */
    scope_type: string;

    /**
     * Scope identifier
     */
    scope_id: string;

    /**
     * Current page number
     */
    page: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    history: TokenHistoryEntry[];
}

export interface TokenRedeemQuoteResponse {
    /**
     * Wallet identifier
     */
    walletId: string;

    /**
     * Current available token balance
     */
    availableTokens: number;

    /**
     * Requested token amount
     */
    requestedTokens: number;

    /**
     * Applied token amount for this quote
     */
    appliedTokens: number;

    /**
     * Maximum applicable token amount
     */
    maxApplicableTokens: number;

    /**
     * Discount amount in euro cents
     */
    discountEurCents: number;

    /**
     * Final payable amount in euro cents
     */
    finalAmountEurCents: number;
}

export interface TokenRulesUpdateBody {
    /**
     * Enable token rules
     */
    enabled?: boolean;

    /**
     * Emission percentage
     */
    emissionRatePct?: number;

    /**
     * Value of one token in euro cents
     */
    tokenValueEurCents?: number;

    /**
     * Minimum purchase (cents) to earn
     */
    minPurchaseEurCentsToEarn?: number;

    /**
     * Minimum purchase (cents) to redeem
     */
    minPurchaseEurCentsToRedeem?: number;

    /**
     * Max redeem percentage
     */
    maxRedeemPct?: number;

    /**
     * Expiration in months
     */
    expirationMonths?: number;

    /**
     * Allow stacking promotions
     */
    stackWithPromotions?: boolean;

    /**
     * Product filter
     */
    allowedProductKinds?: string;
}

export interface TokenRulesConfig {
    /**
     * Enable token rules
     */
    enabled: boolean;

    /**
     * Emission percentage
     */
    emissionRatePct: number;

    /**
     * Value of one token in euro cents
     */
    tokenValueEurCents: number;

    /**
     * Minimum purchase (cents) to earn
     */
    minPurchaseEurCentsToEarn: number;

    /**
     * Minimum purchase (cents) to redeem
     */
    minPurchaseEurCentsToRedeem: number;

    /**
     * Max redeem percentage
     */
    maxRedeemPct: number;

    /**
     * Expiration in months
     */
    expirationMonths: number;

    /**
     * Allow stacking promotions
     */
    stackWithPromotions: boolean;

    /**
     * Product filter
     */
    allowedProductKinds: string;
}

export interface SubscriptionCreateBody {
    /**
     * Subscribable type (item or plan)
     */
    subscribable_type: string;

    /**
     * Subscribable identifier (ItemPlan or PlanPricing id)
     */
    subscribable_id: string;

    /**
     * Number of tokens to apply as a discount (optional, default 0)
     */
    redeem_tokens?: number;

    /**
     * URL to redirect the user after a successful payment (optional)
     */
    success_url?: string;

    /**
     * URL to redirect the user after cancelling the payment (optional)
     */
    cancel_url?: string;

    /**
     * Number of seats for organization digital product subscriptions (optional, default 1)
     */
    quantity?: number;
}

export interface SubscriptionCheckoutResponse {
    /**
     * Subscription id
     */
    subscription_id: string;

    /**
     * Stripe subscription id
     */
    stripe_subscription_id?: string;

    /**
     * Subscribable type
     */
    subscribable_type: string;

    /**
     * Subscribable id
     */
    subscribable_id: string;

    /**
     * Billing cycle
     */
    billing_cycle: string;

    /**
     * Subscription status
     */
    status: string;

    /**
     * Stripe checkout URL
     */
    checkout_url?: string;
}

export interface SubscriptionRenewBody {
    /**
     * Subscription id
     */
    subscription_id: string;
}

export interface SubscriptionChangePlanBody {
    /**
     * Current subscribable type
     */
    subscribable_type: string;

    /**
     * Current subscribable id
     */
    subscribable_id: string;

    /**
     * Target subscribable id
     */
    target_subscribable_id: string;

    /**
     * Payment method (must be stripe)
     */
    method?: string;

    /**
     * Change timing
     */
    effective?: string;

    /**
     * Number of tokens to apply as a discount (optional, default 0)
     */
    redeem_tokens?: number;
}

export interface ChangePlanResponse {
    /**
     * Subscription id
     */
    subscription_id?: string;

    /**
     * Stripe subscription id
     */
    stripe_subscription_id?: string;

    /**
     * Subscription status
     */
    status?: string;

    /**
     * Stripe checkout URL
     */
    checkout_url?: string;

    /**
     * Current subscribable id
     */
    current_subscribable_id?: string;

    /**
     * Target subscribable id
     */
    target_subscribable_id?: string;

    /**
     * Effective timestamp
     */
    effective_at?: number;
}

export interface SubscriptionCancelBody {
    /**
     * Subscription id
     */
    subscription_id: string;

    /**
     * Cancel at period end (default: true)
     */
    cancel_at_period_end?: boolean;
}

export interface PreviewChangeBody {
    /**
     * Current subscribable type
     */
    subscribable_type: string;

    /**
     * Current subscribable id
     */
    subscribable_id: string;

    /**
     * Target subscribable type
     */
    target_subscribable_type: string;

    /**
     * Target subscribable id
     */
    target_subscribable_id: string;
}

export interface PreviewChangeResponse {
    /**
     * Change type (upgrade_immediate or period_end)
     */
    type: string;

    /**
     * Current subscription details
     */
    current: any;

    /**
     * Target subscription details
     */
    target: any;

    /**
     * Activation timestamp for period_end changes
     */
    scheduled_activation_at?: number;

    /**
     * Token redemption quote
     */
    token_quote?: any;
}

export interface PreviewCancelBody {
    /**
     * Subscription id
     */
    subscription_id: string;
}

export interface PreviewCancelResponse {
    /**
     * Subscription id
     */
    subscription_id: string;

    /**
     * Subscribable type
     */
    subscribable_type: string;

    /**
     * Subscribable id
     */
    subscribable_id: string;

    /**
     * Billing cycle
     */
    billing_cycle: string;

    /**
     * Period end timestamp
     */
    period_end: number;

    /**
     * Days remaining in period
     */
    remaining_days: number;

    /**
     * Available cancel options
     */
    cancel_options: any;
}

export interface PreviewCreateBody {
    /**
     * Subscribable type
     */
    subscribable_type: string;

    /**
     * Subscribable id
     */
    subscribable_id: string;
}

export interface PreviewCreateResponse {
    /**
     * Whether subscription is allowed
     */
    eligible: boolean;

    /**
     * Subscribable details
     */
    subscribable: any;

    /**
     * Token redemption quote
     */
    token_quote?: any;
}

export interface CompletePendingBody {
    /**
     * Pending subscription id
     */
    subscription_id: string;

    /**
     * Number of tokens to apply as a discount (optional, default 0)
     */
    redeem_tokens?: number;

    /**
     * URL to redirect the user after a successful payment (optional)
     */
    success_url?: string;

    /**
     * URL to redirect the user after cancelling the payment (optional)
     */
    cancel_url?: string;
}

export interface CompletePendingResponse {
    /**
     * Subscription id
     */
    subscription_id: string;

    /**
     * Stripe checkout URL
     */
    checkout_url: string;
}

export interface SubscriptionStatusItem {
    /**
     * Subscription id
     */
    id: string;

    /**
     * Subscribable type
     */
    subscribableType: string;

    /**
     * Subscribable id
     */
    subscribableId: string;

    /**
     * Billing cycle
     */
    billingCycle: string;

    /**
     * Status
     */
    status: string;

    /**
     * Cancel at period end flag
     */
    cancelAtPeriodEnd?: boolean;

    /**
     * Current period start (Unix ms)
     */
    currentPeriodStart?: number;

    /**
     * Current period end (Unix ms)
     */
    currentPeriodEnd?: number;

    /**
     * Next renewal date (Unix ms)
     */
    nextRenewalDate?: number;
}

export interface SubscriptionStatusCategoryCounts {
    /**
     * Total subscriptions for current secondary filters
     */
    all: number;

    /**
     * Plan subscriptions count
     */
    plan: number;

    /**
     * Service subscriptions count
     */
    service: number;

    /**
     * Product subscriptions count
     */
    product: number;
}

export interface SubscriptionStatusResponse {
    subscriptions: SubscriptionStatusItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;

    categoryCounts: SubscriptionStatusCategoryCounts;

    /**
     * Cancelled subscriptions count for current filters
     */
    cancelledCount?: number;
}

export interface SubscriptionNoticeItem {
    /**
     * Subscription id
     */
    id: string;

    /**
     * Next notice timestamp
     */
    nextNoticeAt: number;

    /**
     * Subscription status
     */
    status: string;
}

export interface SubscriptionNoticesResponse {
    notices: SubscriptionNoticeItem[];
}

export interface SubscriptionAllowanceResponse {
    /**
     * True if an entitlement exists
     */
    has_subscription: boolean;

    /**
     * Subscribable type
     */
    subscribable_type?: string;

    /**
     * Subscribable id
     */
    subscribable_id?: string;

    /**
     * Billing cycle
     */
    billing_cycle?: string;

    /**
     * Subscription status
     */
    status?: string;
}

export interface SubscriptionAdminListItem {
    /**
     * Subscription id
     */
    id: string;

    /**
     * Owner user id
     */
    uid: string;

    /**
     * Owner username
     */
    username?: string;

    /**
     * Subscription category (plan, service, product)
     */
    category?: string;

    /**
     * Subscribable type
     */
    subscribableType: string;

    /**
     * Subscribable id
     */
    subscribableId: string;

    /**
     * Human-readable item or plan name
     */
    subscribableName?: string;

    /**
     * Billing cycle
     */
    billingCycle: string;

    /**
     * Status
     */
    status: string;

    /**
     * Stripe subscription id
     */
    stripeSubscriptionId?: string;

    /**
     * Current period start (Unix ms)
     */
    currentPeriodStart?: number;

    /**
     * Current period end (Unix ms)
     */
    currentPeriodEnd?: number;

    /**
     * Cancel at period end flag
     */
    cancelAtPeriodEnd?: boolean;

    /**
     * Creation timestamp (Unix ms)
     */
    createdAt: number;

    /**
     * Update timestamp (Unix ms)
     */
    updatedAt: number;
}

export interface SubscriptionAdminListResponse {
    subscriptions: SubscriptionAdminListItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;

    categoryCounts: SubscriptionStatusCategoryCounts;
}

export interface SubscriptionAdminUserListResponse {
    subscriptions: SubscriptionAdminListItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface SubscriptionAdminPaymentItem {
    /**
     * Payment id
     */
    id: string;

    /**
     * Payment type
     */
    type: string;

    /**
     * Payment provider
     */
    provider: string;

    /**
     * Amount in cents
     */
    amountCents: number;

    /**
     * Currency
     */
    currency: string;

    /**
     * Payment status
     */
    status: string;

    /**
     * Stripe session or payment intent id
     */
    providerSessionId?: string;

    /**
     * Creation timestamp (Unix ms)
     */
    createdAt: number;
}

export interface SubscriptionAdminStripeSummary {
    /**
     * Stripe subscription id
     */
    stripe_subscription_id: string;

    /**
     * Stripe subscription status
     */
    stripe_status: string;

    /**
     * Stripe customer id
     */
    stripe_customer_id: string;

    /**
     * Current period start (Unix ms)
     */
    current_period_start?: number;

    /**
     * Current period end (Unix ms)
     */
    current_period_end?: number;

    /**
     * Cancel at period end flag
     */
    cancel_at_period_end: boolean;

    /**
     * Pause collection flag
     */
    pause_collection: boolean;
}

export interface SubscriptionAdminDetailResponse {
    subscription: SubscriptionAdminListItem;

    payments: SubscriptionAdminPaymentItem[];

    stripe?: SubscriptionAdminStripeSummary;
}

export interface SubscriptionAdminActionBody {
    /**
     * Subscription id
     */
    subscription_id: string;
}

export interface SubscriptionAdminRefundBody {
    /**
     * Subscription id
     */
    subscription_id: string;

    /**
     * Payment id to refund (defaults to last payment)
     */
    payment_id?: string;
}

export interface SubscriptionAdminRefundResponse {
    /**
     * Refunded payment id
     */
    payment_id: string;

    /**
     * Refunded amount in cents
     */
    refund_amount_cents: number;
}

export interface GlobalRolePermission {
    /**
     * Permission identifier
     */
    id: string;

    /**
     * True if the permission is granted
     */
    granted?: boolean;
}

export interface GlobalRole {
    /**
     * Role identifier
     */
    id: string;

    permissions: GlobalRolePermission[];
}

export interface RoleModifyBody {
    permissions: GlobalRolePermission[];
}

export interface UserProfileMin {
    /**
     * User ID
     */
    id?: string;

    /**
     * Username
     */
    username?: string;

    /**
     * Full name
     */
    name?: string;

    /**
     * Image URL
     */
    image?: string;
}

export interface UserProfile {
    /**
     * User ID
     */
    id?: string;

    /**
     * Username
     */
    username?: string;

    /**
     * Join Date (YYYY-MM-DD)
     */
    joinDate?: string;

    /**
     * Full name
     */
    name?: string;

    /**
     * Bio / Description
     */
    bio?: string;

    /**
     * Image URL
     */
    image?: string;

    /**
     * Location
     */
    location?: string;

    /**
     * Website URL
     */
    website?: string;
}

export interface UpdateProfileBody {
    /**
     * Full name
     */
    name?: string;

    /**
     * Bio / Description
     */
    bio?: string;

    /**
     * Location
     */
    location?: string;

    /**
     * Website URL
     */
    website?: string;
}

export interface UploadProfileImageResponse {
    /**
     * Uploaded image URL
     */
    url?: string;
}

export interface PlanPublicListItem {
    /**
     * Plan ID
     */
    id: string;

    /**
     * Plan name
     */
    name: string;

    /**
     * Plan description
     */
    description: string;

    /**
     * Pricing mode (fixed or calculated)
     */
    pricingMode: string;

    /**
     * Discount percentage
     */
    discountPercent: number;

    /**
     * Support tier
     */
    supportTier: string;

    /**
     * Support config JSON
     */
    supportConfig: string;

    /**
     * Superior plan ID
     */
    superiorPlanId?: string;

    /**
     * Plan index
     */
    planIndex: number;

    /**
     * Creation timestamp
     */
    createdAt: number;

    /**
     * Plan status (admin list)
     */
    status?: string;

    /**
     * Last update timestamp (admin list)
     */
    updatedAt?: number;

    /**
     * Monthly price in EUR (admin list, from PlanPricing)
     */
    monthlyPriceEur?: number;

    /**
     * Annual price in EUR (admin list, from PlanPricing)
     */
    annualPriceEur?: number;
}

export interface PlanPublicList {
    items: PlanPublicListItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface PlanPublicDetailPlan {
    /**
     * Plan ID
     */
    id: string;

    /**
     * Plan name
     */
    name: string;

    /**
     * Plan description
     */
    description: string;

    /**
     * Pricing mode
     */
    pricingMode: string;

    /**
     * Discount percentage
     */
    discountPercent: number;

    /**
     * Support config JSON
     */
    supportConfig: string;

    /**
     * Plan index
     */
    planIndex: number;

    /**
     * Plan status
     */
    status: string;

    /**
     * Creation timestamp
     */
    createdAt: number;

    /**
     * Update timestamp
     */
    updatedAt: number;
}

export interface PlanPublicDetailComponent {
    /**
     * Catalog item ID
     */
    catalogItemId: string;

    /**
     * Quantity
     */
    quantity: number;
}

export interface PlanPublicDetailPricing {
    /**
     * Pricing ID
     */
    id: string;

    /**
     * Billing cycle
     */
    billingCycle: string;

    /**
     * Final price in EUR
     */
    priceEur: number;

    /**
     * Current component total in EUR
     */
    basePriceEur: number;

    /**
     * Current discount amount in EUR
     */
    discountAmountEur: number;
}

export interface PlanPublicDetailResponse {
    plan: PlanPublicDetailPlan;

    components: PlanPublicDetailComponent[];

    pricings: PlanPublicDetailPricing[];
}

export interface PlanCreateBody {
    /**
     * Plan name
     */
    name: string;

    /**
     * Plan description
     */
    description?: string;

    /**
     * Pricing mode (fixed or calculated)
     */
    pricingMode: string;

    /**
     * Discount percentage (0-100, only for calculated mode)
     */
    discountPercent?: number;

    /**
     * Support config JSON
     */
    supportConfig?: string;

    /**
     * Plan index
     */
    planIndex?: number;

    /**
     * Status (default: Draft)
     */
    status?: string;

    /**
     * Monthly price in EUR (required for fixed mode)
     */
    monthlyPriceEur?: number;

    /**
     * Annual price in EUR (required for fixed mode)
     */
    annualPriceEur?: number;

    components: PlanComponentInput[];
}

export interface PlanComponentInput {
    /**
     * Catalog item ID
     */
    catalogItemId: string;

    /**
     * Usage limits JSON
     */
    usageLimits?: string;

    /**
     * Quantity (default: 1)
     */
    quantity?: number;
}

export interface PaymentListItem {
    /**
     * Payment id
     */
    id: string;

    /**
     * Owner user id
     */
    uid: string;

    /**
     * Owner username
     */
    username?: string;

    /**
     * Payment type
     */
    type: string;

    /**
     * Payment provider
     */
    provider: string;

    /**
     * Amount in cents
     */
    amountCents: number;

    /**
     * Currency
     */
    currency: string;

    /**
     * Payment status
     */
    status: string;

    /**
     * Subscribable type
     */
    subscribableType?: string;

    /**
     * Subscribable id
     */
    subscribableId?: string;

    /**
     * Billing cycle
     */
    billingCycle?: string;

    /**
     * Subscription id
     */
    subscriptionId?: string;

    /**
     * Creation timestamp (Unix ms)
     */
    createdAt: number;
}

export interface PaymentListResponse {
    payments: PaymentListItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface MyPaymentHistoryItem {
    /**
     * Payment id
     */
    id: string;

    /**
     * Payment concept
     */
    concept: string;

    /**
     * Amount in cents
     */
    amountCents: number;

    /**
     * Currency
     */
    currency: string;

    /**
     * Payment method label
     */
    method: string;

    /**
     * Payment status
     */
    status: string;

    /**
     * Payment type
     */
    paymentType: string;

    /**
     * Product type
     */
    productType: string;

    /**
     * Billing cycle
     */
    billingCycle: string;

    /**
     * Creation timestamp (Unix ms)
     */
    createdAt: number;

    /**
     * Catalog item type for item-type payments
     */
    catalogItemType?: string;
}

export interface MyPaymentHistoryResponse {
    payments: MyPaymentHistoryItem[];

    /**
     * Current page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface PaymentCheckoutResponse {
    /**
     * Payment id
     */
    payment_id: string;

    /**
     * Payment status
     */
    status: string;
}

export interface PaymentsPlatformConfig {
    /**
     * Days after payment failure before subscription cancellation
     */
    subscriptionGracePeriodDays: number;

    /**
     * Last update timestamp (ms)
     */
    updatedAt: number;
}

export interface PaymentsPlatformConfigUpdateBody {
    /**
     * Days after payment failure before subscription cancellation
     */
    subscriptionGracePeriodDays: number;
}

export interface OrgItem {
    /**
     * Organization ID
     */
    id: string;

    /**
     * Company name
     */
    companyName: string;

    /**
     * CIF / NIF
     */
    cifNif: string;

    /**
     * Country
     */
    country: string;

    /**
     * Fiscal address
     */
    fiscalAddress: string;

    /**
     * Contact email
     */
    email: string;

    /**
     * Admin user ID
     */
    adminUid: string;

    /**
     * Admin username
     */
    adminUsername: string;

    /**
     * Active flag
     */
    isActive: boolean;

    /**
     * Creation timestamp (Unix ms)
     */
    createdAt: number;

    /**
     * Authenticated user's active role in this organization
     */
    currentUserOrganizationRole?: string;

    /**
     * True when the authenticated user is an active organization admin
     */
    currentUserIsOrganizationAdmin?: boolean;

    /**
     * Authenticated user's join date (Unix ms)
     */
    currentUserJoinedAt?: number;
}

export interface OrgListResponse {
    items: OrgItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface OrgRequestCreateBody {
    /**
     * Company name
     */
    companyName: string;

    /**
     * CIF / NIF
     */
    cifNif: string;

    /**
     * Country
     */
    country: string;

    /**
     * Fiscal address
     */
    fiscalAddress: string;
}

export interface OrgRequestItem {
    /**
     * Organization request ID
     */
    id: string;

    /**
     * Company name
     */
    companyName: string;

    /**
     * CIF / NIF
     */
    cifNif: string;

    /**
     * Country
     */
    country: string;

    /**
     * Fiscal address
     */
    fiscalAddress: string;

    /**
     * Applicant email
     */
    applicantEmail: string;

    /**
     * Request status
     */
    status: string;

    /**
     * Request timestamp
     */
    requestedAt: number;

    /**
     * Resolution timestamp (0 if pending)
     */
    resolvedAt: number;
}

export interface OrgRequestListResponse {
    items: OrgRequestItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface OrgDeletionRequestCreateBody {
    /**
     * ImmediateProratedRefund or AtPeriodEnd
     */
    subscriptionPreference: string;
}

export interface OrgDeletionRequestItem {
    /**
     * Deletion request ID
     */
    id: string;

    /**
     * Organization ID
     */
    organizationId: string;

    /**
     * Organization name
     */
    organizationName: string;

    /**
     * Requesting admin user ID
     */
    requestedByUserId: string;

    /**
     * Requesting admin username
     */
    requestedByUsername: string;

    /**
     * Requested subscription handling
     */
    subscriptionPreference: string;

    /**
     * Applied subscription handling (empty if pending)
     */
    resolvedSubscriptionHandling?: string;

    /**
     * Request status
     */
    status: string;

    /**
     * Request timestamp
     */
    requestedAt: number;

    /**
     * Resolution timestamp (0 if pending)
     */
    resolvedAt: number;

    /**
     * Platform admin who resolved the request
     */
    resolvedByUserId?: string;

    /**
     * Platform admin username who resolved the request
     */
    resolvedByUsername?: string;

    /**
     * Estimated closure timestamp when status is ApprovedPendingPeriodEnd (0 otherwise)
     */
    scheduledDeletionAt?: number;

    /**
     * Reason provided when rejected (empty otherwise)
     */
    rejectionReason?: string;
}

export interface OrgDeletionRequestRejectBody {
    /**
     * Optional rejection reason
     */
    reason?: string;
}

export interface OrgDeletionRequestListResponse {
    items: OrgDeletionRequestItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface OrgUpdateBody {
    /**
     * New company name
     */
    companyName?: string;

    /**
     * New fiscal address
     */
    fiscalAddress?: string;

    /**
     * New contact email
     */
    email?: string;

    /**
     * New country
     */
    country?: string;
}

export interface MemberItem {
    /**
     * Membership ID
     */
    id: string;

    /**
     * User ID
     */
    userId: string;

    /**
     * Username
     */
    username: string;

    /**
     * User email
     */
    email: string;

    /**
     * Active license assignment count for this member
     */
    activeLicenseCount: number;

    /**
     * Organization ID
     */
    organizationId: string;

    /**
     * Role: Admin | Member
     */
    organizationRole: string;

    /**
     * Status: Active | Invited | Inactive
     */
    status: string;

    /**
     * Joined timestamp (Unix ms)
     */
    joinedAt: number;
}

export interface MembersListResponse {
    members: MemberItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface AcceptInvitationBody {
    /**
     * Notification ID
     */
    notificationId: string;
}

export interface InviteMemberBody {
    /**
     * Email of the user to invite
     */
    email: string;

    /**
     * Role: Admin | Member
     */
    organizationRole: string;
}

export interface ChangeMemberRoleBody {
    /**
     * Role: Admin | Member
     */
    organizationRole: string;
}

export interface OrgSubscriptionItem {
    /**
     * Subscription ID
     */
    id: string;

    /**
     * Subscribable type (item or plan)
     */
    subscribableType?: string;

    /**
     * Subscribable id
     */
    subscribableId?: string;

    /**
     * Human-readable product or plan name
     */
    subscribableName?: string;

    /**
     * Billing cycle
     */
    billingCycle: string;

    /**
     * Status
     */
    status: string;

    /**
     * Current period start (Unix ms)
     */
    currentPeriodStart: number;

    /**
     * Current period end (Unix ms)
     */
    currentPeriodEnd: number;

    /**
     * Cancel at period end flag
     */
    cancelAtPeriodEnd: boolean;

    /**
     * Creation timestamp (Unix ms)
     */
    createdAt: number;
}

export interface OrgSubscriptionsListResponse {
    subscriptions: OrgSubscriptionItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface OrgPaymentItem {
    /**
     * Payment ID
     */
    id: string;

    /**
     * Agent ID
     */
    agentId: string;

    /**
     * Payment type
     */
    type: string;

    /**
     * Amount in cents
     */
    amountCents: number;

    /**
     * Currency
     */
    currency: string;

    /**
     * Status
     */
    status: string;

    /**
     * Billing cycle
     */
    billingCycle: string;

    /**
     * Creation timestamp (Unix ms)
     */
    createdAt: number;
}

export interface OrgPaymentsListResponse {
    payments: OrgPaymentItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface LicenseAssignmentItem {
    /**
     * Assignment ID
     */
    id: string;

    /**
     * Organization ID
     */
    organizationId: string;

    /**
     * Assigned user ID
     */
    userId: string;

    /**
     * License pool ID
     */
    licensePoolId: string;

    /**
     * Source billing subscription ID (denormalized)
     */
    subscriptionId: string;

    /**
     * Active flag
     */
    isActive: boolean;

    /**
     * Assignment timestamp (Unix ms)
     */
    assignedAt: number;

    /**
     * Catalog product or service display name
     */
    productName?: string;
}

export interface LicensePoolItem {
    /**
     * Pool ID
     */
    id: string;

    /**
     * Organization ID
     */
    organizationId: string;

    /**
     * Catalog item ID
     */
    catalogItemId: string;

    /**
     * Item plan ID for entitlement
     */
    itemPlanId: string;

    /**
     * Billing subscription ID
     */
    sourceSubscriptionId: string;

    /**
     * plan | item
     */
    sourceType: string;

    /**
     * Maximum assignable seats (-1 = unlimited, services)
     */
    seatLimit: number;

    /**
     * Active assignments count
     */
    assignedCount: number;

    /**
     * Remaining seats (null when seatLimit is -1)
     */
    availableCount?: number;

    /**
     * Catalog product display name
     */
    productName: string;

    /**
     * Billing cycle
     */
    billingCycle: string;

    /**
     * Same as sourceSubscriptionId
     */
    parentSubscriptionId: string;

    /**
     * Pool status (mirrors source subscription)
     */
    status: string;
}

export interface OrgLicensePoolsListResponse {
    pools: LicensePoolItem[];
}

export interface BackfillLicensePoolsResponse {
    /**
     * New pools created during backfill
     */
    poolsCreated: number;

    /**
     * Legacy assignments linked to pools
     */
    assignmentsLinked: number;

    /**
     * Assignments or rows skipped
     */
    skipped: number;
}

export interface OrgLicensesListResponse {
    licenses: LicenseAssignmentItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface AssignLicenseBody {
    /**
     * License pool ID to assign
     */
    licensePoolId: string;

    /**
     * Member user ID to assign the license to
     */
    userId: string;
}

export interface UpdateSeatsBody {
    /**
     * New seat count (must be >= 1)
     */
    quantity: number;
}

export interface UpdateSeatsResponse {
    /**
     * Current billable seat count (active licenses)
     */
    quantity?: number;

    /**
     * Seats requested but not yet paid (0 if none)
     */
    pending_quantity?: number;

    /**
     * Seats after the scheduled reduction (0 if none)
     */
    scheduled_quantity?: number;

    /**
     * Unix ms when the reduction takes effect (0 if none)
     */
    scheduled_quantity_effective_at?: number;

    /**
     * active | pending
     */
    seat_payment_status?: string;
}

export interface NotificationData {
    /**
     * The notification type identifier (e.g., "purchase_confirmation", "login")
     */
    type?: string;

    /**
     * Metadata and additional information specific to the notification type
     */
    info?: string;
}

export interface Notification {
    /**
     * Notification ID
     */
    id?: string;

    /**
     * Notification timestamp (Unix Milliseconds)
     */
    date?: number;

    /**
     * Whether notification has been read
     */
    read?: boolean;

    notificationContent?: NotificationData;
}

export interface NotificationCountResponse {
    /**
     * Total notifications count
     */
    notificationsCount: number;
}

export interface UnreadNotificationCountResponse {
    /**
     * Unread notifications count
     */
    unreadCount: number;
}

export interface NotificationList {
    notifications: Notification[];

    /**
     * Total number of notifications
     */
    total: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Current page number
     */
    page: number;

    /**
     * Items per page
     */
    pageSize: number;
}

export interface NotificationData_Purchase_Confirmation_Info {
    /**
     * Product name
     */
    productName: string;

    /**
     * Currency
     */
    currency: string;

    /**
     * Amount
     */
    amount: number;
}

export interface NotificationData_Purchase_Confirmation {
    /**
     * "purchase_confirmation"
     */
    type?: string;

    /**
     * Order ID
     */
    ordenId?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Purchase_Confirmation_Info;
}

export interface NotificationData_Subscription_Renewed_Info {
    /**
     * Plan name
     */
    planName?: string;

    /**
     * Next renewal date
     */
    nextRenewalDate?: string;
}

export interface NotificationData_Subscription_Renewed {
    /**
     * "subscription_renewed"
     */
    type?: string;

    /**
     * Subscription ID
     */
    subscriptionId?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Subscription_Renewed_Info;
}

export interface NotificationData_Payment_Failed_Info {
    /**
     * Reason for failure
     */
    reason: string;

    /**
     * Retry URL
     */
    retryUrl: string;
}

export interface NotificationData_Payment_Failed {
    /**
     * "payment_failed"
     */
    type?: string;

    /**
     * Transaction ID
     */
    transactionId?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Payment_Failed_Info;
}

export interface NotificationData_Seats_Reduced_Info {
    /**
     * Number of license assignments revoked
     */
    revokedCount: number;

    /**
     * New seat limit after reduction
     */
    maxSeats: number;
}

export interface NotificationData_Seats_Reduced {
    /**
     * "seats_reduced"
     */
    type?: string;

    /**
     * Subscription ID
     */
    subscriptionId?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Seats_Reduced_Info;
}

export interface NotificationData_Token_Issue_Info {
    /**
     * Amount
     */
    amount: number;

    /**
     * Wallet address
     */
    walletAddress: string;
}

export interface NotificationData_Token_Issue {
    /**
     * "token_issue"
     */
    type?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Token_Issue_Info;
}

export interface NotificationData_Login_Info {
    /**
     * Message
     */
    message: string;
}

export interface NotificationData_Login {
    /**
     * "login"
     */
    type?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Login_Info;
}

export interface NotificationData_Organization_Request_Approved_Info {
    /**
     * Message
     */
    message: string;
}

export interface NotificationData_Organization_Request_Approved {
    /**
     * "organization_request_approved"
     */
    type?: string;

    /**
     * Company name
     */
    companyName?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Organization_Request_Approved_Info;
}

export interface NotificationData_Organization_Request_Rejected_Info {
    /**
     * Message
     */
    message: string;
}

export interface NotificationData_Organization_Request_Rejected {
    /**
     * "organization_request_rejected"
     */
    type?: string;

    /**
     * Company name
     */
    companyName?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Organization_Request_Rejected_Info;
}

export interface NotificationData_Organization_Member_Invited_Info {
    /**
     * Message
     */
    message: string;
}

export interface NotificationData_Organization_Member_Invited {
    /**
     * "organization_member_invited"
     */
    type?: string;

    /**
     * Organization name
     */
    organizationName?: string;

    /**
     * Role
     */
    role?: string;

    /**
     * Membership ID for accept/reject actions
     */
    membershipId?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Organization_Member_Invited_Info;
}

export interface NotificationData_Organization_Member_Invitation_Accepted_Info {
    /**
     * Message
     */
    message: string;
}

export interface NotificationData_Organization_Member_Invitation_Accepted {
    /**
     * "organization_member_invitation_accepted"
     */
    type?: string;

    /**
     * Organization name
     */
    organizationName?: string;

    /**
     * Member name
     */
    memberName?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Organization_Member_Invitation_Accepted_Info;
}

export interface NotificationData_Organization_Member_Invitation_Rejected_Info {
    /**
     * Message
     */
    message: string;
}

export interface NotificationData_Organization_Member_Invitation_Rejected {
    /**
     * "organization_member_invitation_rejected"
     */
    type?: string;

    /**
     * Organization name
     */
    organizationName?: string;

    /**
     * Member name
     */
    memberName?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Organization_Member_Invitation_Rejected_Info;
}

export interface NotificationData_Organization_Member_Activated_Info {
    /**
     * Message
     */
    message: string;
}

export interface NotificationData_Organization_Member_Activated {
    /**
     * "organization_member_activated"
     */
    type?: string;

    /**
     * Organization name
     */
    organizationName?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Organization_Member_Activated_Info;
}

export interface NotificationData_Organization_Member_Deactivated_Info {
    /**
     * Message
     */
    message: string;
}

export interface NotificationData_Organization_Member_Deactivated {
    /**
     * "organization_member_deactivated"
     */
    type?: string;

    /**
     * Organization name
     */
    organizationName?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Organization_Member_Deactivated_Info;
}

export interface NotificationData_Organization_Member_Removed_Info {
    /**
     * Message
     */
    message: string;
}

export interface NotificationData_Organization_Member_Removed {
    /**
     * "organization_member_removed"
     */
    type?: string;

    /**
     * Organization name
     */
    organizationName?: string;

    /**
     * Additional info
     */
    info?: NotificationData_Organization_Member_Removed_Info;
}

export interface NotificationData_Unknown {
    /**
     * "unknown"
     */
    type?: string;
}

export interface ItaasWorkspaceFlowBody {
    /**
     * `organization` or `user`
     */
    subjectType: string;

    /**
     * Organization id or user id
     */
    subjectId: string;

    /**
     * Flowise chatflow id
     */
    flowId: string;
}

export interface ItaasWorkspaceFlowSubject {
    /**
     * `organization` or `user`
     */
    subjectType: string;

    /**
     * Organization id or user id
     */
    subjectId: string;
}

export interface ItaasWorkspaceFlowSyncResult {
    /**
     * Sync action (`provision` or `skip`)
     */
    action: string;

    /**
     * Result reason
     */
    reason: string;

    subject?: ItaasWorkspaceFlowSubject;
}

export interface ItaasAdminFlowAssignment {
    /**
     * `organization` or `user`
     */
    subjectType: string;

    /**
     * Organization id or user id
     */
    subjectId: string;

    /**
     * Display name when known
     */
    name?: string;

    /**
     * `active` or `inactive`
     */
    status: string;
}

export interface ItaasAdminFlowItem {
    /**
     * Flowise chatflow id
     */
    id: string;

    /**
     * Flow display name
     */
    name: string;

    /**
     * Whether the flow is deployed
     */
    deployed: boolean;

    /**
     * Flowise flow type
     */
    type?: string;

    /**
     * Flow category
     */
    category?: string;

    /**
     * Last update timestamp
     */
    updatedAt?: string;

    /**
     * Whether the flow is platform-global
     */
    isGlobal: boolean;

    /**
     * `global`, `workspace` or `unassigned`
     */
    visibility: string;

    assignments: ItaasAdminFlowAssignment[];

    /**
     * Whether end users can see the graph preview
     */
    graphVisibleToUsers: boolean;

    graph?: ItaasFlowGraph;
}

export interface ItaasAdminFlowsList {
    items: ItaasAdminFlowItem[];
}

export interface ItaasAdminWorkspaceItem {
    /**
     * `organization` or `user`
     */
    subjectType: string;

    /**
     * Organization id or user id
     */
    subjectId: string;

    /**
     * BFF tenant key
     */
    subjectKey: string;

    /**
     * Display name when known
     */
    name?: string;

    /**
     * `active` or `inactive`
     */
    status: string;

    flowIds: string[];
}

export interface ItaasAdminWorkspacesList {
    items: ItaasAdminWorkspaceItem[];
}

export interface ItaasAdminFlowGraphVisibilityBody {
    /**
     * Whether end users can see the graph preview
     */
    visible: boolean;
}

export interface ItaasAdminFlowGraphVisibilityResult {
    /**
     * Flowise chatflow id
     */
    flowId: string;

    /**
     * Whether end users can see the graph preview
     */
    graphVisibleToUsers: boolean;
}

export interface ItaasAdminFlowsGraphVisibilityBody {
    /**
     * Whether end users can see the graph preview
     */
    visible: boolean;

    flowIds: string[];
}

export interface ItaasAdminFlowsGraphVisibilityResult {
    /**
     * Whether end users can see the graph preview
     */
    graphVisibleToUsers: boolean;

    flowIds: string[];
}

export interface ItaasAdminFlowsGraphVisibilityLookupBody {
    flowIds: string[];
}

export interface ItaasAdminFlowsGraphVisibilityLookupResult {
    items: ItaasAdminFlowGraphVisibilityResult[];
}

export interface ItaasAdminGlobalFlowBody {
    /**
     * Flowise chatflow id
     */
    flowId: string;
}

export interface ItaasAdminGlobalFlowResult {
    globalFlowIds: string[];

    /**
     * Private assignments removed before publish
     */
    clearedAssignments: number;
}

export interface ItaasCustomAgentRequestItem {
    /**
     * Request ID
     */
    id: string;

    /**
     * Request status
     */
    status: string;

    /**
     * Request type (`adaptation` or `custom`)
     */
    requestType: string;

    /**
     * Request description
     */
    description: string;

    /**
     * Optional base marketplace agent ID
     */
    baseAgentId?: string;

    /**
     * Optional base Flowise flow ID
     */
    baseFlowiseFlowId?: string;

    /**
     * Requester user ID
     */
    requesterUserId: string;

    /**
     * Requester username
     */
    requesterUsername?: string;

    /**
     * Billing organization ID when requested as org admin
     */
    organizationId?: string;

    /**
     * Admin rejection reason
     */
    adminRejectionReason?: string;

    /**
     * Deposit payment ID
     */
    paymentId?: string;

    /**
     * Delivered Flowise flow ID
     */
    deliveredFlowiseFlowId?: string;

    /**
     * Monthly subscription ID after delivery
     */
    monthlySubscriptionId?: string;

    /**
     * Status before cancellation or rejection
     */
    closedFromStatus?: string;

    /**
     * Creation timestamp (Unix ms)
     */
    createdAt: number;

    /**
     * Update timestamp (Unix ms)
     */
    updatedAt: number;
}

export interface ItaasCustomAgentRequestListResponse {
    custom_agent_requests: ItaasCustomAgentRequestItem[];
}

export interface ItaasCustomAgentRequestCreateBody {
    /**
     * Request type (`adaptation` or `custom`)
     */
    requestType: string;

    /**
     * Request description
     */
    description: string;

    /**
     * Optional base marketplace agent ID
     */
    baseAgentId?: string;

    /**
     * Optional base Flowise flow ID
     */
    baseFlowiseFlowId?: string;
}

export interface ItaasCustomAgentRequestRejectBody {
    /**
     * Rejection reason
     */
    reason: string;
}

export interface ItaasCustomAgentRequestDeliverBody {
    /**
     * Non-global Flowise flow ID to assign
     */
    flowId: string;
}

export interface ItaasAdminCustomAgentRequestList {
    items: ItaasCustomAgentRequestItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface ItaasCustomAgentRequestCheckoutBody {
    /**
     * Frontend URL after successful payment
     */
    successUrl?: string;

    /**
     * Frontend URL after cancelled payment
     */
    cancelUrl?: string;

    /**
     * Number of tokens to apply as a discount (optional, default 0)
     */
    redeem_tokens?: number;
}

export interface ItaasCustomAgentRequestCheckoutResponse {
    /**
     * Stripe checkout URL
     */
    checkoutUrl: string;
}

export interface ItaasFlowSummary {
    /**
     * Flow ID
     */
    id: string;

    /**
     * Flow name
     */
    name: string;

    /**
     * Whether the flow is deployed
     */
    deployed: boolean;

    /**
     * Flowise flow type when present
     */
    type?: string;

    /**
     * Flow category when present
     */
    category?: string;

    /**
     * Last update timestamp
     */
    updatedAt?: string;
}

export interface ItaasFlowGraphNode {
    /**
     * Node ID
     */
    id: string;

    /**
     * Display label
     */
    label: string;

    /**
     * Canvas X position
     */
    x: number;

    /**
     * Canvas Y position
     */
    y: number;
}

export interface ItaasFlowGraphEdge {
    /**
     * Edge ID
     */
    id: string;

    /**
     * Source node ID
     */
    source: string;

    /**
     * Target node ID
     */
    target: string;
}

export interface ItaasFlowGraph {
    nodes: ItaasFlowGraphNode[];

    edges: ItaasFlowGraphEdge[];
}

export interface ItaasFlowDetail {
    /**
     * Flow ID
     */
    id: string;

    /**
     * Flow name
     */
    name: string;

    /**
     * Whether the flow is deployed
     */
    deployed: boolean;

    /**
     * Flowise flow type when present
     */
    type?: string;

    /**
     * Flow category when present
     */
    category?: string;

    /**
     * Creation timestamp when present
     */
    createdAt?: string;

    /**
     * Last update timestamp
     */
    updatedAt?: string;

    graph?: ItaasFlowGraph;
}

export interface ItaasFlowsListResponse {
    /**
     * BFF workspace id for the tenant
     */
    workspaceId: string;

    flows: ItaasFlowSummary[];
}

export interface ItaasRunFlowBody {
    /**
     * Optional user question / prompt
     */
    question?: string;

    /**
     * Optional Flowise overrideConfig
     */
    overrideConfig?: any;
}

export interface ItaasRunFlowResult {
    /**
     * Textual output when present
     */
    text?: string;

    /**
     * Structured output when present
     */
    json?: any;

    /**
     * Raw BFF/Flowise payload
     */
    raw: any;
}

export interface ItaasCredentialField {
    /**
     * Field name
     */
    name: string;

    /**
     * Field label
     */
    label: string;

    /**
     * Field type
     */
    type: string;
}

export interface ItaasCredentialAvailable {
    /**
     * Existing credential ID
     */
    id: string;

    /**
     * Existing credential name
     */
    name: string;
}

export interface ItaasCredentialRequirement {
    /**
     * Credential type key
     */
    credentialType: string;

    /**
     * Human-readable label
     */
    label: string;

    fields: ItaasCredentialField[];

    /**
     * Whether a credential is already assigned
     */
    assigned: boolean;

    /**
     * Assigned credential ID when present
     */
    credentialId?: string;

    nodeIds: string[];

    available: ItaasCredentialAvailable[];
}

export interface ItaasFlowCredentialsResponse {
    /**
     * Flow ID
     */
    flowId: string;

    requirements: ItaasCredentialRequirement[];
}

export interface ItaasStoreCredentialBody {
    /**
     * Credential type key
     */
    credentialType: string;

    /**
     * Name when creating or overwriting a credential
     */
    name?: string;

    /**
     * Secret field values when creating or overwriting a credential
     */
    data?: any;

    /**
     * Existing credential ID when reusing or overwriting
     */
    credentialId?: string;
}

export interface ItaasStoreCredentialResult {
    /**
     * Created or reused credential ID
     */
    credentialId: string;

    /**
     * Whether it was assigned to flow nodes
     */
    assigned: boolean;

    /**
     * Whether an existing credential was reused
     */
    reused: boolean;

    nodeIds: string[];
}

export interface ItaasCreateCredentialBody {
    /**
     * Credential type key
     */
    credentialType: string;

    /**
     * Display name
     */
    name: string;

    /**
     * Secret field values
     */
    data: any;
}

export interface ItaasCreateCredentialResult {
    /**
     * Created credential ID
     */
    credentialId: string;

    /**
     * Credential type key
     */
    credentialType: string;

    /**
     * Display name
     */
    name: string;

    /**
     * Whether the BFF reports the credential as assigned
     */
    assigned: boolean;
}

export interface ItaasWorkspaceCredential {
    /**
     * Credential ID
     */
    id: string;

    /**
     * Display name
     */
    name: string;

    /**
     * Credential type key
     */
    credentialType: string;

    /**
     * Human-readable type label
     */
    label: string;

    fields: ItaasCredentialField[];

    /**
     * Flow used as store/update host
     */
    hostFlowId: string;

    assignedFlowIds: string[];
}

export interface ItaasWorkspaceCredentialType {
    /**
     * Credential type key declared by a flow
     */
    credentialType: string;

    /**
     * Human-readable type label
     */
    label: string;

    fields: ItaasCredentialField[];

    /**
     * Whether accessible flows disagree on the fields for this type
     */
    schemaConflict: boolean;
}

export interface ItaasWorkspaceCredentialsResponse {
    /**
     * BFF workspace id for the tenant
     */
    workspaceId: string;

    flows: ItaasFlowSummary[];

    credentials: ItaasWorkspaceCredential[];

    credentialTypes: ItaasWorkspaceCredentialType[];
}

export interface ItaasFlowFavoriteItem {
    /**
     * Favorited flow ID
     */
    flowId: string;

    /**
     * Favorite creation timestamp (Unix ms)
     */
    createdAt: number;
}

export interface ItaasFlowFavoritesListResponse {
    favorites: ItaasFlowFavoriteItem[];

    /**
     * Total favorites count
     */
    total: number;
}

export interface InternalUserOrganizationInfo {
    /**
     * Organization ID
     */
    id: string;

    /**
     * Organization name
     */
    companyName: string;

    /**
     * Membership role
     */
    role: string;
}

export interface InternalUserItaasSubscriptionInfo {
    /**
     * True when an active ITAAS Platform subscription exists
     */
    hasSubscription: boolean;

    /**
     * Subscription source: organization, personal, or none
     */
    source: string;

    /**
     * True when the user has a personal subscription or an assigned org license seat
     */
    assignedToUser: boolean;
}

export interface InternalUserInfoResponse {
    /**
     * Marketplace user ID
     */
    uid: string;

    /**
     * Keycloak subject
     */
    keycloakSub: string;

    /**
     * Email
     */
    email: string;

    /**
     * Username
     */
    username: string;

    /**
     * Platform role
     */
    role: string;

    organization?: InternalUserOrganizationInfo;

    itaasSubscription: InternalUserItaasSubscriptionInfo;
}

export interface DidRegisterUserBody {
    /**
     * Wallet password (needed to sign the blockchain registration tx)
     */
    walletPassword: string;
}

export interface DidRegisterUserResponse {
    /**
     * Operation successful
     */
    success: boolean;

    /**
     * Created DID
     */
    did: string;

    /**
     * Ethereum address
     */
    ethereumAddress: string;
}

export interface DidRegisterAIBody {
    /**
     * AI agent name
     */
    name: string;

    /**
     * Wallet password
     */
    walletPassword: string;
}

export interface DidRegisterAIResponse {
    /**
     * Operation successful
     */
    success: boolean;

    /**
     * Created DID
     */
    did: string;

    /**
     * Ethereum address
     */
    ethereumAddress: string;
}

export interface DidMeResponse {
    /**
     * Operation successful
     */
    success: boolean;

    /**
     * Token DID
     */
    did?: string;

    /**
     * Credential subject
     */
    credentialSubject?: any;

    /**
     * Credential JWT
     */
    vcJwt?: string;
}

export interface DidMyCredentialsResponse {
    /**
     * Operation successful
     */
    success: boolean;

    /**
     * Number of credentials
     */
    count: number;

    /**
     * List of credentials
     */
    credentials: any[];
}

export interface DidCreatePresentationBody {
    /**
     * IDs of the credentials to include
     */
    credentialIds: any[];

    /**
     * Unique nonce (prevents replay attacks)
     */
    nonce: number;

    /**
     * Password of the wallet to sign
     */
    walletPassword: string;

    /**
     * Optional message to include
     */
    message?: string;
}

export interface DidCreatePresentationResponse {
    /**
     * Operation successful
     */
    success: boolean;

    /**
     * Verifiable Presentation JWT
     */
    vpJwt: string;

    /**
     * Number of credentials included
     */
    credentialsCount: number;

    /**
     * Confirmation message
     */
    message?: string;
}

export interface DidVerifyPresentationBody {
    /**
     * Verifiable Presentation JWT to verify
     */
    vpJwt: string;
}

export interface DidVerifyPresentationResponse {
    /**
     * Operation successful
     */
    success: boolean;

    /**
     * If the presentation is valid
     */
    valid: boolean;

    /**
     * Verified presentation data
     */
    presentation?: any;

    /**
     * Additional message
     */
    message?: string;
}

export interface DashboardSummaryMrr {
    currentCents: number;

    /**
     * Previous month MRR (nullable; not available without historical snapshots)
     */
    previousCents?: number;

    /**
     * Month-over-month MRR change (nullable; not available without historical snapshots)
     */
    variationPct?: number;
}

export interface DashboardSummaryArr {
    currentCents: number;
}

export interface DashboardSummaryActiveSubscriptions {
    total: number;

    plan: number;

    service: number;

    product: number;
}

export interface DashboardSummaryTotalUsers {
    total: number;

    newLast30Days: number;
}

export interface DashboardSummaryActiveOrganizations {
    total: number;

    totalMembers: number;
}

export interface DashboardSummaryCurrentMonthRevenue {
    cents: number;

    previousMonthCents: number;

    variationPct: number;
}

export interface DashboardRevenueMonthlyPoint {
    /**
     * Month label (YYYY-MM)
     */
    month: string;

    revenueCents: number;

    transactionCount: number;
}

export interface DashboardSubscriptionTrendPoint {
    /**
     * Month label (YYYY-MM)
     */
    month: string;

    created: number;

    cancelled: number;
}

export interface DashboardSummaryTokenCirculation {
    availableTokens: number;

    lockedTokens: number;

    equivalentEurCents: number;
}

export interface DashboardTopSubscribedCatalogItem {
    catalogItemId: string;

    name: string;

    type: string;

    status: string;

    subscriptionCount: number;
}

export interface DashboardTopSubscribedCatalogItems {
    items: DashboardTopSubscribedCatalogItem[];

    /**
     * Catalog items with at least one active subscription
     */
    total: number;
}

export interface DashboardSummaryPaymentHealth {
    failedPaymentsCount: number;

    suspendedSubscriptions: number;
}

export interface DashboardBlockchainDailyPoint {
    /**
     * Day label (YYYY-MM-DD)
     */
    day: string;

    /**
     * Blockchain traceability events recorded that day
     */
    eventCount: number;
}

export interface DashboardRecentActivityItem {
    type: string;

    title: string;

    timestamp: number;

    severity: string;

    referenceId: string;
}

export interface AdminDashboardSummary {
    mrr: DashboardSummaryMrr;

    arr: DashboardSummaryArr;

    activeSubscriptions: DashboardSummaryActiveSubscriptions;

    totalUsers: DashboardSummaryTotalUsers;

    activeOrganizations: DashboardSummaryActiveOrganizations;

    currentMonthRevenue: DashboardSummaryCurrentMonthRevenue;

    revenueMonthly: DashboardRevenueMonthlyPoint[];

    /**
     * Subscription counts by status
     */
    subscriptionStatusDistribution: any;

    subscriptionTrend: DashboardSubscriptionTrendPoint[];

    tokenCirculation: DashboardSummaryTokenCirculation;

    topSubscribedCatalogItems: DashboardTopSubscribedCatalogItems;

    paymentHealth: DashboardSummaryPaymentHealth;

    /**
     * Failed blockchain traceability events
     */
    traceabilityFailedCount: number;

    blockchainEventsDaily: DashboardBlockchainDailyPoint[];

    /**
     * Pending organization requests
     */
    pendingOrgRequests: number;

    /**
     * Pending verifiable credential requests
     */
    pendingVCRequests: number;

    recentActivity: DashboardRecentActivityItem[];
}

export interface CatalogPublicListItem {
    /**
     * Item ID
     */
    id: string;

    /**
     * Item type
     */
    type: string;

    /**
     * Item name
     */
    name: string;

    /**
     * Short description
     */
    shortDescription: string;

    /**
     * Long description
     */
    longDescription: string;

    /**
     * Item price
     */
    price: number;

    /**
     * Item status
     */
    status: string;

    /**
     * Creation timestamp
     */
    createdAt: number;
}

export interface CatalogPublicList {
    items: CatalogPublicListItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface CatalogPublicItemPricing {
    /**
     * ItemPricing ID
     */
    id: string;

    /**
     * ItemPricing price in EUR
     */
    price: number;
}

export interface CatalogPublicItemDetail {
    /**
     * Item ID
     */
    id: string;

    /**
     * Item type
     */
    type: string;

    /**
     * Item name
     */
    name: string;

    /**
     * Short description
     */
    shortDescription: string;

    /**
     * Long description
     */
    longDescription: string;

    /**
     * Default item price in EUR
     */
    price: number;

    /**
     * Deposit price in EUR (Custom Agent Service)
     */
    depositPriceEur?: number;

    /**
     * Item status
     */
    status: string;

    /**
     * Creation timestamp
     */
    createdAt: number;

    monthlyItemPricing?: CatalogPublicItemPricing;

    annualItemPricing?: CatalogPublicItemPricing;
}

export interface CatalogPublicEntry {
    /**
     * Entry detail kind (item or plan)
     */
    detailKind: string;

    itemDetail?: CatalogPublicItemDetail;

    planDetail?: PlanPublicDetailResponse;
}

export interface CatalogPublicEntryList {
    items: CatalogPublicEntry[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface CatalogAdminItem {
    /**
     * Item ID
     */
    id: string;

    /**
     * Item type
     */
    type: string;

    /**
     * Item name
     */
    name: string;

    /**
     * Short description
     */
    shortDescription: string;

    /**
     * Long description
     */
    longDescription: string;

    /**
     * Monthly item price in EUR
     */
    price: number;

    /**
     * Annual item price in EUR
     */
    annualPriceEur?: number;

    /**
     * Deposit price in EUR (Custom Agent Service)
     */
    depositPriceEur?: number;

    /**
     * Item status
     */
    status: string;

    /**
     * Item visibility
     */
    visibility: string;

    /**
     * Creation timestamp
     */
    createdAt: number;
}

export interface CatalogAdminList {
    items: CatalogAdminItem[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface CatalogAdminEntry {
    /**
     * True when the row is a business plan
     */
    isPlan: boolean;

    /**
     * Entry ID
     */
    id: string;

    /**
     * Entry name
     */
    name: string;

    /**
     * Catalog item type or Plan
     */
    type: string;

    /**
     * Monthly price in EUR
     */
    price: number;

    /**
     * Annual price in EUR
     */
    annualPriceEur?: number;

    /**
     * Plan pricing mode when isPlan
     */
    pricingMode?: string;

    /**
     * Plan discount percent when isPlan
     */
    discountPercent?: number;

    /**
     * Item visibility when not a plan
     */
    visibility?: string;

    /**
     * Entry status
     */
    status: string;

    /**
     * Last update timestamp
     */
    updatedAt: number;
}

export interface CatalogAdminEntryList {
    items: CatalogAdminEntry[];

    /**
     * Page number
     */
    page: number;

    /**
     * Total pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface CatalogBody {
    /**
     * Item type
     */
    type: string;

    /**
     * Item name
     */
    name: string;

    /**
     * Short description
     */
    shortDescription: string;

    /**
     * Long description
     */
    longDescription?: string;

    /**
     * Monthly price in EUR
     */
    monthlyPriceEur: number;

    /**
     * Annual price in EUR
     */
    annualPriceEur?: number;

    /**
     * Deposit price in EUR (Custom Agent Service)
     */
    depositPriceEur?: number;

    /**
     * Status (default: Draft)
     */
    status?: string;

    /**
     * Visibility (default: Public)
     */
    visibility?: string;
}

export interface AuthenticationContext {
    /**
     * Auth status 
     */
    status: "UNAUTHORIZED" | "TFA_REQUIRED" | "USER_NOT_FOUND" | "LOGGED_IN";

    /**
     * User ID
     */
    uid?: string;

    /**
     * User role.
     */
    role?: string;

    permissions?: string[];

    /**
     * Username
     */
    username?: string;

    /**
     * User email
     */
    email?: string;

    /**
     * Is the account protected by two factor authentication?
     */
    tfa?: boolean;

    /**
     * User locale
     */
    locale?: string;

    /**
     * Profile name
     */
    profileName?: string;

    /**
     * Profile image URL
     */
    profileImage?: string;

    /**
     * Whether Keycloak SSO is the only auth method
     */
    keycloakSso?: boolean;
}

export interface LoginRequest {
    /**
     * Username or email
     */
    username: string;

    /**
     * Password
     */
    password: string;

    /**
     * Captcha (Action = "login")
     */
    captcha?: string;

    /**
     * Send true to keep the session active until closed
     */
    remember?: boolean;
}

export interface LoginResponse {
    /**
     * User Id
     */
    uid: string;

    /**
     * Session ID
     */
    session_id: string;
}

export interface ThirdPartyLoginService {
    /**
     * Service ID
     */
    id: string;

    /**
     * Service name
     */
    name: string;

    /**
     * App public client ID
     */
    client_id: string;

    /**
     * Login URL
     */
    url: string;

    /**
     * Redirect URL
     */
    redirect_url: string;
}

export interface ThirdPartyLoginBody {
    /**
     * Service ID
     */
    service: string;
}

export interface ThirdPartyLoginResponse {
    /**
     * Result. 
     */
    result: "SESSION" | "MUST_REGISTER";

    /**
     * Session ID
     */
    session_id?: string;

    /**
     * Email to register
     */
    email?: string;

    /**
     * Third party user OD to register
     */
    id?: string;

    /**
     * Token to register the user
     */
    token?: string;
}

export interface SignupTPRequest {
    /**
     * Third Party user ID
     */
    id: string;

    /**
     * Username
     */
    username: string;

    /**
     * Password
     */
    password: string;

    /**
     * Token received after authorizing (Oauth 2.0)
     */
    token: string;

    /**
     * User locale
     */
    locale?: string;
}

export interface SignupTPResponse {
    /**
     * User ID of the new user
     */
    uid: string;

    /**
     * Session ID
     */
    session_id: string;
}

export interface TFALoginRequest {
    /**
     * Captcha (action = "tfa")
     */
    captcha: string;

    /**
     * Two-factor authentication single-use code
     */
    token: string;
}

export interface LogoutResponse {
    /**
     * Keycloak end-session URL (only when Keycloak SSO is enabled)
     */
    logout_url?: string;
}

export interface SignupRequest {
    /**
     * Email
     */
    email: string;

    /**
     * Username
     */
    username: string;

    /**
     * Password
     */
    password: string;

    /**
     * Captcha (action = "signup")
     */
    captcha?: string;

    /**
     * User locale
     */
    locale?: string;
}

export interface SignupResponse {
    /**
     * User ID of the new user
     */
    uid: string;

    /**
     * Session ID (Only if email validation is disabled)
     */
    session_id?: string;
}

export interface EmailVerifyRequest {
    /**
     * User ID
     */
    uid: string;

    /**
     * Verification code
     */
    verification: string;
}

export interface EmailVerifyResponse {
    /**
     * Status:
     *  - VERIFIED: Account was verified
     *  - ALREADY_VERIFIED: Account was already verified
     */
    status: string;
}

export interface ForgotPasswordRequest {
    /**
     * User email
     */
    email: string;

    /**
     * Captcha (action = "forgot_password")
     */
    captcha?: string;
}

export interface ForgotPasswordResponse {
    /**
     * Status:
     *  - RESET_PASSWORD_EMAIL_SENT: Email sent
     *  - VERIFY_EMAIL_SENT: Account is not verified yet
     *  - ACCOUNT_VERIFIED: Account was verified, but no email was sent
     */
    status: string;
}

export interface ResetPasswordRequest {
    /**
     * User ID
     */
    uid: string;

    /**
     * Verification code
     */
    verification: string;

    /**
     * New password
     */
    password: string;
}

export interface KeycloakAuthUrlResponse {
    /**
     * Keycloak authorization URL
     */
    url: string;

    /**
     * CSRF state token
     */
    state: string;
}

export interface KeycloakReturnPathResponse {
    /**
     * Relative in-app path (empty if none)
     */
    return_path?: string;
}

export interface KeycloakCallbackRequest {
    /**
     * Authorization code
     */
    code: string;

    /**
     * CSRF state token
     */
    state: string;
}

export interface KeycloakCallbackResponse {
    /**
     * User ID
     */
    uid: string;

    /**
     * Session ID
     */
    session_id: string;
}

export interface AgentAdminItem {
    /**
     * Agent ID
     */
    id: string;

    /**
     * Agent code (unique)
     */
    code: string;

    /**
     * Agent name
     */
    name: string;

    /**
     * Agent description
     */
    description: string;

    /**
     * Agent type
     */
    type: string;

    /**
     * Agent category
     */
    category: string;

    /**
     * True if active
     */
    isActive: boolean;

    /**
     * Agent price
     */
    price: number;

    /**
     * Creation timestamp (Unix milliseconds)
     */
    createdAt: number;

    /**
     * Number of tokens
     */
    numTokens: number;
}

export interface AgentAdminList {
    agents: AgentAdminItem[];

    /**
     * Page number (starting by 1)
     */
    page: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Total results
     */
    total: number;
}

export interface AgentCreateBody {
    /**
     * Agent code (lowercase, numbers, _ and -)
     */
    code: string;

    /**
     * Agent name
     */
    name: string;

    /**
     * Agent description
     */
    description: string;

    /**
     * Agent type
     */
    type: string;

    /**
     * Agent category
     */
    category: string;

    /**
     * Active status (default true)
     */
    isActive?: boolean;

    /**
     * Agent price (>= 0)
     */
    price: number;

    /**
     * Number of tokens (>= 0)
     */
    numTokens: number;
}

export interface AgentUpdateBody {
    /**
     * Agent code (lowercase, numbers, _ and -)
     */
    code: string;

    /**
     * Agent name
     */
    name: string;

    /**
     * Agent description
     */
    description: string;

    /**
     * Agent type
     */
    type: string;

    /**
     * Agent category
     */
    category: string;

    /**
     * Active status
     */
    isActive?: boolean;

    /**
     * Agent price (>= 0)
     */
    price: number;

    /**
     * Number of tokens (>= 0)
     */
    numTokens: number;
}

export interface UsernameChangeRequest {
    /**
     * New username
     */
    username: string;

    /**
     * Account password (required when Keycloak SSO is disabled)
     */
    password?: string;

    /**
     * Two factor authentication code, if you have it enabled is required
     */
    tfa_token?: string;
}

export interface EmailChangeRequest {
    /**
     * New email
     */
    email: string;

    /**
     * Account password (required when Keycloak SSO is disabled)
     */
    password?: string;

    /**
     * Two factor authentication code, if you have it enabled is required
     */
    tfa_token?: string;

    /**
     * Captcha (Action = "change_email")
     */
    captcha?: string;
}

export interface PasswordChangeRequest {
    /**
     * Old password
     */
    old_password: string;

    /**
     * New password
     */
    new_password: string;
}

export interface TFAGenResponse {
    /**
     * TFA secret
     */
    secret: string;

    /**
     * URL for QR code
     */
    uri: string;
}

export interface TFASetupRequest {
    /**
     * Account password
     */
    password: string;

    /**
     * TFA secret
     */
    secret: string;

    /**
     * Current TFA token to validate the secret
     */
    token: string;
}

export interface TFARemoveRequest {
    /**
     * Current TFA token to validate the request
     */
    token: string;
}

export interface SessionListItem {
    /**
     * Session Token
     */
    session: string;

    /**
     * Session creation timestamp
     */
    created?: number;

    /**
     * Remote address
     */
    remote?: string;

    /**
     * Operating system
     */
    os?: string;

    /**
     * Browser / Platform
     */
    browser?: string;

    /**
     * Is current Session?
     */
    current?: boolean;
}

export interface ChangeLocaleBody {
    /**
     * Locale to use, If wrong, it will use the default locale.
     */
    locale?: string;
}

export interface DeleteAccountRequest {
    /**
     * Account password
     */
    password: string;

    /**
     * Two factor authentication code, if you have it enabled is required
     */
    tfa_token: string;
}

