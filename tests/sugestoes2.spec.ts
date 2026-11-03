import { expect, test, type Page } from '@playwright/test'

/* As 15 sugestões da segunda rodada e as opções novas das Configurações, no modo demonstração */

type Papel = 'freelancer' | 'contratante' | 'administrador'

const token = (id: number, tipo: Papel) => 'demo.' + Buffer.from(JSON.stringify({ id, tipo })).toString('base64') + '.demo'

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

async function trocarPara(page: Page, id: number, tipo: Papel, caminho: string) {
  await page.evaluate(
    ({ t, tipo }) => {
      localStorage.setItem('token', t)
      localStorage.setItem('tipo', tipo)
      localStorage.setItem('contrateja:role', tipo)
    },
    { t: token(id, tipo), tipo }
  )
  await page.goto(caminho)
}

test('agenda: o prazo do site da Ana aparece no mês e vai para o calendário', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/agenda')
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
  /* Contratado há 14 dias com 20 de prazo: a entrega é daqui a 6 dias (pode cair no mês que vem) */
  const proximos = page.locator('section', { has: page.getByRole('heading', { name: 'Próximos' }) })
  await expect(proximos.getByText('Entrega de Criação de website')).toBeVisible()
  await expect(proximos.getByText(/Reunião/).first()).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Levar para o meu calendário/ }).click()
  expect((await download).suggestedFilename()).toBe('agenda-contrateja.ics')
})

test('cartas salvas: escolher uma preenche o recado e dá para guardar outra', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/projetos/108')
  await page.getByLabel('Usar uma carta salva').selectOption({ label: 'Para projetos de design' })
  await expect(page.getByLabel('Recado para o contratante (opcional)')).toHaveValue(/pixel art e design de marcas/)
  await page.getByLabel('Recado para o contratante (opcional)').fill('Oi! Faço identidade visual completa, com manual da marca e artes para as redes.')
  await page.getByRole('button', { name: 'Guardar como carta' }).click()
  await page.getByLabel('Nome da carta').fill('Identidade completa')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Carta guardada. Da próxima vez é só escolher.')).toBeVisible()
  await page.getByRole('button', { name: /Candidatar-se/ }).click()
  await expect(page.getByText('Candidatura enviada!')).toBeVisible()

  await page.goto('/freelancer/configuracoes#cartas')
  await expect(page.locator('#cartas').getByText('Identidade completa')).toBeVisible()
})

test('comparar freelancers: marcar dois na busca e ver lado a lado', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/freelancers')
  await page.getByLabel('Comparar Bruno Silva').check()
  await expect(page.getByText('1 marcado: escolha mais um para comparar')).toBeVisible()
  await page.getByLabel('Comparar Carla Souza').check()
  await page.getByRole('link', { name: 'Comparar lado a lado' }).click()
  await expect(page.getByRole('heading', { name: 'Comparar freelancers' })).toBeVisible()
  const quadro = page.getByRole('table', { name: 'Comparação de freelancers' })
  await expect(quadro.getByRole('columnheader')).toHaveCount(2)
  /* Bruno tem nível maior: ganha a estrela da linha */
  const nivel = quadro.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Nível' }) })
  await expect(nivel.getByRole('cell').first()).toContainText('melhor')
  await page.getByRole('button', { name: 'Tirar Carla Souza da comparação' }).click()
  await expect(page.getByText(/Marque "Comparar" em 2 ou 3 cartões/)).toBeVisible()
})

test('pausar o prazo: a Ana pede, o Lucas aceita e depois retoma com dia a mais', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/historico')
  const card = page.locator('article').filter({ hasText: 'Criação de website' })
  await card.getByRole('button', { name: /Pausar o prazo/ }).click()
  await card.getByLabel(/Por que pausar/).fill('Esperando as fotos dos produtos')
  await card.getByRole('button', { name: 'Pedir a pausa' }).click()
  await expect(card.getByText(/Você pediu para pausar o prazo; falta Lucas aceitar/)).toBeVisible()

  await trocarPara(page, 3, 'contratante', '/contratante/historico')
  const doLucas = page.locator('article').filter({ hasText: 'Criação de website' })
  await expect(doLucas.getByText('Ana pediu para pausar o prazo')).toBeVisible()
  await doLucas.getByRole('button', { name: 'Aceitar' }).click()
  await expect(doLucas.getByText(/Prazo pausado desde/)).toBeVisible()
  await doLucas.getByRole('button', { name: 'Retomar o prazo' }).click()
  await expect(page.getByText(/voltou a correr, com 1 dia a mais/)).toBeVisible()
})

test('visto por último: Bruno aparece online no chat e some ao esconder', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/mensagens')
  await page.getByRole('button', { name: /Bruno S. pokemon cartas/ }).click()
  await expect(page.getByText('online agora', { exact: true })).toBeVisible()

  /* Bruno desliga nas Configurações: o Lucas para de ver */
  await trocarPara(page, 4, 'freelancer', '/freelancer/configuracoes#privacidade')
  await page.getByRole('switch', { name: 'Mostrar quando estou online' }).click()
  await expect(page.getByText('Privacidade salva.')).toBeVisible()
  await trocarPara(page, 3, 'contratante', '/contratante/mensagens')
  await page.getByRole('button', { name: /Bruno S. pokemon cartas/ }).click()
  await expect(page.getByRole('dialog', { name: /Conversa com Bruno/ }).getByText('online agora', { exact: true })).toHaveCount(0)
})

test('aparecer na busca: a Carla some da lista dos contratantes', async ({ page }) => {
  await entrarComo(page, 5, 'freelancer')
  await page.goto('/freelancer/configuracoes')
  await page.getByRole('switch', { name: 'Aparecer na busca de freelancers' }).click()
  await expect(page.getByText('Privacidade salva.')).toBeVisible()
  await trocarPara(page, 3, 'contratante', '/contratante/freelancers')
  await expect(page.getByRole('heading', { name: 'Bruno Silva' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Carla Souza' })).toHaveCount(0)
})

test('avisos por tipo: desligar "Conquistas" no sino esconde a insígnia nova', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/configuracoes#notificacoes')
  const caixa = page.getByLabel('Conquistas e jogo no sino')
  await expect(caixa).toBeChecked()
  await caixa.uncheck()
  /* Espera o modo demonstração guardar antes de recarregar */
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('demo:estado') ?? '')).toContain('"conquistas":false')
  await page.reload()
  await expect(page.getByLabel('Conquistas e jogo no sino')).not.toBeChecked()
  await expect(page.getByLabel('Mensagens e reuniões no sino')).toBeChecked()
})

test('filtro de spam: projeto suspeito vai para a revisão e o admin aprova', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/criar-projeto')
  await page.getByLabel('Título do projeto').fill('Renda extra para divulgar a loja')
  await page.getByLabel('Descrição', { exact: true }).fill('Ganhe dinheiro fácil divulgando nossa loja de cartas, pix antecipado para começar.')
  await page.getByLabel('Categoria').selectOption({ index: 1 })
  await page.getByLabel('Valor', { exact: true }).fill('300')
  await page.getByLabel('Prazo em dias').fill('10')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText(/vai passar por uma revisão rápida da administração/)).toBeVisible()
  await page.getByRole('button', { name: /Publicar/ }).click()
  await expect(page.getByText(/passa por uma revisão rápida da administração/).first()).toBeVisible()
  await expect(page.getByText('Em revisão').first()).toBeVisible()

  /* A Ana não vê o projeto em revisão */
  await trocarPara(page, 2, 'freelancer', '/freelancer')
  await expect(page.getByRole('heading', { name: 'Encontre projetos' })).toBeVisible()
  await expect(page.getByText('Renda extra para divulgar a loja')).toHaveCount(0)

  await trocarPara(page, 6, 'administrador', '/administrador')
  await page.getByRole('tab', { name: 'Revisão de projetos' }).click()
  const item = page.locator('li').filter({ hasText: 'Renda extra para divulgar a loja' })
  await expect(item.getByText(/termo suspeito/)).toBeVisible()
  await item.getByRole('button', { name: 'Aprovar e publicar' }).click()
  await expect(page.getByText('Projeto aprovado e publicado.')).toBeVisible()
})

test('monitor de erros: o admin vê os erros agrupados e marca como resolvido', async ({ page }) => {
  await entrarComo(page, 6, 'administrador')
  await page.goto('/administrador')
  await page.getByRole('tab', { name: 'Erros' }).click()
  await expect(page.getByText(/Cannot read properties of undefined/)).toBeVisible()
  await expect(page.getByText(/4 vezes/)).toBeVisible()
  await page.getByRole('tab', { name: 'Servidor', exact: true }).click()
  await expect(page.getByText('Error: connect ETIMEDOUT')).toBeVisible()
  await page.getByRole('button', { name: 'Resolvido' }).click()
  await expect(page.getByText('Nenhum erro registrado. Tudo funcionando!')).toBeVisible()
})

test('retrospectiva e marcos: cartões do ano e marco do primeiro projeto', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/retrospectiva')
  await expect(page.getByRole('heading', { name: 'Retrospectiva' })).toBeVisible()
  await expect(page.getByText(/projetos concluídos neste ano/)).toBeVisible()
  await page.getByRole('button', { name: 'Próximo cartão' }).click()
  await expect(page.getByText('ganhos com o seu trabalho')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar este cartão' }).click()
  expect((await download).suggestedFilename()).toMatch(/^retrospectiva-\d{4}-2\.png$/)
  const marcos = page.locator('section', { has: page.getByRole('heading', { name: 'Marcos' }) })
  await expect(marcos.getByText('Primeiro projeto')).toBeVisible()
  await expect(marcos.getByRole('button', { name: 'Baixar o cartão de Primeiro projeto' })).toBeVisible()
})

test('convide um amigo: link próprio e quem já entrou', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/convidar')
  await expect(page.getByLabel('Seu link de convite')).toHaveValue(/\/cadastro\?convite=ANA-7K2Q$/)
  await expect(page.getByText('Bruno S.')).toBeVisible()
  await expect(page.getByText('+50 XP')).toBeVisible()
  await expect(page.getByText('Falta o 1º projeto')).toBeVisible()
})

test('cadastro pelo link de convite já traz o código', async ({ page }) => {
  await page.goto('/cadastro?convite=ana-7k2q')
  await expect(page.getByText(/Você chegou por um convite/)).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByLabel('Código de convite (opcional)')).toHaveValue('ANA-7K2Q')
})

test('central de ajuda: busca e leva para a página certa', async ({ page }) => {
  await page.goto('/ajuda')
  await expect(page.getByRole('heading', { name: 'Central de ajuda' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar na ajuda' }).fill('sumir disputa')
  await expect(page.getByText('1 resposta encontrada')).toBeVisible()
  await expect(page.getByText(/Abra uma disputa no histórico/)).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar na ajuda' }).fill('palavra que nao existe')
  await expect(page.getByText(/Nada encontrado/)).toBeVisible()
})

test('mural do reino aparece no Mapa do reino', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/reino')
  const mural = page.getByRole('region', { name: 'Mural do reino' })
  await expect(mural.getByText('A guilda Torre do Saber foi fundada.')).toBeVisible()
  await expect(mural.getByText('Carla S. passou no teste de Redação.')).toBeVisible()
})

test('configurações: página inicial, horário silencioso, índice e atalhos', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/configuracoes')
  await page.getByRole('navigation', { name: 'Seções das configurações' }).getByRole('link', { name: 'Atalhos' }).click()
  await expect(page.getByText('Ctrl + K')).toBeInViewport()
  await page.getByRole('group', { name: 'Página inicial' }).getByRole('button', { name: 'Agenda' }).click()
  await page.getByRole('switch', { name: 'Horário silencioso' }).click()
  await expect(page.getByRole('combobox', { name: /^Das/ })).toHaveValue('22')
  await page.getByRole('switch', { name: 'Sublinhar os links' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-sublinhar', '1')
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('preferencias') ?? '{}'))
  expect(prefs).toMatchObject({ paginaInicial: 'agenda', silencio: true, sublinharLinks: true })
})

test('cabeçalhos de segurança: o mesmo CSP na prévia e na Vercel', async ({ request }) => {
  const fs = await import('fs')
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
  const seguranca = JSON.parse(fs.readFileSync('seguranca.json', 'utf8'))
  expect(vercel.headers[0].headers).toEqual(seguranca)
  const r = await request.get('/')
  expect(r.headers()['content-security-policy']).toContain("default-src 'self'")
  expect(r.headers()['x-frame-options']).toBe('DENY')
})
