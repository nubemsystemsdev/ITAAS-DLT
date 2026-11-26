#!/bin/sh

set -e

# If the frontend must be served, build it

if [ "${SERVE_FRONTEND:-YES}" != 'NO' ]
then
    cd /frontend
    npm run build
fi

# Run the backend

cd /backend

exec npm start
