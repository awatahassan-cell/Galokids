# Galo Kids — mobile app

The shop's customer app, for iOS and Android. React Native, built with Expo.

It mirrors the storefront: browsing, search, product pages, basket, checkout,
orders, the saved list, and the shop's own pages. **The admin panel and the
till are not in it, and cannot be reached from it** — see [What the app cannot
do](#what-the-app-cannot-do).

---

## Running it

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on the phone, or press `a` / `i` for an
emulator.

To point it at a backend other than the configured one:

```bash
EXPO_PUBLIC_API_URL=https://staging.example.com/api npx expo start
```

### Building for the stores

```bash
npm install -g eas-cli
eas login
eas build --platform android      # .aab for Google Play
eas build --platform ios          # for the App Store
```

The first `eas build` will ask to create the project and generate signing
keys. Nothing else in the repo needs changing.

---

## What to set before releasing

Everything below lives in **`app.json`**.

| Setting | What it is | Where it matters |
|---|---|---|
| `extra.apiUrl` | The shop's API | Must be `https://`. The app refuses anything else. |
| `extra.webUrl` | The shop's website | Used for shared product links, and to recognise incoming links. |
| `ios.bundleIdentifier` | `com.galokids.shop` | Must match the App Store entry. |
| `android.package` | `com.galokids.shop` | Must match the Play Console entry. |
| `ios.associatedDomains` | `applinks:galokids.com` | Universal links. See below. |
| `android.intentFilters` | `galokids.com` | App links. See below. |

### App icon and splash

Drop `icon.png` (1024×1024) and `splash.png` into `assets/`, then add to
`app.json`:

```json
"icon": "./assets/icon.png",
"splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#FFF6F9" },
"android": { "adaptiveIcon": { "foregroundImage": "./assets/icon.png", "backgroundColor": "#FF8FAB" } }
```

---

## Links from the website

A discount link shared on WhatsApp, or a banner set in the admin panel, opens
the matching screen in the app rather than the home screen.

| Link | Opens |
|---|---|
| `galokids.com/product/42` | that product |
| `galokids.com/products?category=7` | the catalogue, filtered to that category |
| `galokids.com/products?sale=1` | the catalogue, discounted items only |
| `galokids.com/my-orders` | the customer's orders |
| `galokids.com/track` | order tracking |
| `galokids.com/faq`, `/about`, `/shipping-returns`, `/size-guide` | those pages |
| `galokids.com/admin`, `/pos` | opens in the browser — the app has no such screens |
| anything else | ignored; the app opens where it would have anyway |

`galokids://product/42` works the same way.

### Making the website's links open the app

Both platforms require a file served from the website, proving the site and the
app belong to the same owner. Until these are in place, links open in the
browser — nothing breaks, they just do not hand over to the app.

**iOS** — serve at `https://galokids.com/.well-known/apple-app-site-association`
(no file extension, `Content-Type: application/json`):

```json
{
  "applinks": {
    "details": [
      { "appID": "TEAMID.com.galokids.shop", "paths": ["/product/*", "/products*", "/my-orders", "/track", "/wishlist", "/about", "/faq", "/shipping-returns", "/size-guide"] }
    ]
  }
}
```

`TEAMID` is the Apple Developer Team ID.

**Android** — serve at `https://galokids.com/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.galokids.shop",
    "sha256_cert_fingerprints": ["<from: eas credentials>"]
  }
}]
```

Get the fingerprint with `eas credentials`.

---

## What the shop controls without an app release

These come from the API on every launch, so changing them in the admin panel
changes the app:

- the shop's name and logo
- **the banner and hero slides** (`promo_banner`, `hero_slides`) — including
  the link a banner points at
- categories, and the icon chosen for each
- products, prices, discounts, stock, images
- delivery charges per governorate, and the free-delivery threshold
- the phone number, WhatsApp, address and social links on the contact page

The last shop configuration is cached, so the app opens instantly on a slow
connection and then refreshes.

---

## What the app cannot do

The API also serves the till, the stock ledger, purchasing, supplier accounts,
reports and user administration. None of it is reachable from the app.

This is not enforced by hiding buttons. `src/api/endpoints.ts` is the app's
entire vocabulary, and it names only customer routes — there is no function in
the app that asks for an admin one. Orders are fetched with `mine=1`, so even a
staff account signing in here sees only its own orders.

## Security notes

- **Session token** in `expo-secure-store` (iOS Keychain / Android Keystore),
  not AsyncStorage, which is a plain file readable from a device backup. It is
  pinned to the device, so a restored backup does not carry a session onto a
  second phone.
- **https only.** The app refuses a non-https API base outside development.
- **No passwords.** Sign-in is a phone number and a one-time code; the code is
  exchanged for a session and never becomes a credential itself.
- **A rejected token is dropped** rather than retried with.
- **Prices, delivery and discounts are the server's.** The app sends a coupon
  *code*, never an amount, and asks the server what delivery costs. An app that
  posts its own discount can be told to post any discount.
- **Links are validated** before being followed. Only the shop's own paths
  resolve; anything else is ignored.
- **No secrets in the bundle.** The Instagram token stays on the server.

## Speed

- `FlashList` recycles rows; the catalogue pages 20 at a time.
- `expo-image` with `memory-disk` caching, so the same pictures are not
  re-downloaded across screens.
- Requests on a screen run together, not in sequence, and in-flight requests
  are cancelled when superseded — typing "shoes" costs one round trip.
- Product cards are memoised with stable callbacks.

---

## Layout

```
app/                     screens (expo-router: the file tree is the routes)
  (tabs)/                home, shop, cart, wishlist, account
  product/[id].tsx       product page
  order/[id].tsx         one order, and the order confirmation
  auth/sign-in.tsx       phone + code
  info/                  about, faq, shipping, size guide, contact
src/
  api/                   client, token store, endpoints, response mapping
  store/                 shop config, basket, session
  components/            shared UI
  i18n/                  Kurdish, Arabic, English
  utils/                 prices, phone numbers, governorates, links
```

## Checks

```bash
npm run typecheck                 # tsc, no emit
npx expo export --platform android   # bundles everything; catches import errors
npx expo-doctor
```
