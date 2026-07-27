# Extension Docs Agent Guide

This folder explains extension contracts from the SDK user's point of view.

## Read Order

1. [README.md](./README.md)
2. Choose the extension you are building
3. Cross-check with:
   - [../AUTH-AND-TOKENS.md](../AUTH-AND-TOKENS.md)
   - [../WAM.md](../WAM.md) if the extension opens UI

## What These Docs Optimize For

- current AppStore contract
- current SDK exports
- practical implementation flow

## Messaging boundary

Use the `Messaging` decorators for Function names and schemas. Normal Extension registration is
SDK-managed; product-specific messaging setup remains an explicit AppStore configuration step.
