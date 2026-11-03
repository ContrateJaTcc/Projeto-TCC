import { expect, test, type Page } from '@playwright/test'

/* Rodada do reino: as 25 sugestões novas (as que já existiam têm teste próprio), no modo demonstração */

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

/* "AAAA-MM-DDT10:00" da próxima segunda-feira (para cair nos horários de atendimento) */
function proximaSegunda10h() {
  const d = new Date()
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T10:00`
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

test('pagamento por etapa: o contratante aprova e a freelancer recebe a parte', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/historico')
  const card = page.locator('article').filter({ hasText: 'Criação de website' })
  await expect(card.getByText(/Pagamento por etapa/)).toBeVisible()
  /* 1500 guardados, 3 etapas: a primeira (já feita) vale 500 */
  await card.getByRole('button', { name: 'Aprovar e pagar R$ 500,00' }).click()
  await expect(page.getByText('Etapa aprovada: R$ 500,00 foram para o freelancer.')).toBeVisible()
  await expect(card.getByText('R$ 500,00 pago')).toBeVisible()
  await expect(card.getByText(/R\$\s1\.000,00 guardados na garantia/)).toBeVisible()

  await trocarPara(page, 2, 'freelancer', '/freelancer/carteira')
  await expect(page.getByText('Etapa paga')).toBeVisible()
  await expect(page.getByText('Etapa "Página inicial" de "Criação de website"', { exact: false })).toBeVisible()
})

test('bônus no fim e recibo do projeto', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/historico')
  const card = page.locator('article').filter({ hasText: 'Logo para loja de cartas' })
  await card.getByRole('button', { name: 'Dar bônus' }).click()
  await card.getByRole('button', { name: 'R$ 100,00' }).click()
  await card.getByLabel('Recado (opcional)').fill('Ficou demais!')
  await card.getByRole('button', { name: 'Mandar R$ 100,00' }).click()
  await expect(page.getByText(/Bônus de R\$ 100,00 enviado/)).toBeVisible()
  await expect(card.getByText(/você mandou R\$\s100,00/)).toBeVisible()

  await card.getByRole('link', { name: 'Recibo' }).click()
  await expect(page.getByRole('heading', { name: 'Recibo do projeto' })).toBeVisible()
  await expect(page.getByText('Nº CJ-000103')).toBeVisible()
  await expect(page.getByRole('cell', { name: /Bônus/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'R$ 400,00' })).toBeVisible()
})

test('avaliação às cegas: a nota da Marta só aparece depois que a Ana avalia', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/p/2-ana-freelancer')
  await expect(page.getByRole('heading', { name: 'Ana Freelancer' })).toBeVisible()
  await expect(page.getByText('O banner ficou lindo')).toHaveCount(0)

  await page.goto('/freelancer/avaliacoes')
  await expect(page.getByText(/Avaliação às cegas/)).toBeVisible()
  const cartao = page.locator('article').filter({ hasText: 'Banner de inauguração' })
  await expect(cartao.getByText('Marta já avaliou você.', { exact: false })).toBeVisible()
  await cartao.getByRole('button', { name: '5 estrelas' }).click()
  await cartao.getByRole('button', { name: 'Enviar avaliação' }).click()
  await expect(page.getByText(/As duas notas já aparecem/)).toBeVisible()

  await page.goto('/p/2-ana-freelancer')
  await expect(page.getByText('O banner ficou lindo', { exact: false })).toBeVisible()
})

test('chat: aviso de contato por fora antes da contratação', async ({ page }) => {
  /* O Lucas recebeu o telefone do Bruno antes de contratar: aparece o aviso */
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/mensagens')
  await page.getByRole('button', { name: /Bruno S. pokemon cartas/ }).click()
  await expect(page.getByRole('dialog').getByText(/esta mensagem tem um contato de fora do site/)).toBeVisible()

  /* A Ana tenta mandar o WhatsApp numa conversa sem contratação: o site pede confirmação */
  await trocarPara(page, 2, 'freelancer', '/freelancer/mensagens')
  await page.getByRole('button', { name: /Marta O. Textos do site da cafeteria/ }).click()
  const chat = page.getByRole('dialog')
  await chat.getByPlaceholder('Escreva sua mensagem...').fill('Me chama no zap que eu faço mais barato')
  await chat.getByRole('button', { name: 'Enviar' }).click()
  await expect(chat.getByText('Mandar um contato de fora?')).toBeVisible()
  await chat.getByRole('button', { name: 'Enviar mesmo assim' }).click()
  await expect(chat.getByText('Me chama no zap que eu faço mais barato')).toBeVisible()
})

test('chat: aceitar a reunião e marcar outra', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/mensagens')
  await page.getByRole('button', { name: /Lucas Contratante Criação de website/ }).click()
  const chat = page.getByRole('dialog')
  await expect(chat.getByText('Convite para reunião')).toBeVisible()
  await chat.getByRole('button', { name: 'Aceitar' }).click()
  await expect(page.getByText('Reunião confirmada! Avisamos uma hora antes.')).toBeVisible()
  await expect(chat.getByRole('button', { name: 'Pôr na agenda' })).toBeVisible()
  await expect(chat.getByRole('link', { name: 'Entrar na chamada' })).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij')

  await chat.getByRole('button', { name: 'Marcar reunião' }).click()
  /* A Ana atende de segunda a sexta, das 9h às 18h: marca na próxima segunda às 10h */
  await chat.getByLabel('Dia e hora').fill(proximaSegunda10h())
  await chat.getByLabel('Assunto (opcional)').fill('Revisar as cores')
  await chat.getByRole('button', { name: 'Enviar convite' }).click()
  await expect(page.getByText('Convite de reunião enviado.')).toBeVisible()
  await expect(chat.getByText('Você chamou para uma reunião')).toBeVisible()
})

test('favoritos do contratante na busca de freelancers', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/freelancers')
  await expect(page.getByRole('button', { name: 'Tirar Bruno dos favoritos' })).toBeVisible()
  await page.getByRole('button', { name: 'Guardar Ana nos favoritos' }).click()
  await expect(page.getByRole('button', { name: 'Tirar Ana dos favoritos' })).toBeVisible()
  await page.getByRole('combobox', { name: /^Favoritos/ }).selectOption('sim')
  await expect(page.getByText('2 profissionais encontrados')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Carla Souza' })).toHaveCount(0)
  /* Guilda e teste de habilidade aparecem no cartão */
  const bruno = page.locator('article').filter({ hasText: 'Bruno Silva' })
  await expect(bruno.getByText('Forja de Pixels')).toBeVisible()
  await expect(bruno.getByText('Testado em Desenvolvimento Web')).toBeVisible()
})

test('teste de habilidade: passar dá o selo e XP', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/testes')
  const cartao = page.locator('li').filter({ hasText: 'Design Gráfico' })
  await cartao.getByRole('button', { name: 'Fazer o teste' }).click()
  await expect(page.getByRole('heading', { name: 'Teste de Design Gráfico' })).toBeVisible()
  for (const certa of ['SVG', 'Opostas no círculo cromático', 'O espaço entre pares de letras', 'CMYK', 'Guiar o olhar para o que é mais importante primeiro']) {
    await page.getByText(certa, { exact: true }).click()
  }
  await page.getByRole('button', { name: 'Entregar respostas' }).click()
  await expect(page.getByText('5 de 5')).toBeVisible()
  await expect(page.getByText(/Aprovado! 5 de 5/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Voltar aos testes' }).last().click()
  await expect(page.locator('li').filter({ hasText: 'Design Gráfico' }).getByText(/Aprovado em/)).toBeVisible()
})

test('guildas: entrar, sair e fundar a própria com candidatura em time', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/guildas')
  const torre = page.locator('li').filter({ hasText: 'Torre do Saber' })
  await torre.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Bem-vindo à Torre do Saber!')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Torre do Saber' })).toBeVisible()
  await page.getByRole('button', { name: 'Sair da guilda' }).click()
  await expect(page.getByText('Você saiu da Torre do Saber.')).toBeVisible()

  await page.getByLabel('Nome da guilda').fill('Ordem dos Pixels')
  await page.getByRole('button', { name: 'Coroa' }).click()
  await page.getByRole('button', { name: 'Fundar a guilda' }).click()
  await expect(page.getByText(/A guilda Ordem dos Pixels foi fundada/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ordem dos Pixels' })).toBeVisible()

  await page.goto('/freelancer/projetos/108')
  await page.getByLabel(/Candidatar com a guilda/).check()
  await page.getByRole('button', { name: 'Candidatar-se ao projeto' }).click()
  await expect(page.getByText('Candidatura enviada!')).toBeVisible()

  await trocarPara(page, 8, 'contratante', '/contratante/candidatos')
  await expect(page.getByText(/Com a guilda Ordem dos Pixels · 1 membro/)).toBeVisible()
})

test('mapa do reino e mascote', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/reino')
  /* Ana está no nível 3 */
  await expect(page.getByRole('heading', { name: 'Você está em Bosque dos Vaga-lumes' })).toBeVisible()
  await expect(page.getByText(/Faltam 110 XP para chegar em Ponte do Rio/)).toBeVisible()
  await page.getByRole('button', { name: 'Dragão' }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Faísca')
  await page.getByRole('button', { name: 'Salvar mudanças' }).click()
  await expect(page.getByText('Faísca agora mora no seu castelo!')).toBeVisible()

  await page.goto('/p/2-ana-freelancer')
  await expect(page.getByText('Faísca, o mascote')).toBeVisible()
})

test('painel do freelancer: visitas, mascote, missões do dia e "combina com você"', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer')
  const visitas = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Visitas ao perfil' }) })
  await expect(visitas.getByText('23', { exact: true })).toBeVisible()
  await expect(visitas.getByText(/10 delas eram contratantes/)).toBeVisible()
  await expect(visitas.getByRole('listitem')).toHaveCount(7)

  const castelo = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Seu castelo' }) })
  await expect(castelo.getByText('Pixel', { exact: true })).toBeVisible()

  const missoes = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Missões do dia' }) })
  await missoes.getByRole('list', { name: 'Missões do dia' }).getByRole('button', { name: 'Resgatar +5 XP' }).click()
  await expect(page.getByText('Missão cumprida! +5 XP')).toBeVisible()

  const combina = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Combina com você' }) })
  await expect(combina.getByText(/Na sua área: /).first()).toBeVisible()
})

test('álbum de insígnias com a porcentagem de quem tem', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/insignias')
  await expect(page.getByRole('heading', { name: 'Álbum de insígnias' })).toBeVisible()
  await expect(page.getByText(/% dos freelancers têm/).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Conquistas secretas' })).toBeVisible()
})

test('planilhas: usuários no painel do admin e extrato da carteira', async ({ page }) => {
  await entrarComo(page, 6, 'administrador')
  await page.goto('/administrador')
  const baixando = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar planilha' }).click()
  const arquivo = await baixando
  expect(arquivo.suggestedFilename()).toMatch(/^usuarios-contrateja-\d{4}-\d{2}-\d{2}\.csv$/)

  await trocarPara(page, 3, 'contratante', '/contratante/carteira')
  const extrato = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar extrato (planilha)' }).click()
  expect((await extrato).suggestedFilename()).toMatch(/^extrato-contrateja-/)
})

test('documentação da API no "Sobre"', async ({ page }) => {
  await page.goto('/sobre')
  await expect(page.getByRole('heading', { name: 'Documentação da API' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Abrir a documentação/ })).toHaveAttribute('href', /\/docs$/)
})
