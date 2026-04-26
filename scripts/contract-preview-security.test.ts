import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPreviewRefreshDelay } from "../src/lib/contract-preview";

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

const editorSource = readProjectFile("src/pages/contratos/editor.tsx");
const contractsServiceSource = readProjectFile("src/service/contracts.ts");

function testPreviewRefreshDelay() {
  const now = Date.parse("2026-04-07T12:00:00.000Z");
  const futureDelay = getPreviewRefreshDelay("2026-04-07T12:01:00.000Z", now);

  assert.equal(typeof futureDelay, "number", "future preview expiry should schedule a refresh");
  assert(futureDelay !== null && futureDelay > 0 && futureDelay <= 55_000, "future preview expiry should refresh before expiration");
  assert.equal(getPreviewRefreshDelay("2026-04-07T11:59:59.000Z", now), 0, "expired previews should refresh immediately");
  assert.equal(getPreviewRefreshDelay(null, now), null, "missing preview expiry should not schedule a timer");
  assert.equal(getPreviewRefreshDelay("not-a-date", now), null, "invalid preview expiry should be ignored");
}

function testProtectedPreviewIntegration() {
  expectIncludes(editorSource, "renderContract(contractIdNum)", "editor preview");
  expectIncludes(editorSource, 'srcDoc={previewHtml}', "editor preview");
  expectIncludes(editorSource, 'sandbox="allow-same-origin"', "editor preview");
  expectIncludes(editorSource, 'referrerPolicy="no-referrer"', "editor preview");
  expectIncludes(editorSource, 'refreshProtectedPreview(\"expired\", true)', "editor preview");
  expectIncludes(editorSource, 'refreshProtectedPreview(\"asset-error\", true)', "editor preview");
  expectIncludes(editorSource, "previewExpiresAt", "editor preview");
  expectIncludes(editorSource, "handlePreviewFrameLoad", "editor preview");
  expectIncludes(editorSource, "PREVIEW_ASSET_RETRY_LIMIT", "editor preview");
  expectIncludes(editorSource, "PREVIEW_ASSET_RETRY_BASE_DELAY_MS", "editor preview");
  expectIncludes(editorSource, "PREVIEW_ASSET_RETRY_MAX_DELAY_MS", "editor preview");
  expectIncludes(editorSource, "previewAssetRetryAttemptRef.current >= PREVIEW_ASSET_RETRY_LIMIT", "editor preview");
  expectIncludes(editorSource, "requestPreviewAssetRetry", "editor preview");
  expectIncludes(editorSource, "clearPreviewAssetRetryTimer", "editor preview");
  expectIncludes(editorSource, "2 ** (attempt - 1)", "editor preview");
  expectIncludes(editorSource, "Assinatura indisponível no momento", "editor preview");

  expectExcludes(editorSource, "dangerouslySetInnerHTML", "editor preview");
  expectExcludes(editorSource, "sanitizePreviewHtml(", "editor preview");
  expectExcludes(editorSource, "createObjectURL", "editor preview");
  expectExcludes(editorSource, "/api/contracts/${contractIdNum}/signature", "editor preview");
  expectExcludes(editorSource, "clientSignatureUrl", "editor preview");
  expectExcludes(editorSource, "providerSignatureUrl", "editor preview");
  expectExcludes(editorSource, "allow-scripts", "editor preview");
  expectExcludes(editorSource, "allow-downloads", "editor preview");
  expectExcludes(editorSource, "allow-top-navigation", "editor preview");
  expectExcludes(editorSource, "setInterval(", "editor preview");

  assert(
    !/(localStorage|sessionStorage|indexedDB|caches?)[\s\S]{0,160}(preview|signature|token|html|expiresAt)/i.test(editorSource),
    "editor preview must not persist protected preview HTML, signature assets, expiring URLs or tokens",
  );

  const providerSignatureMutations = [...editorSource.matchAll(
    /apiFetch\("\/api\/contracts\/provider-signature", \{[\s\S]{0,120}?method: "(POST|DELETE)"/g,
  )].map((match) => match[1]);

  assert.deepEqual(
    providerSignatureMutations,
    ["POST", "DELETE"],
    "editor should only mutate the saved provider signature profile record, never fetch it as a clean preview asset",
  );

  const contractSignatureApplyCalls = [...editorSource.matchAll(
    /apiFetch\(`\/api\/contracts\/\$\{contractIdNum\}\/provider-signature`, \{[\s\S]{0,120}?method: "(POST|DELETE|PATCH|GET)"/g,
  )].map((match) => match[1]);

  assert.deepEqual(
    contractSignatureApplyCalls,
    ["POST"],
    "editor should only apply the saved provider signature to the contract, never fetch it as a standalone preview asset",
  );
}

function testRenderEndpointContract() {
  expectIncludes(contractsServiceSource, "apiFetch<RenderedContractPreview>(`${PREFIX}/render`", "contracts service");
  expectIncludes(contractsServiceSource, 'method: "POST"', "contracts service");
  expectIncludes(contractsServiceSource, "json: { contractId }", "contracts service");
}

testPreviewRefreshDelay();
testProtectedPreviewIntegration();
testRenderEndpointContract();

console.log("contract-preview-security.test.ts: OK");
