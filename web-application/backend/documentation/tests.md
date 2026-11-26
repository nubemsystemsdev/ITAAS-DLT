# Tests

Tests are scripts that run to ensure the backend codebase works as intended.

Tests are located in the [test/mocha](../test/mocha/) folder.

The test framework used by this project is [Mocha](https://mochajs.org/#getting-started). Make sure to read its documentation to get familiar with the framework.

Run every suite:

```sh
npm test
```

## Unit tests

Unit tests or function tests are located inside the [test/mocha/function-tests](../test/mocha/function-tests/).

The function tests are used to test functions, ensuring they work as intended.

Run only the function tests:

```sh
npm run unit-tests
```

Write function tests by calling the functions with example parameters and checking the result with [chai](https://www.chaijs.com/) or [assert](https://nodejs.org/api/assert.html).

Example:

```ts
// Function tests

"use strict";

import Crypto from "crypto";
import { expect } from 'chai';
import { encrypt, decrypt } from "../../../src/utils/aes";

// Test group
describe("AES", () => {
    const message = "Test message " + Crypto.randomBytes(8).toString("hex");
    const password = Crypto.randomBytes(24).toString("hex");

    let encrypted: string;

    it('Should be able to encrypt a message', async () => {
        encrypted = encrypt(message, password);
    });

    it('Should be able to decrypt a message', async () => {
        const decryptedMessage = decrypt(encrypted, password).toString("utf-8");

        expect(decryptedMessage).to.be.equal(message);
    });
});
```

## API tests

API tests are located inside the [test/mocha/api-tests](../test/mocha/api-tests/).

API tests run a test server instance and make HTTP request to it in order to ensure the API works as intended.

Run only the API tests:

```sh
npm run api-tests
```

When writing API tests, make sure you update the API bindings with the following command:

```sh
npm run update-api-bindings
```

You can use the API bindings and the tools located inside the [test/mocha/test-tools](../test/mocha/test-tools/) folder in order to reduce the complexity of the tests.

Example:

```ts
// API tests

"use strict";

import assert from "assert";
import Crypto from "crypto";
import { APITester } from '../test-tools/api-tester';
import { PreparedUser, TestUsers } from '../test-tools/models/users';
import { ApiWallet } from '../test-tools/api-bindings/api-group-wallet';
import { privateKeyToAddress } from '@asanrom/smart-contract-wrapper';


// Test group
describe("API/Wallets", () => {
    let testUser1: PreparedUser;

    before(async () => {
        // Setup test server (REQUIRED)
        await APITester.Initialize();

        // Setup test users
        testUser1 = await TestUsers.NewRegularUser();
    });

    // Tests

    const randomPassword = Crypto.randomBytes(8).toString("hex");
    let wallet1: string;

    it('Should be able to create a wallet', async () => {
        const r = await APITester.Test(ApiWallet.CreateWallet({ name: "Wallet 1", password: randomPassword }), testUser1.auth);

        assert.equal(r.name, "Wallet 1");

        wallet1 = r.id;
    });

    // ...
});
```

### Requirements for running the API tests

API tests need:

- A MongoDB database other than the application database. Set `TEST_DB_MONGO_URL`.
- The Cyberchain test node. Point `BLOCKCHAIN_NODE_RPC_URL` at it (`http://localhost:8547` with `cyberchain-test-node/.env.example`). See [blockchain configuration](../CONFIG.md#blockchain-configuration).

### Skipping code for tests

`Config.IS_TEST` is true while tests run. Use that flag to skip calls that the tests cannot make, such as external services.
