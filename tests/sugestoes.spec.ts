import { expect, test, type Page } from '@playwright/test'

/* As 11 sugestões desta rodada, no modo demonstração */

async function entrarComo(page: Page, id: number, tipo: 'freelancer' | 'contratante' | 'administrador') {
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

const listaPrincipal = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Encontre projetos' }) })

test('salva projeto e vê na aba Salvos', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer')
  const secao = listaPrincipal(page)
  await page.getByRole('button', { name: 'Salvar "Site para cafeteria"' }).click()
  await expect(page.getByRole('button', { name: 'Tirar "Site para cafeteria" dos salvos' })).toHaveAttribute('aria-pressed', 'true')
  await secao.getByRole('tab', { name: /^Salvos/ }).click()
  await expect(secao.locator('a[href^="/freelancer/projetos/"]')).toHaveCount(2)
  await page.goto('/freelancer/projetos/108')
  await expect(page.getByRole('button', { name: 'Salvo' })).toHaveAttribute('aria-pressed', 'true')
})

test('prazo para candidaturas aparece na lista e no projeto', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer')
  await expect(listaPrincipal(page).getByText(/Inscrições até \d\d\/\d\d · faltam 3 dias/)).toBeVisible()
  await page.goto('/freelancer/projetos/104')
  await expect(page.getByText(/Inscrições até \d\d\/\d\d · faltam 3 dias/)).toBeVisible()
})

test('projeto mostra parecidos de outros contratantes', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/projetos/110')
  const parecidos = page.locator('section', { has: page.getByRole('heading', { name: 'Projetos parecidos' }) })
  await expect(parecidos.getByRole('link', { name: /Revisão do catálogo/ })).toBeVisible()
  await expect(parecidos.getByText('por Lucas Contratante')).toBeVisible()
})

test('criar projeto: modelo pronto e rascunho automático', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/criar-projeto')
  await page.getByRole('button', { name: 'Logo' }).click()
  await expect(page.getByLabel('Título do projeto')).toHaveValue('Criação de logo')
  await expect(page.getByLabel('Prazo em dias')).toHaveValue('7')
  await page.reload()
  await expect(page.getByText('Recuperamos o que você estava escrevendo.')).toBeVisible()
  await expect(page.getByLabel('Título do projeto')).toHaveValue('Criação de logo')
  await page.getByRole('button', { name: 'Começar do zero' }).click()
  await expect(page.getByLabel('Título do projeto')).toHaveValue('')
})

test('lembrete de prazo chega ao freelancer', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/historico')
  await expect(page.locator('article').filter({ hasText: 'Criação de website' }).getByText(/Prazo: \d\d\/\d\d · falta 1 dia/)).toBeVisible()
  await page.getByRole('button', { name: /^Notificações/ }).click()
  await expect(page.getByRole('dialog', { name: 'Notificações' }).getByText('Falta 1 dia para o prazo de "Criação de website".')).toBeVisible()
})

test('selo de verificado e tempo de resposta', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/freelancers')
  await expect(page.locator('article').filter({ hasText: 'Bruno Silva' }).getByText('Verificado')).toBeVisible()
  await expect(page.locator('article').filter({ hasText: 'Ana Freelancer' }).getByText('Verificado')).toHaveCount(0)
  await page.goto('/contratante/freelancer/4')
  await expect(page.getByText('Responde em ~30 min')).toBeVisible()
})

test('freelancer vê o que falta para o selo', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/perfil')
  const selo = page.locator('section', { has: page.getByRole('heading', { name: 'Selo de verificado' }) })
  await expect(selo.getByText('Foto no perfil')).toBeVisible()
  await expect(selo.getByText('Complete 1 item para ganhar o selo', { exact: false })).toBeVisible()
})

test('conquista secreta do explorador', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/configuracoes')
  await page.getByRole('button', { name: 'Ver fundo' }).click()
  await expect(page.getByText('Conquista secreta: Explorador do castelo!')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto('/freelancer/perfil')
  const secretas = page.locator('section', { has: page.getByRole('heading', { name: 'Conquistas secretas' }) })
  await expect(secretas.getByText('Explorador do castelo')).toBeVisible()
  /* A da lua cheia depende do dia: conta só que há 4 e pelo menos uma achada */
  await expect(secretas.getByText(/[1-5] de 5 encontradas/)).toBeVisible()
})

test('admin abre o relatório para salvar em PDF', async ({ page }) => {
  await entrarComo(page, 1, 'administrador')
  await page.goto('/administrador')
  await page.getByRole('link', { name: 'Relatório em PDF' }).click()
  await expect(page.getByRole('heading', { name: 'Relatório da plataforma' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Imprimir ou salvar PDF' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Projetos publicados por categoria' })).toBeVisible()
})

test.describe('tour de boas-vindas', () => {
  /* Navegador "novo": sem o tour marcado como visto */
  test.use({ storageState: { cookies: [], origins: [] } })

  test('aparece uma vez, passa pelos 4 balões e volta pelas Configurações', async ({ page }) => {
    await entrarComo(page, 2, 'freelancer')
    await page.goto('/freelancer')
    const tour = page.getByRole('dialog', { name: 'Seu castelo' })
    await expect(tour).toBeVisible()
    await expect(page.getByText('1 de 4')).toBeVisible()
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(page.getByRole('dialog', { name: 'Noite ou pôr do sol' })).toBeVisible()
    await page.getByRole('button', { name: 'Começar' }).click()
    await expect(page.getByRole('dialog', { name: 'Noite ou pôr do sol' })).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Encontre projetos' })).toBeVisible()
    await expect(tour).toHaveCount(0)
    await page.goto('/freelancer/configuracoes')
    await page.getByRole('button', { name: 'Rever o tour' }).click()
    await expect(tour).toBeVisible()
  })
})
