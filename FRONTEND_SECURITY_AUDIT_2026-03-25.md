# Frontend Security Audit & Hardening Report — 2026-03-25

## 1) Inventário auditado

- `src/lib/*`: auth storage, security utils, query client
- `src/service/*`: fetch client, auth/proposals/contracts services
- `src/services/*`: axios client, payment/proposals wrappers
- `src/pages/*`: login/register, public contract, checkout, proposal details, editor
- `src/components/*`: AuthGuard, Navbar, chart renderer
- `src/context/*`: session provider
- `index.html`
- `scripts/security-audit-checks.mjs`

## 2) Matriz de riscos

| Severidade | Problema | Exploração | Status |
|---|---|---|---|
| Crítica | Estado de sessão sem bootstrap forte | Flash/bypass visual de conteúdo privado | Mitigado |
| Crítica | Dependência histórica de token em storage | Exfiltração pós-XSS | Mitigado |
| Alta | Redirect de checkout/pagamento sem validação de URL | Open redirect / `javascript:` URL | Mitigado |
| Alta | Erros 403/429/suspeita sem normalização por código | Enumeração comportamental e UX insegura | Mitigado |
| Alta | Upload baseado só em MIME/extensão | Arquivo disfarçado | Mitigado |
| Média | `dangerouslySetInnerHTML` com identificador dinâmico | CSS/selector injection | Mitigado |
| Média | Logs de debug sensíveis | Vazamento em console/telemetria | Mitigado |
| Média | Camadas `service` e `services` paralelas | regressão de segurança por divergência | Parcial (em consolidação) |

## 3) Riscos corrigidos (resumo)

- Sessão backend-first com `SessionProvider` + `AuthGuard` orientado a status validado pelo backend.
- Token sem persistência em `localStorage/sessionStorage/indexedDB`.
- `credentials: include`, CSRF header e tratamento central de 401.
- Normalização de 403/429/5xx + códigos (`STEP_UP_REQUIRED`, `COOLDOWN_ACTIVE`, `SUSPICIOUS_ACTIVITY`).
- Validação de URL segura para redirecionamentos externos de pagamento/checkout.
- Sanitização de interpolação dinâmica no chart.
- Upload com assinatura mágica (JPEG/PNG/WebP).

## 4) Riscos residuais

- Persistem duas famílias de serviços (`src/service` e `src/services`) em paralelo; a convergência total ainda deve continuar para reduzir risco de drift.
- Ausência de suíte de testes de componente/E2E cobrindo todos os fluxos sensíveis.

## 5) Dependências de backend/infra

- Cookies `HttpOnly + Secure + SameSite` e refresh rotativo server-side.
- CSRF validado no servidor.
- Step-up transacional e policy engine no backend.
- Rate limit distribuído + suspicion scoring no backend.
- Security headers finais via servidor/CDN (HSTS, X-Content-Type-Options, CSP por header, etc.).

## 6) O que foi resolvido inteiramente no frontend

- Hardening de guards e bootstrap de sessão.
- Remoção de persistência insegura de token.
- Normalização de mensagens de erro no client.
- Sanitização dinâmica de chart/style IDs.
- Hardening de redirect de pagamentos.
- Hardening de upload no client.
- Política de referrer/permissions no HTML.

## 7) Regressões possíveis

- Se backend não estiver pronto para cookie-based session + `/api/auth/me`, usuários podem cair em `unauthenticated` no bootstrap.
- Se provedor de pagamento retornar URL fora de `http/https`, o redirect será bloqueado por segurança.


## 8) Fase 2 — matriz de confirmação (revalidação)

| Item | Status | Arquivos | Risco residual |
|---|---|---|---|
| Camada API canônica + anti-drift | Mitigado | `src/service/api.ts`, `src/services/api.ts`, `scripts/security-audit-checks.mjs` | Ainda existem duas famílias de serviços, porém com contrato de segurança unificado e checks de regressão |
| Sessão backend-first por cookie | Corrigido/Mitigado | `src/context/session-context.tsx`, `src/components/AuthGuard.tsx`, `src/service/api.ts` | Depende de backend emitir sessão/cookies corretamente |
| CSRF integração | Mitigado | `src/lib/csrf.ts`, `src/service/api.ts`, `src/services/api.ts` | Depende do endpoint/backend (`/api/auth/csrf` e/ou header `x-csrf-token`) |
| UX neutra para step-up/cooldown/suspicious | Corrigido | `src/service/api.ts`, `src/services/api.ts` | Backend pode evoluir códigos; frontend já preparado para os principais |
| Regressão de segurança automática | Corrigido | `scripts/security-audit-checks.mjs`, `package.json` | Não substitui E2E, mas reduz regressão estrutural |

## 9) Plano aplicado (fase 2)

1. Unificação prática do contrato de segurança dos clients (`fetch` + `axios`).
2. Integração CSRF memory-only com bootstrap por endpoint/header de backend.
3. Normalização de respostas de segurança (401/403/429 + códigos de política).
4. Ampliação de checks automatizados para anti-drift e invariantes de hardening.
