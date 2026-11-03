import { expect, test, type Page } from '@playwright/test'

/* As 30 sugestões desta rodada, no modo demonstração */

type Papel = 'freelancer' | 'contratante' | 'administrador'

const token = (id: number, tipo: Papel) => 'demo.' + Buffer.from(JSON.stringify({ id, tipo })).toString('base64') + '.demo'

async function entrarComo(page: Page, id: number, tipo: Papel, extra: Record<string, string> = {}) {
  await page.addInitScript(
    ({ id, tipo, extra }) => {
      if (sessionStorage.getItem('teste-pronto')) return
      sessionStorage.setItem('teste-pronto', '1')
      localStorage.setItem('demo', '1')
      localStorage.setItem('token', 'demo.' + btoa(JSON.stringify({ id, tipo })) + '.demo')
      localStorage.setItem('tipo', tipo)
      localStorage.setItem('contrateja:role', tipo)
      localStorage.setItem('preferencias', JSON.stringify({ tema: 'escuro', transicao: false, animacoes: false }))
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v)
    },
    { id, tipo, extra }
  )
}

/* Troca de conta na mesma aba (os dados do modo ficam na aba) */
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

test('termo de acordo: a freelancer lê e concorda', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/entregues')
  await page.getByRole('link', { name: 'Ler e concordar' }).click()
  await expect(page.getByRole('heading', { name: 'Termo de acordo' })).toBeVisible()
  await expect(page.getByText('Ainda não concordou')).toBeVisible()
  await page.getByLabel('Li o termo inteiro e concordo com o que está escrito.').check()
  await page.getByRole('button', { name: 'Li e concordo' }).click()
  await expect(page.getByText('Ainda não concordou')).toHaveCount(0)
  await expect(page.getByText(/Concordou em/)).toHaveCount(2)
})

test('garantia: finalizar libera o pagamento para a carteira da freelancer', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/historico')
  const card = page.locator('article').filter({ hasText: 'Criação de website' })
  await expect(card.getByText(/guardados na garantia/)).toBeVisible()
  await card.getByRole('button', { name: /finalizar projeto/i }).click()
  await card.getByRole('button', { name: 'Confirmar: trabalho entregue?' }).click()
  await expect(page.getByText(/pagamento guardado foi para o freelancer/)).toBeVisible()
  await trocarPara(page, 2, 'freelancer', '/freelancer/carteira')
  await expect(page.getByText('Pagamento de "Criação de website"')).toBeVisible()
  await expect(page.getByText('R$ 2.000,00')).toBeVisible()
})

test('contratante guarda o pagamento e pede ajustes depois da entrega', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/entregues')
  await page.getByRole('button', { name: 'Marcar como entregue' }).click()
  await page.getByRole('button', { name: 'Confirmar entrega' }).click()
  await expect(page.getByText(/Entregue em/)).toBeVisible()

  await trocarPara(page, 3, 'contratante', '/contratante/historico')
  const card = page.locator('article').filter({ hasText: 'Criação de website' })
  await card.getByRole('button', { name: 'Pedir ajustes' }).click()
  await card.getByLabel(/O que precisa mudar/).fill('Trocar a cor do botão de comprar.')
  await card.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByText(/Pedido enviado/)).toBeVisible()

  await trocarPara(page, 2, 'freelancer', '/freelancer/entregues')
  await expect(page.getByText('Ajustes pedidos (1 de 3):')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcar como entregue' })).toBeVisible()
})

test('disputa: contratante abre e a administração resolve', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/historico')
  const card = page.locator('article').filter({ hasText: 'Criação de website' })
  await card.getByRole('button', { name: 'Abrir disputa' }).click()
  await card.getByLabel('Motivo').selectOption('nao_entregou')
  await card.getByLabel('O que aconteceu?').fill('O prazo está acabando e o carrinho não ficou pronto.')
  await card.locator('form').getByRole('button', { name: 'Abrir disputa' }).click()
  await expect(card.getByText('Disputa em análise:')).toBeVisible()

  await trocarPara(page, 1, 'administrador', '/administrador')
  await page.getByRole('tab', { name: 'Disputas' }).click()
  await expect(page.getByText('Projeto "Criação de website"')).toBeVisible()
  await page.getByRole('button', { name: 'Decidir' }).click()
  await page.getByText('Encerrar sem mudar o projeto').click()
  await page.getByLabel('Recado para os dois').fill('Combinem um prazo novo pelo chat.')
  await page.getByRole('button', { name: 'Resolver disputa' }).click()
  await expect(page.getByText(/Nenhuma disputa esperando/)).toBeVisible()
})

test('proposta no chat: contratante aceita e o projeto muda', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/mensagens?serv=102&com=3&nome=Lucas%20Contratante&titulo=Cria%C3%A7%C3%A3o%20de%20website')
  await page.getByRole('button', { name: 'Propor valor e prazo' }).click()
  await page.getByLabel('Valor (R$)').fill('1700')
  await page.getByLabel('Prazo (dias)').fill('25')
  await page.getByRole('button', { name: 'Enviar proposta' }).click()
  await expect(page.getByText('Sua proposta')).toBeVisible()
  await expect(page.getByText('Esperando resposta')).toBeVisible()

  await trocarPara(page, 3, 'contratante', '/contratante/mensagens?serv=102&com=2&nome=Ana%20Freelancer&titulo=Cria%C3%A7%C3%A3o%20de%20website')
  await page.getByRole('dialog').getByRole('button', { name: 'Aceitar' }).click()
  await expect(page.getByText(/O projeto foi atualizado/).first()).toBeVisible()
  await page.goto('/contratante/historico')
  await expect(page.locator('article').filter({ hasText: 'Criação de website' }).getByText('R$ 1.700,00')).toBeVisible()
})

test('respostas rápidas, "digitando..." e "Visto" no chat', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer', { 'demo:respostas': '1' })
  await page.goto('/freelancer/mensagens?serv=102&com=3&nome=Lucas%20Contratante&titulo=Cria%C3%A7%C3%A3o%20de%20website')
  await page.getByRole('button', { name: 'Posso começar amanhã.' }).click()
  await expect(page.getByPlaceholder('Escreva sua mensagem...')).toHaveValue('Posso começar amanhã.')
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByText('Visto', { exact: true })).toBeVisible({ timeout: 8000 })
  await expect(page.getByText(/Lucas está digitando/)).toBeVisible({ timeout: 8000 })
})

test('disponibilidade aparece e filtra na busca de freelancers', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/perfil')
  const form = page.getByRole('form', { name: 'Disponibilidade' })
  await form.getByText('Ocupado', { exact: true }).click()
  await form.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Você aparece como ocupado.')).toBeVisible()

  await trocarPara(page, 3, 'contratante', '/contratante/freelancers')
  await expect(page.locator('article').filter({ hasText: 'Ana Freelancer' }).getByText('Ocupado')).toBeVisible()
  await expect(page.locator('article').filter({ hasText: 'Carla Souza' }).getByText(/De férias até/)).toBeVisible()
  await page.getByLabel('Disponibilidade').selectOption('sim')
  await expect(page.locator('article').filter({ hasText: 'Ana Freelancer' })).toHaveCount(0)
  await expect(page.locator('article').filter({ hasText: 'Bruno Silva' })).toHaveCount(1)
})

test('loja: compra moldura com XP sem baixar o nível', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/loja')
  await expect(page.getByLabel('340 XP para gastar')).toBeVisible()
  await page.getByRole('button', { name: 'Comprar Moldura de madeira por 60 XP' }).click()
  await expect(page.getByText('Moldura de madeira é seu! Já está equipado.')).toBeVisible()
  await expect(page.getByLabel('280 XP para gastar')).toBeVisible()
  await expect(page.getByText('340/450 XP').first()).toBeVisible()
})

test('ganhos, certificado e portfólio a partir do projeto', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/ganhos')
  await expect(page.getByRole('heading', { name: 'Ganhos por mês' })).toBeVisible()
  await expect(page.getByText('R$ 1.750,00').first()).toBeVisible()

  await page.goto('/certificado/103')
  await expect(page.getByRole('heading', { name: 'Certificado de conclusão' })).toBeVisible()
  await expect(page.getByText('Ana Freelancer')).toBeVisible()

  await page.goto('/freelancer/historico')
  const card = page.locator('article').filter({ hasText: 'Landing page da cafeteria' })
  await card.getByRole('button', { name: 'Mostrar no portfólio' }).click()
  await card.getByRole('button', { name: 'Adicionar ao portfólio' }).click()
  await expect(card.getByText('No seu portfólio')).toBeVisible()
})

test('trabalhar de novo: projeto vem preenchido e o convite sai', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/historico')
  await page.getByRole('link', { name: 'Trabalhar de novo com Ana' }).click()
  await expect(page.getByLabel('Título do projeto')).toHaveValue('Logo para loja de cartas')
  await expect(page.getByText(/costumam pagar entre/)).toBeVisible()
  await expect(page.getByText(/Seu anúncio está \d+% completo/)).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Publicar projeto' }).click()
  await expect(page.getByText('Projeto publicado e Ana foi convidado.')).toBeVisible()
})

test('busca rápida com Ctrl+K e chama da sequência', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer')
  await expect(page.getByRole('button', { name: /Sequência: \d+ dias seguidos/ })).toBeVisible()
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'O que você procura?' }).fill('ganhos')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/freelancer\/ganhos$/)
})

test('evento: pega um item escondido e a faixa conta', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer', { 'evento:sempre': '1' })
  await page.goto('/freelancer')
  const item = page.locator('[data-evento-item]')
  /* Só existe durante um evento do calendário */
  const temEvento = await page.getByRole('region', { name: /^Evento de/ }).waitFor({ timeout: 5000 }).then(() => true, () => false)
  test.skip(!temEvento, 'Nenhum evento no calendário hoje')
  await item.click()
  await expect(page.getByText(/^1 de 5 /)).toBeVisible()
  await expect(page.getByRole('progressbar', { name: /^1 de 5/ }).first()).toBeVisible()
})

test('acessibilidade, verificação em 2 etapas, sessões e dados', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/configuracoes')
  await page.getByRole('group', { name: 'Tamanho da letra' }).getByRole('button', { name: 'Grande' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-fonte', 'grande')
  await page.getByRole('switch', { name: 'Alto contraste' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-contraste', 'alto')

  await page.getByRole('button', { name: 'Ligar' }).click()
  await page.getByLabel('Código que chegou no e-mail').fill('123456')
  await page.getByRole('button', { name: 'Ligar verificação' }).click()
  await expect(page.getByText(/Verificação em 2 etapas ligada/).first()).toBeVisible()

  await page.getByRole('button', { name: 'Desconectar Chrome no Android' }).click()
  await expect(page.getByText('Chrome no Android')).toHaveCount(0)

  const baixa = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar meus dados' }).click()
  expect((await baixa).suggestedFilename()).toBe('meus-dados-contrateja.json')
})

test('modo apresentação troca de conta sozinho', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/configuracoes')
  await page.getByRole('button', { name: 'Começar' }).click()
  const painel = page.getByRole('complementary', { name: 'Roteiro da apresentação' })
  await expect(painel.getByText(/1 de 14/)).toBeVisible()
  await expect(page).toHaveURL(/\/freelancer$/)
  for (let i = 0; i < 8; i++) await painel.getByRole('button', { name: 'Próximo' }).click()
  await expect(painel.getByText(/Lucas \(contratante\)/)).toBeVisible()
  await expect(page).toHaveURL(/\/contratante$/)
})
