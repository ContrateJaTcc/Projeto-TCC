import { expect, test, type Page } from '@playwright/test'

/* Home pública: depoimentos de verdade, busca e contato (no modo demonstração, que segue as mesmas regras do servidor) */

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

test('home mostra depoimentos de verdade', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/')
  await expect(page.getByText('Resolveu no mesmo dia e explicou tudo')).toBeVisible()
  /* Nome curto: primeiro nome e inicial */
  await expect(page.getByText('Lucas C.').first()).toBeVisible()
})

test('busca da home leva para a lista filtrada', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/')
  await page.getByRole('searchbox', { name: 'Procure Projetos' }).fill('cafeteria')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page).toHaveURL(/\/freelancer\?busca=cafeteria/)
})

test('formulário de contato envia de verdade', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/#contato')
  const form = page.locator('#contato form')
  await form.getByLabel('Nome').fill('Teste da Silva')
  await form.getByLabel('E-mail').fill('teste@exemplo.com')
  await form.getByLabel('Assunto').fill('Parceria')
  await form.getByLabel('Mensagem').fill('Gostaria de saber mais sobre o ContrateJá.')
  await form.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(form.getByRole('status')).toContainText('Mensagem enviada!')
  /* Os campos ficam limpos para outra mensagem */
  await expect(form.getByLabel('Nome')).toHaveValue('')
})
