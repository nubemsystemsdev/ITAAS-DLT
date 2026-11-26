# Services

Services are Singleton classes encapsulating reusable code. They are used by the controllers to perform complex tasks, like file storage, sending mails or making requests to third party services without adding the logic inside the controller class.

They live in [src/services](../src/services/).

## Example service

Here is an example service you can use as template:

```ts
// Example service

"use strict";

export class ExampleService {
    /* Singleton */

    public static instance: ExampleService = null;

    public static getInstance(): ExampleService {
        if (ExampleService.instance) {
            return ExampleService.instance;
        } else {
            ExampleService.instance = new ExampleService();
            return ExampleService.instance;
        }
    }

    constructor() {
        // Initialization logic here
    }

    // ...
}
```

Note: When adding new services, remember to update this document.

## Existing services

Here is a list of existing services with a brief explanation on their function and usage.

### Blockchain events scan service

Location: [src/services/blockchain-events-scan.ts](../src/services/blockchain-events-scan.ts).

The blockchain events scan service is used to scan the blockchain in order to find events, and index them in the database for easier access for the controllers.

`scan` indexes the VC manager, Nubem token, catalog registry, subscription registry, and organization registry. Add a new method next to those calls when another contract needs indexing.

### DID service

Location: [src/services/did-service.ts](../src/services/did-service.ts).

The DID service handles Decentralized Identity (DID) operations, including:

- Creating DIDs for users (linked to the application user) and for AI agents (admin-only).
- Issuing and verifying Verifiable Credentials (VC) in JWT format (ethr-did).
- Resolving DID documents from the blockchain (Ethereum DID Registry).
- Reissuing credentials with updated claims (e.g. email, emailVerified).

It depends on blockchain configuration (`BLOCKCHAIN_NETWORK_ID`, `BLOCKCHAIN_NODE_RPC_URL`, `CONTRACT_ETHEREUM_DIDREGISTRY`) and uses `BLOCKCHAIN_PK_ADMIN` as the credential issuer.

### Verifiable Credentials service

Location: [src/services/vc-service.ts](../src/services/vc-service.ts).

The Verifiable Credentials (VC) service handles:

- Creating Verifiable Presentations (VP) from multiple VCs, signed with the holder’s wallet.
- Verifying Verifiable Presentations and their contained credentials.
- Trusted issuer checks (e.g. admin issuer) and revocation handling.

It is used by the DID API for `create-presentation` and `verify-presentation` endpoints.

### Blockchain service

Location: [src/services/blockchain-service.ts](../src/services/blockchain-service.ts).

The Blockchain service is used to encapsulate interaction logic with the blockchain, for example:

 - Handle wallets
 - Make transaction options
 - Obtains smart contract wrappers

For smart contract wrappers, bytecodes or other smart contract tools, use the [src/contracts](../src/contracts/) folder.

### Captcha service

Location: [src/services/captcha-service.ts](../src/services/captcha-service.ts).

The Captcha service can be used to verify captchas, in order to ensure the caller for a particular API is not a robot.

### File storage service

Location: [src/services/file-storage.ts](../src/services/file-storage.ts).

The file storage service is used to store files and retrieve them later to be server for the users.

Some relevant methods are:

 - `getRandomKey`: Generates a fully random key to store a file. You can specify its privacy (public or private) and its extension.
 - `uploadFile`: Stores an upload file into a key. This is very useful for user-uploaded content. You store the file using this method, and store the key in the database.
 - `getStaticFileURL`: For a file key, gets an URL to retrieve it. If it's private, it will include an authentication token in the query.
 - `deleteFile`: Deletes a file stored in a key.

### InternationalizationService service

Location: [src/services/i18n-service.ts](../src/services/i18n-service.ts).

The internationalization service can be used to send texts in multiple languages depending on the user's preference. This is useful for email templates, or for text or html responses that need to be internationalized.

The main method is `getTranslator` or `getTranslatorFromRequestOrUser`, which creates a translation with a `__` method that can be called with a text in english to be translated to the requested language. If the requested language is not available, it will default to english.

When using this service, run the following command to update the translations files:

```sh
npm run update-translations
```

Then translate the values found inside the translation files, located inside the [locales](../locales/) folder.

### Mail service

Location: [src/services/mail-service.ts](../src/services/mail-service.ts).

The mail service can be used to send emails.

When creating emails, you usually want to use a template. Email templates must be placed inside the [src/emails](../src/emails/) folder, where you can find some examples.

An email template must have 3 methods for:

 - The subject
 - The email body in HTML
 - The email body in plain text

### Redis service

Location: [src/services/redis-service.ts](../src/services/redis-service.ts).

The Redis service is used to interact with the Redis database, if enabled.

Redis can be used for 2 mail purposes:

 - As a caché key-value database.
 - As a publish / subscribe service to send and receive messages in real time.

### Tasks service

Location: [src/services/task-service.ts](../src/services/task-service.ts).

The tasks service is used to perform periodic tasks.

This can be done outside the backend, but for ease, they can also be run in this service.

Add a task by defining an async method on the service class and registering its interval inside `start`:

```ts
this.createTask(
    "example", // Name of the task (unique)
    24 * 60 * 60 * 1000, // Interval time (milliseconds)
    this.exampleTask.bind(this),  // The method to call
    true // True if the task should run at startup, false to wait the first interval time
);
```

### Two factor authentication service

Location: [src/services/tfa-service.ts](../src/services/tfa-service.ts).

The two factor authentication service can be used to generate and verify [TOTP](https://en.wikipedia.org/wiki/Time-based_one-time_password) codes.

### Users service

Location: [src/services/users-service.ts](../src/services/users-service.ts).

The users service is used to handle authentication and perform task related to the users system.
