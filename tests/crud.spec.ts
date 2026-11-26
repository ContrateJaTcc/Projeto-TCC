import { expect, test, type Page } from '@playwright/test'

/* CRUD completo: o que faltava de criar, ler, editar e apagar em cada parte do site (modo demonstração) */

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

async function trocarPara(page: Page, id: number, tipo: Papel, caminho: string) {
  await page.evaluate(
    ({ id, tipo }) => {
      localStorage.setItem('token', 'demo.' + btoa(JSON.stringify({ id, tipo })) + '.demo')
      localStorage.setItem('tipo', tipo)
      localStorage.setItem('contrateja:role', tipo)
    },
    { id, tipo }
  )
  await page.goto(caminho)
}

/* Estado do modo demonstração (fica no sessionStorage) */
const estadoDemo = (page: Page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('demo:estado') ?? '{}'))

const cartao = (page: Page, titulo: string) => page.locator('article').filter({ has: page.getByRole('heading', { name: titulo }) })

test('1. categorias: o admin cria, renomeia, desativa e exclui; com projetos só desativa', async ({ page }) => {
  await entrarComo(page, 1, 'administrador')
  await page.goto('/administrador')
  await page.getByRole('tab', { name: 'Categorias' }).click()

  const lista = page.getByRole('list', { name: 'Categorias' })
  /* "Outros" tem projetos: não aparece o botão de excluir */
  const outros = lista.getByRole('listitem').filter({ hasText: 'Outros' })
  await expect(outros).toContainText('projetos')
  await expect(outros.getByRole('button', { name: /Excluir/ })).toHaveCount(0)

  await page.getByLabel('Nome', { exact: true }).fill('Fotografia')
  await page.getByLabel('Descrição (opcional)').fill('Ensaios e fotos de produto')
  await page.getByRole('button', { name: 'Criar categoria' }).click()
  await expect(page.getByText('Categoria "Fotografia" criada.')).toBeVisible()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('')

  /* Nome repetido é recusado */
  await page.getByLabel('Nome', { exact: true }).fill('fotografia')
  await page.getByRole('button', { name: 'Criar categoria' }).click()
  await expect(page.getByText('Já existe a categoria "Fotografia".')).toBeVisible()

  const foto = lista.getByRole('listitem').filter({ hasText: 'Fotografia' })
  await foto.getByRole('button', { name: 'Editar Fotografia' }).click()
  /* Na edição o nome fica dentro do campo: usa os controles da edição direto */
  await lista.getByLabel('Nome').fill('Fotografia e vídeo')
  await lista.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Categoria atualizada.')).toBeVisible()

  const fotoVideo = lista.getByRole('listitem').filter({ hasText: 'Fotografia e vídeo' })
  await fotoVideo.getByRole('button', { name: 'Desativar' }).click()
  await expect(fotoVideo.getByText('Desativada')).toBeVisible()

  /* Desativada some do formulário de projeto */
  let estado = await estadoDemo(page)
  expect(estado.tipos.find((t: { tipo_nome: string }) => t.tipo_nome === 'Fotografia e vídeo').ativo).toBe(false)

  await fotoVideo.getByRole('button', { name: 'Excluir' }).click()
  await fotoVideo.getByRole('button', { name: 'Clique de novo para excluir' }).click()
  await expect(page.getByText('Categoria "Fotografia e vídeo" excluída.')).toBeVisible()
  estado = await estadoDemo(page)
  expect(estado.tipos.some((t: { tipo_nome: string }) => t.tipo_nome.startsWith('Fotografia'))).toBe(false)
})

test('1b. categoria desativada não aparece para quem cria projeto', async ({ page }) => {
  await entrarComo(page, 1, 'administrador')
  await page.goto('/administrador')
  await page.getByRole('tab', { name: 'Categorias' }).click()
  await page.getByRole('list', { name: 'Categorias' }).getByRole('listitem').filter({ hasText: 'Aulas Particulares' }).getByRole('button', { name: 'Desativar' }).click()
  await expect(page.getByText(/desativada: some dos formulários/)).toBeVisible()

  await trocarPara(page, 3, 'contratante', '/contratante/criar-projeto')
  const categoria = page.getByLabel(/Categoria/).first()
  await expect(categoria.locator('option', { hasText: 'Desenvolvimento Web' })).toHaveCount(1)
  await expect(categoria.locator('option', { hasText: 'Aulas Particulares' })).toHaveCount(0)
})

test('2. notificações: marcar uma como lida e não lida, apagar e limpar as lidas', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante')
  await page.getByRole('button', { name: /^Notificações/ }).click()
  const sino = page.getByRole('dialog', { name: 'Notificações' })
  const aviso = sino.getByRole('listitem').filter({ hasText: 'Bruno Silva se candidatou a "pokemon cartas".' })

  /* Abrir não marca nada sozinho */
  await aviso.getByRole('button', { name: 'Marcar "Nova candidatura" como lida' }).click()
  await expect(aviso.getByRole('button', { name: 'Marcar "Nova candidatura" como não lida' })).toBeVisible()
  await expect.poll(async () => (await estadoDemo(page)).notificacoes.find((n: { not_id: number }) => n.not_id === 502).not_lida).toBe(true)

  await aviso.getByRole('button', { name: 'Marcar "Nova candidatura" como não lida' }).click()
  await expect(aviso.getByRole('button', { name: 'Marcar "Nova candidatura" como lida' })).toBeVisible()

  await sino.getByRole('button', { name: 'Marcar todas como lidas' }).click()
  await sino.getByRole('button', { name: 'Limpar lidas' }).click()
  await expect(page.getByText(/notificaç(ão|ões) apagada/)).toBeVisible()
  const estado = await estadoDemo(page)
  /* O aviso lido saiu (avisos novos, como uma conquista secreta, podem chegar depois) */
  expect(estado.notificacoes.some((n: { not_id: number }) => n.not_id === 502)).toBe(false)
})

test('2b. notificações: apagar só uma', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante')
  await page.getByRole('button', { name: /^Notificações/ }).click()
  const sino = page.getByRole('dialog', { name: 'Notificações' })
  await sino.getByRole('button', { name: 'Apagar "Nova candidatura"' }).click()
  await expect(sino.getByText('Bruno Silva se candidatou a "pokemon cartas".')).toHaveCount(0)
  await expect.poll(async () => (await estadoDemo(page)).notificacoes.some((n: { not_id: number }) => n.not_id === 502)).toBe(false)
})

test('3. candidatura: o freelancer edita valor, prazo e recado e o contratante é avisado', async ({ page }) => {
  await entrarComo(page, 4, 'freelancer')
  await page.goto('/freelancer/projetos/101')
  await page.getByRole('button', { name: 'Editar candidatura' }).click()
  await expect(page.getByLabel('Valor (R$)')).toHaveValue('25')
  await page.getByLabel('Valor (R$)').fill('22')
  await page.getByLabel('Prazo (dias)').fill('8')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Candidatura atualizada. O contratante foi avisado.')).toBeVisible()
  await expect(page.getByText(/Sua contraproposta: R\$\s?22,00 · 8 dias/)).toBeVisible()

  const estado = await estadoDemo(page)
  const cand = estado.candidaturas.find((c: { cand_id: number }) => c.cand_id === 201)
  expect(cand.cand_valor_proposto).toBe(22)
  expect(cand.cand_prazo_proposto).toBe(8)
  expect(estado.notificacoes.some((n: { usu_id: number; not_titulo: string }) => n.usu_id === 3 && n.not_titulo === 'Candidatura atualizada')).toBe(true)
})

test('4. convite: o contratante retira o que ainda não foi respondido', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/freelancer/2')
  await page.getByRole('button', { name: 'Retirar o convite para Revisão do catálogo' }).click()
  await page.getByRole('button', { name: 'Confirmar: retirar o convite para Revisão do catálogo' }).click()
  await expect(page.getByText('Convite retirado.')).toBeVisible()
  /* O projeto volta a dar para convidar */
  await expect(page.getByLabel('Projeto').locator('option', { hasText: 'Revisão do catálogo' })).toHaveCount(1)

  const estado = await estadoDemo(page)
  expect(estado.convites.some((c: { conv_id: number }) => c.conv_id === 301)).toBe(false)
  expect(estado.notificacoes.some((n: { usu_id: number; not_titulo: string }) => n.usu_id === 2 && n.not_titulo === 'Convite retirado')).toBe(true)
})

test('5. chat: editar e apagar a própria mensagem', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/mensagens')
  await page.getByText('Lucas Contratante').first().click()
  await page.getByPlaceholder('Escreva sua mensagem...').fill('O carinho fica pronto amanhã')
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()

  await page.getByRole('button', { name: 'Editar: O carinho fica pronto amanhã' }).click()
  await page.getByLabel('Editar mensagem').fill('O carrinho fica pronto amanhã')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('O carrinho fica pronto amanhã')).toBeVisible()
  await expect(page.getByText(/ · editada/)).toBeVisible()

  /* Mensagem dos outros não tem editar nem apagar */
  await expect(page.getByRole('button', { name: /^Editar: Perfeito, obrigado!/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Apagar: O carrinho fica pronto amanhã' }).click()
  await page.getByRole('button', { name: 'Confirmar: apagar a mensagem' }).click()
  await expect(page.getByText('Você apagou esta mensagem')).toBeVisible()

  const estado = await estadoDemo(page)
  const minha = estado.mensagens.filter((m: { usu_remetente: number }) => m.usu_remetente === 2).at(-1)
  expect(minha.msg_texto).toBe('')
  expect(minha.msg_apagada_em).toBeTruthy()

  /* Do outro lado aparece "Mensagem apagada" */
  await trocarPara(page, 3, 'contratante', '/contratante/mensagens')
  await page.getByText('Ana Freelancer').first().click()
  await expect(page.getByText('Mensagem apagada', { exact: true })).toBeVisible()
})

test('6. avaliações: corrigir e apagar a que ainda está às cegas', async ({ page }) => {
  await entrarComo(page, 8, 'contratante')
  await page.goto('/contratante/avaliacoes')
  const minhas = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Avaliações que você fez' }) })
  const daAna = minhas.getByRole('article', { name: 'Sua avaliação de Ana Freelancer' }).first()
  await expect(daAna).toContainText('Às cegas')

  const xpAntes = (await estadoDemo(page)).usuarios.find((u: { usu_id: number }) => u.usu_id === 2).free_xp
  await daAna.getByRole('button', { name: 'Corrigir' }).click()
  await daAna.getByRole('button', { name: '3 estrelas' }).click()
  await daAna.getByRole('button', { name: 'Salvar correção' }).click()
  await expect(page.getByText('Avaliação corrigida. Ela continua às cegas até a outra pessoa avaliar.')).toBeVisible()
  await expect(daAna.getByText('corrigida')).toBeVisible()

  let estado = await estadoDemo(page)
  const aval = estado.avaliacoes.find((a: { usu_avaliador: number; serv_id: number }) => a.usu_avaliador === 8 && a.serv_id === 115)
  expect(aval.aval_nota).toBe(3)
  /* O XP da Ana acompanha a nota nova (20 por estrela) */
  const notaAntes = 5
  expect(estado.usuarios.find((u: { usu_id: number }) => u.usu_id === 2).free_xp).toBe(xpAntes + (3 - notaAntes) * 20)

  await daAna.getByRole('button', { name: 'Apagar' }).click()
  await daAna.getByRole('button', { name: 'Clique de novo para apagar' }).click()
  await expect(page.getByText(/Avaliação apagada/)).toBeVisible()
  estado = await estadoDemo(page)
  expect(estado.avaliacoes.some((a: { usu_avaliador: number; serv_id: number }) => a.usu_avaliador === 8 && a.serv_id === 115)).toBe(false)
  /* Volta para as pendentes */
  await expect(page.getByText('Como foi trabalhar com').first()).toBeVisible()
})

test('7. alerta de busca: editar a palavra e o valor mínimo', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer')
  const alertas = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Alertas de projetos' }) })
  await alertas.getByRole('button', { name: /Editar o alerta “cafeteria”/ }).click()
  await expect(alertas.getByLabel('Palavra')).toHaveValue('cafeteria')
  await alertas.getByLabel('Palavra').fill('padaria')
  await alertas.getByLabel('Pagando a partir de (R$)').fill('400')
  await alertas.getByRole('button', { name: 'Salvar alerta' }).click()
  await expect(page.getByText('Alerta atualizado.')).toBeVisible()
  await expect(alertas.getByText(/“padaria”.*a partir de R\$\s?400,00/)).toBeVisible()
  await expect(alertas.getByText('“cafeteria”')).toHaveCount(0)
})

test('8. critério de aceite: o contratante corrige o texto e o "entregue" volta a zero', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/historico')
  const site = cartao(page, 'Criação de website')
  await site.getByRole('button', { name: 'Editar o critério Compra de ponta a ponta funcionando' }).click()
  await site.getByLabel('Texto do critério').fill('Compra com Pix e cartão funcionando')
  await site.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(site.getByText('Compra com Pix e cartão funcionando')).toBeVisible()

  const estado = await estadoDemo(page)
  const cri = estado.criterios.find((c: { cri_id: number }) => c.cri_id === 1702)
  expect(cri.cri_texto).toBe('Compra com Pix e cartão funcionando')
  expect(cri.cri_entregue_em).toBeNull()
  /* Critério aprovado não tem editar */
  await expect(site.getByRole('button', { name: /Editar o critério Página inicial/ })).toHaveCount(0)
})

test('9. etapas: o contratante renomeia e muda a ordem', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/historico')
  const site = cartao(page, 'Criação de website')
  const etapas = site.getByRole('region', { name: 'Etapas do projeto' })
  const nomes = () => etapas.locator('li').allInnerTexts()

  await expect(etapas.locator('li').nth(1)).toBeVisible()
  const antes = await nomes()
  const segunda = antes[1].split('\n')[0].trim()
  await etapas.getByRole('button', { name: `Subir a etapa ${segunda}` }).click()
  await expect.poll(async () => (await nomes())[0]).toContain(segunda)

  await etapas.getByRole('button', { name: `Renomear a etapa ${segunda}` }).click()
  await etapas.getByLabel(`Novo nome da etapa ${segunda}`).fill('Primeira etapa renomeada')
  await etapas.getByRole('button', { name: 'Salvar o nome' }).click()
  await expect(etapas.getByText('Primeira etapa renomeada')).toBeVisible()
})

test('10. horas: o freelancer corrige um registro que espera aprovação', async ({ page }) => {
  await entrarComo(page, 4, 'freelancer')
  await page.goto('/freelancer/historico')
  const horas = page.getByRole('region', { name: 'Horas trabalhadas' })
  await horas.getByRole('button', { name: 'Corrigir este registro' }).click()
  await horas.getByLabel('Minutos').last().fill('75')
  await horas.getByLabel('O que foi feito').last().fill('Backup das vendas, antivírus e limpeza')
  await horas.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Registro corrigido.')).toBeVisible()
  await expect(horas.getByText(/Backup das vendas, antivírus e limpeza/)).toBeVisible()

  const estado = await estadoDemo(page)
  expect(estado.horas.find((h: { hor_id: number }) => h.hor_id === 1602).hor_minutos).toBe(75)
})

test('11. orçamento: corrigir a pergunta e apagar o pedido sem resposta; com resposta, não', async ({ page }) => {
  await entrarComo(page, 3, 'contratante')
  await page.goto('/contratante/orcamentos')
  /* O pedido que o Bruno já respondeu não tem corrigir nem apagar */
  const respondido = page.getByRole('region').filter({ hasText: 'site de 5 páginas para a loja de cartas' })
  await expect(respondido.getByRole('button', { name: /Corrigir pergunta|Apagar pedido/ })).toHaveCount(0)

  await page.getByLabel('O que você precisa?').fill('Quanto custa montar um balcão de madeira para a loja?')
  await page.getByRole('checkbox', { name: 'Bruno Silva' }).check()
  await page.getByRole('button', { name: /Mandar para/ }).click()
  await expect(page.getByText(/Pedido enviado para/)).toBeVisible()

  const novo = page.getByRole('region').filter({ hasText: 'balcão de madeira' })
  await novo.getByRole('button', { name: 'Corrigir pergunta' }).click()
  await page.getByLabel('Corrigir a pergunta').fill('Quanto custa montar um balcão e duas prateleiras de madeira?')
  await page.getByRole('button', { name: 'Salvar pergunta' }).click()
  await expect(page.getByText('Pedido atualizado.')).toBeVisible()

  const corrigido = page.getByRole('region').filter({ hasText: 'balcão e duas prateleiras' })
  await corrigido.getByRole('button', { name: 'Apagar pedido' }).click()
  await corrigido.getByRole('button', { name: 'Clique de novo para apagar' }).click()
  await expect(page.getByText('Pedido apagado.')).toBeVisible()
  await expect(page.getByText('balcão e duas prateleiras')).toHaveCount(0)
})

test('12. guilda: só a liderança dissolve, e os membros são avisados', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/guildas')
  await page.locator('li').filter({ hasText: 'Forja de Pixels' }).getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Bem-vindo à Forja de Pixels!')).toBeVisible()
  /* Membro comum não vê "Dissolver" */
  await expect(page.getByRole('button', { name: 'Dissolver a guilda' })).toHaveCount(0)

  await trocarPara(page, 4, 'freelancer', '/freelancer/guildas')
  await page.getByRole('button', { name: 'Dissolver a guilda' }).click()
  await page.getByRole('button', { name: 'Clique de novo: todos saem' }).click()
  await expect(page.getByText('A Forja de Pixels foi dissolvida.')).toBeVisible()

  const estado = await estadoDemo(page)
  expect(estado.guildas.some((g: { gui_id: number }) => g.gui_id === 1301)).toBe(false)
  expect(estado.membros.some((m: { gui_id: number }) => m.gui_id === 1301)).toBe(false)
  expect(estado.notificacoes.some((n: { usu_id: number; not_titulo: string }) => n.usu_id === 2 && n.not_titulo === 'Guilda dissolvida')).toBe(true)
})

test('13. denúncias: acompanhar nas configurações e retirar a que está em análise', async ({ page }) => {
  await entrarComo(page, 2, 'freelancer')
  await page.goto('/freelancer/projetos/107')
  await page.getByRole('button', { name: 'Denunciar projeto' }).click()
  const janela = page.getByRole('dialog', { name: 'Denunciar projeto' })
  await janela.getByLabel('Spam ou propaganda').check()
  await janela.getByRole('button', { name: 'Enviar denúncia' }).click()
  await expect(page.getByText(/Denúncia enviada/)).toBeVisible()

  await page.goto('/freelancer/configuracoes#privacidade')
  const minhas = page.getByRole('list', { name: 'Minhas denúncias' })
  const item = minhas.getByRole('listitem').filter({ hasText: 'Projeto "Site para cafeteria"' })
  await expect(item).toContainText('em análise')
  await item.getByRole('button', { name: 'Retirar a denúncia de Projeto "Site para cafeteria"' }).click()
  await item.getByRole('button', { name: /Confirmar: retirar/ }).click()
  await expect(page.getByText('Denúncia retirada.')).toBeVisible()
  await expect(minhas.getByText('Site para cafeteria')).toHaveCount(0)
})
