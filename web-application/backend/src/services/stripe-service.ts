// Reserved for license

import Stripe from "stripe";
import { Config } from "../config/config";
import Decimal from "decimal.js";
import { Monitor } from "../monitor";
import { StripeConfig } from "../config/config-stripe";
import { BlockchainConfig } from "../config/config-blockchain";
import { StripeAccount } from "../models/stripe-account";

/**
 * Stripe service
 */
export class StripeService {
    /* Singleton */

    public static CONFIG: Stripe.StripeConfig = {
        apiVersion: '2026-01-28.clover',
    };

    public static instance: StripeService = null;

    public static getInstance(): StripeService {
        if (StripeService.instance) {
            return StripeService.instance;
        } else {
            StripeService.instance = new StripeService();
            return StripeService.instance;
        }
    }

    public client: Stripe;

    constructor() {
        if (!StripeConfig.getInstance().clientSecret) {
            Monitor.warning("Stripe service is not properly configured.");
            this.client = null;
            return;
        }
        this.client = new Stripe(StripeConfig.getInstance().clientSecret, StripeService.CONFIG);
    }

    public async createConnectedAccount(): Promise<string> {        
        if (!this.client) {
            throw new Error("Stripe is not configured");
        }

        const account = await this.client.accounts.create({
            type: "express",
        });

        return account.id;
    }

    public async createAccountLink(methodId: string, accountId: string, isVerified: boolean): Promise<string> {
        const cancelURL = Config.getInstance().getFrontendURI("/#/payment-methods");
        const successURL = Config.getInstance().getFrontendURI("/#/payment-methods?success=" + encodeURIComponent(methodId));

        if (!this.client) {
            throw new Error("Stripe is not configured");
        }

        const accountLink = await this.client.accountLinks.create({
            account: accountId,
            refresh_url: cancelURL,
            return_url: successURL,
            type: "account_onboarding",
        });

        return accountLink.url;
    }

    public async deleteConnectedAccount(accountId: string): Promise<void> {
        if (!accountId) {
            return;
        }
        
        if (!this.client) {
            throw new Error("Stripe is not configured");
        }

        await this.client.accounts.del(accountId);
    }

    public parse(amount: number, decimals: number): bigint  {

        const d = new Decimal(amount);
        const exchangedAmount = BigInt(d.mul((new Decimal(10)).pow(new Decimal(decimals))).floor().toHex());

        return exchangedAmount;
    }

    public toStripeCurrency(amount: bigint, decimals: number): number {
        const amountDecimal = new Decimal(amount.toString(10));

        const base = (new Decimal(10)).pow(new Decimal(decimals));

        return amountDecimal.div(base).mul(100).floor().toNumber();
    }

    public async toStripeCurrencyAndFee(amount: bigint, decimals: number): Promise<{amount: number, fee: number}> {
        const amountDecimal = new Decimal(amount.toString(10));
        const feeDecimal = amountDecimal.mul(new Decimal(StripeConfig.getInstance().fee));

        const base = (new Decimal(10)).pow(new Decimal(decimals));

        return {
            amount: amountDecimal.div(base).mul(100).floor().toNumber(),
            fee: feeDecimal.div(base).mul(100).floor().toNumber(),
        };
    }

    public async payCredit(
        amount: number, 
        isFund: boolean, 
        paymentMethodId: string, 
        projectId: string, 
        uid: string,
        customSuccessURL?: string,
        customCancelURL?: string
    ): Promise<string> {
        const successURL = customSuccessURL || Config.getInstance().getFrontendURI("/#/projects/create?payment=success");
        const cancelURL = customCancelURL || Config.getInstance().getFrontendURI("/#/projects/create?payment=cancel");

        if (!this.client) {
            throw new Error("Stripe is not configured");
        }

        let name;
        let description;
        let type;

        if(isFund) {
            name = "Fund Credit";
            description = "Fund a credit from a project";
            type = "fund";
        }else{
            name = "Purchase Credit";
            description = "Purchase a credit from a project";
            type = "purchase";
        }

        const checkout = await this.client.checkout.sessions.create({
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: 'EUR',
                        unit_amount: amount,
                        product_data: {
                            name: name,
                            description: description,
                        },
                    },
                    quantity: 1,
                }
            ],
            metadata: {
                kind: type,
                method_id: paymentMethodId,
                project_id: projectId,
                uid: uid,
            },
            success_url: successURL,
            cancel_url: cancelURL,
        });

        return checkout.url;
    }

    public async payValidation(
        amount: number,
        uid: string,
        contract_id: string,
        customSuccessURL?: string,
        customCancelURL?: string
    ): Promise<string> {
        const successURL = customSuccessURL || Config.getInstance().getFrontendURI("/quotation?payment=success");
        const cancelURL = customCancelURL || Config.getInstance().getFrontendURI("/quotation?payment=cancel");

        if (!this.client) {
            throw new Error("Stripe is not configured");
        }

        const checkout = await this.client.checkout.sessions.create({
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: 'EUR',
                        unit_amount: amount,
                        product_data: {
                            name: "Validation Fee",
                            description: "Payment for project validation fees",
                        },
                    },
                    quantity: 1,
                }
            ],
            metadata: {
                kind: "pay_validation",
                uid: uid,
                contract_id: contract_id,
            },
            success_url: successURL,
            cancel_url: cancelURL,
        });

        return checkout.url;
    }

    public async createCustomCheckout(
        amount: number,
        currency: string,
        name: string,
        description: string,
        metadata: any,
        successURL?: string,
        cancelURL?: string,
        customer?: string,
        options?: { savePaymentMethodForFuture?: boolean; discounts?: Array<{ coupon: string }> },
    ): Promise<{ url: string, sessionId: string }> {
        if (!this.client) {
            throw new Error("Stripe is not configured");
        }

        const savePaymentMethodForFuture = !!options?.savePaymentMethodForFuture && !!customer;
        const discounts = options?.discounts && options.discounts.length > 0 ? options.discounts : undefined;

        const checkout = await this.client.checkout.sessions.create({
            mode: "payment",
            ...(customer ? { customer } : {}),
            line_items: [
                {
                    price_data: {
                        currency: currency,
                        unit_amount: amount,
                        product_data: {
                            name: name,
                            description: description,
                        },
                    },
                    quantity: 1,
                }
            ],
            ...(discounts ? { discounts } : {}),
            metadata: metadata || {},
            // Persist the card on the Stripe customer so monthly billing can charge off-session later.
            ...(savePaymentMethodForFuture ? {
                payment_intent_data: {
                    setup_future_usage: "off_session",
                },
            } : {}),
            success_url: successURL || Config.getInstance().getFrontendURI("/?payment=success"),
            cancel_url: cancelURL || Config.getInstance().getFrontendURI("/?payment=cancel"),
        });

        return { url: checkout.url, sessionId: checkout.id };
    }

    public async createAccount (uid: string): Promise<string> {
        if (!this.client) {
            throw new Error("Stripe is not configured");
        }
        const account = await this.client.accounts.create({
            type: "express",
        });
        StripeAccount.createAccount(account.id, uid);

        return account.id;
    }

    public async getAccount(accountId: string): Promise<Stripe.Account> {
        if (!this.client) {
            throw new Error("Stripe is not configured");
        }

        return await this.client.accounts.retrieve(accountId);
    }
}
