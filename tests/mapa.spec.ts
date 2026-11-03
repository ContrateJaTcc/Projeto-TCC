import { expect, test, type Page } from '@playwright/test'

/* Mapa com localização real (pela cidade), no modo demonstração */

type Papel = 'freelancer' | 'contratante'

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

test('projetos no mapa: perto da minha cidade, raio maior e escolher uma cidade', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer')
  await page.getByRole('button', { name: 'Ver no mapa' }).click()
  await expect(page.getByRole('heading', { name: 'Projetos no mapa' })).toBeVisible()

  /* Ana mora em Volta Redonda: até 100 km entram Volta Redonda e Barra Mansa */
  await expect(page.getByRole('heading', { name: '3 projetos' })).toBeVisible()
  await expect(page.getByText('Barra Mansa/RJ').locator('..')).toContainText('a 9 km')
  await expect(page.getByText(/projetos remotos não aparecem no mapa/)).toBeVisible()

  /* Com 300 km chegam o Rio e São José dos Campos */
  await page.getByLabel('Até').selectOption('300')
  await expect(page.getByRole('heading', { name: '5 projetos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Fotos do cardápio' })).toBeVisible()

  /* Tocar no marcador da cidade mostra só os projetos dela */
  await page.getByTitle('Rio de Janeiro/RJ: 1 projeto').click()
  await expect(page.getByRole('heading', { name: 'Rio de Janeiro/RJ' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Site para cafeteria' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver todas as cidades' }).click()
  await expect(page.getByRole('heading', { name: '5 projetos' })).toBeVisible()
})

test('freelancers no mapa: tocar numa cidade filtra a lista', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/freelancers')
  await page.getByRole('button', { name: 'Mapa' }).click()
  await expect(page.getByTitle('Resende/RJ: 1 freelancer')).toBeVisible()
  await page.getByTitle('Resende/RJ: 1 freelancer').click()
  await expect(page.getByText('1 profissional encontrado')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Carla Souza' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bruno Silva' })).toHaveCount(0)
})

test('detalhe do projeto: mapinha só nos presenciais e híbridos', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/projetos/107')
  await expect(page.getByRole('region', { name: 'Mapa de Volta Redonda/RJ, a cidade do projeto' })).toBeVisible()
  await page.goto('/freelancer/projetos/101')
  await expect(page.getByRole('heading', { name: 'pokemon cartas' })).toBeVisible()
  await expect(page.getByRole('region', { name: /a cidade do projeto/ })).toHaveCount(0)
})
