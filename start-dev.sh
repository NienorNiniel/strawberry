#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
cd "$(dirname "$0")"
exec node node_modules/.bin/next dev --webpack
