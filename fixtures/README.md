# Verified QR payloads

Real payload strings that worked (or were issued) by a bank/wallet app. Tests load these files via `loadFixturePayload()` in `src/lib/load-fixture.ts`.

## Adding a new wallet or bank layout

1. Save the full payload string as `fixtures/<name>.txt` (one line, no spaces).
2. Run **Decode QR or payload** in the app and confirm tags (BIC, 28-02, MCC, 62, CRC).
3. Add Vitest coverage:
   - `parseEmvQrPayload(fixture)` for decode fields and CRC flag
   - `buildPayload(...)` with fixed test hooks where random IDs would differ
4. Implement builder under `src/lib/wallets/` (do not reuse another wallet’s TLV layout).
5. Note verification in the table below.

## Catalog

| File | BIC | Notes | Verified |
|------|-----|--------|----------|
| `cbe-birr.txt` | CBEBETAA | Golden match in tests | User sample, 2026-10 |
| `yaya-sample.txt` | YAYAETAA | Lenient tag 62; CRC may not recalc to sample | Yaya app request payment, 2026-10 |

**Telebirr / others:** add a fixture first; no builder until a sample exists.
