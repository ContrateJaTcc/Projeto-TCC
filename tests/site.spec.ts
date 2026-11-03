import { expect, test, type Page } from '@playwright/test'

/* Entra no modo demonstração pela tela de login, como uma pessoa faria */
async function entrarNaDemo(page: Page, papel: 'Freelancer' | 'Contratante') {
  await page.goto('/login')
  await page.getByRole('button', { name: papel, exact: true }).click()
  await expect(page.getByText('Modo demonstração:')).toBeVisible()
}

test.describe('Login', () => {
  test('o olho mostra e esconde a senha', async ({ page }) => {
    await page.goto('/login')
    const senha = page.getByPlaceholder('Sua senha')
    await senha.fill('segredo123')
    await expect(senha).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: 'Mostrar senha' }).click()
    await expect(senha).toHaveAttribute('type', 'text')

    await page.getByRole('button', { name: 'Esconder senha' }).click()
    await expect(senha).toHaveAttribute('type', 'password')
  })

  test('tem "Manter conectado" e o modo demonstração não oferece administrador', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Manter conectado')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Freelancer', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Contratante', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /administrador|admin/i })).toHaveCount(0)
  })
})

test.describe('Cadastro', () => {
  test('só deixa escolher freelancer ou contratante', async ({ page }) => {
    await page.goto('/cadastro')
    await expect(page.getByText(/administrador/i)).toHaveCount(0)
  })
})

test.describe('Freelancer', () => {
  test('vê as missões da semana e resgata a que está pronta', async ({ page }) => {
    await entrarNaDemo(page, 'Freelancer')
    await expect(page.getByRole('heading', { name: 'Missões da semana' })).toBeVisible()

    /* Só dentro do cartão das missões (os primeiros passos também têm botões de resgatar) */
    const missoes = page.locator('section', { has: page.getByRole('heading', { name: 'Missões da semana' }) })
    await missoes.getByRole('button', { name: /Resgatar \+20 XP/ }).click()
    await expect(page.getByText(/Missão cumprida! \+20 XP/)).toBeVisible()
    /* Depois de resgatada, vira selo e o botão some */
    await expect(missoes.getByRole('list', { name: 'Missões da semana' }).getByRole('button', { name: /Resgatar/ })).toHaveCount(0)
  })

  test('vê o ranking do mês e o geral', async ({ page }) => {
    await entrarNaDemo(page, 'Freelancer')
    const ranking = page.locator('section', { has: page.getByRole('heading', { name: 'Ranking dos freelancers' }) })
    await expect(ranking.getByText('Bruno Silva')).toBeVisible()

    await ranking.getByRole('tab', { name: 'Geral' }).click()
    await expect(ranking.getByText('1250 XP')).toBeVisible()
  })

  test('se candidata a um projeto aberto', async ({ page }) => {
    await entrarNaDemo(page, 'Freelancer')
    await page.goto('/freelancer/projetos/101')
    await page.getByRole('button', { name: /Candidatar-se/ }).click()
    await expect(page.getByText('Candidatura enviada!')).toBeVisible()
  })

  test('troca o clima nas Configurações e a prévia acompanha', async ({ page }) => {
    await entrarNaDemo(page, 'Freelancer')
    await page.goto('/freelancer/configuracoes')
    await page.getByRole('group', { name: 'Clima' }).getByRole('button', { name: 'Neve' }).click()
    await expect(page.getByRole('img', { name: /Prévia do cenário: .*clima neve/ })).toBeVisible()
  })
})

test.describe('Tela de transição', () => {
  /* Os testes rodam com "reduzir movimento" do sistema ligado, como no Windows de quem pediu */
  const portal = (page: Page) => page.locator('[data-movimento-livre]')
  const chave = (page: Page) => page.getByRole('switch', { name: 'Tela de transição' })

  test('desligar e ligar de novo faz o portal voltar, animando', async ({ page }) => {
    await entrarNaDemo(page, 'Freelancer')
    await page.goto('/freelancer/configuracoes')

    /* Ligada: aparece mesmo com o sistema pedindo menos movimento */
    await chave(page).click()
    await expect(chave(page)).toHaveAttribute('aria-checked', 'true')
    await page.locator('a[href="/freelancer/historico"]').first().click()
    await expect(portal(page)).toBeVisible()
    await expect(portal(page)).not.toHaveCSS('animation-duration', '1e-05s')
    await expect(portal(page)).toHaveCount(0, { timeout: 5000 })

    /* Desligada: nada */
    await page.locator('a[href$="/configuracoes"]').first().click()
    await expect(chave(page)).toBeVisible()
    await chave(page).click()
    await expect(chave(page)).toHaveAttribute('aria-checked', 'false')
    await page.locator('a[href="/freelancer/mensagens"]').first().click()
    await expect(page).toHaveURL(/mensagens/)
    await expect(portal(page)).toHaveCount(0)

    /* Ligada de novo: volta */
    await page.locator('a[href$="/configuracoes"]').first().click()
    await chave(page).click()
    await expect(chave(page)).toHaveAttribute('aria-checked', 'true')
    await page.locator('a[href="/freelancer/historico"]').first().click()
    await expect(portal(page)).toBeVisible()
  })
})

test.describe('Contratante', () => {
  test('aceita um candidato', async ({ page }) => {
    await entrarNaDemo(page, 'Contratante')
    await page.goto('/contratante/candidatos')
    const cartao = page.locator('article, li, div').filter({ hasText: 'Bruno Silva' }).filter({ has: page.getByRole('button', { name: /Aceitar/ }) }).last()
    await cartao.getByRole('button', { name: /Aceitar/ }).click()
    await expect(page.getByText('Bruno foi contratado! "pokemon cartas" agora está em andamento.')).toBeVisible()
  })

  test('vê os destaques na busca de freelancers', async ({ page }) => {
    await entrarNaDemo(page, 'Contratante')
    await page.goto('/contratante/freelancers')
    await expect(page.getByRole('heading', { name: 'Destaques' })).toBeVisible()
  })
})

test.describe('App', () => {
  test('tem manifesto para instalar no celular', async ({ request }) => {
    const resposta = await request.get('/manifest.webmanifest')
    expect(resposta.ok()).toBeTruthy()
    const manifesto = await resposta.json()
    expect(manifesto.name).toBe('ContrateJá')
    expect(manifesto.icons.length).toBeGreaterThan(0)
  })
})
