# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private vulnerability
reporting instead: open the repository's **Security** tab and choose **Report a vulnerability**.
Include what you found, how to reproduce it and the version or commit you tested.

## Scope

This repository is a test template. The local demo server in `scripts/demo-server.mjs` is for
development only and is not meant to be exposed. Never commit credentials, auth state
(`.auth/`), `.env` files, project URLs or customer data; if you find any in the history, report it
the same way.
