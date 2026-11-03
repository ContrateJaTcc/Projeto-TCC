import { expect, test, type Page } from '@playwright/test'

/* Recomendações com projetos reais e atalho para a avaliação pendente (modo demonstração) */

async function entrarComo(page: Page, id: number, tipo: 'freelancer' | 'contratante') {
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

test('"Combina com você" mostra projetos abertos de verdade', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer')
  const secao = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Combina com você' }) })
  await expect(secao).toBeVisible()
  /* Os fictícios saíram */
  await expect(secao.getByText('Landing page para loja virtual')).toHaveCount(0)

  const cards = secao.locator('article')
  expect(await cards.count()).toBeGreaterThan(0)
  expect(await cards.count()).toBeLessThanOrEqual(6)

  /* "Ver projeto" abre o projeto certo */
  const titulo = await cards.first().locator('h3').innerText()
  await cards.first().getByRole('link', { name: 'Ver projeto' }).click()
  await expect(page).toHaveURL(/\/freelancer\/projetos\/\d+$/)
  await expect(page.getByRole('heading', { name: titulo }).first()).toBeVisible()
})

test('faixa de avaliação pendente leva à página de avaliações', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/historico')
  /* Finalizar um projeto em andamento cria a avaliação pendente */
  await page.getByRole('button', { name: /finalizar projeto/i }).first().click()
  await page.getByRole('button', { name: 'Confirmar: trabalho entregue?' }).click()
  /* O formulário não fica mais dentro do histórico */
  await expect(page.getByRole('button', { name: 'Enviar avaliação' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Avaliar agora' }).click()
  await expect(page).toHaveURL(/\/contratante\/avaliacoes$/)
  await expect(page.getByRole('heading', { name: 'Avaliações pendentes' })).toBeVisible()

  const cartoes = page.locator('article')
  const antes = await cartoes.count()
  expect(antes).toBeGreaterThan(0)
  await cartoes.first().getByRole('button', { name: '5 estrelas' }).click()
  await cartoes.first().getByLabel(/Comentário/).fill('Entrega caprichada.')
  await cartoes.first().getByRole('button', { name: 'Enviar avaliação' }).click()
  await expect(page.getByText(/Avaliação de .+ enviada\./)).toBeVisible()
  await expect(cartoes).toHaveCount(antes - 1)
})
