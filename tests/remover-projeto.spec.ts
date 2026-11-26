import { expect, test, type Page } from '@playwright/test'

/* O contratante exclui (ninguém se candidatou) ou cancela (já tem candidatos) o próprio projeto, no modo demonstração */

type Papel = 'freelancer' | 'contratante' | 'administrador'

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

/* Estado do modo demonstração (fica no sessionStorage) */
async function estadoDemo(page: Page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('demo:estado') ?? '{}'))
}

test('projeto sem candidatos: o dono exclui de vez e ele some do painel', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/projetos/109')

  const cartao = page.getByRole('region', { name: 'Gerenciar projeto' })
  await expect(cartao).toContainText('Ninguém se candidatou ainda')
  await cartao.getByRole('button', { name: 'Excluir projeto' }).click()

  const janela = page.getByRole('dialog', { name: 'Excluir projeto?' })
  await expect(janela).toBeVisible()
  await expect(janela).toContainText('Montar prateleiras da loja')
  await expect(janela).toContainText('não dá para desfazer')

  /* Voltar fecha sem apagar nada */
  await janela.getByRole('button', { name: 'Voltar' }).click()
  await expect(janela).toBeHidden()

  await cartao.getByRole('button', { name: 'Excluir projeto' }).click()
  await janela.getByRole('button', { name: 'Sim, excluir' }).click()

  await expect(page).toHaveURL(/\/contratante$/)
  await expect(page.getByText('Projeto excluído.')).toBeVisible()
  await expect(page.getByText('Montar prateleiras da loja')).toHaveCount(0)

  const estado = await estadoDemo(page)
  expect(estado.servicos.some((s: { serv_id: number }) => s.serv_id === 109)).toBe(false)
})

test('projeto com candidato: só dá para cancelar, e o candidato é avisado com o motivo', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/projetos/101')

  const cartao = page.getByRole('region', { name: 'Gerenciar projeto' })
  await expect(cartao).toContainText('1 pessoa já se candidatou')
  await expect(cartao.getByRole('button', { name: 'Excluir projeto' })).toHaveCount(0)
  await cartao.getByRole('button', { name: 'Cancelar projeto' }).click()

  const janela = page.getByRole('dialog', { name: 'Cancelar projeto?' })
  await expect(janela).toContainText('o candidato é avisado')
  await janela.getByLabel(/Motivo/).fill('O orçamento mudou.')
  await janela.getByRole('button', { name: 'Sim, cancelar' }).click()

  await expect(page).toHaveURL(/\/contratante$/)
  await expect(page.getByText('Projeto cancelado. O candidato foi avisado.')).toBeVisible()

  const estado = await estadoDemo(page)
  const projeto = estado.servicos.find((s: { serv_id: number }) => s.serv_id === 101)
  expect(projeto.serv_status).toBe('cancelado')
  const candidatura = estado.candidaturas.find((c: { cand_id: number }) => c.cand_id === 201)
  expect(candidatura.cand_status).toBe('recusada')
  const aviso = estado.notificacoes.find((n: { usu_id: number; not_titulo: string }) => n.usu_id === 4 && n.not_titulo === 'Projeto cancelado')
  expect(aviso.not_desc).toContain('O orçamento mudou.')
})

test('rascunho: excluir direto da tela de edição', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/criar-projeto?id=105')

  const cartao = page.getByRole('region', { name: 'Gerenciar rascunho' })
  await cartao.getByRole('button', { name: 'Excluir rascunho' }).click()
  await page.getByRole('dialog', { name: 'Excluir rascunho?' }).getByRole('button', { name: 'Sim, excluir' }).click()

  await expect(page).toHaveURL(/\/contratante$/)
  await expect(page.getByText('Rascunho excluído.')).toBeVisible()
  const estado = await estadoDemo(page)
  expect(estado.servicos.some((s: { serv_id: number }) => s.serv_id === 105)).toBe(false)
})

test('projeto em andamento: sem botão, só a explicação', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/projetos/102')

  const cartao = page.getByRole('region', { name: 'Gerenciar projeto' })
  await expect(cartao).toContainText('já está em andamento')
  await expect(cartao.getByRole('button')).toHaveCount(0)
})

test('freelancer não vê o cartão de gerenciar', async ({ page }) => {
  await entrarComo(page, 4, 'freelancer')
  await page.goto('/freelancer/projetos/109')
  await expect(page.getByRole('heading', { name: 'Montar prateleiras da loja' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Gerenciar projeto' })).toHaveCount(0)
})
