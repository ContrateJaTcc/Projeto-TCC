/*
 * Modo apresentação (só no modo demonstração): um roteiro que passa pelas telas principais,
 * troca entre freelancer e contratante sozinho e, no fim, volta os dados de exemplo ao começo.
 * Abre pelas Configurações ou com Ctrl+Shift+A.
 */
export const EVENTO_APRESENTACAO = 'abrir-apresentacao'
export const CHAVE_APRESENTACAO = 'apresentacao:passo'

export const abrirApresentacao = () => window.dispatchEvent(new Event(EVENTO_APRESENTACAO))

export interface PassoApresentacao {
  papel: 'freelancer' | 'contratante'
  rota: string
  titulo: string
  texto: string
}

export const ROTEIRO: PassoApresentacao[] = [
  { papel: 'freelancer', rota: '/freelancer', titulo: 'O painel do freelancer', texto: 'A Ana procura projetos: filtra por categoria, ordena por valor ou prazo, salva os que gostou e cria alertas de busca. Repare nas abóboras: é o evento de Halloween.' },
  { papel: 'freelancer', rota: '/freelancer/projetos/104', titulo: 'Detalhe do projeto', texto: 'Prazo para se candidatar, nota do contratante e projetos parecidos. Dá para se candidatar com outro valor ou prazo (contraproposta).' },
  { papel: 'freelancer', rota: '/freelancer/mensagens', titulo: 'Chat do projeto', texto: 'Respostas rápidas, foto e PDF, "Visto" e "digitando...". O botão da moeda manda uma proposta de valor e prazo que a outra pessoa aceita ali mesmo.' },
  { papel: 'freelancer', rota: '/freelancer/entregues', titulo: 'Trabalho em andamento', texto: 'Linha do tempo, etapas, prazo, termo de acordo e o pagamento guardado na garantia (uma simulação: nenhum dinheiro real).' },
  { papel: 'freelancer', rota: '/freelancer/acordo/102', titulo: 'Termo de acordo', texto: 'Gerado sozinho com o combinado: partes, escopo, valor, prazo e o que fazer se der errado. Os dois dão "Li e concordo".' },
  { papel: 'freelancer', rota: '/freelancer/ganhos', titulo: 'Painel de ganhos', texto: 'Quanto entrou por mês, a média por projeto, a taxa de aceite das candidaturas e a categoria que mais rende.' },
  { papel: 'freelancer', rota: '/freelancer/loja', titulo: 'Loja do castelo', texto: 'O XP que sobra vira molduras, cor do nome e cenários. Gastar não baixa o nível. Os 3 primeiros do ranking do mês ganham a moldura da temporada.' },
  { papel: 'freelancer', rota: '/freelancer/perfil', titulo: 'Perfil do freelancer', texto: 'Disponibilidade, selo de verificado, avatar em pixel, cartão de visita com QR code, insígnias e conquistas secretas.' },
  { papel: 'contratante', rota: '/contratante', titulo: 'Agora, o contratante', texto: 'Trocamos para o Lucas. Aqui ele acompanha os próprios projetos e as candidaturas que chegaram.' },
  { papel: 'contratante', rota: '/contratante/criar-projeto', titulo: 'Criar projeto', texto: 'Modelos prontos, rascunho automático, sugestão de preço pelos projetos parecidos e a nota de qualidade do anúncio.' },
  { papel: 'contratante', rota: '/contratante/freelancers', titulo: 'Encontrar freelancers', texto: 'Selo de verificado, tempo de resposta, disponibilidade e as molduras da temporada. Dá para filtrar só quem está disponível.' },
  { papel: 'contratante', rota: '/contratante/historico', titulo: 'Histórico do contratante', texto: 'Finalizar e liberar o pagamento, pedir ajustes (até 3), abrir disputa para a administração mediar e "Trabalhar de novo" com quem já contratou.' },
  { papel: 'contratante', rota: '/contratante/carteira', titulo: 'Carteira fictícia', texto: 'Saldo da simulação, o que está guardado em cada projeto e o extrato. Tudo de mentirinha, para mostrar o fluxo com garantia.' },
  { papel: 'contratante', rota: '/contratante/configuracoes', titulo: 'Configurações', texto: 'Acessibilidade (tamanho da letra, alto contraste, fonte simples), verificação em 2 etapas, sessões abertas, resumo semanal por e-mail e baixar meus dados (LGPD).' },
]

export function lerPassoApresentacao(): number | null {
  try {
    const v = sessionStorage.getItem(CHAVE_APRESENTACAO)
    return v === null ? null : Number(v)
  } catch {
    return null
  }
}

export function guardarPassoApresentacao(passo: number | null) {
  try {
    if (passo === null) sessionStorage.removeItem(CHAVE_APRESENTACAO)
    else sessionStorage.setItem(CHAVE_APRESENTACAO, String(passo))
  } catch {
    /* Sem armazenamento: o roteiro vale até recarregar */
  }
}
