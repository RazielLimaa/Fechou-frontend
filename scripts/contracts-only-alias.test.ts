import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function expectIncludes(source: string, needle: string, label: string) {
  assert(source.includes(needle), `${label}: expected to include ${needle}`);
}

function expectExcludes(source: string, needle: string, label: string) {
  assert(!source.includes(needle), `${label}: must not include ${needle}`);
}

const proposalsPageSource = readProjectFile("src/pages/propostas.tsx").trim();
const legacyProposalPdfSource = readProjectFile("src/pages/ProposalPdf.tsx").trim();

assert(
  proposalsPageSource.includes("export default function Propostas"),
  "propostas page should remain available as its own screen",
);
assert(
  legacyProposalPdfSource.length > 0,
  "proposal pdf page should remain available",
);

console.log("contracts-only-alias.test.ts: OK");
