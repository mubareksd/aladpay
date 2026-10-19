# AladPay

Generate Ethiopian bank and wallet payment QR codes for receiving money.

## Features

- 32 banks plus **CBE Birr** and **Yaya Wallet**
- Optional fixed amount or open amount
- Saved accounts in `localStorage` (browser only)
- Import payee details from a QR photo
- **Restaurant POS** — tables, bilingual menu, kitchen queue, daily reports, POS backup (browser `localStorage`)
- **Guest QR ordering** — publish menu to the server, table QR links to `/guest/{tableId}`; staff sync imports orders into the kitchen queue
- Checkout payment per order when the bill is ready
- Incoming payment verification and optional hosted checkout (server-configured)
- Export / import saved account backups

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
| `npm run test:e2e` | Playwright smoke test |
| `npm run sync-logos` | Download bank logos into `public/banks/` |

## Environment

- `NEXT_PUBLIC_SITE_URL` — public site URL (metadata and checkout redirects)
- `ALAD_API_KEY` — server-only; enables Verify and checkout (see `.env.example`)
- `POS_DATA_DIR` — optional; directory for guest menu and inbox JSON (default `.data/` in the app root). Mount a volume in Docker so guest orders survive restarts.

## Docker

```bash
docker build -t aladpay .
docker run -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=https://your.domain aladpay
```

## Logos

Logos are synced from [FaydaLink](https://github.com/motiabebe/FaydaLink) and [EthiopianLogos](https://github.com/Chapa-Et/ethiopianlogos). Run `npm run sync-logos` after adding banks.

## Privacy

QR generation and import run in the browser. Payment verification sends receipt details through your server when enabled.
