import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Load a trimmed payload string from `fixtures/` (tests and scripts). */
export function loadFixturePayload(name: string): string {
  const path = join(process.cwd(), "fixtures", name);
  return readFileSync(path, "utf8").trim();
}
