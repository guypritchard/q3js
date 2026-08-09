#!/bin/sh
set -eu

private_key=${Q3JS_ADMIN_JWT_PRIVATE_KEY_LOCATION:?Q3JS_ADMIN_JWT_PRIVATE_KEY_LOCATION is required}
public_key=${Q3JS_ADMIN_JWT_PUBLIC_KEY_LOCATION:?Q3JS_ADMIN_JWT_PUBLIC_KEY_LOCATION is required}

if [ ! -f "$private_key" ]; then
    mkdir -p "$(dirname "$private_key")"
    private_key_temporary="${private_key}.tmp.$$"
    trap 'rm -f "$private_key_temporary"' EXIT HUP INT TERM
    umask 077
    openssl genpkey \
        -quiet \
        -algorithm RSA \
        -pkeyopt rsa_keygen_bits:2048 \
        -out "$private_key_temporary"
    mv "$private_key_temporary" "$private_key"
    trap - EXIT HUP INT TERM
    generated_private_key=true
    echo "Generated admin JWT private key at $private_key"
else
    generated_private_key=false
fi

if [ "$generated_private_key" = true ] || [ ! -f "$public_key" ]; then
    mkdir -p "$(dirname "$public_key")"
    public_key_temporary="${public_key}.tmp.$$"
    trap 'rm -f "$public_key_temporary"' EXIT HUP INT TERM
    umask 077
    openssl pkey \
        -in "$private_key" \
        -pubout \
        -out "$public_key_temporary"
    mv "$public_key_temporary" "$public_key"
    trap - EXIT HUP INT TERM
    echo "Generated admin JWT public key at $public_key"
fi

exec "$@"
