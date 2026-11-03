import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/*
 * Acessibilidade: o axe confere cada página (contraste, rótulos, nomes de botões, estrutura).
 * Falha com problema "sério" ou "crítico"; os leves aparecem no relatório, sem derrubar o teste.
 */

/* Entra direto numa conta do modo demonstração (inclusive admin, que não tem botão no login) */
async function entrarComo(page: Page, id: number, tipo: 'freelancer' | 'contratante' | 'administrador', tema: 'escuro' | 'claro') {
  await page.addInitScript(
    ({ id, tipo, tema }) => {
      if (sessionStorage.getItem('teste-pronto')) return
      sessionStorage.setItem('teste-pronto', '1')
      localStorage.setItem('demo', '1')
      localStorage.setItem('token', 'demo.' + btoa(JSON.stringify({ id, tipo })) + '.demo')
      localStorage.setItem('tipo', tipo)
      localStorage.setItem('contrateja:role', tipo)
      localStorage.setItem('preferencias', JSON.stringify({ tema, transicao: false, animacoes: false }))
    },
    { id, tipo, tema }
  )
}

async function conferir(page: Page, caminho: string, esperar?: string) {
  await page.goto(caminho)
  if (esperar) await expect(page.getByText(esperar).first()).toBeVisible()
  await page.waitForTimeout(400)
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  /* Relatório legível quando falha: regra, quantos lugares e um exemplo */
  const relatorio = graves.map((v) => `${v.id} (${v.impact}, ${v.nodes.length}x): ${v.help}\n    ex.: ${v.nodes[0]?.target.join(' ')}`).join('\n')
  expect(graves, `${caminho}\n${relatorio}`).toEqual([])
}

test.describe('Acessibilidade: páginas públicas', () => {
  for (const [caminho, texto] of [['/', 'Conecte-se'], ['/login', 'Bem-vindo de volta'], ['/cadastro', 'Bem-Vindo'], ['/ajuda', 'Central de ajuda']] as const) {
    test(caminho, async ({ page }) => conferir(page, caminho, texto))
  }
})

for (const tema of ['escuro', 'claro'] as const) {
  test.describe(`Acessibilidade: tema ${tema}`, () => {
    const freelancer: [string, string][] = [
      ['/freelancer', 'Encontre projetos'],
      ['/freelancer/projetos/101', 'pokemon cartas'],
      ['/freelancer/mensagens', 'Mensagens'],
      ['/freelancer/perfil', 'Meu perfil'],
      ['/freelancer/configuracoes', 'Configurações'],
      ['/freelancer/reino', 'Mapa do reino'],
      ['/freelancer/mapa', 'Projetos no mapa'],
      ['/freelancer/guildas', 'Ranking do mês'],
      ['/freelancer/testes', 'Testes de habilidade'],
      ['/freelancer/insignias', 'Álbum de insígnias'],
      ['/freelancer/recibo/103', 'Recibo do projeto'],
      ['/freelancer/agenda', 'Próximos'],
      ['/freelancer/retrospectiva', 'Marcos'],
      ['/freelancer/convidar', 'Seu link'],
      ['/freelancer/historico', 'Histórico'],
    ]
    for (const [caminho, texto] of freelancer) {
      test(`freelancer ${caminho}`, async ({ page }) => {
        await entrarComo(page, 2, 'freelancer', tema)
        await conferir(page, caminho, texto)
      })
    }

    const contratante: [string, string][] = [
      ['/contratante', 'Lucas Contratante'],
      ['/contratante/freelancers', 'Encontre freelancers'],
      ['/contratante/candidatos', 'Candidatos'],
      ['/contratante/historico', 'Histórico'],
      ['/contratante/comparar?ids=4,5', 'Comparar freelancers'],
      ['/contratante/configuracoes', 'Configurações'],
    ]
    for (const [caminho, texto] of contratante) {
      test(`contratante ${caminho}`, async ({ page }) => {
        await entrarComo(page, 3, 'contratante', tema)
        await conferir(page, caminho, texto)
      })
    }

    test('administrador /administrador', async ({ page }) => {
      await entrarComo(page, 6, 'administrador', tema)
      await conferir(page, '/administrador', 'Painel do administrador')
    })
  })
}
