import { expect, test, type Page } from '@playwright/test'

/* As 13 melhorias desta rodada, no modo demonstração (mesmas regras do servidor) */

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

const cartao = (page: Page, titulo: string) => page.locator('article').filter({ has: page.getByRole('heading', { name: titulo }) })

test.describe('Histórico', () => {
  test('selo de avaliação pendente aparece no menu ao finalizar um projeto', async ({ page }) => {
    await entrarComo(page, 3, 'contratante')
    await page.goto('/contratante/historico')
    const menu = page.getByRole('navigation', { name: 'Menu principal' })
    await expect(menu.getByLabel(/avaliaç/)).toHaveCount(0)
    await page.getByRole('button', { name: /finalizar projeto/i }).first().click()
    await page.getByRole('button', { name: 'Confirmar: trabalho entregue?' }).click()
    await expect(menu.getByLabel('1 avaliação pendente')).toHaveText('1')
  })

  test('abas e busca filtram a lista', async ({ page }) => {
    await entrarComo(page, 3, 'contratante')
    await page.goto('/contratante/historico')
    /* Criação de website, Suporte técnico (por hora), Logo e Formatar o computador */
    await expect(page.locator('article')).toHaveCount(4)
    await page.getByRole('tab', { name: /Concluídos/ }).click()
    await expect(page.locator('article')).toHaveCount(2)
    await page.getByRole('searchbox', { name: 'Buscar no histórico' }).fill('logo')
    await expect(page.locator('article')).toHaveCount(1)
    await page.getByRole('searchbox', { name: 'Buscar no histórico' }).fill('nada disso')
    await expect(page.getByText('Nada encontrado')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page.locator('article')).toHaveCount(3)
  })

  test('linha do tempo mostra as etapas e a da vez', async ({ page }) => {
    await entrarComo(page, 3, 'contratante')
    await page.goto('/contratante/historico')
    const andamento = cartao(page, 'Criação de website').getByRole('list', { name: 'Andamento do projeto' })
    await expect(andamento.getByRole('listitem')).toHaveText([/Publicado/, /Contratado/, /Entregue/, /Concluído/])
    /* Ainda não entregue: "Entregue" é a etapa atual */
    await expect(andamento.locator('[aria-current="step"]')).toContainText('Entregue')
    const pronto = cartao(page, 'Logo para loja de cartas').getByRole('list', { name: 'Andamento do projeto' })
    await expect(pronto.locator('[aria-current="step"]')).toHaveCount(0)
  })

  test('contratante cria etapa e freelancer marca como feita', async ({ page }) => {
    await entrarComo(page, 3, 'contratante')
    await page.goto('/contratante/historico')
    const site = cartao(page, 'Criação de website')
    await site.getByLabel('Nome da nova etapa').fill('Testes finais')
    await site.getByRole('button', { name: 'Adicionar' }).click()
    await expect(site.getByText('Testes finais')).toBeVisible()
    await expect(site.getByText('1 de 4 · 25%')).toBeVisible()

    /* Troca para a Ana, que é a freelancer do projeto */
    await page.evaluate(() => {
      localStorage.setItem('token', 'demo.' + btoa(JSON.stringify({ id: 2, tipo: 'freelancer' })) + '.demo')
      localStorage.setItem('tipo', 'freelancer')
      localStorage.setItem('contrateja:role', 'freelancer')
    })
    await page.goto('/freelancer/historico')
    const doFree = cartao(page, 'Criação de website')
    await doFree.getByRole('checkbox', { name: /Carrinho de compras/ }).click()
    await expect(doFree.getByRole('checkbox', { name: /Carrinho de compras/ })).toHaveAttribute('aria-checked', 'true')
    await expect(doFree.getByText('2 de 4 · 50%')).toBeVisible()
    /* Freelancer não cria nem apaga etapas */
    await expect(doFree.getByLabel('Nome da nova etapa')).toHaveCount(0)
  })
})

test.describe('Perfil público e páginas abertas', () => {
  test('perfil público abre sem login e mostra portfólio e insígnias', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('demo', '1'))
    await page.goto('/p/2-ana-freelancer')
    await expect(page.getByRole('heading', { name: 'Ana Freelancer', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Portfólio' })).toBeVisible()
    await expect(page.locator('article strong', { hasText: 'Loja de cartas' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Criar conta grátis' })).toBeVisible()
    /* Contratante não tem perfil público */
    await page.goto('/p/3')
    await expect(page.getByText('Perfil não encontrado.')).toBeVisible()
  })

  test('freelancer compartilha o próprio perfil', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await entrarComo(page, 2, 'freelancer')
    await page.goto('/freelancer/perfil')
    await page.getByRole('button', { name: 'Compartilhar perfil' }).click()
    await expect(page.getByText('Link do seu perfil público copiado!')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/p\/2-ana-freelancer$/)
  })

  test('página Sobre o projeto', async ({ page }) => {
    await page.goto('/sobre')
    await expect(page.getByRole('heading', { name: 'Sobre o ContrateJá' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tecnologias' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sobre o projeto' })).toBeVisible()
  })

  test('link compartilhado tem prévia (Open Graph)', async ({ page }) => {
    const html = await (await page.request.get('/')).text()
    expect(html).toContain('property="og:image"')
    expect(html).toContain('og-imagem.png')
    expect((await page.request.get('/og-imagem.png')).ok()).toBe(true)
  })
})

test.describe('Projetos e candidaturas', () => {
  test('recomendados recentes ganham o selo Novo', async ({ page }) => {
    await entrarComo(page, 2, 'freelancer')
    await page.goto('/freelancer')
    const secao = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Combina com você' }) })
    await expect(secao.locator('article').filter({ hasText: 'Site para cafeteria' }).getByText('Novo')).toBeVisible()
    await expect(secao.locator('article').filter({ hasText: 'pokemon cartas' }).getByText('Novo')).toHaveCount(0)
  })

  test('freelancer manda contraproposta', async ({ page }) => {
    await entrarComo(page, 2, 'freelancer')
    await page.goto('/freelancer/projetos/109')
    await page.getByRole('button', { name: 'Propor outro valor ou prazo' }).click()
    await page.getByLabel('Valor por hora (R$)').fill('40')
    await page.getByLabel('Prazo (dias)').fill('8')
    await page.getByLabel(/Recado para o contratante/).fill('Levo as ferramentas.')
    await page.getByRole('button', { name: 'Candidatar-se com a contraproposta' }).click()
    await expect(page.getByText(/Sua contraproposta:\s*R\$\s*40,00 · 8 dias/)).toBeVisible()
  })

  test('contratante aceita a contraproposta e o projeto passa a valer o combinado', async ({ page }) => {
    await entrarComo(page, 3, 'contratante')
    await page.goto('/contratante/candidatos')
    const bruno = page.locator('article').filter({ hasText: 'Bruno Silva' }).filter({ hasText: 'Contraproposta' })
    await expect(bruno.getByText('Consigo os pacotes raros em 10 dias')).toBeVisible()
    await bruno.getByRole('button', { name: 'Aceitar contraproposta' }).click()
    await expect(page.getByText('Bruno foi contratado!')).toBeVisible()
    await page.goto('/contratante/historico')
    await expect(cartao(page, 'pokemon cartas').getByText('R$ 25,00')).toBeVisible()
  })

  test('alertas de busca: cria e apaga', async ({ page }) => {
    await entrarComo(page, 2, 'freelancer')
    await page.goto('/freelancer')
    const alertas = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Alertas de projetos' }) })
    await expect(alertas.getByText('“cafeteria”')).toBeVisible()
    await alertas.getByLabel('Palavra').fill('prateleira')
    await alertas.getByLabel('Categoria').selectOption({ label: 'Manutenção' })
    await alertas.getByRole('button', { name: 'Criar alerta' }).click()
    await expect(alertas.getByText('“prateleira” · Manutenção')).toBeVisible()
    await alertas.getByRole('button', { name: /Apagar o alerta “prateleira”/ }).click()
    await expect(alertas.getByText('“prateleira” · Manutenção')).toHaveCount(0)
  })
})

test('chat envia e baixa PDF', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/mensagens')
  await page.getByText('Lucas Contratante').first().click()
  await page.getByLabel('Mandar PDF').setInputFiles({ name: 'orcamento.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%teste\n') })
  await expect(page.getByText(/orcamento\.pdf · 1 KB/)).toBeVisible()
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  const anexo = page.getByRole('button', { name: 'Baixar orcamento.pdf' })
  await expect(anexo).toBeEnabled()
  const download = page.waitForEvent('download')
  await anexo.click()
  expect((await download).suggestedFilename()).toBe('orcamento.pdf')
})

test('admin vê as métricas e a versão em tabela', async ({ page }) => {
  await entrarComo(page, 1, 'administrador')
  await page.goto('/administrador')
  await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Taxa de conclusão' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Cadastros por semana' }).getByRole('listitem')).toHaveCount(8)
  await page.getByRole('button', { name: 'Ver como tabela' }).click()
  await expect(page.getByRole('table', { name: 'Projetos publicados por categoria' })).toBeVisible()
})

test('clima "Estação" nas Configurações', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/configuracoes')
  const estacao = page.getByRole('group', { name: 'Clima' }).getByRole('button', { name: 'Estação' })
  await estacao.click()
  await expect(estacao).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('preferencias') ?? '{}').clima)).toBe('estacao')
})
