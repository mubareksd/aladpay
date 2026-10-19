# Verified QR payloads

Add payload strings that scan successfully in a real app. Tests in `src/lib/*.test.ts` should assert CRC and critical tags; note the app and date in a comment here.

| File | Wallet or bank | Verified in app | Date |
|------|----------------|-----------------|------|
| `cbe-birr.txt` | CBEBETAA | CBE Birr (user sample) | 2026-10 |
| `yaya-sample.txt` | YAYAETAA | Yaya request payment (user sample) | 2026-10 |

Tests load these via `loadFixturePayload()` in `src/lib/load-fixture.ts`.
