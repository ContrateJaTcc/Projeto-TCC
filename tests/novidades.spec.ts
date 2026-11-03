import { expect, test, type Page } from '@playwright/test'

/* Entra numa conta do modo demonstração (inclusive admin comum, que não tem botão no login) */
async function entrarComo(page: Page, id: number, tipo: 'freelancer' | 'contratante' | 'administrador') {
  await page.addInitScript(
    ({ id, tipo }) => {
      if (sessionStorage.getItem('teste-pronto')) return
      sessionStorage.setItem('teste-pronto', '1')
      localStorage.setItem('demo', '1')
      localStorage.setItem('token', 'demo.' + btoa(JSON.stringify({ id, tipo })) + '.demo')
      localStorage.setItem('tipo', tipo)
      localStorage.setItem('contrateja:role', tipo)
    },
    { id, tipo }
  )
}

test.describe('Filtros de projetos', () => {
  test('filtra por cobrança e valor e ordena por maior valor', async ({ page }) => {
    await entrarComo(page, 2, 'freelancer')
    await page.goto('/freelancer')
    /* Só a lista principal (os cartões de "Projetos que você pode gostar" também levam a projetos) */
    const lista = page.locator('section', { has: page.getByRole('heading', { name: 'Encontre projetos' }) }).locator('a[href^="/freelancer/projetos/"]')
    await expect(lista.first()).toBeVisible()

    await page.getByRole('button', { name: /^Filtros/ }).click()
    await page.getByLabel('Cobrança').selectOption('hora')
    /* Só sobram os projetos cobrados por hora */
    await expect(lista).toHaveCount(2)
    await expect(lista.filter({ hasText: 'Revisão do catálogo' })).toBeVisible()
    await expect(lista.filter({ hasText: 'Montar prateleiras da loja' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Filtros (1)' })).toBeVisible()

    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await page.getByLabel('Valor mínimo (R$)').fill('100')
    await expect(lista.filter({ hasText: 'pokemon cartas' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await page.getByLabel('Ordenar por').selectOption('maior')
    /* O mais caro (o spam de R$ 9.999) vem primeiro */
    await expect(lista.first()).toContainText('Ganhe dinheiro fácil')
  })
})

test.describe('Primeiros passos', () => {
  test('resgata o XP de um passo já feito', async ({ page }) => {
    await entrarComo(page, 2, 'freelancer')
    await page.goto('/freelancer')
    const passos = page.locator('section', { has: page.getByRole('heading', { name: 'Primeiros passos' }) })
    await expect(passos).toBeVisible()

    /* Ana já tem descrição: "Conte sobre você" está pronto para resgatar */
    const sobre = passos.locator('li', { hasText: 'Conte sobre você' })
    await sobre.getByRole('button', { name: /Resgatar \+20 XP/ }).click()
    await expect(page.getByText('Passo concluído! +20 XP')).toBeVisible()
    await expect(sobre.getByRole('button', { name: /Resgatar/ })).toHaveCount(0)

    /* "Coloque uma foto" ainda não foi feito: leva ao perfil */
    await expect(passos.locator('li', { hasText: 'Coloque uma foto' }).getByRole('link', { name: /Fazer/ })).toBeVisible()
  })
})

test.describe('Denúncias', () => {
  test('o freelancer denuncia um projeto', async ({ page }) => {
    await entrarComo(page, 2, 'freelancer')
    await page.goto('/freelancer/projetos/104')
    await page.getByRole('button', { name: 'Denunciar projeto' }).click()

    const janela = page.getByRole('dialog', { name: 'Denunciar projeto' })
    await expect(janela).toBeVisible()
    await expect(janela.getByRole('button', { name: 'Enviar denúncia' })).toBeDisabled()
    await janela.getByLabel('Informações falsas').check()
    await janela.getByLabel('Conte o que aconteceu (opcional)').fill('O valor não bate com a descrição.')
    await janela.getByRole('button', { name: 'Enviar denúncia' }).click()

    await expect(page.getByText(/Denúncia enviada/)).toBeVisible()
    await expect(janela).toBeHidden()
  })

  test('o admin vê as denúncias juntas e cancela o projeto denunciado', async ({ page }) => {
    await entrarComo(page, 6, 'administrador')
    await page.goto('/administrador')
    await page.getByRole('tab', { name: 'Denúncias' }).click()

    const item = page.locator('li', { hasText: 'Ganhe dinheiro fácil' })
    /* As duas denúncias do mesmo projeto aparecem num item só */
    await expect(item.getByText('2 denúncias')).toBeVisible()
    await item.getByRole('button', { name: 'Cancelar projeto' }).click()

    await expect(page.getByText('Projeto cancelado e denúncia resolvida.')).toBeVisible()
    await expect(page.getByText('Nenhuma denúncia esperando. Tudo em ordem!')).toBeVisible()

    await page.getByRole('tab', { name: 'Resolvidas' }).click()
    await expect(page.locator('li', { hasText: 'Ganhe dinheiro fácil' })).toBeVisible()
  })
})

test.describe('Chat', () => {
  test('manda uma imagem na conversa', async ({ page }) => {
    await entrarComo(page, 2, 'freelancer')
    await page.goto('/freelancer/mensagens')
    await page.getByRole('button', { name: /Lucas Contratante Criação de website/ }).click()
    await expect(page.getByRole('dialog').getByText('Perfeito, obrigado!')).toBeVisible()

    /* Uma imagem pequena gerada na hora (PNG de 2x2) */
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyQAAAABJRU5ErkJggg==', 'base64')
    await page.getByLabel('Mandar imagem').setInputFiles({ name: 'print.png', mimeType: 'image/png', buffer: png })
    await expect(page.getByText('Imagem pronta para enviar')).toBeVisible()

    await page.getByRole('button', { name: 'Enviar' }).click()
    const foto = page.getByRole('img', { name: 'Imagem enviada na conversa' }).last()
    await expect(foto).toBeVisible()

    /* Tocar na foto abre ela grande */
    await page.getByRole('button', { name: 'Ver imagem maior' }).last().click()
    await expect(page.getByRole('dialog', { name: 'Imagem ampliada' })).toBeVisible()
  })
})
