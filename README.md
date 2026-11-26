# ContrateJá — Frontend

Plataforma que conecta **freelancers** e **contratantes** (TCC). Feita em React 19 + TypeScript + Vite.

O backend (Express) fica em outro repositório e está publicado em
`https://backendtcc-zeta.vercel.app` (documentação das rotas em `/docs`).

## Perfis e áreas

| Perfil | Rota inicial | O que faz |
|---|---|---|
| Visitante | `/` | Página inicial, cadastro, login, ajuda, perfil público (`/p/:slug`), certificado, Modo TV (`/tv`) |
| Freelancer | `/freelancer` | Procura projetos, se candidata, conversa, entrega, recebe, avalia; portfólio, agenda, mapa, guildas, arena, insígnias |
| Contratante | `/contratante` | Cria projetos, escolhe candidatos, busca e compara freelancers, acompanha etapas e paga |
| Administrador | `/administrador` | Denúncias, disputas, moderação, métricas, funil, erros, saúde do sistema, relatório |

## Como rodar

```bash
npm install
cp .env.example .env.local   # ajuste as variáveis
npm run dev                  # http://localhost:5173
```

### Variáveis de ambiente (`.env.local`)

| Variável | Para que serve |
|---|---|
| `VITE_API_URL` | Endereço do backend. Sem ela, usa o servidor publicado. |
| `VITE_GOOGLE_CLIENT_ID` | Liga o "Entrar com Google" (mesmo Client ID do backend). Sem ela o botão avisa que não está configurado. |

Na Vercel, as mesmas variáveis vão em *Settings → Environment Variables*.

## Modo demonstração

Na tela de login há a opção de entrar na demonstração: o site passa a responder com dados de
exemplo (`src/services/demo.ts`), sem precisar do servidor nem de internet. Os testes usam esse modo.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checa os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Abre a versão de produção localmente |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Build + testes de ponta a ponta (Playwright, usa o Chrome instalado) |
| `npm run contraste` | Confere o contraste das cores |

## Estrutura

```
src/
  pages/        telas (uma por rota; carregadas sob demanda)
  components/   peças reaproveitadas, por assunto
  services/     api.ts (chamadas ao backend), demo.ts (dados de exemplo), google.ts
  utils/        regras e funções auxiliares
  context/      papel do usuário e avisos (toast)
api/previa.js   função da Vercel que gera a prévia de link (WhatsApp, LinkedIn) do perfil e do certificado
public/         ícones, manifest, service worker (sw.js), imagens
tests/          testes Playwright
```

## Publicação

O projeto é publicado na Vercel. O `vercel.json` define as rotas da SPA, o redirecionamento dos
robôs de prévia para `api/previa.js` e os cabeçalhos de segurança (CSP, HSTS etc.).
