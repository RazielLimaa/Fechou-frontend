# Security Implementation Report — 2026-03-25 (frontend hardening)

## Prioridade Crítica

1. **Sessão não confiando no cliente**
   - Implementado `SessionProvider` com bootstrap real de sessão via `/api/auth/me` no carregamento do app.
   - `AuthGuard` passa a depender do estado de sessão validado pelo backend (cookie/sessão), não de token em storage.

2. **Token sem persistência insegura**
   - `authStorage` agora guarda access token apenas em memória efêmera.
   - Removido uso de `localStorage` para access/refresh token.

3. **Tratamento consistente de auth expirada e erros HTTP**
   - Clientes HTTP padronizados com limpeza de sessão no 401, mensagens seguras para 403/429/5xx e `credentials: include`.

## Prioridade Alta

4. **Mitigação de XSS em renderização dinâmica**
   - Sanitização de identificadores no componente de chart antes de interpolar CSS dentro de `dangerouslySetInnerHTML`.

5. **Upload mais robusto**
   - No upload de logo, validação de tipo/tamanho + assinatura mágica do arquivo (JPEG/PNG/WebP) antes de enviar.

6. **Redução de vazamento por navegação**
   - `Referrer-Policy` e `Permissions-Policy` configuradas no HTML base.

## Prioridade Média

7. **Exposição de informações**
   - Remoção de logs sensíveis no cliente em fluxos de upload/auth.

8. **Conflitos/duplicidade**
   - Remoção de conflitos de merge restantes e limpeza de trechos inseguros duplicados em services.

## Dependências de backend/infra (necessárias para blindagem completa)

- Cookies `HttpOnly + Secure + SameSite` emitidos pelo backend.
- Endpoint de refresh rotativo e revogação server-side.
- CSRF server-side com validação do token enviado pelo frontend.
- Rate limiting distribuído (Redis) e antifraude no backend.
- Assinatura obrigatória de webhooks com comparação timing-safe.
- Autorização por ownership no backend para cada recurso.
- Security headers finais por servidor/CDN (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, CSP por header).
