# AladPay

Generate Ethiopian bank and wallet payment QR codes from EMV-style TLV payloads (IPS ET and legacy layouts).

## Features

- 32 banks plus **CBE Birr** and **Yaya Wallet** (wallet-specific QR layouts)
- Optional fixed amount or open amount (POI 11 / 12)
- IPS ET with merchant GUID, or legacy BIC prefix for select banks
- Saved accounts in `localStorage` (browser only, no server storage)
- Decode from **QR image upload** or pasted payload; apply fields or merchant GUID
- **Favorite banks** in the picker; **live preview** with stale-request protection
- **Yaya tag 62 compatibility** mode when the Yaya app rejects standard encoding
- Export / import saved account backups (merge or replace)

## Requirements

- Node.js 20+

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (standalone output) |
| `npm start` | Run production server |
| `npm run check` | Lint, typecheck, tests, and build |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright smoke test (builds and starts app) |
| `npm run sync-logos` | Download bank logos into `public/banks/` |
| `npm run sample-payloads` | Print sample IPS/legacy strings for a few banks |

## Environment

- `NEXT_PUBLIC_SITE_URL` — canonical site URL for metadata (sitemap, Open Graph)

## Docker

```bash
docker build -t aladpay .
docker run -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=https://your.domain aladpay
```

## QR standards

| Type | Notes |
|------|--------|
| **Banks (IPS)** | Tag 28: GUID + BIC + account. Optional tag 80 for remark. |
| **Legacy** | Tag 28-00: `BIC + 0002246`. Some Abyssinia QRs use this. |
| **CBE Birr** | Phone in tag 28-00/02, MCC 4829, tag 62 city + remark + empty `10`. |
| **Yaya Wallet** | GUID in tag 28-00, 9-digit phone in tag 28-02, MCC 0000, Yaya tag 62 block. Paste GUID from a working Yaya QR if derived GUID fails. |

## Logos

Logos are synced from [FaydaLink](https://github.com/motiabebe/FaydaLink) and [EthiopianLogos](https://github.com/Chapa-Et/ethiopianlogos). Run `npm run sync-logos` after adding banks.

## Privacy

Account numbers, names, and payloads never leave the browser unless you copy or download them.
