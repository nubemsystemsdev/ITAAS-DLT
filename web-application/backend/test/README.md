# Tests

This folder contains the backend test suites (parent: [backend](../README.md)).

## Mocha

Suites live in [mocha](./mocha/). From the backend folder:

```sh
npm run unit-tests
npm run api-tests
npm test
```

`npm test` runs both. API tests need a separate MongoDB and the Cyberchain test node. Details: [documentation/tests.md](../documentation/tests.md).
