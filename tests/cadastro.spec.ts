import { expect, test } from '@playwright/test'

/* Cadastro: cada campo confere o que foi digitado antes de enviar */

test.beforeEach(async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByRole('button', { name: 'Contratante' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
})

test('dá para trocar o perfil dentro do formulário', async ({ page }) => {
  const perfil = page.getByLabel('Você vai usar o ContrateJá como')
  await expect(perfil).toHaveValue('contratante')
  await expect(perfil).toBeEnabled()
  await perfil.selectOption('freelancer')
  await expect(page.getByRole('button', { name: 'Criar conta de freelancer' })).toBeVisible()
})

test('CPF e telefone de mentira são recusados; os de verdade ganham o ok', async ({ page }) => {
  const cpf = page.getByLabel('CPF')
  await cpf.fill('111.111.111-11')
  await cpf.blur()
  await expect(cpf).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Este CPF não existe. Confira os números.')).toBeVisible()
  await cpf.fill('52998224725')
  await expect(cpf).toHaveValue('529.982.247-25')
  await expect(page.getByText('CPF válido')).toBeVisible()

  const tel = page.getByLabel('Telefone')
  await tel.fill('20912345678')
  await tel.blur()
  await expect(page.getByText('O DDD 20 não existe.')).toBeVisible()
  await tel.fill('11812345678')
  await expect(page.getByText('Celular com 11 números começa com 9 depois do DDD.')).toBeVisible()
  await tel.fill('24999990000')
  await expect(page.getByText('Celular de RJ')).toBeVisible()
})

test('a cidade precisa existir no estado escolhido e vira o nome oficial', async ({ page }) => {
  const cidade = page.getByLabel('Cidade', { exact: true })
  await expect(cidade).toBeDisabled()
  await page.getByLabel('Estado').selectOption('SP')

  await cidade.fill('Cidade Inventada')
  await cidade.blur()
  await expect(page.getByText('Não achamos "Cidade Inventada" em SP. Escolha uma cidade da lista.')).toBeVisible()

  await cidade.fill('sao jose dos campos')
  await cidade.blur()
  await expect(cidade).toHaveValue('São José dos Campos')
  await expect(page.getByText('São José dos Campos/SP')).toBeVisible()

  /* Trocar o estado volta a conferir */
  await page.getByLabel('Estado').selectOption('RJ')
  await expect(page.getByText('Não achamos "São José dos Campos" em RJ. Escolha uma cidade da lista.')).toBeVisible()
})

test('enviar com problemas marca os campos e leva ao primeiro', async ({ page }) => {
  await page.getByLabel('Primeiro nome').fill('Ana')
  await page.getByRole('button', { name: 'Criar conta de contratante' }).click()
  await expect(page.getByRole('alert')).toHaveText('Confira os campos marcados em vermelho.')
  await expect(page.getByLabel('Sobrenome')).toBeFocused()
  await expect(page.getByText('Informe o sobrenome.')).toBeVisible()
  await expect(page.getByText('É preciso aceitar os Termos para criar a conta.')).toBeVisible()
})

test('senha: força, senha fácil e confirmação', async ({ page }) => {
  const senha = page.getByLabel('Senha', { exact: true })
  await senha.fill('123456')
  await senha.blur()
  await expect(page.getByText('Essa senha é muito fácil de adivinhar. Escolha outra.')).toBeVisible()
  await senha.fill('Castelo-Roxo-7')
  await expect(page.getByText('Força da senha: Forte')).toBeVisible()
  await page.getByLabel('Confirmar senha').fill('Castelo-Roxo-8')
  await page.getByLabel('Confirmar senha').blur()
  await expect(page.getByText('As senhas não são iguais.')).toBeVisible()
  await page.getByLabel('Confirmar senha').fill('Castelo-Roxo-7')
  await expect(page.getByText('As senhas conferem')).toBeVisible()
})

test('menores de 18 anos não passam', async ({ page }) => {
  const data = page.getByLabel('Data de nascimento')
  const ano = new Date().getFullYear() - 10
  await data.fill(`${ano}-01-15`)
  await data.blur()
  await expect(page.getByText('É preciso ter 18 anos ou mais para usar o ContrateJá.')).toBeVisible()
})

test.describe('Perfil (modo demonstração)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('teste-pronto')) return
      sessionStorage.setItem('teste-pronto', '1')
      localStorage.setItem('demo', '1')
      localStorage.setItem('token', 'demo.' + btoa(JSON.stringify({ id: 2, tipo: 'freelancer' })) + '.demo')
      localStorage.setItem('tipo', 'freelancer')
      localStorage.setItem('contrateja:role', 'freelancer')
      localStorage.setItem('preferencias', JSON.stringify({ tema: 'escuro', transicao: false, animacoes: false }))
    })
  })

  test('editar a cidade também confere se ela existe', async ({ page }) => {
    await page.goto('/freelancer/perfil')
    await page.getByRole('button', { name: 'Editar perfil' }).click()
    const cidade = page.getByLabel('Cidade', { exact: true })
    await cidade.fill('Lugar Nenhum')
    await page.getByRole('button', { name: 'Salvar perfil' }).click()
    await expect(page.getByText('Não achamos "Lugar Nenhum" em RJ. Escolha uma cidade da lista.')).toBeVisible()
    await cidade.fill('barra mansa')
    await cidade.blur()
    await expect(cidade).toHaveValue('Barra Mansa')
    await page.getByRole('button', { name: 'Salvar perfil' }).click()
    await expect(page.getByText('Perfil atualizado!')).toBeVisible()
    await expect(page.getByText('Barra Mansa - RJ')).toBeVisible()
  })

  test('trocar a senha pede a senha atual', async ({ page }) => {
    await page.goto('/freelancer/configuracoes')
    await expect(page.getByLabel('Senha atual')).toBeVisible()
    await page.getByLabel('Nova senha', { exact: true }).fill('123456')
    await page.getByLabel('Confirmar nova senha').fill('123456')
    await page.getByLabel('Senha atual').fill('qualquer-uma')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(page.getByText('Essa senha é muito fácil de adivinhar. Escolha outra.')).toBeVisible()
  })
})
