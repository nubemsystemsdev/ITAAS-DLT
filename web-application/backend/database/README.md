# Database scripts

This folder holds generated schema and index scripts for the [backend](../README.md). Do not edit `*.auto.sql` or `*.auto.json` by hand.

## MongoDB

After `npm run build`:

```sh
npm run setup-mongo
```

## MySQL

Apply [mysql.auto.sql](./mysql.auto.sql) with a MySQL client.

## PostgreSQL

Apply [postgres.auto.sql](./postgres.auto.sql) with a PostgreSQL client.

## Regenerate the scripts

After model schema comments change:

```sh
npm run update-db-scripts
```

## Migrations

Write production schema changes as scripts in [migrations](./migrations/).
