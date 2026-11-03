import { defineConfig } from '@playwright/test'

/*
 * Testes de ponta a ponta: abrem o site de verdade no Chrome e clicam como uma pessoa.
 * Rodam no modo demonstração, então não precisam do servidor nem de internet.
 * Uso: npm run test:e2e (faz o build antes)
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    /* O Chrome já instalado no computador (não baixa outro navegador) */
    channel: 'chrome',
    viewport: { width: 1280, height: 900 },
    /* Como um Windows com "reduzir movimento" ligado: tudo parado, a não ser o que a pessoa ligar no site */
    contextOptions: { reducedMotion: 'reduce' },
    screenshot: 'only-on-failure',
    /* O tour de boas-vindas já visto: os testes clicam direto (o tour tem teste próprio) */
    storageState: 'tests/estado-inicial.json',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
})
