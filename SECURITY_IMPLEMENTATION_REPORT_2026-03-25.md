# Security Implementation Report — 2026-03-25 (frontend)

## Escopo aplicado

Refatoração de segurança **frontend** no app React/TypeScript para reduzir superfície de ataque em sessão, API client, links públicos, XSS e hardening de browser.

## Vulnerabilidades corrigidas

| Vulnerabilidade | Risco | Arquivo(s) alterado(s) | Correção aplicada | Impacto esperado |
|---|---|---|---|---|
| Token persistido no `localStorage` | Alto (exfiltração em XSS) | `src/lib/auth-storage.ts` + consumidores | Removido uso de `localStorage` para token; token agora apenas em memória; frontend não usa storage persistente para access/refresh token | Reduz drasticamente persistência e roubo pós-XSS |
| Dependência de interceptor em token persistido | Alto | `src/service/api.ts`, `src/services/api.ts`, `src/lib/queryClient.ts` | Cliente HTTP central com `credentials: include`, timeout e tratamento consistente de 401 sem depender de `localStorage` | Sessão orientada a cookie HttpOnly no backend |
| Fluxo OAuth legado | Alto | `src/pages/login.tsx` | Removido implicit flow; uso de `flow: "auth-code"`, enviando `code` ao backend | Compatível com Authorization Code + PKCE |
| Camada de API inconsistente e endpoints públicos inseguros | Médio/Alto | `src/service/proposals.ts`, `src/services/proposals.ts`, `src/services/api/index.ts` | Removido código duplicado inseguro, validação forte de token público e centralização do client exportado | Menos bypass por path/token e menor regressão |
| Exposição de token público via referer | Médio | `index.html` | `referrer` policy `no-referrer` + CSP baseline | Reduz vazamento de URL sensível para terceiros |
| XSS via CSS injection em `dangerouslySetInnerHTML` | Médio | `src/components/ui/chart.tsx` | Sanitização de identificadores CSS (`id`, `key`) antes de interpolar no style | Mitiga injeção via payload de configuração |
| Vazamento de dados sensíveis por logs client | Médio | `src/pages/contratos/editor.tsx`, `src/pages/login.tsx` | Removidos `console.log/error` com contexto de upload/auth; mensagens de erro neutras | Menor exposição de PII/token em console/breadcrumbs |
| Conflitos de merge | Alto (integridade) | `src/service/proposals.ts`, `src/pages/premium-dashboard.tsx` | Remoção de marcadores e limpeza de código morto | Build mais previsível e menor risco de regressão |

## Itens ainda dependentes de backend/infra

1. Sessão 100% via cookie `HttpOnly` + `Secure` + `SameSite` (emissão e rotação no backend).
2. Refresh token rotativo + revogação server-side.
3. PKCE completo no backend (`state`, `nonce`, verificação e troca segura).
4. Rate limiting distribuído (Redis) e proteção anti-bruteforce por rota.
5. Assinatura obrigatória de webhook com comparação timing-safe no backend.
6. Autorização por ownership (`userId`) no servidor para todas rotas privadas.
7. CORS allowlist e headers HTTP de segurança no servidor (Helmet/HSTS/CSP final por header).
