# Security Review — Fechou Frontend

Data: 2026-03-25
Escopo: revisão estática do frontend (`src/`, `shared/`, config) + checks de build/audit.

## Resumo executivo

Foram identificados riscos relevantes em autenticação/sessão, higiene de código e exposição de tokens em URL.

Principais pontos críticos:

1. **Arquivo com conflito de merge em produção (`src/service/proposals.ts`)** contendo blocos duplicados e caminhos sem sanitização do token.
2. **Persistência de token JWT em `localStorage`** em múltiplos fluxos de login/registro e interceptors, aumentando risco de sequestro de sessão em caso de XSS.
3. **Uso de OAuth Google no fluxo `implicit`** (menos recomendado hoje para SPA do que Authorization Code + PKCE).
4. **Tokens públicos passados por path param (`/c/:token`, `/p/contract/:token`)**, com risco de vazamento via logs, histórico, analytics e referências.
5. **Ausência de CSP explícita no `index.html`**, reduzindo defesa em profundidade contra XSS.

## Achados detalhados

### 1) [CRÍTICO] Conflito de merge + código duplicado inseguro em `src/service/proposals.ts`

- Há marcadores de conflito (`<<<<<<<`, `>>>>>>>`) no arquivo.
- O mesmo arquivo possui versão segura (com `safePublicToken`) e uma versão duplicada insegura interpolando `token` bruto em URL.
- Isso é risco de integridade e pode quebrar pipeline/build; dependendo de resolução incorreta, pode reintroduzir rotas sem validação.

**Ações recomendadas**
- Resolver o conflito imediatamente e remover duplicações.
- Manter somente a variante com validação forte de token (`safePublicToken`) e `safeId`.
- Adicionar CI gate para bloquear commits com marcadores de merge.

### 2) [ALTO] JWT em `localStorage` (superfície maior para account takeover)

- O token é salvo e lido de `localStorage` em vários pontos do app.
- Em cenário de XSS, script malicioso consegue exfiltrar o token e assumir sessão.

**Ações recomendadas**
- Migrar autenticação para **cookie `HttpOnly` + `Secure` + `SameSite`**.
- Manter access token em memória (ou usar sessão no backend) e renovar via refresh token em cookie HttpOnly.
- Reduzir tempo de vida do token e aplicar rotação.

### 3) [ALTO] OAuth Google no fluxo `implicit`

- O código declara explicitamente `flow: "implicit"`.
- Em SPAs modernas, prática recomendada é Authorization Code com PKCE para reduzir exposição de token no cliente.

**Ações recomendadas**
- Migrar para `authorization code + PKCE`.
- Minimizar escopos e revisar tratamento de callback/nonce/state.

### 4) [MÉDIO] Tokens públicos em URL path

- Rotas públicas usam `:token` no path.
- Tokens em URL podem vazar em logs de servidor/proxy, histórico do navegador e ferramentas de analytics.

**Ações recomendadas**
- Preferir token de uso único/curta duração + escopo mínimo.
- Considerar token no fragment (`#`) quando aplicável (não enviado ao servidor automaticamente) ou fluxo de troca por código efêmero.
- Definir `Referrer-Policy` restritiva no backend.

### 5) [MÉDIO] Ausência de Content Security Policy explícita

- Não há meta CSP no HTML base.
- Sem CSP, payloads de XSS têm menos barreiras caso uma injeção ocorra.

**Ações recomendadas**
- Definir CSP via headers no servidor (preferível) ou meta como fallback.
- Exemplo inicial: bloquear `unsafe-inline`, usar nonce/hash, restringir `connect-src` e `img-src`.

### 6) [MÉDIO] Inconsistência de camada de API (`src/service` vs `src/services`)

- Existem duas implementações paralelas com padrões de segurança diferentes.
- Em `src/services/proposals.ts`, token é interpolado sem encode/validação dedicada.

**Ações recomendadas**
- Consolidar em uma única camada de API.
- Aplicar validação/normalização centralizada para ids/tokens/path params.

## Checks executados

- `npm run build` → falhou por dependências/types ausentes e erro de regex target.
- `npm audit --json` → indisponível no ambiente (403 no endpoint de advisories).
- Busca estática por padrões de risco com `rg` (tokens, auth headers, URLs públicas, `dangerouslySetInnerHTML`, etc.).

## Plano de correção recomendado (ordem)

1. Corrigir `src/service/proposals.ts` (conflito + duplicação) e ativar proteção CI contra merge markers.
2. Migrar estratégia de sessão para cookie HttpOnly.
3. Trocar OAuth implicit por Authorization Code + PKCE.
4. Reduzir exposição de tokens em URL e endurecer políticas de referrer.
5. Implantar CSP e revisar `connect-src`/`script-src`.
6. Unificar camada de API para evitar regressões de segurança.

