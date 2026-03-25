import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const checks = [];

function ok(name, condition, details = '') {
  checks.push({ name, condition, details });
}

function read(path) {
  return readFileSync(path, 'utf8');
}

const login = read('src/pages/login.tsx');
ok('oauth_auth_code_flow', /flow:\s*"auth-code"/.test(login), 'login must use auth-code flow');

const authStorage = read('src/lib/auth-storage.ts');
ok('no_localstorage_in_auth_storage', !/localStorage/.test(authStorage), 'auth storage must not persist tokens');

const authGuard = read('src/components/AuthGuard.tsx');
ok('auth_guard_uses_session_context', /useSession\(\)/.test(authGuard), 'AuthGuard should rely on backend-validated session state');

const apiFetch = read('src/service/api.ts');
ok('api_fetch_uses_credentials_include', /credentials:\s*"include"/.test(apiFetch), 'apiFetch should send cookies');
ok('api_fetch_handles_401', /res\.status\s*===\s*401/.test(apiFetch), 'apiFetch must handle 401 centrally');
ok('api_fetch_csrf_integration', /getCsrfToken\(API_URL\)/.test(apiFetch), 'apiFetch should request CSRF token from backend-compatible source');

const axiosApi = read('src/services/api.ts');
ok('axios_csrf_integration', /getCsrfToken\(API_URL\)/.test(axiosApi), 'axios client should request CSRF token');
ok('error_code_normalization', /STEP_UP_REQUIRED|COOLDOWN_ACTIVE|SUSPICIOUS_ACTIVITY/.test(axiosApi) && /STEP_UP_REQUIRED|COOLDOWN_ACTIVE|SUSPICIOUS_ACTIVITY/.test(apiFetch), 'clients should normalize security policy codes');

const openRedirectPaths = [
  'src/pages/plan-checkout.tsx',
  'src/pages/public/PublicContract.tsx',
  'src/pages/app/ProposalDetails.tsx',
];
ok(
  'safe_redirect_usage',
  openRedirectPaths.every((p) => /getSafeRedirectUrl\(/.test(read(p))),
  'checkout/payment redirects should validate URLs'
);

const lsAccessTokenMatches = execSync(
  "rg -n \"localStorage\\.(getItem|setItem|removeItem)\\(\\\"access_token\\\"|localStorage\\.(getItem|setItem|removeItem)\\('access_token'\" src || true",
  { encoding: 'utf8' }
).trim();
ok('no_access_token_localstorage_calls', lsAccessTokenMatches.length === 0, lsAccessTokenMatches || 'none');

const mergeMarkers = execSync("rg -n \"^<<<<<<<|^=======|^>>>>>>>\" src || true", { encoding: 'utf8' }).trim();
ok('no_merge_conflict_markers', mergeMarkers.length === 0, mergeMarkers || 'none');

let failed = 0;
for (const c of checks) {
  const status = c.condition ? 'PASS' : 'FAIL';
  if (!c.condition) failed += 1;
  console.log(`[${status}] ${c.name}${c.details ? ` :: ${c.details}` : ''}`);
}

if (failed > 0) {
  console.error(`\n${failed} security checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} security checks passed.`);
