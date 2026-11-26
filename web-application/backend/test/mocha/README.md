# Mocha tests

Mocha suites for the [backend tests](../README.md).

Run them from the backend folder:

```sh
npm test
```

- [function-tests](./function-tests/) — unit tests. They do not need MongoDB or a chain node.
- [api-tests](./api-tests/) — API tests. They start a local server and need `TEST_DB_MONGO_URL` plus a Cyberchain node.
- [test-tools](./test-tools/) — helpers used by the suites.

Command reference: [documentation/tests.md](../../documentation/tests.md).
