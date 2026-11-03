import { expect, test, type Page } from '@playwright/test'

/*
 * Texto solto sobre o cenário no pôr do sol. O axe não consegue medir contraste em cima de imagem
 * (marca como "incompleto"), então este teste confere outra coisa: todo texto da área logada precisa
 * ter, atrás dele, algo com fundo sólido (cartão, plaquinha, botão). Foi assim que o título do
 * Portfólio e o aviso de avaliação pendente sumiam no castelo.
 */

async function entrarComo(page: Page, id: number, tipo: 'freelancer' | 'contratante' | 'administrador') {
  await page.addInitScript(
    ({ id, tipo }) => {
      if (sessionStorage.getItem('teste-pronto')) return
      sessionStorage.setItem('teste-pronto', '1')
      localStorage.setItem('demo', '1')
      localStorage.setItem('token', 'demo.' + btoa(JSON.stringify({ id, tipo })) + '.demo')
      localStorage.setItem('tipo', tipo)
      localStorage.setItem('contrateja:role', tipo)
      localStorage.setItem('preferencias', JSON.stringify({ tema: 'claro', transicao: false, animacoes: false }))
    },
    { id, tipo }
  )
}

/* Textos visíveis do conteúdo que não têm nada sólido por trás até chegar na página */
async function textosSoltos(page: Page) {
  return page.evaluate(() => {
    /* Área logada, ou a moldura das páginas públicas com o mesmo tema */
    const conteudo = document.querySelector('[data-area="privada"], [data-area="home"]')
    if (!conteudo) return ['(área logada não abriu)']
    const solido = (el: Element) => {
      const estilo = getComputedStyle(el)
      if (estilo.backgroundImage !== 'none') return true
      const cor = estilo.backgroundColor.match(/[\d.]+/g)?.map(Number) ?? []
      const alfa = cor.length === 4 ? cor[3] : cor.length === 3 ? 1 : 0
      return alfa >= 0.85
    }
    const soltos: string[] = []
    const andar = document.createTreeWalker(conteudo, NodeFilter.SHOW_TEXT)
    for (let no = andar.nextNode(); no; no = andar.nextNode()) {
      const texto = no.textContent?.trim()
      const el = no.parentElement
      if (!texto || !el) continue
      /* O cabeçalho e o rodapé têm fundo próprio; aqui interessa o conteúdo */
      if (el.closest('header, footer, [role="status"], [aria-hidden="true"]')) continue
      const caixa = el.getBoundingClientRect()
      const estilo = getComputedStyle(el)
      if (!caixa.width || !caixa.height || estilo.visibility === 'hidden' || Number(estilo.opacity) === 0) continue
      let atual: Element | null = el
      let achou = false
      while (atual && atual !== conteudo) {
        if (solido(atual)) {
          achou = true
          break
        }
        atual = atual.parentElement
      }
      if (!achou) soltos.push(`"${texto.slice(0, 60)}" em <${el.tagName.toLowerCase()} class="${el.className}">`)
    }
    return soltos
  })
}

const PAGINAS: [number, 'freelancer' | 'contratante' | 'administrador', string, string][] = [
  [2, 'freelancer', '/freelancer', 'Encontre projetos'],
  [2, 'freelancer', '/freelancer/entregues', 'Trabalhos em andamento'],
  [2, 'freelancer', '/freelancer/historico', 'Histórico'],
  [2, 'freelancer', '/freelancer/mensagens', 'Mensagens'],
  [2, 'freelancer', '/freelancer/perfil', 'Meu perfil'],
  [2, 'freelancer', '/freelancer/configuracoes', 'Configurações'],
  [2, 'freelancer', '/freelancer/projetos/101', 'pokemon cartas'],
  [3, 'contratante', '/contratante', 'Lucas Contratante'],
  [3, 'contratante', '/contratante/freelancers', 'Encontre freelancers'],
  [3, 'contratante', '/contratante/candidatos', 'Candidatos'],
  [3, 'contratante', '/contratante/historico', 'Histórico'],
  [3, 'contratante', '/contratante/perfil', 'Meu perfil'],
  [6, 'administrador', '/administrador', 'Painel do administrador'],
  [2, 'freelancer', '/freelancer/avaliacoes', 'Avaliações pendentes'],
  [2, 'freelancer', '/p/2-ana-freelancer', 'Ana Freelancer'],
  [2, 'freelancer', '/sobre', 'Sobre o ContrateJá'],
  [3, 'contratante', '/contratante/criar-projeto', 'Crie seu projeto'],
  [2, 'freelancer', '/freelancer/projetos/110', 'Projetos parecidos'],
  [1, 'administrador', '/administrador/relatorio', 'Relatório da plataforma'],
  [2, 'freelancer', '/freelancer/acordo/102', 'Termo de acordo'],
  [2, 'freelancer', '/freelancer/carteira', 'Extrato'],
  [3, 'contratante', '/contratante/carteira', 'Extrato'],
  [2, 'freelancer', '/freelancer/ganhos', 'Ganhos por mês'],
  [2, 'freelancer', '/freelancer/loja', 'Loja do castelo'],
  [2, 'freelancer', '/certificado/103', 'Certificado de conclusão'],
  [2, 'freelancer', '/freelancer/reino', 'Mapa do reino'],
  [2, 'freelancer', '/freelancer/mapa', 'Projetos no mapa'],
  [2, 'freelancer', '/freelancer/guildas', 'Ranking do mês'],
  [2, 'freelancer', '/freelancer/testes', 'Testes de habilidade'],
  [2, 'freelancer', '/freelancer/insignias', 'Álbum de insígnias'],
  [3, 'contratante', '/contratante/recibo/103', 'Recibo do projeto'],
  [2, 'freelancer', '/freelancer/agenda', 'Próximos'],
  [2, 'freelancer', '/freelancer/retrospectiva', 'Marcos'],
  [2, 'freelancer', '/freelancer/convidar', 'Seu link'],
  [3, 'contratante', '/contratante/comparar?ids=4,5', 'Comparar freelancers'],
  [3, 'contratante', '/contratante/configuracoes', 'Configurações'],
  [2, 'freelancer', '/ajuda', 'Central de ajuda'],
]

test.describe('Legibilidade no pôr do sol', () => {
  for (const [id, tipo, caminho, esperar] of PAGINAS) {
    test(`${tipo} ${caminho}`, async ({ page }) => {
      await entrarComo(page, id, tipo)
      await page.goto(caminho)
      await expect(page.getByText(esperar).first()).toBeVisible()
      await page.waitForTimeout(500)
      const soltos = await textosSoltos(page)
      expect(soltos, `Texto direto sobre o cenário em ${caminho}:\n  ${soltos.join('\n  ')}`).toEqual([])
    })
  }
})
