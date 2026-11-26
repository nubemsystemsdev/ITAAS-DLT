# Payments

Stripe confirms Checkout at `POST /stripe/webhook`. On-chain payment records use `CONTRACT_PAYMENT_ROUTER`.

`PAYMENTS_SUBSCRIPTION_GRACE_PERIOD_DAYS` is the initial grace period. The admin payments view stores the value in use in `payments_platform_config`.

Other settings: [CONFIG.md](../CONFIG.md#payments-and-tokens).
