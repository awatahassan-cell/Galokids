# Galo Kids — mobile

Two Expo apps and the code they share.

```
mobile/
  packages/core/   the API client, types, money and phone helpers
  apps/shop/       the storefront a customer installs
  apps/pos/        the till and back office the shop uses
```

`packages/core` talks to the same Laravel API as the website, so an endpoint is
described once and both apps — and the website — agree on what it returns.

The two apps are separate deliberately. A customer should not be carrying the
shop's stock screens around in their phone, and the till wants to open on a
scanner rather than a shop front.

## Running

```
cd mobile && npm install
npm run shop    # or: npm run pos
```

Point them at an API with `EXPO_PUBLIC_API_URL`; without it they use the
production one in `packages/core/src/config.ts`.

## The till works without a signal

`apps/pos` keeps the catalogue in SQLite on the device and queues sales it
could not send. See `apps/pos/src/offline/README.md` for what that costs and
where it stops.
