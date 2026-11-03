import { expect, test, type Page } from '@playwright/test'

/*
 * Responsividade: cada página, em larguras de celular, tablet e notebook pequeno, não pode rolar de lado
 * nem ter nada visível passando da borda da tela (o que está dentro de uma faixa com rolagem própria não conta).
 */

type Papel = 'freelancer' | 'contratante' | 'administrador'

async function entrarComo(page: Page, id: number, tipo: Papel) {
  await page.addInitScript(
    ({ id, tipo }) => {
      if (sessionStorage.getItem('teste-pronto')) return
      sessionStorage.setItem('teste-pronto', '1')
      localStorage.setItem('demo', '1')
      localStorage.setItem('token', 'demo.' + btoa(JSON.stringify({ id, tipo })) + '.demo')
      localStorage.setItem('tipo', tipo)
      localStorage.setItem('contrateja:role', tipo)
      localStorage.setItem('preferencias', JSON.stringify({ tema: 'escuro', transicao: false, animacoes: false }))
    },
    { id, tipo }
  )
}

/* O que passa da largura da tela (ignora o que está escondido ou dentro de quem rola sozinho) */
async function vazamentos(page: Page) {
  return page.evaluate(() => {
    const largura = document.documentElement.clientWidth
    const problemas: string[] = []
    if (document.documentElement.scrollWidth > largura + 1) problemas.push(`a página rola de lado (${document.documentElement.scrollWidth}px em ${largura}px)`)
    const rolaSozinho = (el: Element | null) => {
      for (let a = el?.parentElement; a && a !== document.body; a = a.parentElement) {
        const o = getComputedStyle(a).overflowX
        if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true
      }
      return false
    }
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const e = getComputedStyle(el)
      if (e.visibility === 'hidden' || e.position === 'fixed' || el.closest('[aria-hidden="true"], .leaflet-container, canvas')) continue
      if (r.right > largura + 1 || r.left < -1) {
        if (rolaSozinho(el)) continue
        const nome = `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 50)}">${(el.textContent ?? '').trim().slice(0, 30)}`
        problemas.push(`${nome} vai de ${Math.round(r.left)} a ${Math.round(r.right)}px`)
      }
      if (problemas.length > 6) break
    }
    return problemas
  })
}

const PAGINAS: [Papel | null, number, string, string][] = [
  [null, 0, '/', 'Conecte-se'],
  [null, 0, '/login', 'Bem-vindo de volta'],
  [null, 0, '/cadastro', 'Bem-Vindo'],
  [null, 0, '/ajuda', 'Central de ajuda'],
  [null, 0, '/sobre', 'Sobre o ContrateJá'],
  [null, 0, '/termos', 'Termos de Uso'],
  ['freelancer', 2, '/freelancer', 'Encontre projetos'],
  ['freelancer', 2, '/freelancer/projetos/101', 'pokemon cartas'],
  ['freelancer', 2, '/freelancer/entregues', 'Trabalhos em andamento'],
  ['freelancer', 2, '/freelancer/historico', 'Histórico'],
  ['freelancer', 2, '/freelancer/mensagens', 'Mensagens'],
  ['freelancer', 2, '/freelancer/perfil', 'Meu perfil'],
  ['freelancer', 2, '/freelancer/configuracoes', 'Configurações'],
  ['freelancer', 2, '/freelancer/carteira', 'Extrato'],
  ['freelancer', 2, '/freelancer/ganhos', 'Ganhos por mês'],
  ['freelancer', 2, '/freelancer/loja', 'Loja do castelo'],
  ['freelancer', 2, '/freelancer/reino', 'Mapa do reino'],
  ['freelancer', 2, '/freelancer/mapa', 'Projetos no mapa'],
  ['freelancer', 2, '/freelancer/guildas', 'Ranking do mês'],
  ['freelancer', 2, '/freelancer/testes', 'Testes de habilidade'],
  ['freelancer', 2, '/freelancer/insignias', 'Álbum de insígnias'],
  ['freelancer', 2, '/freelancer/agenda', 'Próximos'],
  ['freelancer', 2, '/freelancer/retrospectiva', 'Marcos'],
  ['freelancer', 2, '/freelancer/convidar', 'Seu link'],
  ['freelancer', 2, '/freelancer/avaliacoes', 'Avaliações pendentes'],
  ['freelancer', 2, '/freelancer/acordo/102', 'Termo de acordo'],
  ['freelancer', 2, '/certificado/103', 'Certificado de conclusão'],
  ['freelancer', 2, '/p/2-ana-freelancer', 'Ana Freelancer'],
  ['contratante', 3, '/contratante', 'Lucas Contratante'],
  ['contratante', 3, '/contratante/freelancers', 'Encontre freelancers'],
  ['contratante', 3, '/contratante/freelancer/4', 'Bruno Silva'],
  ['contratante', 3, '/contratante/comparar?ids=4,5', 'Comparar freelancers'],
  ['contratante', 3, '/contratante/candidatos', 'Candidatos'],
  ['contratante', 3, '/contratante/criar-projeto', 'Crie seu projeto'],
  ['contratante', 3, '/contratante/historico', 'Histórico'],
  ['contratante', 3, '/contratante/recibo/103', 'Recibo do projeto'],
  ['administrador', 6, '/administrador', 'Painel do administrador'],
  ['administrador', 1, '/administrador/relatorio', 'Relatório da plataforma'],
]

for (const largura of [360, 390, 768, 1024]) {
  test.describe(`Responsivo ${largura}px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })
    for (const [papel, id, caminho, esperar] of PAGINAS) {
      test(caminho, async ({ page }) => {
        if (papel) await entrarComo(page, id, papel)
        await page.goto(caminho)
        await expect(page.getByText(esperar).first()).toBeAttached()
        await page.waitForTimeout(400)
        const problemas = await vazamentos(page)
        expect(problemas, `${caminho} em ${largura}px:\n  ${problemas.join('\n  ')}`).toEqual([])
      })
    }
  })
}
