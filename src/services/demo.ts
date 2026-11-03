/*
 * Modo demonstração: o site inteiro funciona sem servidor, com dados de exemplo.
 * services/api.ts manda cada chamada para cá quando o modo está ligado; as respostas têm
 * o mesmo formato do servidor de verdade (Backendtcc). O que muda (candidaturas, mensagens,
 * projetos novos...) fica guardado nesta aba do navegador até sair do modo.
 */
import { nivelPorXp, xpDoNivel } from '../utils/xp'
import { eventoAtual, EVENTOS, type CodigoEvento } from '../utils/eventos'
import { temContatoExterno } from '../utils/contatoexterno'
import { BANCO, areaDaCategoria, ACERTOS_PARA_PASSAR, ESPERA_REFAZER, XP_TESTE } from './demotestes'
import { analisarTelefone, ehEstado, erroNome, erroSenha } from '../utils/validacao'
import { CHAVE_DEMO, CHAVE_ESTADO_DEMO, demoAtivo, limparDemo } from './demoflag'
import { motivosDeSpam } from '../utils/moderacao'
import { avisosPadrao, categoriaDoAviso, CATEGORIAS_AVISO, type PreferenciaAvisos } from '../utils/avisos'

export type PapelDemo = 'freelancer' | 'contratante' | 'administrador'

const CHAVE_ESTADO = CHAVE_ESTADO_DEMO
export { CHAVE_DEMO }

/* ---------- Dados de exemplo ---------- */

const hoje = Date.now()
const diasAtras = (d: number) => new Date(hoje - d * 86_400_000).toISOString()
/* Data (sem hora) daqui a alguns dias, como o servidor guarda o prazo das candidaturas */
/* Datas no dia do relógio da pessoa (em UTC, de noite já seria o dia seguinte) */
const dataLocal = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const diaDaqui = (d: number) => dataLocal(hoje + d * 86_400_000)
const hojeData = () => dataLocal(Date.now())

interface Usuario {
  usu_id: number
  usu_nome: string
  usu_email: string
  usu_cpf: string
  usu_tel: string
  usu_data_nasc: string
  usu_cid: string
  usu_est: string
  usu_desc: string | null
  usu_foto: string | null
  tipo_usuario: PapelDemo
  status_conta: 'ativa' | 'suspensa' | 'banida' | 'pendente'
  data_criacao: string
  usu_supremo: boolean
  free_xp?: number
  areas?: number[]
  /* Disponibilidade, segurança, e-mail semanal e cosméticos equipados */
  disponibilidade?: 'disponivel' | 'ocupado' | 'ferias'
  disponivel_ate?: string | null
  dois_fatores?: boolean
  resumo_email?: boolean
  moldura?: string | null
  cor_nome?: string | null
  tema_cenario?: string | null
  /* Mascote do castelo */
  mascote?: string | null
  mascote_nome?: string | null
  /* "Visto por último", privacidade, avisos por tipo e convite de amigos */
  visto_em?: string | null
  mostrar_online?: boolean
  aparecer_busca?: boolean
  avisos?: PreferenciaAvisos
  indicacao_codigo?: string | null
  indicado_por?: number | null
  indicacao_premiada?: boolean
  /* Horários de atendimento (0 = domingo) */
  horarios?: { dias: number[]; de: number; ate: number } | null
}

interface Servico {
  serv_id: number
  cont_usu: number
  tipo_id: number
  serv_titulo: string
  serv_desc: string
  serv_valor: number
  serv_tipo_valor: 'hora' | 'fixo'
  serv_qtd_dias: number | null
  serv_local: 'remoto' | 'hibrido' | 'presencial'
  serv_cidade: string | null
  serv_estado: string | null
  serv_habilidades: string | null
  serv_forma_pagamento: string | null
  serv_vagas: number | null
  serv_status: 'rascunho' | 'aberto' | 'em_andamento' | 'finalizado' | 'cancelado'
  serv_data_criacao: string
  serv_entregue_em: string | null
  serv_entrega_nota: string | null
  /* Linha do tempo */
  serv_contratado_em?: string | null
  serv_finalizado_em?: string | null
  /* Até quando aceita candidaturas e quando os lembretes de prazo saíram */
  serv_candidaturas_ate?: string | null
  serv_lembrete_prazo_em?: string | null
  serv_lembrete_atraso_em?: string | null
  /* Termo de acordo, garantia (pagamento simulado) e ajustes */
  serv_acordo_cont_em?: string | null
  serv_acordo_free_em?: string | null
  serv_garantia_valor?: number | null
  serv_garantia_em?: string | null
  serv_garantia_liberada_em?: string | null
  serv_garantia_estornada_em?: string | null
  serv_revisoes?: number
  serv_revisao_nota?: string | null
  /* Bônus dado no fim */
  serv_bonus_valor?: number | null
  serv_bonus_em?: string | null
  serv_bonus_recado?: string | null
  /* Prazo pausado e filtro de spam */
  serv_pausa_pedida_por?: number | null
  serv_pausa_motivo?: string | null
  serv_pausado_em?: string | null
  serv_pausa_dias?: number
  serv_moderacao?: 'pendente' | 'aprovado' | 'recusado' | null
  serv_moderacao_motivo?: string | null
  /* Projeto recorrente e trabalho de amostra */
  serv_repetir?: boolean
  serv_repetir_em?: string | null
  serv_repetido_de?: number | null
  serv_amostra_de?: number | null
}

interface Movimento {
  mov_id: number
  usu_id: number
  serv_id: number | null
  mov_tipo: 'credito' | 'garantia' | 'recebido' | 'estorno' | 'etapa' | 'bonus'
  mov_valor: number
  mov_desc: string
  mov_data: string
}

interface Disputa {
  dis_id: number
  serv_id: number
  usu_id: number
  dis_motivo: string
  dis_detalhe: string
  dis_status: 'aberta' | 'resolvida'
  dis_decisao: string | null
  dis_resposta: string | null
  dis_data: string
  dis_resolvida_em: string | null
}

interface Candidatura {
  cand_id: number
  serv_id: number
  free_usu: number
  cand_status: 'pendente' | 'aceita' | 'recusada' | 'cancelada'
  /* Contraproposta */
  cand_valor_proposto?: number | null
  cand_prazo_proposto?: number | null
  cand_mensagem?: string | null
  /* Candidatura em nome da guilda */
  cand_gui_id?: number | null
}

interface Estado {
  eu: number
  supremo: number | null
  proximo: number
  usuarios: Usuario[]
  servicos: Servico[]
  candidaturas: Candidatura[]
  convites: { conv_id: number; serv_id: number; free_usu: number; conv_mensagem: string | null; conv_status: 'pendente' | 'aceito' | 'recusado'; conv_data: string }[]
  mensagens: {
    msg_id: number; serv_id: number; usu_remetente: number; usu_destinatario: number; msg_texto: string; msg_imagem?: string | null; msg_arquivo?: string | null; msg_arquivo_nome?: string | null; msg_data: string; msg_lida: boolean
    /* Proposta de valor/prazo feita no chat */
    msg_proposta_valor?: number | null; msg_proposta_prazo?: number | null; msg_proposta_status?: 'pendente' | 'aceita' | 'recusada' | null
    /* Reunião marcada e aviso de contato por fora */
    msg_reuniao_em?: string | null; msg_reuniao_link?: string | null; msg_reuniao_status?: 'pendente' | 'aceita' | 'recusada' | 'cancelada' | null; msg_alerta_contato?: boolean
    /* Respondendo (citando) outra mensagem */
    msg_resposta_id?: number | null
  }[]
  notificacoes: { not_id: number; usu_id: number; not_titulo: string; not_desc: string; not_lida: boolean; not_data: string }[]
  avaliacoes: { aval_id: number; serv_id: number; usu_avaliador: number; usu_avaliado: number; aval_nota: number; aval_comentario: string | null; aval_data: string; aval_comunicacao?: number | null; aval_prazo?: number | null; aval_qualidade?: number | null }[]
  portfolio: { port_id: number; usu_id: number; port_titulo: string; port_desc: string; port_link: string | null; port_img: string | null; port_data_criacao: string; port_data_atualizacao: string; port_serv_id?: number | null }[]
  cenario: { tema: 'escuro' | 'claro' | null; clima: string | null; fogos: number | null; aviso: string | null }
  /* Versão do formato: estado guardado de uma versão antiga é jogado fora */
  versao: number
  registro: { reg_id: number; usu_nome: string; alvo_nome: string | null; reg_acao: string; reg_detalhe: string | null; reg_data: string }[]
  /* XP ganho com data (ranking do mês) e o que o freelancer fez nesta semana (missões) */
  xpEventos: { usu_id: number; xp: number; data: string }[]
  semana: Record<number, Record<string, number>>
  resgatadas: string[]
  /* Denúncias e primeiros passos já resgatados ("usu:codigo") */
  denuncias: { den_id: number; usu_id: number; den_alvo_tipo: 'servico' | 'usuario' | 'mensagem'; den_alvo_id: number; den_motivo: string; den_detalhe: string | null; den_status: 'aberta' | 'resolvida' | 'descartada'; den_data: string }[]
  passos: string[]
  /* Etapas dos projetos e alertas de busca */
  etapas: { eta_id: number; serv_id: number; eta_titulo: string; eta_ordem: number; eta_concluida_em: string | null; eta_liberado_valor?: number | null; eta_liberada_em?: string | null }[]
  buscas: { bus_id: number; usu_id: number; bus_termo: string | null; tipo_id: number | null; bus_valor_min: number | null; bus_data: string }[]
  /* Projetos salvos e conquistas secretas */
  salvos: { usu_id: number; serv_id: number; sal_data: string }[]
  conquistas: { usu_id: number; codigo: string; data: string }[]
  /* Carteira fictícia, disputas, dias com visita, loja, eventos, sessões e "digitando..." */
  carteira: Movimento[]
  disputas: Disputa[]
  atividade: Record<number, string[]>
  compras: { usu_id: number; codigo: string; preco: number }[]
  eventos: { usu_id: number; codigo: string; ano: number; qtd: number; completo_em: string | null; resgatado: boolean }[]
  sessoes: { ses_id: string; usu_id: number; ses_agente: string; ses_ip: string; ses_criada: string; ses_ultimo_uso: string; atual: boolean }[]
  digitando: { serv_id: number; usu_id: number; outro_id: number; ate: number }[]
  /* Reino: favoritos, testes, guildas, visitas ao perfil e o que cada um fez hoje (missões do dia) */
  favoritos: { usu_id: number; fav_usu_id: number; data: string }[]
  testes: { usu_id: number; tipo_id: number; acertos: number; total: number; ultima_em: string; aprovado_em: string | null }[]
  guildas: { gui_id: number; nome: string; lema: string | null; brasao: string; cor: string; dono: number; criada: string }[]
  membros: { gui_id: number; usu_id: number; papel: 'lider' | 'membro'; entrou: string }[]
  visitas: { usu_id: number; dia: string; chave: string; origem: 'publico' | 'contratante' }[]
  hoje: Record<number, { dia: string; conversar: number; explorar: number }>
  /* Cartas de candidatura salvas e erros do monitor (painel admin) */
  modelos: { mod_id: number; usu_id: number; mod_titulo: string; mod_texto: string }[]
  erros: { err_id: number; err_origem: 'site' | 'servidor'; err_mensagem: string; err_local: string | null; err_total: number; err_primeira: string; err_ultima: string }[]
  /* Rodada das 30: horas, bloqueios, avisos de "estou livre", chefão, histórico do anúncio, critérios, versões, orçamentos, anotações e desafio */
  horas: { hor_id: number; serv_id: number; usu_id: number; hor_inicio: string; hor_fim: string | null; hor_minutos: number | null; hor_desc: string | null; hor_status: 'rodando' | 'pendente' | 'aprovada' | 'recusada' }[]
  bloqueios: { usu_id: number; bloqueado_id: number; blo_data: string }[]
  avisosLivre: { usu_id: number; free_usu_id: number }[]
  chefao: { usu_id: number; mes: string }[]
  mudancas: { serv_id: number; campo: string; antes: string; depois: string; data: string }[]
  criterios: { cri_id: number; serv_id: number; cri_texto: string; cri_entregue_em: string | null; cri_aprovado_em: string | null }[]
  versoes: { ver_id: number; serv_id: number; ver_numero: number; ver_nota: string | null; ver_link: string | null; ver_data: string }[]
  orcamentos: { orc_id: number; usu_id: number; pergunta: string; fechado: boolean; data: string; respostas: { usu_id: number; status: 'aguardando' | 'respondido' | 'recusado'; valor: number | null; prazo: number | null; texto: string | null; data: string | null }[] }[]
  notas: { usu_id: number; alvo_id: number; texto: string; data: string }[]
  envios: { env_id: number; semana: string; usu_id: number; titulo: string; link: string; desc: string | null; data: string }[]
  votos: { env_id: number; usu_id: number }[]
}

const VERSAO = 11

const TIPOS = [
  { tipo_id: 1, tipo_nome: 'Desenvolvimento Web', tipo_desc: 'Sites, sistemas e lojas virtuais' },
  { tipo_id: 2, tipo_nome: 'Design Gráfico', tipo_desc: 'Logos, identidade visual e artes' },
  { tipo_id: 3, tipo_nome: 'Redação', tipo_desc: 'Textos, revisão e tradução' },
  { tipo_id: 4, tipo_nome: 'Aulas Particulares', tipo_desc: 'Reforço escolar e cursos' },
  { tipo_id: 5, tipo_nome: 'Manutenção', tipo_desc: 'Reparos e serviços gerais' },
  { tipo_id: 6, tipo_nome: 'Outros', tipo_desc: null },
]

/* Foto do Bruno: rostinho em pixel art (SVG), para o modo mostrar um freelancer verificado */
const FOTO_BRUNO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">' +
      '<rect width="16" height="16" fill="#5ec4d6"/><rect x="4" y="3" width="8" height="9" fill="#e0a77a"/>' +
      '<rect x="4" y="2" width="8" height="3" fill="#3b2418"/><rect x="3" y="3" width="1" height="4" fill="#3b2418"/><rect x="12" y="3" width="1" height="4" fill="#3b2418"/>' +
      '<rect x="6" y="7" width="1" height="1" fill="#1b1b30"/><rect x="9" y="7" width="1" height="1" fill="#1b1b30"/><rect x="7" y="10" width="2" height="1" fill="#a8281a"/>' +
      '<rect x="3" y="12" width="10" height="4" fill="#494d7e"/></svg>'
  )

const usuario = (u: Partial<Usuario> & Pick<Usuario, 'usu_id' | 'usu_nome' | 'tipo_usuario'>): Usuario => ({
  usu_email: `${u.usu_nome.split(' ')[0].toLowerCase()}@demo.contrateja`,
  usu_cpf: String(10000000000 + u.usu_id),
  usu_tel: '24999990000',
  usu_data_nasc: '2000-05-10',
  usu_cid: 'Volta Redonda',
  usu_est: 'RJ',
  usu_desc: null,
  usu_foto: null,
  status_conta: 'ativa',
  data_criacao: diasAtras(60),
  usu_supremo: false,
  ...u,
})

function estadoInicial(eu: number): Estado {
  return {
    eu,
    supremo: null,
    proximo: 1000,
    usuarios: [
      usuario({ usu_id: 1, usu_nome: 'Administrador Demo', tipo_usuario: 'administrador', data_criacao: diasAtras(120) }),
      usuario({ usu_id: 2, usu_nome: 'Ana Freelancer', tipo_usuario: 'freelancer', free_xp: 340, areas: [1, 2], usu_desc: 'Desenvolvedora web e designer. Faço sites rápidos e bonitos.', data_criacao: diasAtras(150), mascote: 'gato', mascote_nome: 'Pixel', indicacao_codigo: 'ANA-7K2Q', horarios: { dias: [1, 2, 3, 4, 5], de: 9, ate: 18 } }),
      usuario({ usu_id: 3, usu_nome: 'Lucas Contratante', tipo_usuario: 'contratante', usu_desc: 'Dono de uma loja de cartas colecionáveis.', data_criacao: diasAtras(52), visto_em: diasAtras(2 / 24) }),
      usuario({ usu_id: 4, usu_nome: 'Bruno Silva', tipo_usuario: 'freelancer', free_xp: 1250, areas: [1, 5], usu_cid: 'Barra Mansa', usu_desc: 'Programador há 6 anos.', data_criacao: diasAtras(41), usu_foto: FOTO_BRUNO, cor_nome: 'cor_ciano', mascote: 'dragao', mascote_nome: 'Brasa', visto_em: diasAtras(1 / 1440), indicado_por: 2, indicacao_premiada: true }),
      usuario({ usu_id: 5, usu_nome: 'Carla Souza', tipo_usuario: 'freelancer', free_xp: 60, areas: [3, 4], usu_cid: 'Resende', usu_desc: 'Professora de português e revisora.', data_criacao: diasAtras(18), disponibilidade: 'ferias', disponivel_ate: diaDaqui(10), visto_em: diasAtras(3), indicado_por: 2 }),
      usuario({ usu_id: 6, usu_nome: 'Diego Moderador', tipo_usuario: 'administrador', data_criacao: diasAtras(100) }),
      usuario({ usu_id: 7, usu_nome: 'Eva Spammer', tipo_usuario: 'contratante', status_conta: 'suspensa', data_criacao: diasAtras(5) }),
      usuario({ usu_id: 8, usu_nome: 'Marta Oliveira', tipo_usuario: 'contratante', usu_desc: 'Dona de uma cafeteria no centro.', data_criacao: diasAtras(70), visto_em: diasAtras(0.01), mostrar_online: false }),
    ],
    servicos: [
      servico(101, 3, 6, 'pokemon cartas', 'pacotes com cartas raras', 19, 'fixo', 'aberto', 3, { serv_habilidades: 'ter pacotes', serv_forma_pagamento: 'pix', serv_vagas: 2, serv_qtd_dias: 20 }),
      /* O site da Ana: Lucas já assinou o acordo e guardou o pagamento; falta a Ana concordar */
      servico(102, 3, 1, 'Criação de website', 'Preciso de um website para venda de roupa online', 1500, 'fixo', 'em_andamento', 20, {
        serv_habilidades: 'React, design responsivo', serv_contratado_em: diasAtras(14),
        serv_acordo_cont_em: diasAtras(13), serv_garantia_valor: 1500, serv_garantia_em: diasAtras(13),
      }),
      servico(103, 3, 2, 'Logo para loja de cartas', 'Logo em pixel art para a loja', 300, 'fixo', 'finalizado', 40, {
        serv_contratado_em: diasAtras(38), serv_entregue_em: diasAtras(32), serv_finalizado_em: diasAtras(30), serv_entrega_nota: 'Arquivos enviados em PNG e SVG.',
        serv_acordo_cont_em: diasAtras(38), serv_acordo_free_em: diasAtras(37), serv_garantia_valor: 300, serv_garantia_em: diasAtras(37), serv_garantia_liberada_em: diasAtras(30),
      }),
      servico(104, 3, 3, 'Revisão do catálogo', 'Revisar os textos do catálogo de produtos', 45, 'hora', 'aberto', 6, { serv_local: 'hibrido', serv_cidade: 'Volta Redonda', serv_estado: 'RJ', serv_candidaturas_ate: diaDaqui(3) }),
      servico(105, 3, 4, 'Aulas de inglês', 'Aulas para a equipe da loja, duas vezes por semana', 60, 'hora', 'rascunho', 1),
      servico(106, 7, 6, 'Ganhe dinheiro fácil!!!', 'Clique no link', 9999, 'fixo', 'aberto', 4),
      servico(107, 8, 1, 'Site para cafeteria', 'Site com cardápio e pedidos pelo WhatsApp para a cafeteria', 1200, 'fixo', 'aberto', 1, { serv_local: 'presencial', serv_cidade: 'Volta Redonda', serv_estado: 'RJ', serv_habilidades: 'React, site responsivo' }),
      servico(108, 8, 2, 'Identidade visual da cafeteria', 'Logo, cardápio e artes para redes sociais', 650, 'fixo', 'aberto', 8, { serv_habilidades: 'logo, pixel art, Figma' }),
      servico(109, 3, 5, 'Montar prateleiras da loja', 'Instalar prateleiras e balcão na loja de cartas', 35, 'hora', 'aberto', 12, { serv_local: 'presencial', serv_cidade: 'Barra Mansa', serv_estado: 'RJ' }),
      servico(110, 8, 3, 'Textos do site da cafeteria', 'Escrever os textos das páginas e o cardápio', 280, 'fixo', 'aberto', 2),
      servico(111, 8, 3, 'Revisão do cardápio', 'Revisar o cardápio antes de imprimir', 120, 'fixo', 'finalizado', 50, { serv_contratado_em: diasAtras(48), serv_entregue_em: diasAtras(44), serv_finalizado_em: diasAtras(43), serv_entrega_nota: 'Cardápio revisado em PDF.' }),
      servico(112, 3, 5, 'Formatar o computador da loja', 'Formatar e instalar os programas do caixa', 150, 'fixo', 'finalizado', 35, {
        serv_local: 'presencial', serv_cidade: 'Volta Redonda', serv_estado: 'RJ', serv_contratado_em: diasAtras(30), serv_entregue_em: diasAtras(25), serv_finalizado_em: diasAtras(24), serv_entrega_nota: 'Tudo instalado e testado.',
        serv_garantia_valor: 150, serv_garantia_em: diasAtras(29), serv_garantia_liberada_em: diasAtras(24),
      }),
      /* Trabalhos antigos da Ana para a Marta: dão o painel de ganhos de vários meses */
      servico(113, 8, 1, 'Landing page da cafeteria', 'Página de divulgação com mapa e horário de funcionamento', 800, 'fixo', 'finalizado', 80, { serv_contratado_em: diasAtras(78), serv_entregue_em: diasAtras(70), serv_finalizado_em: diasAtras(68) }),
      servico(114, 8, 2, 'Cardápio ilustrado', 'Ilustrações em pixel art para o cardápio de inverno', 450, 'fixo', 'finalizado', 125, { serv_contratado_em: diasAtras(122), serv_entregue_em: diasAtras(112), serv_finalizado_em: diasAtras(110) }),
      /* Projetos presenciais longe de Volta Redonda: aparecem no mapa só com o raio maior */
      servico(116, 8, 2, 'Fotos do cardápio', 'Fotografar os pratos para o cardápio novo (estúdio no Rio)', 350, 'fixo', 'aberto', 2, { serv_local: 'presencial', serv_cidade: 'Rio de Janeiro', serv_estado: 'RJ' }),
      servico(117, 3, 5, 'Instalar câmeras na loja', 'Instalar 4 câmeras e configurar o aplicativo', 400, 'fixo', 'aberto', 3, { serv_local: 'presencial', serv_cidade: 'São José dos Campos', serv_estado: 'SP' }),
      /* Por hora, em andamento: o Bruno registra horas e o Lucas aprova */
      servico(119, 3, 5, 'Suporte técnico da loja', 'Manutenção dos computadores e da rede da loja, por hora', 45, 'hora', 'em_andamento', 6, {
        serv_contratado_em: diasAtras(5), serv_qtd_dias: 30, serv_acordo_cont_em: diasAtras(5), serv_acordo_free_em: diasAtras(5),
      }),
      /* Caiu no filtro de spam: só aparece para os freelancers depois que a administração aprovar */
      servico(118, 8, 2, 'Divulgadores para a cafeteria', 'Renda extra garantida! Cadastre-se pelo link bit.ly/cafe-promo e comece hoje.', 500, 'fixo', 'aberto', 0, {
        serv_moderacao: 'pendente', serv_moderacao_motivo: 'termo suspeito ("renda extra garantida"), link encurtado',
      }),
      /* A Marta já avaliou a Ana neste: a nota fica às cegas até a Ana avaliar também */
      servico(115, 8, 2, 'Banner de inauguração', 'Banner em pixel art para a vitrine da cafeteria', 200, 'fixo', 'finalizado', 9, {
        serv_contratado_em: diasAtras(8), serv_entregue_em: diasAtras(3), serv_finalizado_em: diasAtras(2), serv_entrega_nota: 'Banner em alta resolução, pronto para imprimir.',
        serv_acordo_cont_em: diasAtras(8), serv_acordo_free_em: diasAtras(8), serv_garantia_valor: 200, serv_garantia_em: diasAtras(8), serv_garantia_liberada_em: diasAtras(2),
      }),
    ],
    candidaturas: [
      /* Bruno pediu outro valor e prazo: dá para mostrar a contraproposta */
      { cand_id: 201, serv_id: 101, free_usu: 4, cand_status: 'pendente', cand_valor_proposto: 25, cand_prazo_proposto: 10, cand_mensagem: 'Consigo os pacotes raros em 10 dias, mas o frete sobe o valor para R$ 25.' },
      { cand_id: 202, serv_id: 104, free_usu: 5, cand_status: 'pendente' },
      { cand_id: 203, serv_id: 102, free_usu: 2, cand_status: 'aceita' },
      { cand_id: 204, serv_id: 103, free_usu: 2, cand_status: 'aceita' },
      { cand_id: 205, serv_id: 111, free_usu: 5, cand_status: 'aceita' },
      { cand_id: 206, serv_id: 112, free_usu: 4, cand_status: 'aceita' },
      { cand_id: 207, serv_id: 113, free_usu: 2, cand_status: 'aceita' },
      { cand_id: 208, serv_id: 114, free_usu: 2, cand_status: 'aceita' },
      { cand_id: 209, serv_id: 110, free_usu: 2, cand_status: 'recusada' },
      { cand_id: 210, serv_id: 115, free_usu: 2, cand_status: 'aceita' },
      { cand_id: 211, serv_id: 119, free_usu: 4, cand_status: 'aceita' },
    ],
    convites: [{ conv_id: 301, serv_id: 104, free_usu: 2, conv_mensagem: 'Vi seu portfólio e acho que combina com o projeto!', conv_status: 'pendente', conv_data: diasAtras(1) }],
    mensagens: [
      { msg_id: 401, serv_id: 102, usu_remetente: 3, usu_destinatario: 2, msg_texto: 'Oi Ana! Como está o site?', msg_data: diasAtras(2), msg_lida: true },
      { msg_id: 402, serv_id: 102, usu_remetente: 2, usu_destinatario: 3, msg_texto: 'Oi Lucas! A página inicial já está pronta, falta o carrinho.', msg_data: diasAtras(1.9), msg_lida: true },
      { msg_id: 403, serv_id: 102, usu_remetente: 3, usu_destinatario: 2, msg_texto: 'Perfeito, obrigado!', msg_data: diasAtras(0.2), msg_lida: false },
      /* Bruno responde rápido: dá o "Responde em ~30 min" do perfil dele */
      { msg_id: 404, serv_id: 112, usu_remetente: 3, usu_destinatario: 4, msg_texto: 'Bruno, consegue vir amanhã cedo?', msg_data: diasAtras(29), msg_lida: true },
      { msg_id: 405, serv_id: 112, usu_remetente: 4, usu_destinatario: 3, msg_texto: 'Consigo sim, às 9h estou aí.', msg_data: diasAtras(29 - 25 / 1440), msg_lida: true },
      { msg_id: 406, serv_id: 112, usu_remetente: 3, usu_destinatario: 4, msg_texto: 'Precisa de alguma senha do caixa?', msg_data: diasAtras(28), msg_lida: true },
      { msg_id: 407, serv_id: 112, usu_remetente: 4, usu_destinatario: 3, msg_texto: 'Só a do administrador do Windows.', msg_data: diasAtras(28 - 35 / 1440), msg_lida: true },
      /* Lucas chamou a Ana para uma chamada amanhã (dá para aceitar e baixar para a agenda) */
      {
        msg_id: 408, serv_id: 102, usu_remetente: 3, usu_destinatario: 2, msg_texto: 'Vamos alinhar o carrinho numa chamada rápida?', msg_data: diasAtras(0.1), msg_lida: false,
        msg_reuniao_em: amanhaAs(14), msg_reuniao_link: 'https://meet.google.com/abc-defg-hij', msg_reuniao_status: 'pendente',
      },
      /* Bruno passou o telefone antes de ser contratado: o Lucas vê o aviso de segurança */
      { msg_id: 409, serv_id: 101, usu_remetente: 4, usu_destinatario: 3, msg_texto: 'Se preferir, me chama no zap: (24) 99999-1234', msg_data: diasAtras(0.4), msg_lida: false, msg_alerta_contato: true },
    ],
    notificacoes: [
      { not_id: 501, usu_id: 2, not_titulo: 'Novo convite', not_desc: 'Lucas Contratante convidou você para "Revisão do catálogo".', not_lida: false, not_data: diasAtras(1) },
      { not_id: 502, usu_id: 3, not_titulo: 'Nova candidatura', not_desc: 'Bruno Silva se candidatou a "pokemon cartas".', not_lida: false, not_data: diasAtras(0.5) },
      { not_id: 503, usu_id: 1, not_titulo: 'Bem-vindo ao modo demonstração', not_desc: 'Tudo aqui é de exemplo. Pode mexer à vontade.', not_lida: false, not_data: diasAtras(0) },
    ],
    avaliacoes: [
      { aval_id: 601, serv_id: 103, usu_avaliador: 3, usu_avaliado: 2, aval_nota: 5, aval_comentario: 'Logo incrível, entregou antes do prazo!', aval_data: diasAtras(30), aval_comunicacao: 5, aval_prazo: 5, aval_qualidade: 5 },
      { aval_id: 602, serv_id: 103, usu_avaliador: 2, usu_avaliado: 3, aval_nota: 5, aval_comentario: 'Cliente claro e pagou certinho.', aval_data: diasAtras(30) },
      { aval_id: 603, serv_id: 111, usu_avaliador: 8, usu_avaliado: 5, aval_nota: 5, aval_comentario: 'Revisão caprichada, ainda voltou com sugestões que eu nem tinha pedido.', aval_data: diasAtras(43) },
      { aval_id: 604, serv_id: 111, usu_avaliador: 5, usu_avaliado: 8, aval_nota: 4, aval_comentario: 'Explicou bem o que queria e respondeu rápido no chat.', aval_data: diasAtras(43) },
      { aval_id: 605, serv_id: 112, usu_avaliador: 3, usu_avaliado: 4, aval_nota: 5, aval_comentario: 'Resolveu no mesmo dia e explicou tudo o que fez no computador.', aval_data: diasAtras(24) },
      { aval_id: 606, serv_id: 112, usu_avaliador: 4, usu_avaliado: 3, aval_nota: 5, aval_comentario: 'Pagamento em dia e tudo combinado pelo chat. Recomendo!', aval_data: diasAtras(24) },
      { aval_id: 607, serv_id: 113, usu_avaliador: 8, usu_avaliado: 2, aval_nota: 5, aval_comentario: null, aval_data: diasAtras(67) },
      { aval_id: 608, serv_id: 113, usu_avaliador: 2, usu_avaliado: 8, aval_nota: 5, aval_comentario: null, aval_data: diasAtras(67) },
      { aval_id: 609, serv_id: 114, usu_avaliador: 8, usu_avaliado: 2, aval_nota: 4, aval_comentario: null, aval_data: diasAtras(109), aval_comunicacao: 4, aval_prazo: 3, aval_qualidade: 5 },
      { aval_id: 610, serv_id: 114, usu_avaliador: 2, usu_avaliado: 8, aval_nota: 5, aval_comentario: null, aval_data: diasAtras(109) },
      { aval_id: 611, serv_id: 115, usu_avaliador: 8, usu_avaliado: 2, aval_nota: 5, aval_comentario: 'O banner ficou lindo, todo mundo pergunta quem fez!', aval_data: diasAtras(2) },
    ],
    portfolio: [
      { port_id: 701, usu_id: 2, port_titulo: 'Loja de cartas', port_desc: 'Logo em pixel art para uma loja de cartas colecionáveis.', port_link: null, port_img: null, port_data_criacao: diasAtras(30), port_data_atualizacao: diasAtras(30), port_serv_id: 103 },
      { port_id: 702, usu_id: 2, port_titulo: 'Site de padaria', port_desc: 'Site com cardápio e pedidos pelo WhatsApp.', port_link: 'https://example.com', port_img: null, port_data_criacao: diasAtras(70), port_data_atualizacao: diasAtras(70) },
    ],
    cenario: { tema: null, clima: null, fogos: null, aviso: null },
    versao: VERSAO,
    registro: [
      { reg_id: 801, usu_nome: 'Diego Moderador', alvo_nome: 'Eva Spammer', reg_acao: 'conta_suspensa', reg_detalhe: null, reg_data: diasAtras(2) },
      { reg_id: 802, usu_nome: 'Diego Moderador', alvo_nome: 'Eva Spammer', reg_acao: 'cancelar_projeto', reg_detalhe: 'Ganhe dinheiro fácil!!!', reg_data: diasAtras(2) },
    ],
    xpEventos: [
      { usu_id: 4, xp: 180, data: diasAtras(3) },
      { usu_id: 2, xp: 120, data: diasAtras(5) },
      { usu_id: 5, xp: 40, data: diasAtras(1) },
      /* Mês passado (temporada que já acabou): Bruno, Ana e Carla ganharam as molduras de campeão */
      ...temporadaPassada(),
    ],
    /* Ana já cumpriu "Bom de papo" (dá para mostrar o resgate) e está no meio de "Caçador de projetos" */
    semana: { 2: { candidatar: 1, conversar: 5 } },
    resgatadas: [],
    /* O projeto de spam já tem duas denúncias esperando os admins */
    denuncias: [
      { den_id: 901, usu_id: 2, den_alvo_tipo: 'servico', den_alvo_id: 106, den_motivo: 'golpe', den_detalhe: 'Pede para clicar num link estranho.', den_status: 'aberta', den_data: diasAtras(1) },
      { den_id: 902, usu_id: 4, den_alvo_tipo: 'servico', den_alvo_id: 106, den_motivo: 'spam', den_detalhe: null, den_status: 'aberta', den_data: diasAtras(0.5) },
    ],
    passos: [],
    /* O site da Ana tem três etapas, a primeira já feita */
    etapas: [
      { eta_id: 1001, serv_id: 102, eta_titulo: 'Página inicial', eta_ordem: 1, eta_concluida_em: diasAtras(8) },
      { eta_id: 1002, serv_id: 102, eta_titulo: 'Carrinho de compras', eta_ordem: 2, eta_concluida_em: null },
      { eta_id: 1003, serv_id: 102, eta_titulo: 'Publicar o site', eta_ordem: 3, eta_concluida_em: null },
    ],
    buscas: [{ bus_id: 1101, usu_id: 2, bus_termo: 'cafeteria', tipo_id: null, bus_valor_min: null, bus_data: diasAtras(6) }],
    salvos: [{ usu_id: 2, serv_id: 108, sal_data: diasAtras(2) }],
    conquistas: [],
    carteira: [
      mov(1201, 3, null, 'credito', 5000, 'Saldo inicial da simulação', 52),
      mov(1202, 3, 103, 'garantia', -300, 'Garantia de "Logo para loja de cartas"', 37),
      mov(1203, 2, 103, 'recebido', 300, 'Pagamento de "Logo para loja de cartas"', 30),
      mov(1204, 3, 112, 'garantia', -150, 'Garantia de "Formatar o computador da loja"', 29),
      mov(1205, 4, 112, 'recebido', 150, 'Pagamento de "Formatar o computador da loja"', 24),
      mov(1206, 3, 102, 'garantia', -1500, 'Garantia de "Criação de website"', 13),
      mov(1207, 8, null, 'credito', 5000, 'Saldo inicial da simulação', 70),
      mov(1208, 8, 115, 'garantia', -200, 'Garantia de "Banner de inauguração"', 8),
      mov(1209, 2, 115, 'recebido', 200, 'Pagamento de "Banner de inauguração"', 2),
    ],
    disputas: [],
    /* Ana entrou nos últimos dias (com um dia de folga no meio): a chama já está acesa */
    atividade: { 2: [1, 2, 4, 5, 6].map((d) => dataLocal(hoje - d * 86_400_000)), 3: [1, 2].map((d) => dataLocal(hoje - d * 86_400_000)) },
    compras: [{ usu_id: 4, codigo: 'cor_ciano', preco: 80 }],
    eventos: [],
    sessoes: [],
    digitando: [],
    favoritos: [{ usu_id: 3, fav_usu_id: 4, data: diasAtras(20) }],
    testes: [
      { usu_id: 4, tipo_id: 1, acertos: 5, total: 5, ultima_em: diasAtras(15), aprovado_em: diasAtras(15) },
      { usu_id: 5, tipo_id: 3, acertos: 4, total: 5, ultima_em: diasAtras(9), aprovado_em: diasAtras(9) },
    ],
    /* Duas guildas com vaga: a Ana pode entrar numa ou fundar a dela */
    guildas: [
      { gui_id: 1301, nome: 'Forja de Pixels', lema: 'Código forte como aço.', brasao: 'dragao', cor: 'ciano', dono: 4, criada: diasAtras(30) },
      { gui_id: 1302, nome: 'Torre do Saber', lema: 'Cada palavra no lugar certo.', brasao: 'arvore', cor: 'verde', dono: 5, criada: diasAtras(12) },
    ],
    membros: [
      { gui_id: 1301, usu_id: 4, papel: 'lider', entrou: diasAtras(30) },
      { gui_id: 1302, usu_id: 5, papel: 'lider', entrou: diasAtras(12) },
    ],
    /* Visitas da semana ao perfil da Ana (algumas de contratantes) */
    visitas: [2, 4, 1, 5, 3, 6, 2].flatMap((n, i) =>
      Array.from({ length: n }, (_, k) => ({ usu_id: 2, dia: dataLocal(hoje - (6 - i) * 86_400_000), chave: `ex${i}-${k}`, origem: k % 3 === 0 ? ('contratante' as const) : ('publico' as const) }))
    ),
    hoje: {},
    modelos: [
      { mod_id: 1401, usu_id: 2, mod_titulo: 'Apresentação curta', mod_texto: 'Oi! Sou a Ana, faço sites e identidade visual há 4 anos. Vi o seu projeto e consigo entregar no prazo. Posso mandar exemplos parecidos do meu portfólio.' },
      { mod_id: 1402, usu_id: 2, mod_titulo: 'Para projetos de design', mod_texto: 'Olá! Trabalho com pixel art e design de marcas. Antes de começar, mando 2 rascunhos para você escolher a direção, e faço até 2 rodadas de ajuste sem custo.' },
    ],
    horas: [
      { hor_id: 1601, serv_id: 119, usu_id: 4, hor_inicio: diasAtras(3), hor_fim: diasAtras(3 - 1.5 / 24), hor_minutos: 90, hor_desc: 'Configurei o roteador e a impressora do caixa', hor_status: 'aprovada' },
      { hor_id: 1602, serv_id: 119, usu_id: 4, hor_inicio: diasAtras(1), hor_fim: diasAtras(1 - 1 / 24), hor_minutos: 60, hor_desc: 'Backup das vendas e antivírus', hor_status: 'pendente' },
    ],
    bloqueios: [],
    avisosLivre: [],
    chefao: [],
    mudancas: [{ serv_id: 101, campo: 'valor', antes: 'R$ 15,00', depois: 'R$ 19,00', data: diasAtras(1) }],
    criterios: [
      { cri_id: 1701, serv_id: 102, cri_texto: 'Página inicial com a vitrine das roupas', cri_entregue_em: diasAtras(6), cri_aprovado_em: diasAtras(5) },
      { cri_id: 1702, serv_id: 102, cri_texto: 'Carrinho de compras funcionando', cri_entregue_em: diasAtras(1), cri_aprovado_em: null },
      { cri_id: 1703, serv_id: 102, cri_texto: 'Site certinho no celular', cri_entregue_em: null, cri_aprovado_em: null },
    ],
    versoes: [
      { ver_id: 1801, serv_id: 103, ver_numero: 1, ver_nota: 'Primeira versão do logo, em 3 cores.', ver_link: 'https://www.figma.com/file/logo-cartas-v1', ver_data: diasAtras(34) },
      { ver_id: 1802, serv_id: 103, ver_numero: 2, ver_nota: 'Arquivos enviados em PNG e SVG.', ver_link: 'https://www.figma.com/file/logo-cartas-v2', ver_data: diasAtras(32) },
    ],
    orcamentos: [
      {
        orc_id: 1901, usu_id: 3, pergunta: 'Quanto você cobra por um site de 5 páginas para a loja de cartas, com catálogo e contato?', fechado: false, data: diasAtras(2),
        respostas: [
          { usu_id: 4, status: 'respondido', valor: 1800, prazo: 15, texto: 'Faço em React, já com o catálogo editável e o formulário de contato.', data: diasAtras(1.5) },
          { usu_id: 2, status: 'aguardando', valor: null, prazo: null, texto: null, data: null },
        ],
      },
    ],
    notas: [{ usu_id: 3, alvo_id: 4, texto: 'Responde rápido. Ótimo com computadores e rede.', data: diasAtras(20) }],
    envios: [
      { env_id: 2001, semana: semanaDemo(), usu_id: 4, titulo: 'Proposta em pixel art', link: 'https://www.behance.net/exemplo-bruno', desc: 'Feito no Aseprite, 32x32.', data: diasAtras(1) },
      { env_id: 2002, semana: semanaDemo(), usu_id: 5, titulo: 'Versão aquarela', link: 'https://drive.google.com/exemplo-carla', desc: null, data: diasAtras(0.5) },
    ],
    votos: [{ env_id: 2001, usu_id: 3 }, { env_id: 2001, usu_id: 8 }, { env_id: 2002, usu_id: 2 }],
    erros: [
      { err_id: 1501, err_origem: 'site', err_mensagem: "TypeError: Cannot read properties of undefined (reading 'serv_titulo')", err_local: '/freelancer/historico', err_total: 4, err_primeira: diasAtras(3), err_ultima: diasAtras(0.3) },
      { err_id: 1502, err_origem: 'servidor', err_mensagem: 'Error: connect ETIMEDOUT', err_local: 'src/services/email.js:42:11', err_total: 1, err_primeira: diasAtras(1), err_ultima: diasAtras(1) },
    ],
  }
}

/* Amanhã numa hora cheia (hora local), como o servidor guarda */
function amanhaAs(hora: number) {
  const d = new Date(hoje + 86_400_000)
  d.setHours(hora, 0, 0, 0)
  return d.toISOString()
}

/* Movimento da carteira de exemplo, "dias" atrás */
function mov(mov_id: number, usu_id: number, serv_id: number | null, mov_tipo: Movimento['mov_tipo'], mov_valor: number, mov_desc: string, dias: number): Movimento {
  return { mov_id, usu_id, serv_id, mov_tipo, mov_valor, mov_desc, mov_data: diasAtras(dias) }
}

/* XP ganho no meio do mês passado (o ranking dele vira a temporada passada) */
function temporadaPassada() {
  const agora = new Date()
  const meio = new Date(agora.getFullYear(), agora.getMonth() - 1, 15, 12).toISOString()
  return [
    { usu_id: 4, xp: 420, data: meio },
    { usu_id: 2, xp: 260, data: meio },
    { usu_id: 5, xp: 90, data: meio },
  ]
}

function servico(
  serv_id: number, cont_usu: number, tipo_id: number, serv_titulo: string, serv_desc: string, serv_valor: number,
  serv_tipo_valor: 'hora' | 'fixo', serv_status: Servico['serv_status'], dias: number, extra: Partial<Servico> = {}
): Servico {
  return {
    serv_id, cont_usu, tipo_id, serv_titulo, serv_desc, serv_valor, serv_tipo_valor, serv_status,
    serv_qtd_dias: 15, serv_local: 'remoto', serv_cidade: null, serv_estado: null, serv_habilidades: null,
    serv_forma_pagamento: 'pix', serv_vagas: 1, serv_data_criacao: diasAtras(dias), serv_entregue_em: null, serv_entrega_nota: null,
    ...extra,
  }
}

/* ---------- Estado guardado na aba ---------- */

let estado: Estado | null = null

function ler(): Estado {
  if (estado) return estado
  try {
    estado = JSON.parse(sessionStorage.getItem(CHAVE_ESTADO) ?? 'null')
  } catch {
    estado = null
  }
  if (estado?.versao !== VERSAO) estado = estadoInicial(1)
  return estado
}

function guardar() {
  try {
    sessionStorage.setItem(CHAVE_ESTADO, JSON.stringify(estado))
  } catch {
    /* Sem armazenamento: vale até recarregar */
  }
}

/* Token de mentira no formato JWT, para o site ler o papel como sempre */
const tokenPara = (u: Usuario) => `demo.${btoa(JSON.stringify({ id: u.usu_id, tipo: u.tipo_usuario }))}.demo`

const CONTA_DO_PAPEL: Record<PapelDemo, number> = { administrador: 1, freelancer: 2, contratante: 3 }

/* Liga o modo e devolve o token da conta de exemplo daquele papel (o admin de exemplo é comum: o supremo só existe de verdade) */
export function comecarDemo(papel: PapelDemo) {
  /* Ninguém entra como administrador pelo modo demonstração */
  if (papel === 'administrador') papel = 'freelancer'
  estado = estadoInicial(CONTA_DO_PAPEL[papel])
  guardar()
  try {
    localStorage.setItem(CHAVE_DEMO, '1')
  } catch {
    /* Sem armazenamento */
  }
  return tokenPara(estado.usuarios.find((u) => u.usu_id === estado!.eu)!)
}

/* Modo apresentação: troca de conta sem perder o que já foi feito (só freelancer e contratante) */
export function trocarContaDemo(papel: 'freelancer' | 'contratante') {
  const e = ler()
  e.eu = CONTA_DO_PAPEL[papel]
  e.supremo = null
  guardar()
  return tokenPara(quem(e, e.eu))
}

/* Volta todos os dados de exemplo ao começo, na conta do papel pedido */
export function reiniciarDemo(papel: 'freelancer' | 'contratante') {
  estado = estadoInicial(CONTA_DO_PAPEL[papel])
  guardar()
  return tokenPara(quem(estado, estado.eu))
}

export function sairDemo() {
  estado = null
  limparDemo()
}

export { demoAtivo }

/* ---------- Ajudantes ---------- */

class ErroDemo extends Error {
  status: number

  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

const tipoNome = (id: number) => TIPOS.find((t) => t.tipo_id === id)?.tipo_nome ?? 'Outros'

function quem(e: Estado, id: number) {
  const u = e.usuarios.find((x) => x.usu_id === id)
  if (!u) throw new ErroDemo(404, 'Usuário não encontrado.')
  return u
}

function servicoDe(e: Estado, id: number) {
  const s = e.servicos.find((x) => x.serv_id === id)
  if (!s) throw new ErroDemo(404, 'Projeto não encontrado.')
  return s
}

/* Missões: conta o que a pessoa fez nesta semana */
function contarNaSemana(e: Estado, codigo: string) {
  e.semana[e.eu] ??= {}
  e.semana[e.eu][codigo] = (e.semana[e.eu][codigo] ?? 0) + 1
}

/* Registro de ações dos admins */
function registrar(e: Estado, reg_acao: string, alvo: number | null, reg_detalhe: string | null = null) {
  e.registro.unshift({
    reg_id: e.proximo++, usu_nome: quem(e, e.supremo ?? e.eu).usu_nome, alvo_nome: alvo ? e.usuarios.find((u) => u.usu_id === alvo)?.usu_nome ?? null : null,
    reg_acao, reg_detalhe, reg_data: new Date().toISOString(),
  })
}

function ganharXp(e: Estado, usu_id: number, xp: number) {
  const u = quem(e, usu_id)
  u.free_xp = (u.free_xp ?? 0) + xp
  e.xpEventos.push({ usu_id, xp, data: new Date().toISOString() })
}

function notificar(e: Estado, usu_id: number, not_titulo: string, not_desc: string) {
  e.notificacoes.unshift({ not_id: e.proximo++, usu_id, not_titulo, not_desc, not_lida: false, not_data: new Date().toISOString() })
}

/*
 * Avaliação às cegas (igual ao servidor): a nota aparece quando os dois avaliaram o projeto
 * ou 7 dias depois da avaliação.
 */
const DIAS_AVALIACAO_CEGA = 7
function visivel(e: Estado, a: Estado['avaliacoes'][number]) {
  if (Date.now() - new Date(a.aval_data).getTime() >= DIAS_AVALIACAO_CEGA * 86_400_000) return true
  return e.avaliacoes.some((v) => v.serv_id === a.serv_id && v.usu_avaliador === a.usu_avaliado && v.usu_avaliado === a.usu_avaliador)
}

function mediaDe(e: Estado, usu_id: number) {
  const notas = e.avaliacoes.filter((a) => a.usu_avaliado === usu_id && visivel(e, a)).map((a) => a.aval_nota)
  return { media: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : 0, total: notas.length }
}

/* Freelancer contratado num projeto (candidatura aceita) */
const contratadoDe = (e: Estado, serv_id: number) => e.candidaturas.find((c) => c.serv_id === serv_id && c.cand_status === 'aceita')?.free_usu ?? null

function listaServico(e: Estado, s: Servico) {
  return {
    ...s,
    categoria: tipoNome(s.tipo_id),
    contratante_nome: quem(e, s.cont_usu).usu_nome,
  }
}

function avaliacoesDe(e: Estado, usu_id: number) {
  return e.avaliacoes
    .filter((a) => a.usu_avaliado === usu_id && visivel(e, a))
    .map((a) => {
      const autor = quem(e, a.usu_avaliador)
      return { ...a, serv_titulo: servicoDe(e, a.serv_id).serv_titulo, avaliador_nome: autor.usu_nome, avaliador_foto: autor.usu_foto }
    })
}

const INSIGNIAS = [
  ['primeiro_projeto', 'Primeiro Projeto', 'Concluiu o primeiro projeto.', (c: number) => [c, 1]],
  ['em_ascensao', 'Em Ascensão', 'Concluiu 5 projetos.', (c: number) => [c, 5]],
  ['veterano', 'Veterano', 'Concluiu 20 projetos.', (c: number) => [c, 20]],
  ['nota_maxima', 'Nota Máxima', 'Recebeu uma avaliação 5 estrelas.', (_c: number, n5: number) => [n5, 1]],
  ['vitrine', 'Vitrine Completa', 'Publicou 3 trabalhos no portfólio.', (_c: number, _n: number, p: number) => [p, 3]],
  ['nivel_5', 'Nível 5', 'Chegou ao nível 5.', (_c: number, _n: number, _p: number, nv: number) => [nv, 5]],
] as const

function perfilFreelancer(e: Estado, usu_id: number) {
  const u = quem(e, usu_id)
  const xp = u.free_xp ?? 0
  const nivel = nivelPorXp(xp)
  const concluidos = e.servicos.filter((s) => s.serv_status === 'finalizado' && contratadoDe(e, s.serv_id) === usu_id).length
  const avaliacoes = avaliacoesDe(e, usu_id)
  const { media, total } = mediaDe(e, usu_id)
  const cincos = avaliacoes.filter((a) => a.aval_nota === 5).length
  const itens = e.portfolio.filter((p) => p.usu_id === usu_id).length
  return {
    resumo: { xp, nivel, xpNivelAtual: xpDoNivel(nivel), xpProximoNivel: xpDoNivel(nivel + 1), media, totalAvaliacoes: total, concluidos },
    insignias: INSIGNIAS.map(([codigo, nome, descricao, regra]) => {
      const [progresso, meta] = regra(concluidos, cincos, itens, nivel)
      return { codigo, nome, descricao, conquistada: progresso >= meta, data: progresso >= meta ? diasAtras(10) : null, progresso: Math.min(progresso, meta), meta }
    }),
    avaliacoes,
  }
}

function perfilContratante(e: Estado, usu_id: number) {
  const meus = e.servicos.filter((s) => s.cont_usu === usu_id)
  const conta = (st: string) => meus.filter((s) => s.serv_status === st).length
  const contratados = [...new Set(meus.map((s) => contratadoDe(e, s.serv_id)).filter((x): x is number => x !== null))]
  const { media, total } = mediaDe(e, usu_id)
  return {
    estatisticas: {
      publicados: meus.filter((s) => s.serv_status !== 'rascunho').length,
      abertos: conta('aberto'),
      emAndamento: conta('em_andamento'),
      concluidos: conta('finalizado'),
      rascunhos: conta('rascunho'),
      freelancersContratados: contratados.length,
    },
    reputacao: { media, total },
    avaliacoes: avaliacoesDe(e, usu_id),
    contratados: contratados.map((id) => {
      const f = quem(e, id)
      return {
        usu_id: id, usu_nome: f.usu_nome, usu_foto: f.usu_foto, free_nivel: nivelPorXp(f.free_xp ?? 0), free_xp: f.free_xp ?? 0,
        free_rank: mediaDe(e, id).media, projetos: meus.filter((s) => contratadoDe(e, s.serv_id) === id).length,
      }
    }),
  }
}

function conversasDe(e: Estado) {
  const pares = new Map<string, { serv_id: number; outro: number }>()
  for (const m of e.mensagens) {
    if (m.usu_remetente !== e.eu && m.usu_destinatario !== e.eu) continue
    const outro = m.usu_remetente === e.eu ? m.usu_destinatario : m.usu_remetente
    pares.set(`${m.serv_id}:${outro}`, { serv_id: m.serv_id, outro })
  }
  /* Antes da contratação, o chat mostra só o primeiro nome e a inicial */
  const contratadoAqui = (serv_id: number, outro: number) => e.candidaturas.some((x) => x.serv_id === serv_id && x.cand_status === 'aceita' && [e.eu, outro].includes(x.free_usu))
  return [...pares.values()].map(({ serv_id, outro }) => {
    const msgs = e.mensagens.filter((m) => m.serv_id === serv_id && [m.usu_remetente, m.usu_destinatario].includes(outro) && [m.usu_remetente, m.usu_destinatario].includes(e.eu))
    const ultima = msgs[msgs.length - 1]
    const o = quem(e, outro)
    return {
      serv_id, serv_titulo: servicoDe(e, serv_id).serv_titulo, outro_usu_id: outro, outro_nome: contratadoAqui(serv_id, outro) ? o.usu_nome : nomeCurtoDemo(o.usu_nome), outro_foto: o.usu_foto, outro_visto_em: vistoDe(o),
      anonimo: !contratadoAqui(serv_id, outro),
      ultima_mensagem: ultima.msg_texto, ultima_data: ultima.msg_data, nao_lidas: msgs.filter((m) => m.usu_destinatario === e.eu && !m.msg_lida).length,
    }
  })
}

/* ---------- Rotas ---------- */

type Corpo = Record<string, unknown>
type Rota = [metodo: string, padrao: RegExp, responder: (e: Estado, p: string[], corpo: Corpo, busca: URLSearchParams) => unknown]

const ok = (mensagem: string, extra: object = {}) => ({ mensagem, ...extra })

const ROTAS: Rota[] = [
  ['GET', /^\/config\/cenario$/, (e) => e.cenario],
  ['GET', /^\/tipos-servico$/, () => ({ tipos: TIPOS })],

  /* Usuário */
  ['GET', /^\/usuarios\/eu$/, (e) => {
    /* Sem os campos internos do modo (XP e áreas têm rotas próprias) */
    const eu = quem(e, e.eu)
    const u: Partial<Usuario> = { ...eu }
    for (const campo of ['free_xp', 'areas', 'disponibilidade', 'disponivel_ate', 'dois_fatores', 'resumo_email', 'moldura', 'cor_nome', 'tema_cenario', 'mascote', 'mascote_nome'] as const) delete u[campo]
    return { ...u, ...aparenciaDe(e, e.eu), usu_resumo_email: eu.resumo_email ?? true, usu_tema_cenario: eu.tema_cenario ?? null, supremo_id: e.supremo, horarios: eu.horarios ?? null }
  }],
  ['GET', /^\/usuarios\/eu\/areas$/, (e) => ({ areas: (quem(e, e.eu).areas ?? []).map((id) => ({ tipo_id: id, tipo_nome: tipoNome(id) })) })],
  ['PUT', /^\/usuarios\/eu\/areas$/, (e, _p, c) => {
    quem(e, e.eu).areas = ((c.tipos as number[]) ?? []).map(Number)
    return ok('Áreas salvas.')
  }],
  ['GET', /^\/usuarios\/freelancers$/, (e) =>
    e.usuarios.filter((u) => u.tipo_usuario === 'freelancer' && u.status_conta === 'ativa' && u.aparecer_busca !== false).map((u) => ({
      usu_id: u.usu_id, usu_nome: u.usu_nome, usu_desc: u.usu_desc, usu_cid: u.usu_cid, usu_est: u.usu_est, usu_foto: u.usu_foto,
      areas_atuacao: (u.areas ?? []).map(tipoNome).join(','), free_nivel: nivelPorXp(u.free_xp ?? 0), free_xp: u.free_xp ?? 0,
      insignias: perfilFreelancer(e, u.usu_id).insignias.filter((i) => i.conquistada).map((i) => i.codigo).join(','),
      verificado: verificacaoDe(e, u.usu_id).verificado,
      ...aparenciaDe(e, u.usu_id),
    }))],
  ['PUT', /^\/usuarios\/(\d+)$/, (e, [id], c) => {
    const u = quem(e, Number(id))
    /* As mesmas regras do servidor (services/validacao.js) */
    if (c.usu_senha !== undefined) {
      if (!c.senha_atual) throw new ErroDemo(400, 'Informe a senha atual para trocar a senha.')
      const problema = erroSenha(String(c.usu_senha))
      if (problema) throw new ErroDemo(400, problema)
    }
    if (c.usu_nome !== undefined && erroNome(String(c.usu_nome), 'nome')) throw new ErroDemo(400, erroNome(String(c.usu_nome), 'nome'))
    if (c.usu_tel !== undefined && analisarTelefone(String(c.usu_tel)).erro) throw new ErroDemo(400, analisarTelefone(String(c.usu_tel)).erro)
    if (c.usu_est !== undefined && !ehEstado(String(c.usu_est))) throw new ErroDemo(400, 'Estado inválido. Escolha um da lista.')
    if (c.usu_cid !== undefined && !String(c.usu_cid).trim()) throw new ErroDemo(400, 'Informe a cidade.')
    for (const campo of ['usu_nome', 'usu_tel', 'usu_cid', 'usu_est', 'usu_desc', 'usu_foto'] as const) if (c[campo] !== undefined) (u[campo] as unknown) = c[campo]
    return ok(c.usu_senha !== undefined ? 'Senha alterada! (no modo demonstração ela não é guardada)' : 'Usuário atualizado com sucesso!')
  }],
  ['DELETE', /^\/usuarios\/(\d+)$/, () => {
    throw new ErroDemo(400, 'No modo demonstração não dá para excluir a própria conta.')
  }],

  /* Perfis */
  ['GET', /^\/perfil\/freelancer\/eu$/, (e) => ({ ...perfilFreelancer(e, e.eu), verificacao: verificacaoDe(e, e.eu) })],
  ['GET', /^\/perfil\/freelancer\/(\d+)$/, (e, [id]) => perfilFreelancer(e, Number(id))],
  ['GET', /^\/perfil\/contratante\/eu$/, (e) => perfilContratante(e, e.eu)],

  /* Projetos */
  ['GET', /^\/servicos\/meus$/, (e) => ({ projetos: e.servicos.filter((s) => s.cont_usu === e.eu).map((s) => listaServico(e, s)) })],
  ['GET', /^\/servicos\/abertos$/, (e) => ({
    projetos: e.servicos.filter((s) => s.serv_status === 'aberto' && aceitaCandidatura(s)).map((s) => {
      const { media, total } = mediaDe(e, s.cont_usu)
      return { ...listaServico(e, s), contratante_nota: total ? media : null }
    }),
  })],
  ['GET', /^\/publico\/depoimentos$/, (e) => depoimentosPublicos(e)],
  ['GET', /^\/publico\/freelancer\/(\d+)$/, (e, [id]) => {
    const perfil = perfilPublico(e, Number(id))
    registrarVisita(e, Number(id), `a:${e.eu}`, 'publico')
    return { ...perfil, criterios: mediasCriterioDemo(e, Number(id)) }
  }],
  ['POST', /^\/publico\/contato$/, (e, _p, c) => {
    const nome = String(c.nome ?? '').trim()
    const mensagem = String(c.mensagem ?? '').trim()
    if (!nome || !String(c.assunto ?? '').trim() || mensagem.length < 10) throw new ErroDemo(400, 'Preencha nome, assunto e uma mensagem de pelo menos 10 letras.')
    for (const adm of e.usuarios.filter((u) => u.tipo_usuario === 'administrador' && u.status_conta === 'ativa')) {
      notificar(e, adm.usu_id, 'Mensagem de contato', `${nome} (${String(c.email)}) — ${String(c.assunto)}: ${mensagem.slice(0, 300)}`)
    }
    return ok('Mensagem enviada! Vamos responder no seu e-mail.')
  }],
  ['GET', /^\/servicos\/salvos$/, (e) => ({ ids: salvosDe(e) })],
  ['GET', /^\/servicos\/precos$/, (e, _p, _c, busca) => precosDe(e, Number(busca.get('tipo_id')), busca.get('tipo_valor') === 'hora' ? 'hora' : 'fixo')],
  ['POST', /^\/servicos\/(\d+)\/salvar$/, (e, [id]) => {
    const s = servicoDe(e, Number(id))
    if (!e.salvos.some((x) => x.usu_id === e.eu && x.serv_id === s.serv_id)) {
      e.salvos.push({ usu_id: e.eu, serv_id: s.serv_id, sal_data: new Date().toISOString() })
      contarHoje(e, 'explorar')
    }
    return ok('Projeto salvo.', { ids: salvosDe(e) })
  }],
  ['DELETE', /^\/servicos\/(\d+)\/salvar$/, (e, [id]) => {
    e.salvos = e.salvos.filter((x) => !(x.usu_id === e.eu && x.serv_id === Number(id)))
    return ok('Projeto tirado dos salvos.', { ids: salvosDe(e) })
  }],
  ['GET', /^\/servicos\/(\d+)\/parecidos$/, (e, [id]) => {
    const s = servicoDe(e, Number(id))
    return {
      projetos: e.servicos
        .filter((o) => o.tipo_id === s.tipo_id && o.cont_usu !== s.cont_usu && o.serv_id !== s.serv_id && o.serv_status === 'aberto' && aceitaCandidatura(o) && quem(e, o.cont_usu).status_conta === 'ativa')
        .sort((x, y) => y.serv_id - x.serv_id)
        .slice(0, 4)
        .map((o) => listaServico(e, o)),
    }
  }],
  ['GET', /^\/servicos\/(\d+)\/outros$/, (e, [id]) => {
    const s = servicoDe(e, Number(id))
    return { projetos: e.servicos.filter((o) => o.cont_usu === s.cont_usu && o.serv_id !== s.serv_id && o.serv_status === 'aberto').map((o) => listaServico(e, o)) }
  }],
  ['GET', /^\/servicos\/(\d+)$/, (e, [id]) => {
    const s = servicoDe(e, Number(id))
    const c = quem(e, s.cont_usu)
    const { media, total } = mediaDe(e, c.usu_id)
    /* Freelancer: o que mudou depois que se candidatou; contratante: tudo */
    const candidato = e.candidaturas.some((x) => x.serv_id === s.serv_id && x.free_usu === e.eu)
    return {
      projeto: {
        ...listaServico(e, s), contratante_desc: c.usu_desc, contratante_foto: c.usu_foto, contratante_data_criacao: c.data_criacao,
        contratante_servicos_postados: e.servicos.filter((o) => o.cont_usu === c.usu_id).length, contratante_nota: total ? media : null, contratante_total_avaliacoes: total,
        contratante_reputacao: reputacaoContratanteDemo(e, c.usu_id),
        mudancas: s.cont_usu === e.eu || candidato ? e.mudancas.filter((m) => m.serv_id === s.serv_id) : [],
      },
    }
  }],
  ['POST', /^\/servicos$/, (e, _p, c) => {
    /* Filtro de spam: projeto suspeito espera a revisão da administração */
    const motivos = motivosDeSpam({ titulo: String(c.titulo), descricao: String(c.descricao), valor: Number(c.valor), tipo_valor: String(c.tipo_valor) })
    const moderacao = motivos.length ? { serv_moderacao: 'pendente' as const, serv_moderacao_motivo: motivos.join(', ') } : {}
    const novo = servico(e.proximo++, e.eu, Number(c.tipo_id), String(c.titulo), String(c.descricao), Number(c.valor), c.tipo_valor as 'hora', (c.status as 'aberto') ?? 'aberto', 0, { ...camposProjeto(c), serv_candidaturas_ate: lerPrazoCandidaturas(c.candidaturas_ate), ...moderacao })
    e.servicos.unshift(novo)
    if (novo.serv_status === 'aberto' && !motivos.length) avisarBuscas(e, novo)
    if (motivos.length) {
      for (const a of e.usuarios.filter((u) => u.tipo_usuario === 'administrador')) notificar(e, a.usu_id, 'Projeto para revisar', `"${novo.serv_titulo}" caiu no filtro de spam e espera a sua revisão.`)
      return ok('Projeto criado! Ele passa por uma revisão rápida da administração antes de aparecer para os freelancers.', { projeto: novo, em_revisao: true })
    }
    return ok('Projeto publicado!', { projeto: novo })
  }],
  ['PUT', /^\/servicos\/(\d+)$/, (e, [id], c) => {
    const s = servicoDe(e, Number(id))
    const antes = s.serv_status
    registrarMudancasDemo(e, s, c)
    Object.assign(s, { serv_titulo: c.titulo, serv_desc: c.descricao, tipo_id: Number(c.tipo_id), serv_valor: Number(c.valor), serv_tipo_valor: c.tipo_valor, serv_status: c.status ?? 'aberto', ...camposProjeto(c) })
    if ('candidaturas_ate' in c) s.serv_candidaturas_ate = lerPrazoCandidaturas(c.candidaturas_ate)
    /* Mesmas regras do servidor: texto suspeito volta para a revisão; texto limpo tira o "pendente" */
    const motivos = motivosDeSpam({ titulo: s.serv_titulo, descricao: s.serv_desc, valor: s.serv_valor, tipo_valor: s.serv_tipo_valor })
    if (motivos.length) Object.assign(s, { serv_moderacao: 'pendente', serv_moderacao_motivo: motivos.join(', ') })
    else if (s.serv_moderacao === 'pendente') Object.assign(s, { serv_moderacao: null, serv_moderacao_motivo: null })
    else if (s.serv_moderacao === 'recusado') Object.assign(s, { serv_moderacao: 'pendente', serv_moderacao_motivo: 'editado depois de recusado' })
    if (s.serv_status === 'aberto' && antes !== 'aberto' && s.serv_moderacao !== 'pendente') avisarBuscas(e, s)
    return s.serv_moderacao === 'pendente'
      ? ok('Projeto atualizado. Ele passa por uma revisão rápida da administração antes de aparecer.', { em_revisao: true })
      : ok('Projeto atualizado!')
  }],
  ['POST', /^\/servicos\/(\d+)\/candidaturas$/, (e, [id], c) => {
    const s = servicoDe(e, Number(id))
    if (bloqueadosDemo(e, e.eu, s.cont_usu)) throw new ErroDemo(403, 'Você não pode se candidatar a este projeto.')
    if (!aceitaCandidatura(s)) throw new ErroDemo(400, 'As candidaturas para este projeto já encerraram.')
    const proposta = lerProposta(c)
    const ja = e.candidaturas.find((x) => x.serv_id === s.serv_id && x.free_usu === e.eu)
    if (ja && ja.cand_status !== 'cancelada') throw new ErroDemo(400, 'Você já se candidatou a este projeto.')
    /* Com a guilda: o contratante vê que é um time */
    const guilda = c.com_guilda ? guildaDe(e, e.eu) : null
    if (c.com_guilda && !guilda) throw new ErroDemo(400, 'Você não está em nenhuma guilda.')
    const cand_gui_id = guilda?.gui_id ?? null
    if (ja) Object.assign(ja, { cand_status: 'pendente', ...proposta, cand_gui_id })
    else e.candidaturas.push({ cand_id: e.proximo++, serv_id: s.serv_id, free_usu: e.eu, cand_status: 'pendente', ...proposta, cand_gui_id })
    const pediu = proposta.cand_valor_proposto != null || proposta.cand_prazo_proposto != null
    notificar(e, s.cont_usu, 'Nova candidatura', `${quem(e, e.eu).usu_nome} se candidatou a "${s.serv_titulo}"${guilda ? ` com a guilda ${guilda.nome}` : ''}${pediu ? ' com uma contraproposta' : ''}.`)
    contarNaSemana(e, 'candidatar')
    contarHoje(e, 'explorar')
    return ok('Candidatura enviada!')
  }],
  ['DELETE', /^\/servicos\/(\d+)\/candidaturas$/, (e, [id]) => {
    const c = e.candidaturas.find((x) => x.serv_id === Number(id) && x.free_usu === e.eu)
    if (c) c.cand_status = 'cancelada'
    return ok('Candidatura cancelada.')
  }],
  ['PUT', /^\/servicos\/(\d+)\/entregar$/, (e, [id], c) => {
    const s = servicoDe(e, Number(id))
    const link = String(c.link ?? '').trim()
    if (link && !/^https:\/\/\S+$/i.test(link)) throw new ErroDemo(400, 'O link da entrega precisa começar com https:// (Drive, Figma, GitHub...).')
    s.serv_entregue_em = new Date().toISOString()
    s.serv_entrega_nota = (c.nota as string) || null
    /* Versões da entrega: cada entrega fica guardada */
    e.versoes.push({ ver_id: e.proximo++, serv_id: s.serv_id, ver_numero: e.versoes.filter((v) => v.serv_id === s.serv_id).length + 1, ver_nota: s.serv_entrega_nota, ver_link: link || null, ver_data: new Date().toISOString() })
    notificar(e, s.cont_usu, 'Trabalho entregue', `"${s.serv_titulo}" foi marcado como entregue.`)
    contarNaSemana(e, 'entregar')
    return ok('Entrega registrada! Agora é com o contratante.')
  }],
  ['PUT', /^\/servicos\/(\d+)\/finalizar$/, (e, [id]) => {
    const pago = concluirProjeto(e, servicoDe(e, Number(id)))
    return ok(pago ? 'Projeto finalizado! O pagamento guardado foi para o freelancer, que também ganhou 100 XP.' : 'Projeto finalizado! O freelancer ganhou 100 XP.')
  }],

  /* Depois da contratação: acordo, garantia, ajustes e disputa (mesmas regras do servidor) */
  ['GET', /^\/servicos\/(\d+)\/acordo$/, (e, [id]) => acordoDe(e, participacaoDe(e, Number(id)))],
  ['PUT', /^\/servicos\/(\d+)\/acordo$/, (e, [id]) => {
    const p = participacaoDe(e, Number(id))
    if (p.s.serv_status !== 'em_andamento') throw new ErroDemo(400, 'Só dá para aceitar o acordo de projetos em andamento.')
    const campo = p.papel === 'contratante' ? 'serv_acordo_cont_em' : 'serv_acordo_free_em'
    if (p.s[campo]) throw new ErroDemo(400, 'Você já concordou com este acordo.')
    p.s[campo] = new Date().toISOString()
    const outro = p.papel === 'contratante' ? p.free : p.s.cont_usu
    notificar(e, outro, 'Acordo assinado', `${quem(e, e.eu).usu_nome} concordou com o acordo de "${p.s.serv_titulo}".`)
    return { mensagem: 'Pronto! Você concordou com o acordo.', ...acordoDe(e, p) }
  }],
  ['POST', /^\/servicos\/(\d+)\/garantia$/, (e, [id], c) => {
    const p = participacaoDe(e, Number(id))
    if (p.papel !== 'contratante') throw new ErroDemo(404, 'Projeto não encontrado.')
    if (p.s.serv_status !== 'em_andamento') throw new ErroDemo(400, 'Só dá para guardar o pagamento de projetos em andamento.')
    if (p.s.serv_garantia_em) throw new ErroDemo(400, 'O pagamento deste projeto já está guardado.')
    const valor = Math.round(Number(c.valor ?? p.s.serv_valor) * 100) / 100
    if (!Number.isFinite(valor) || valor <= 0 || valor > 1_000_000) throw new ErroDemo(400, 'Valor inválido.')
    garantirSaldoInicial(e)
    if (saldoDe(e, e.eu) < valor) throw new ErroDemo(400, 'Saldo fictício insuficiente. Adicione saldo na sua carteira.')
    Object.assign(p.s, { serv_garantia_valor: valor, serv_garantia_em: new Date().toISOString() })
    movimentar(e, e.eu, p.s.serv_id, 'garantia', -valor, `Garantia de "${p.s.serv_titulo}"`)
    notificar(e, p.free, 'Pagamento guardado', `O pagamento de ${reais(valor)} de "${p.s.serv_titulo}" está guardado na garantia. Ele cai na sua carteira quando o projeto for finalizado.`)
    return ok(`${reais(valor)} guardados na garantia. O freelancer recebe quando você finalizar o projeto.`, { saldo: saldoDe(e, e.eu) })
  }],
  ['PUT', /^\/servicos\/(\d+)\/ajustes$/, (e, [id], c) => {
    const nota = String(c.nota ?? '').trim()
    if (nota.length < 5) throw new ErroDemo(400, 'Conte o que precisa ser ajustado (pelo menos 5 letras).')
    if (nota.length > 500) throw new ErroDemo(400, 'O pedido pode ter até 500 letras.')
    const p = participacaoDe(e, Number(id))
    if (p.papel !== 'contratante') throw new ErroDemo(404, 'Projeto não encontrado.')
    if (p.s.serv_status !== 'em_andamento' || !p.s.serv_entregue_em) throw new ErroDemo(400, 'Só dá para pedir ajustes depois que o freelancer entregar.')
    const feitas = p.s.serv_revisoes ?? 0
    if (feitas >= LIMITE_REVISOES) throw new ErroDemo(400, `Este projeto já teve ${LIMITE_REVISOES} pedidos de ajuste. Converse pelo chat ou abra uma disputa.`)
    Object.assign(p.s, { serv_entregue_em: null, serv_revisoes: feitas + 1, serv_revisao_nota: nota })
    notificar(e, p.free, 'Ajustes pedidos', `O contratante pediu ajustes em "${p.s.serv_titulo}": ${nota.slice(0, 140)}`)
    const restam = LIMITE_REVISOES - feitas - 1
    return ok(`Pedido enviado. ${restam === 0 ? 'Este foi o último ajuste.' : `Ainda ${restam === 1 ? 'resta 1 pedido' : `restam ${restam} pedidos`} de ajuste.`}`)
  }],
  ['POST', /^\/servicos\/(\d+)\/disputa$/, (e, [id], c) => {
    const motivo = String(c.motivo ?? '')
    const detalhe = String(c.detalhe ?? '').trim()
    if (!MOTIVOS_DISPUTA[motivo]) throw new ErroDemo(400, 'Escolha o motivo da disputa.')
    if (detalhe.length < 10) throw new ErroDemo(400, 'Explique o que aconteceu (pelo menos 10 letras).')
    if (detalhe.length > 1000) throw new ErroDemo(400, 'A explicação pode ter até 1000 letras.')
    const p = participacaoDe(e, Number(id))
    if (p.s.serv_status !== 'em_andamento') throw new ErroDemo(400, 'Só dá para abrir disputa em projetos em andamento.')
    if (e.disputas.some((d) => d.serv_id === p.s.serv_id && d.dis_status === 'aberta')) throw new ErroDemo(400, 'Já existe uma disputa aberta para este projeto. A administração vai analisar.')
    e.disputas.push({ dis_id: e.proximo++, serv_id: p.s.serv_id, usu_id: e.eu, dis_motivo: motivo, dis_detalhe: detalhe, dis_status: 'aberta', dis_decisao: null, dis_resposta: null, dis_data: new Date().toISOString(), dis_resolvida_em: null })
    notificar(e, p.papel === 'contratante' ? p.free : p.s.cont_usu, 'Disputa aberta', `Foi aberta uma disputa em "${p.s.serv_titulo}". A administração vai analisar e avisar vocês dois.`)
    for (const a of e.usuarios.filter((u) => u.tipo_usuario === 'administrador')) notificar(e, a.usu_id, 'Nova disputa', `"${p.s.serv_titulo}" precisa de mediação.`)
    return ok('Disputa aberta. A administração vai analisar e responder aos dois.')
  }],

  /* Carteira fictícia */
  ['GET', /^\/carteira$/, (e) => {
    garantirSaldoInicial(e)
    const ehContratante = quem(e, e.eu).tipo_usuario === 'contratante'
    const guardados = e.servicos
      .filter((s) => s.serv_garantia_em && !s.serv_garantia_liberada_em && !s.serv_garantia_estornada_em && (ehContratante ? s.cont_usu === e.eu : contratadoDe(e, s.serv_id) === e.eu))
      .map((s) => ({ serv_id: s.serv_id, serv_titulo: s.serv_titulo, valor: restanteDaGarantia(e, s) }))
    return {
      disponivel: true,
      saldo: saldoDe(e, e.eu),
      garantido: guardados.reduce((t, g) => t + g.valor, 0),
      guardados,
      movimentos: e.carteira.filter((m) => m.usu_id === e.eu).sort((x, y) => y.mov_id - x.mov_id).map((m) => ({ ...m, serv_titulo: m.serv_id ? e.servicos.find((s) => s.serv_id === m.serv_id)?.serv_titulo ?? null : null })),
    }
  }],
  ['POST', /^\/carteira\/credito$/, (e) => {
    if (quem(e, e.eu).tipo_usuario !== 'contratante') throw new ErroDemo(403, 'Só contratantes adicionam saldo.')
    garantirSaldoInicial(e)
    if (saldoDe(e, e.eu) + 1000 > 50000) throw new ErroDemo(400, 'Na simulação o saldo vai até R$ 50.000,00.')
    movimentar(e, e.eu, null, 'credito', 1000, 'Saldo fictício adicionado')
    return ok('R$ 1.000,00 fictícios adicionados.', { saldo: saldoDe(e, e.eu) })
  }],

  /* Disputas na administração */
  ['GET', /^\/admin\/disputas$/, (e, _p, _c, busca) => ({
    disputas: e.disputas
      .filter((d) => d.dis_status === (busca.get('status') === 'resolvida' ? 'resolvida' : 'aberta'))
      .map((d) => {
        const s = servicoDe(e, d.serv_id)
        const free = contratadoDe(e, s.serv_id)
        return {
          ...d, motivo_texto: MOTIVOS_DISPUTA[d.dis_motivo] ?? d.dis_motivo, autor_nome: quem(e, d.usu_id).usu_nome,
          serv_titulo: s.serv_titulo, serv_valor: s.serv_valor, serv_tipo_valor: s.serv_tipo_valor, serv_status: s.serv_status, serv_entregue_em: s.serv_entregue_em,
          serv_revisoes: s.serv_revisoes ?? 0, serv_garantia_valor: s.serv_garantia_valor ?? null, serv_garantia_em: s.serv_garantia_em ?? null,
          serv_garantia_liberada_em: s.serv_garantia_liberada_em ?? null, serv_garantia_estornada_em: s.serv_garantia_estornada_em ?? null,
          contratante_usu_id: s.cont_usu, contratante_nome: quem(e, s.cont_usu).usu_nome, freelancer_usu_id: free, freelancer_nome: free ? quem(e, free).usu_nome : null,
        }
      }),
  })],
  ['PUT', /^\/admin\/disputas\/(\d+)$/, (e, [id], c) => {
    const decisao = String(c.decisao ?? '')
    const resposta = String(c.resposta ?? '').trim()
    if (!['freelancer', 'contratante', 'acordo'].includes(decisao)) throw new ErroDemo(400, 'Escolha a decisão.')
    if (resposta.length < 5) throw new ErroDemo(400, 'Escreva um recado para os dois (pelo menos 5 letras).')
    const d = e.disputas.find((x) => x.dis_id === Number(id))
    if (!d) throw new ErroDemo(404, 'Disputa não encontrada.')
    if (d.dis_status !== 'aberta') throw new ErroDemo(400, 'Esta disputa já foi resolvida.')
    const s = servicoDe(e, d.serv_id)
    if (decisao !== 'acordo' && s.serv_status !== 'em_andamento') throw new ErroDemo(400, 'O projeto não está mais em andamento: escolha "Encerrar sem mudar o projeto".')
    let efeito = ''
    if (decisao === 'freelancer') {
      const pago = concluirProjeto(e, s)
      efeito = pago ? ' O projeto foi finalizado e o pagamento guardado foi para o freelancer.' : ' O projeto foi finalizado.'
    } else if (decisao === 'contratante') {
      s.serv_status = 'cancelado'
      const devolvido = estornarGarantia(e, s)
      efeito = devolvido ? ` O projeto foi cancelado e ${reais(devolvido)} voltaram para o contratante.` : ' O projeto foi cancelado.'
    }
    Object.assign(d, { dis_status: 'resolvida', dis_decisao: decisao, dis_resposta: resposta, dis_resolvida_em: new Date().toISOString() })
    const texto = `A disputa de "${s.serv_titulo}" foi resolvida.${efeito} Recado da administração: ${resposta}`
    notificar(e, s.cont_usu, 'Disputa resolvida', texto)
    const free = contratadoDe(e, s.serv_id)
    if (free) notificar(e, free, 'Disputa resolvida', texto)
    registrar(e, 'disputa_resolvida', s.cont_usu, `${s.serv_titulo}: a favor de ${decisao}`)
    return ok(`Disputa resolvida.${efeito}`)
  }],

  /* Projeto concluído vira portfólio; certificado público */
  ['POST', /^\/portfolio\/de-projeto\/(\d+)$/, (e, [id], c) => {
    const s = servicoDe(e, Number(id))
    if (contratadoDe(e, s.serv_id) !== e.eu) throw new ErroDemo(404, 'Projeto não encontrado entre os seus trabalhos.')
    if (s.serv_status !== 'finalizado') throw new ErroDemo(400, 'Só projetos concluídos vão para o portfólio.')
    if (e.portfolio.some((p) => p.port_serv_id === s.serv_id)) throw new ErroDemo(400, 'Este projeto já está no seu portfólio.')
    const aval = e.avaliacoes.find((a) => a.serv_id === s.serv_id && a.usu_avaliado === e.eu && a.usu_avaliador === s.cont_usu && visivel(e, a))
    const depoimento = aval ? `\n\n★ ${aval.aval_nota}/5${aval.aval_comentario ? ` — "${aval.aval_comentario}"` : ''} (${nomeCurto(quem(e, s.cont_usu).usu_nome)})` : ''
    const titulo = String(c.port_titulo ?? '').trim() || s.serv_titulo
    const desc = (String(c.port_desc ?? '').trim() || s.serv_desc) + depoimento
    if (titulo.length > 150) throw new ErroDemo(400, 'O título deve ter no máximo 150 caracteres.')
    const agora = new Date().toISOString()
    const item = { port_id: e.proximo++, usu_id: e.eu, port_titulo: titulo, port_desc: desc, port_link: null, port_img: null, port_data_criacao: agora, port_data_atualizacao: agora, port_serv_id: s.serv_id }
    e.portfolio.unshift(item)
    contarNaSemana(e, 'vitrine')
    return ok('Projeto adicionado ao portfólio!', { item })
  }],
  ['GET', /^\/publico\/certificado\/(\d+)$/, (e, [id]) => {
    const s = e.servicos.find((x) => x.serv_id === Number(id) && x.serv_status === 'finalizado')
    const free = s ? contratadoDe(e, s.serv_id) : null
    if (!s || !free) throw new ErroDemo(404, 'Certificado não encontrado.')
    const f = quem(e, free)
    const aval = e.avaliacoes.find((a) => a.serv_id === s.serv_id && a.usu_avaliado === free && a.usu_avaliador === s.cont_usu && visivel(e, a))
    return {
      certificado: {
        serv_id: s.serv_id, titulo: s.serv_titulo, categoria: tipoNome(s.tipo_id), freelancer: f.usu_nome, freelancer_id: f.usu_id, nivel: nivelPorXp(f.free_xp ?? 0),
        cliente: nomeCurto(quem(e, s.cont_usu).usu_nome), concluido_em: s.serv_finalizado_em ?? s.serv_data_criacao, nota: aval?.aval_nota ?? null,
        codigo: (s.serv_id * 2654435761 >>> 0).toString(16).slice(0, 8).toUpperCase().padStart(8, '0'),
      },
    }
  }],

  /* Conta: disponibilidade, sequência, e-mail semanal, dados e ganhos */
  ['PUT', /^\/usuarios\/eu\/disponibilidade$/, (e, _p, c) => {
    const u = quem(e, e.eu)
    if (u.tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'Só freelancers mostram disponibilidade.')
    const status = String(c.status ?? '') as NonNullable<Usuario['disponibilidade']>
    if (!['disponivel', 'ocupado', 'ferias'].includes(status)) throw new ErroDemo(400, 'Escolha disponível, ocupado ou de férias.')
    let ate: string | null = null
    if (status !== 'disponivel' && c.ate) {
      ate = String(c.ate).slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ate)) throw new ErroDemo(400, 'Data inválida.')
      if (ate < hojeData()) throw new ErroDemo(400, 'A data de volta não pode estar no passado.')
    }
    Object.assign(u, { disponibilidade: status, disponivel_ate: ate })
    /* "Me avise quando estiver livre" */
    if (status === 'disponivel') {
      for (const a of e.avisosLivre.filter((x) => x.free_usu_id === u.usu_id)) notificar(e, a.usu_id, `${u.usu_nome.split(' ')[0]} está livre`, `${u.usu_nome.split(' ')[0]} voltou a aceitar projetos. Que tal mandar um convite?`)
      e.avisosLivre = e.avisosLivre.filter((x) => x.free_usu_id !== u.usu_id)
    }
    const mensagem = status === 'disponivel' ? 'Você aparece como disponível.' : status === 'ocupado' ? 'Você aparece como ocupado.' : 'Boas férias! Você aparece como de férias.'
    return { mensagem, disponibilidade: disponibilidadeDe(u) }
  }],
  ['POST', /^\/usuarios\/eu\/atividade$/, (e) => {
    const dias = (e.atividade[e.eu] ??= [])
    if (!dias.includes(hojeData())) dias.push(hojeData())
    return { disponivel: true, ...calcularSequencia(dias) }
  }],
  ['PUT', /^\/usuarios\/eu\/resumo$/, (e, _p, c) => {
    quem(e, e.eu).resumo_email = Boolean(c.ativo)
    return { mensagem: c.ativo ? 'Você vai receber o resumo toda segunda-feira.' : 'Pronto, sem resumo por e-mail.', ativo: Boolean(c.ativo) }
  }],
  ['GET', /^\/usuarios\/eu\/resumo-previa$/, (e) => ({ resumo: resumoDe(e) })],
  ['GET', /^\/usuarios\/eu\/dados$/, (e) => dadosDe(e)],
  ['GET', /^\/usuarios\/eu\/ganhos$/, (e) => ganhosDe(e)],

  /* Loja de cosméticos e cenário próprio */
  ['GET', /^\/loja$/, (e) => lojaDe(e)],
  ['GET', /^\/loja\/tema$/, (e) => ({ tema: quem(e, e.eu).tema_cenario ?? null })],
  ['POST', /^\/loja\/(\w+)\/comprar$/, (e, [codigo]) => {
    const item = LOJA[codigo]
    if (!item) throw new ErroDemo(404, 'Item não encontrado.')
    const atual = lojaDe(e)
    if (atual.itens.find((i) => i.codigo === codigo)?.comprado) throw new ErroDemo(400, 'Você já tem este item.')
    if (atual.xp_livre < item.preco) throw new ErroDemo(400, `Faltam ${item.preco - atual.xp_livre} XP para este item.`)
    e.compras.push({ usu_id: e.eu, codigo, preco: item.preco })
    quem(e, e.eu)[CAMPO_EQUIPADO[item.tipo]] = codigo
    return { mensagem: `${item.nome} é seu! Já está equipado.`, ...lojaDe(e) }
  }],
  ['PUT', /^\/loja\/equipar$/, (e, _p, c) => {
    const tipo = String(c.tipo ?? '') as keyof typeof CAMPO_EQUIPADO
    const codigo = c.codigo ? String(c.codigo) : null
    if (!CAMPO_EQUIPADO[tipo]) throw new ErroDemo(400, 'Tipo de item inválido.')
    if (codigo && (LOJA[codigo]?.tipo !== tipo || !e.compras.some((x) => x.usu_id === e.eu && x.codigo === codigo))) throw new ErroDemo(400, 'Compre o item antes de usar.')
    quem(e, e.eu)[CAMPO_EQUIPADO[tipo]] = codigo
    return { mensagem: codigo ? `${LOJA[codigo].nome} equipado.` : 'Item tirado.', ...lojaDe(e) }
  }],

  /* Eventos sazonais */
  ['GET', /^\/eventos$/, (e) => eventoDe(e)],
  ['POST', /^\/eventos\/coletar$/, (e) => {
    const ev = eventoAtual()
    if (!ev) throw new ErroDemo(400, 'Nenhum evento acontecendo agora.')
    const agora = Date.now()
    if (agora - (ultimaColeta.get(e.eu) ?? 0) < INTERVALO_COLETA) throw new ErroDemo(429, `Calma! Espere um pouquinho para pegar outro ${ev.item}.`)
    ultimaColeta.set(e.eu, agora)
    let linha = e.eventos.find((x) => x.usu_id === e.eu && x.codigo === ev.codigo && x.ano === ev.ano)
    if (!linha) e.eventos.push((linha = { usu_id: e.eu, codigo: ev.codigo, ano: ev.ano, qtd: 0, completo_em: null, resgatado: false }))
    if (linha.qtd >= ev.meta) return { mensagem: `Você já achou todos os ${ev.itens}!`, ...eventoDe(e) }
    linha.qtd += 1
    const completou = linha.qtd >= ev.meta
    if (completou) {
      linha.completo_em = new Date().toISOString()
      notificar(e, e.eu, `Evento de ${ev.nome}`, `Você achou todos os ${ev.itens} e ganhou a insígnia "${ev.insignia}"!`)
    }
    return { mensagem: completou ? `Insígnia "${ev.insignia}" desbloqueada!` : `${linha.qtd} de ${ev.meta} ${ev.itens}!`, completou, ...eventoDe(e) }
  }],
  ['POST', /^\/eventos\/resgatar$/, (e) => {
    const ev = eventoAtual()
    if (!ev) throw new ErroDemo(400, 'Nenhum evento acontecendo agora.')
    if (quem(e, e.eu).tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'O XP do evento é para freelancers.')
    const linha = e.eventos.find((x) => x.usu_id === e.eu && x.codigo === ev.codigo && x.ano === ev.ano)
    if (!linha?.completo_em) throw new ErroDemo(400, `Ache todos os ${ev.itens} primeiro.`)
    if (linha.resgatado) throw new ErroDemo(400, 'Você já resgatou o XP deste evento.')
    linha.resgatado = true
    ganharXp(e, e.eu, ev.xp)
    return { mensagem: `Missão de ${ev.nome} cumprida! +${ev.xp} XP`, xp: ev.xp, ...eventoDe(e) }
  }],

  /* Temporada do ranking: os 3 primeiros do mês passado */
  ['GET', /^\/ranking\/campeoes$/, (e) => {
    const agora = new Date()
    return { mes: new Date(agora.getFullYear(), agora.getMonth() - 1, 15).toISOString().slice(0, 7), campeoes: campeoesDe(e) }
  }],

  /* Proposta no chat, "digitando..." e "visto" */
  ['POST', /^\/mensagens\/proposta$/, (e, _p, c) => {
    const serv_id = Number(c.serv_id)
    const destino = Number(c.destinatario_id)
    const valor = c.valor === '' || c.valor == null ? null : Math.round(Number(c.valor) * 100) / 100
    const prazo = c.prazo === '' || c.prazo == null ? null : Number(c.prazo)
    const recado = String(c.texto ?? '').trim().slice(0, 300)
    if (valor === null && prazo === null) throw new ErroDemo(400, 'Proponha um valor, um prazo ou os dois.')
    if (valor !== null && (!Number.isFinite(valor) || valor <= 0 || valor > 1_000_000)) throw new ErroDemo(400, 'Valor inválido.')
    if (prazo !== null && (!Number.isInteger(prazo) || prazo < 1 || prazo > 365)) throw new ErroDemo(400, 'O prazo vai de 1 a 365 dias.')
    const s = servicoDe(e, serv_id)
    const freeId = s.cont_usu === e.eu ? destino : e.eu
    const cand = e.candidaturas.find((x) => x.serv_id === serv_id && x.free_usu === freeId && x.cand_status !== 'cancelada')
    const negociavel = s.serv_status === 'em_andamento' ? cand?.cand_status === 'aceita' : s.serv_status === 'aberto' && cand?.cand_status === 'pendente'
    if (!negociavel) throw new ErroDemo(400, 'Só dá para propor valor e prazo em candidaturas em análise ou projetos em andamento.')
    for (const m of e.mensagens) {
      if (m.serv_id === serv_id && m.msg_proposta_status === 'pendente' && [m.usu_remetente, m.usu_destinatario].includes(destino) && [m.usu_remetente, m.usu_destinatario].includes(e.eu)) m.msg_proposta_status = 'recusada'
    }
    const partes = [valor !== null ? `${reais(valor)}${s.serv_tipo_valor === 'hora' ? '/hora' : ''}` : null, prazo !== null ? `${prazo} ${prazo === 1 ? 'dia' : 'dias'}` : null].filter(Boolean)
    const m = { msg_id: e.proximo++, serv_id, usu_remetente: e.eu, usu_destinatario: destino, msg_texto: recado || `Proposta: ${partes.join(' · ')}`, msg_data: new Date().toISOString(), msg_lida: false, msg_proposta_valor: valor, msg_proposta_prazo: prazo, msg_proposta_status: 'pendente' as const }
    e.mensagens.push(m)
    notificar(e, destino, 'Nova proposta', `${quem(e, e.eu).usu_nome} propôs ${partes.join(' e ')} em "${s.serv_titulo}".`)
    responderSozinho(e, serv_id, destino, 'proposta')
    return ok('Proposta enviada.', { msg_id: m.msg_id })
  }],
  ['PUT', /^\/mensagens\/proposta\/(\d+)$/, (e, [id], c) => {
    const acao = c.acao === 'aceitar' ? 'aceita' : c.acao === 'recusar' ? 'recusada' : null
    if (!acao) throw new ErroDemo(400, 'Escolha aceitar ou recusar.')
    const msg = e.mensagens.find((m) => m.msg_id === Number(id))
    if (!msg || msg.usu_destinatario !== e.eu || !msg.msg_proposta_status) throw new ErroDemo(404, 'Proposta não encontrada.')
    if (msg.msg_proposta_status !== 'pendente') throw new ErroDemo(400, 'Esta proposta já foi respondida.')
    const efeito = acao === 'aceita' ? aplicarProposta(e, msg) : ''
    msg.msg_proposta_status = acao
    notificar(e, msg.usu_remetente, acao === 'aceita' ? 'Proposta aceita' : 'Proposta recusada', `${quem(e, e.eu).usu_nome} ${acao === 'aceita' ? 'aceitou' : 'recusou'} sua proposta em "${servicoDe(e, msg.serv_id).serv_titulo}".${efeito}`)
    return ok(acao === 'aceita' ? `Proposta aceita.${efeito}` : 'Proposta recusada.')
  }],
  ['POST', /^\/mensagens\/digitando$/, () => undefined],
  ['GET', /^\/mensagens\/(\d+)\/(\d+)\/estado$/, (e, [serv, outro]) => {
    const agora = Date.now()
    const digitando = e.digitando.some((d) => d.serv_id === Number(serv) && d.usu_id === Number(outro) && d.outro_id === e.eu && d.ate > agora)
    const lidas = e.mensagens.filter((m) => m.serv_id === Number(serv) && m.usu_remetente === e.eu && m.usu_destinatario === Number(outro) && m.msg_lida)
    return { digitando, lidas_ate: lidas.reduce((x, m) => Math.max(x, m.msg_id), 0), visto_em: vistoDe(quem(e, Number(outro))) }
  }],

  /* Segurança: verificação em 2 etapas e sessões (no modo o código é sempre 123456) */
  ['GET', /^\/auth\/seguranca$/, (e) => ({ dois_fatores: Boolean(quem(e, e.eu).dois_fatores), dois_fatores_possivel: true, email: quem(e, e.eu).usu_email.replace(/^(.)(.*)(.@.*)$/, (_x, a: string, meio: string, b: string) => a + '*'.repeat(Math.max(1, meio.length)) + b), sessoes_disponivel: true })],
  ['POST', /^\/auth\/2fa\/codigo$/, () => ok('Modo demonstração: o código é 123456 (no site de verdade ele chega por e-mail).')],
  ['PUT', /^\/auth\/2fa$/, (e, _p, c) => {
    if (String(c.codigo ?? '').replace(/\D/g, '') !== '123456') throw new ErroDemo(401, 'Código incorreto.')
    quem(e, e.eu).dois_fatores = Boolean(c.ativo)
    return { mensagem: c.ativo ? 'Verificação em 2 etapas ligada. No próximo login vamos pedir um código do e-mail.' : 'Verificação em 2 etapas desligada.', dois_fatores: Boolean(c.ativo) }
  }],
  ['GET', /^\/auth\/sessoes$/, (e) => ({ disponivel: true, sessoes: sessoesDe(e) })],
  ['DELETE', /^\/auth\/sessoes\/([\w-]+)$/, (e, [id]) => {
    const s = sessoesDe(e).find((x) => x.ses_id === id)
    if (!s) throw new ErroDemo(404, 'Sessão não encontrada.')
    if (s.atual) throw new ErroDemo(400, 'Para sair deste aparelho, use o botão Sair.')
    e.sessoes = e.sessoes.filter((x) => x.ses_id !== id)
    return ok('Pronto: aquele aparelho foi desconectado.')
  }],
  ['POST', /^\/auth\/sessoes\/encerrar-outras$/, (e) => {
    const antes = sessoesDe(e).filter((s) => !s.atual).length
    e.sessoes = e.sessoes.filter((s) => s.usu_id !== e.eu || s.atual)
    return ok(antes === 1 ? '1 outro aparelho foi desconectado.' : `Todos os outros aparelhos foram desconectados (${antes}).`)
  }],
  ['POST', /^\/auth\/sair$/, () => ok('Até logo!')],

  /* Candidaturas */
  ['GET', /^\/candidaturas\/minhas$/, (e) => ({
    candidaturas: e.candidaturas.filter((c) => c.free_usu === e.eu).map((c) => ({ ...listaServico(e, servicoDe(e, c.serv_id)), cand_id: c.cand_id, cand_status: c.cand_status, ...camposProposta(c) })),
  })],
  ['GET', /^\/candidaturas\/recebidas$/, (e) => ({
    candidatos: e.candidaturas
      .filter((c) => servicoDe(e, c.serv_id).cont_usu === e.eu && c.cand_status !== 'cancelada')
      .map((c) => {
        const s = servicoDe(e, c.serv_id)
        const f = quem(e, c.free_usu)
        const g = c.cand_gui_id ? e.guildas.find((x) => x.gui_id === c.cand_gui_id) : null
        const guilda = g ? { gui_id: g.gui_id, nome: g.nome, brasao: g.brasao, cor: g.cor, membros: e.membros.filter((m) => m.gui_id === g.gui_id).length } : null
        return { cand_id: c.cand_id, cand_status: c.cand_status, ...camposProposta(c), serv_id: s.serv_id, serv_titulo: s.serv_titulo, serv_valor: s.serv_valor, serv_tipo_valor: s.serv_tipo_valor, serv_qtd_dias: s.serv_qtd_dias, usu_id: f.usu_id, usu_nome: f.usu_nome, usu_desc: f.usu_desc, usu_cid: f.usu_cid, usu_est: f.usu_est, usu_foto: f.usu_foto, guilda }
      }),
  })],
  ['PUT', /^\/candidaturas\/(\d+)$/, (e, [id], c) => {
    const cand = e.candidaturas.find((x) => x.cand_id === Number(id))
    if (!cand) throw new ErroDemo(404, 'Candidatura não encontrada.')
    const s = servicoDe(e, cand.serv_id)
    cand.cand_status = c.acao === 'aceitar' ? 'aceita' : 'recusada'
    if (cand.cand_status === 'aceita') {
      /* Aceitar a candidatura aceita também a contraproposta */
      s.serv_status = 'em_andamento'
      s.serv_contratado_em = new Date().toISOString()
      if (cand.cand_valor_proposto != null) s.serv_valor = cand.cand_valor_proposto
      if (cand.cand_prazo_proposto != null) s.serv_qtd_dias = cand.cand_prazo_proposto
      for (const outra of e.candidaturas) if (outra.serv_id === s.serv_id && outra !== cand && outra.cand_status === 'pendente') outra.cand_status = 'recusada'
    }
    notificar(e, cand.free_usu, cand.cand_status === 'aceita' ? 'Você foi contratado!' : 'Candidatura recusada', `Sua candidatura a "${s.serv_titulo}" foi ${cand.cand_status}.`)
    return ok('Candidatura respondida.')
  }],

  /* Histórico e avaliações */
  ['GET', /^\/historico$/, (e) => {
    const eu = quem(e, e.eu)
    const meus = eu.tipo_usuario === 'contratante'
      ? e.servicos.filter((s) => s.cont_usu === e.eu && ['em_andamento', 'finalizado', 'cancelado'].includes(s.serv_status))
      : e.servicos.filter((s) => contratadoDe(e, s.serv_id) === e.eu)
    return {
      itens: meus.map((s) => {
        const outro = eu.tipo_usuario === 'contratante' ? contratadoDe(e, s.serv_id) : s.cont_usu
        const disputa = e.disputas.find((d) => d.serv_id === s.serv_id && d.dis_status === 'aberta')
        return {
          ...listaServico(e, s), outro_usu_id: outro, outro_nome: outro ? quem(e, outro).usu_nome : null, etapas: etapasDe(e, s.serv_id),
          serv_revisoes: s.serv_revisoes ?? 0,
          serv_bonus_valor: s.serv_bonus_valor ?? null,
          serv_bonus_em: s.serv_bonus_em ?? null,
          serv_pausa_pedida_por: s.serv_pausa_pedida_por ?? null,
          serv_pausa_motivo: s.serv_pausa_motivo ?? null,
          serv_pausado_em: s.serv_pausado_em ?? null,
          serv_pausa_dias: s.serv_pausa_dias ?? 0,
          serv_repetir: s.serv_repetir ?? false,
          serv_repetir_em: s.serv_repetir_em ?? null,
          serv_amostra_de: s.serv_amostra_de ?? null,
          disputa: disputa ? { motivo: MOTIVOS_DISPUTA[disputa.dis_motivo] ?? disputa.dis_motivo, data: disputa.dis_data } : null,
          nota_recebida: e.avaliacoes.find((a) => a.serv_id === s.serv_id && a.usu_avaliado === e.eu && visivel(e, a))?.aval_nota ?? null,
          no_portfolio: e.portfolio.some((p) => p.port_serv_id === s.serv_id),
        }
      }),
    }
  }],

  /* Etapas: o contratante cria e remove, o freelancer contratado marca como feita */
  ['GET', /^\/servicos\/(\d+)\/etapas$/, (e, [id]) => ({ etapas: etapasDe(e, participanteDe(e, Number(id)).serv_id) })],
  ['POST', /^\/servicos\/(\d+)\/etapas$/, (e, [id], c) => {
    const s = participanteDe(e, Number(id))
    if (s.cont_usu !== e.eu) throw new ErroDemo(403, 'Só o contratante define as etapas.')
    if (s.serv_status !== 'em_andamento') throw new ErroDemo(400, 'Só dá para criar etapas em projetos em andamento.')
    const titulo = String(c.titulo ?? '').trim()
    if (!titulo || titulo.length > 100) throw new ErroDemo(400, 'Dê um nome de até 100 letras para a etapa.')
    const atuais = etapasDe(e, s.serv_id)
    if (atuais.length >= 10) throw new ErroDemo(400, 'Um projeto pode ter até 10 etapas.')
    e.etapas.push({ eta_id: e.proximo++, serv_id: s.serv_id, eta_titulo: titulo, eta_ordem: atuais.reduce((m, x) => Math.max(m, x.eta_ordem), 0) + 1, eta_concluida_em: null })
    const free = contratadoDe(e, s.serv_id)
    if (free) notificar(e, free, 'Nova etapa no projeto', `"${s.serv_titulo}" ganhou a etapa "${titulo}".`)
    return ok('Etapa criada.', { etapas: etapasDe(e, s.serv_id) })
  }],
  ['DELETE', /^\/servicos\/(\d+)\/etapas\/(\d+)$/, (e, [id, etaId]) => {
    const s = participanteDe(e, Number(id))
    if (s.cont_usu !== e.eu) throw new ErroDemo(403, 'Só o contratante remove etapas.')
    if (e.etapas.find((x) => x.eta_id === Number(etaId))?.eta_liberada_em) throw new ErroDemo(400, 'Esta etapa já foi paga e não pode ser removida.')
    e.etapas = e.etapas.filter((x) => !(x.eta_id === Number(etaId) && x.serv_id === s.serv_id))
    return ok('Etapa removida.', { etapas: etapasDe(e, s.serv_id) })
  }],
  ['PUT', /^\/servicos\/(\d+)\/etapas\/(\d+)$/, (e, [id, etaId]) => {
    const s = participanteDe(e, Number(id))
    if (s.cont_usu === e.eu) throw new ErroDemo(403, 'Quem marca a etapa como feita é o freelancer.')
    if (s.serv_status !== 'em_andamento') throw new ErroDemo(400, 'O projeto não está mais em andamento.')
    const etapa = e.etapas.find((x) => x.eta_id === Number(etaId) && x.serv_id === s.serv_id)
    if (!etapa) throw new ErroDemo(404, 'Etapa não encontrada.')
    if (etapa.eta_liberada_em) throw new ErroDemo(400, 'Esta etapa já foi aprovada e paga: não dá para reabrir.')
    etapa.eta_concluida_em = etapa.eta_concluida_em ? null : new Date().toISOString()
    if (etapa.eta_concluida_em) notificar(e, s.cont_usu, 'Etapa concluída', `A etapa "${etapa.eta_titulo}" de "${s.serv_titulo}" foi marcada como feita.`)
    return ok(etapa.eta_concluida_em ? 'Etapa marcada como feita.' : 'Etapa reaberta.', { etapas: etapasDe(e, s.serv_id) })
  }],

  /* Alertas de busca */
  ['GET', /^\/buscas$/, (e) => ({ buscas: buscasDe(e) })],
  ['POST', /^\/buscas$/, (e, _p, c) => {
    const termo = String(c.termo ?? '').trim()
    const tipo_id = c.tipo_id ? Number(c.tipo_id) : null
    const valorMin = c.valor_min === '' || c.valor_min == null ? null : Number(c.valor_min)
    if (!termo && !tipo_id) throw new ErroDemo(400, 'Escolha uma palavra ou uma categoria para o alerta.')
    if (termo.length > 80) throw new ErroDemo(400, 'A palavra pode ter até 80 letras.')
    if (valorMin !== null && (!Number.isFinite(valorMin) || valorMin < 0)) throw new ErroDemo(400, 'Valor mínimo inválido.')
    if (buscasDe(e).length >= 5) throw new ErroDemo(400, 'Você pode ter até 5 alertas. Apague um para criar outro.')
    e.buscas.push({ bus_id: e.proximo++, usu_id: e.eu, bus_termo: termo || null, tipo_id, bus_valor_min: valorMin, bus_data: new Date().toISOString() })
    return ok('Alerta criado! Avisamos quando sair um projeto assim.', { buscas: buscasDe(e) })
  }],
  ['DELETE', /^\/buscas\/(\d+)$/, (e, [id]) => {
    e.buscas = e.buscas.filter((b) => !(b.bus_id === Number(id) && b.usu_id === e.eu))
    return ok('Alerta apagado.', { buscas: buscasDe(e) })
  }],
  ['GET', /^\/avaliacoes\/pendentes$/, (e) => ({ pendentes: pendentesDe(e) })],
  ['POST', /^\/avaliacoes$/, (e, _p, c) => {
    const nota = Number(c.nota)
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) throw new ErroDemo(400, 'Escolha uma nota de 1 a 5 estrelas.')
    const alvo = pendentesDe(e).find((p) => p.serv_id === Number(c.serv_id) && p.usu_id === Number(c.usu_avaliado))
    if (!alvo) throw new ErroDemo(400, 'Você não pode avaliar esta pessoa neste projeto, ou já avaliou.')
    /* Notas por critério (opcionais) */
    const criterio = (campo: string) => {
      const v = c[campo]
      if (v === undefined || v === null || v === '') return null
      if (!Number.isInteger(Number(v)) || Number(v) < 1 || Number(v) > 5) throw new ErroDemo(400, 'As notas por critério vão de 1 a 5.')
      return Number(v)
    }
    e.avaliacoes.push({
      aval_id: e.proximo++, serv_id: alvo.serv_id, usu_avaliador: e.eu, usu_avaliado: alvo.usu_id, aval_nota: nota, aval_comentario: (c.comentario as string) || null, aval_data: new Date().toISOString(),
      aval_comunicacao: criterio('comunicacao'), aval_prazo: criterio('prazo'), aval_qualidade: criterio('qualidade'),
    })
    const avaliado = quem(e, alvo.usu_id)
    const xp = avaliado.tipo_usuario === 'freelancer' ? ` +${20 * nota} XP!` : ''
    if (avaliado.tipo_usuario === 'freelancer') ganharXp(e, avaliado.usu_id, 20 * nota)
    notificar(e, avaliado.usu_id, 'Você recebeu uma avaliação', alvo.outro_ja_avaliou
      ? `Nota ${nota} de 5 em "${alvo.serv_titulo}". Agora as duas avaliações aparecem.${xp}`
      : `Alguém avaliou você em "${alvo.serv_titulo}". A nota aparece quando você avaliar também (ou em ${DIAS_AVALIACAO_CEGA} dias).${xp}`)
    return ok(alvo.outro_ja_avaliou
      ? 'Avaliação enviada. As duas notas já aparecem no perfil de vocês.'
      : `Avaliação enviada. Ela aparece quando a outra pessoa avaliar também (ou em ${DIAS_AVALIACAO_CEGA} dias).`)
  }],

  /* Mensagens */
  ['GET', /^\/mensagens$/, (e) => ({ conversas: conversasDe(e) })],
  ['GET', /^\/mensagens\/contatos$/, (e) => {
    const eu = quem(e, e.eu)
    return {
      contatos: e.candidaturas
        .filter((c) => c.cand_status !== 'cancelada' && (eu.tipo_usuario === 'freelancer' ? c.free_usu === e.eu : servicoDe(e, c.serv_id).cont_usu === e.eu))
        .map((c) => {
          const s = servicoDe(e, c.serv_id)
          const outro = quem(e, eu.tipo_usuario === 'freelancer' ? s.cont_usu : c.free_usu)
          return { serv_id: s.serv_id, serv_titulo: s.serv_titulo, outro_usu_id: outro.usu_id, outro_nome: outro.usu_nome, outro_foto: outro.usu_foto, cand_status: c.cand_status }
        }),
    }
  }],
  ['GET', /^\/mensagens\/(\d+)\/(\d+)$/, (e, [serv, outro]) => {
    const msgs = e.mensagens.filter((m) => m.serv_id === Number(serv) && [m.usu_remetente, m.usu_destinatario].includes(Number(outro)) && [m.usu_remetente, m.usu_destinatario].includes(e.eu))
    for (const m of msgs) if (m.usu_destinatario === e.eu) m.msg_lida = true
    /* O PDF não vai na lista (igual ao servidor): só o nome */
    return { mensagens: msgs.map((m) => ({ ...m, msg_arquivo: undefined })) }
  }],
  ['POST', /^\/mensagens$/, (e, _p, c) => {
    const arquivo = (c.arquivo as string) || null
    if (arquivo && (!/^data:application\/pdf;base64,/.test(arquivo) || arquivo.length > 2_100_000)) throw new ErroDemo(400, 'Envie um PDF de até 1,5 MB.')
    const texto = String(c.texto ?? '')
    const serv_id = Number(c.serv_id)
    const destino = Number(c.destinatario_id)
    if (bloqueadosDemo(e, e.eu, destino)) throw new ErroDemo(403, 'Não dá para falar com esta pessoa: uma de vocês bloqueou a outra.')
    /* Responder citando: a mensagem precisa ser desta conversa */
    const resposta = c.resposta_id ? e.mensagens.find((x) => x.msg_id === Number(c.resposta_id) && x.serv_id === serv_id && [x.usu_remetente, x.usu_destinatario].includes(e.eu) && [x.usu_remetente, x.usu_destinatario].includes(destino)) : null
    if (c.resposta_id && !resposta) throw new ErroDemo(400, 'A mensagem citada não é desta conversa.')
    /* Contato por fora antes da contratação: vai, mas com aviso para quem recebe (igual ao servidor) */
    const contratado = e.candidaturas.some((x) => x.serv_id === serv_id && x.cand_status === 'aceita' && [e.eu, destino].includes(x.free_usu))
    const alerta = temContatoExterno(texto) && !contratado
    const m = {
      msg_id: e.proximo++, serv_id, usu_remetente: e.eu, usu_destinatario: destino, msg_texto: texto, msg_imagem: (c.imagem as string) || null,
      msg_arquivo: arquivo, msg_arquivo_nome: arquivo ? String(c.arquivo_nome ?? 'arquivo.pdf').slice(0, 120) : null, msg_data: new Date().toISOString(), msg_lida: false,
      msg_alerta_contato: alerta,
      msg_resposta_id: resposta?.msg_id ?? null,
    }
    e.mensagens.push(m)
    if (new Date().getHours() < 5) liberarConquista(e, 'coruja')
    contarNaSemana(e, 'conversar')
    contarHoje(e, 'conversar')
    responderSozinho(e, m.serv_id, m.usu_destinatario, 'mensagem')
    return ok('Mensagem enviada.', { mensagem_id: m.msg_id, alerta_contato: alerta })
  }],

  ['GET', /^\/mensagens\/arquivo\/(\d+)$/, (e, [id]) => {
    const m = e.mensagens.find((x) => x.msg_id === Number(id) && x.msg_arquivo && (x.usu_remetente === e.eu || x.usu_destinatario === e.eu))
    if (!m) throw new ErroDemo(404, 'Arquivo não encontrado.')
    return { arquivo: m.msg_arquivo, nome: m.msg_arquivo_nome }
  }],

  /* Conquistas secretas */
  ['GET', /^\/conquistas$/, (e) => ({ conquistas: conquistasDe(e) })],
  ['POST', /^\/conquistas\/(\w+)$/, (e, [codigo]) => {
    if (!['explorador', 'lua_cheia', 'clima'].includes(codigo)) throw new ErroDemo(404, 'Conquista não encontrada.')
    const nova = liberarConquista(e, codigo)
    return { nova, conquista: nova ? SECRETAS[codigo].nome : null, conquistas: conquistasDe(e) }
  }],

  /* Notificações */
  ['GET', /^\/notificacoes$/, (e, _p, _c, busca) => {
    gerarLembretes(e)
    /* Avisos por tipo: o que foi desligado no sino não aparece */
    const prefs = quem(e, e.eu).avisos ?? avisosPadrao()
    const minhas = e.notificacoes.filter((n) => {
      if (n.usu_id !== e.eu) return false
      const categoria = categoriaDoAviso(n.not_titulo, n.not_desc)
      return categoria === null || prefs.sino[categoria]
    })
    /* Em páginas de 20 (?antes=<not_id>) */
    const antes = Number(busca.get('antes')) || null
    const pagina = minhas.filter((n) => !antes || n.not_id < antes)
    return { notificacoes: pagina.slice(0, 20), naoLidas: minhas.filter((n) => !n.not_lida).length, mais: pagina.length > 20 }
  }],
  ['PUT', /^\/notificacoes\/lidas$/, (e) => {
    for (const n of e.notificacoes) if (n.usu_id === e.eu) n.not_lida = true
    return ok('Notificações lidas.')
  }],

  /* Convites */
  ['GET', /^\/convites\/recebidos$/, (e) => ({
    convites: e.convites.filter((c) => c.free_usu === e.eu).map((c) => {
      const s = servicoDe(e, c.serv_id)
      const cont = quem(e, s.cont_usu)
      return { ...c, serv_titulo: s.serv_titulo, serv_desc: s.serv_desc, serv_valor: s.serv_valor, serv_tipo_valor: s.serv_tipo_valor, serv_status: s.serv_status, categoria: tipoNome(s.tipo_id), contratante_nome: cont.usu_nome, contratante_foto: cont.usu_foto }
    }),
  })],
  ['GET', /^\/convites\/enviados$/, (e, _p, _c, busca) => ({
    convites: e.convites
      .filter((c) => c.free_usu === Number(busca.get('usu_id')) && servicoDe(e, c.serv_id).cont_usu === e.eu)
      .map((c) => ({ conv_id: c.conv_id, conv_status: c.conv_status, serv_id: c.serv_id, serv_titulo: servicoDe(e, c.serv_id).serv_titulo })),
  })],
  ['POST', /^\/convites$/, (e, _p, c) => {
    if (bloqueadosDemo(e, e.eu, Number(c.usu_id))) throw new ErroDemo(403, 'Não dá para convidar esta pessoa: uma de vocês bloqueou a outra.')
    const conv_id = e.proximo++
    e.convites.push({ conv_id, serv_id: Number(c.serv_id), free_usu: Number(c.usu_id), conv_mensagem: (c.mensagem as string) || null, conv_status: 'pendente', conv_data: new Date().toISOString() })
    notificar(e, Number(c.usu_id), 'Novo convite', `${quem(e, e.eu).usu_nome} convidou você para "${servicoDe(e, Number(c.serv_id)).serv_titulo}".`)
    return ok('Convite enviado!', { conv_id })
  }],
  ['PUT', /^\/convites\/(\d+)$/, (e, [id], c) => {
    const conv = e.convites.find((x) => x.conv_id === Number(id))
    if (!conv) throw new ErroDemo(404, 'Convite não encontrado.')
    conv.conv_status = c.acao === 'aceitar' ? 'aceito' : 'recusado'
    if (conv.conv_status === 'aceito' && !e.candidaturas.some((x) => x.serv_id === conv.serv_id && x.free_usu === e.eu)) {
      e.candidaturas.push({ cand_id: e.proximo++, serv_id: conv.serv_id, free_usu: e.eu, cand_status: 'pendente' })
    }
    return ok(conv.conv_status === 'aceito' ? 'Convite aceito! Sua candidatura foi enviada.' : 'Convite recusado.')
  }],

  /* Portfólio */
  ['GET', /^\/portfolio\/meu$/, (e) => ({ itens: e.portfolio.filter((p) => p.usu_id === e.eu) })],
  ['GET', /^\/portfolio\/freelancer\/(\d+)$/, (e, [id]) => {
    const u = quem(e, Number(id))
    if (quem(e, e.eu).tipo_usuario === 'contratante') registrarVisita(e, u.usu_id, `u:${e.eu}`, 'contratante')
    return {
      perfil: {
        usu_id: u.usu_id, usu_nome: u.usu_nome, usu_desc: u.usu_desc, usu_cid: u.usu_cid, usu_est: u.usu_est, usu_foto: u.usu_foto, free_nivel: nivelPorXp(u.free_xp ?? 0), free_xp: u.free_xp ?? 0, free_rank: mediaDe(e, u.usu_id).media,
        verificado: verificacaoDe(e, u.usu_id).verificado, tempo_resposta: tempoRespostaDe(e, u.usu_id), visto_em: vistoDe(u), ...aparenciaDe(e, u.usu_id),
        criterios: mediasCriterioDemo(e, u.usu_id), horarios: u.horarios ?? null,
      },
      areas: (u.areas ?? []).map((t) => ({ tipo_id: t, tipo_nome: tipoNome(t) })),
      itens: e.portfolio.filter((p) => p.usu_id === u.usu_id),
    }
  }],
  ['POST', /^\/portfolio$/, (e, _p, c) => {
    const agora = new Date().toISOString()
    e.portfolio.unshift({ port_id: e.proximo++, usu_id: e.eu, port_titulo: String(c.port_titulo), port_desc: String(c.port_desc), port_link: (c.port_link as string) || null, port_img: (c.port_img as string) || null, port_data_criacao: agora, port_data_atualizacao: agora })
    contarNaSemana(e, 'vitrine')
    return ok('Trabalho adicionado.')
  }],
  ['PUT', /^\/portfolio\/(\d+)$/, (e, [id], c) => {
    const item = e.portfolio.find((p) => p.port_id === Number(id))
    if (item) Object.assign(item, { port_titulo: c.port_titulo, port_desc: c.port_desc, port_link: c.port_link || null, port_img: c.port_img || null, port_data_atualizacao: new Date().toISOString() })
    contarNaSemana(e, 'vitrine')
    return ok('Trabalho atualizado.')
  }],
  ['DELETE', /^\/portfolio\/(\d+)$/, (e, [id]) => {
    e.portfolio = e.portfolio.filter((p) => p.port_id !== Number(id))
    return ok('Trabalho excluído.')
  }],

  /* Administração */
  ['GET', /^\/admin\/resumo$/, (e) => {
    const conta = <T,>(lista: T[], campo: keyof T) => lista.reduce<Record<string, number>>((acc, x) => ({ ...acc, [String(x[campo])]: (acc[String(x[campo])] ?? 0) + 1 }), {})
    return { usuarios: conta(e.usuarios, 'tipo_usuario'), contas: conta(e.usuarios, 'status_conta'), servicos: conta(e.servicos, 'serv_status'), candidaturas: conta(e.candidaturas, 'cand_status'), avaliacoes: e.avaliacoes.length }
  }],
  ['GET', /^\/admin\/metricas$/, (e) => metricasAdmin(e)],
  ['GET', /^\/admin\/usuarios$/, (e) => ({
    usuarios: [...e.usuarios].reverse().map((u) => ({ usu_id: u.usu_id, usu_nome: u.usu_nome, usu_email: u.usu_email, usu_cid: u.usu_cid, usu_est: u.usu_est, usu_foto: u.usu_foto, tipo_usuario: u.tipo_usuario, status_conta: u.status_conta, data_criacao: u.data_criacao, usu_supremo: u.usu_supremo })),
  })],
  ['GET', /^\/admin\/servicos$/, (e) => ({
    servicos: [...e.servicos].reverse().map((s) => ({ ...listaServico(e, s), contratante_usu_id: s.cont_usu })),
  })],
  ['PUT', /^\/admin\/usuarios\/(\d+)\/status$/, (e, [id], c) => {
    alvoSupremo(e, Number(id), true).status_conta = c.status as Usuario['status_conta']
    registrar(e, `conta_${c.status}`, Number(id))
    return ok('Status da conta atualizado.')
  }],
  ['PUT', /^\/admin\/servicos\/(\d+)\/cancelar$/, (e, [id]) => {
    const s = servicoDe(e, Number(id))
    s.serv_status = 'cancelado'
    registrar(e, 'cancelar_projeto', s.cont_usu, s.serv_titulo)
    return ok('Projeto cancelado.')
  }],
  ['PUT', /^\/admin\/usuarios\/(\d+)\/papel$/, (e, [id], c) => {
    const u = alvoSupremo(e, Number(id))
    registrar(e, 'mudar_papel', u.usu_id, `${u.tipo_usuario} → ${c.tipo}`)
    u.tipo_usuario = c.tipo as PapelDemo
    return ok(`${u.usu_nome} agora é ${u.tipo_usuario}.`)
  }],
  ['DELETE', /^\/admin\/usuarios\/(\d+)$/, (e, [id]) => {
    const u = alvoSupremo(e, Number(id))
    registrar(e, 'excluir_conta', u.usu_id, u.usu_email)
    e.usuarios = e.usuarios.filter((x) => x.usu_id !== u.usu_id)
    e.servicos = e.servicos.filter((s) => s.cont_usu !== u.usu_id)
    return ok(`A conta de ${u.usu_nome} foi excluída.`)
  }],
  ['POST', /^\/admin\/usuarios\/(\d+)\/entrar$/, (e, [id]) => {
    const u = alvoSupremo(e, Number(id))
    registrar(e, 'entrar_como', u.usu_id)
    return { mensagem: `Você está vendo o site como ${u.usu_nome}.`, token: tokenPara(u), tipo: u.tipo_usuario }
  }],
  ['POST', /^\/admin\/avisos$/, (e, _p, c) => {
    const para = e.usuarios.filter((u) => u.status_conta === 'ativa' && (c.para === 'todos' || u.tipo_usuario === c.para))
    for (const u of para) notificar(e, u.usu_id, String(c.titulo), String(c.descricao))
    registrar(e, 'aviso', null, `${c.titulo} (para: ${c.para}, ${para.length} contas)`)
    return ok(`Aviso enviado para ${para.length} ${para.length === 1 ? 'pessoa' : 'pessoas'}.`)
  }],
  ['GET', /^\/admin\/registro$/, (e) => ({ registro: e.registro })],

  /* Avisos no celular não existem no modo demonstração */
  ['GET', /^\/push\/chave$/, () => ({ chave: null })],

  /* Denúncias */
  ['POST', /^\/denuncias$/, (e, _p, c) => {
    if (!['servico', 'usuario', 'mensagem'].includes(String(c.alvo_tipo)) || !c.motivo) throw new ErroDemo(400, 'Escolha o motivo da denúncia.')
    if (c.alvo_tipo === 'mensagem') {
      const msg = e.mensagens.find((m) => m.msg_id === Number(c.alvo_id))
      if (!msg) throw new ErroDemo(404, 'Não encontramos o que você quer denunciar.')
      if (msg.usu_destinatario !== e.eu) throw new ErroDemo(403, 'Só dá para denunciar mensagens que você recebeu.')
    }
    if (e.denuncias.some((d) => d.usu_id === e.eu && d.den_alvo_tipo === c.alvo_tipo && d.den_alvo_id === Number(c.alvo_id))) {
      throw new ErroDemo(400, 'Você já denunciou isso. A administração vai analisar.')
    }
    e.denuncias.unshift({ den_id: e.proximo++, usu_id: e.eu, den_alvo_tipo: c.alvo_tipo as 'servico', den_alvo_id: Number(c.alvo_id), den_motivo: String(c.motivo), den_detalhe: (c.detalhe as string) || null, den_status: 'aberta', den_data: new Date().toISOString() })
    for (const a of e.usuarios.filter((u) => u.tipo_usuario === 'administrador')) notificar(e, a.usu_id, 'Nova denúncia', 'Algo foi denunciado e espera análise.')
    return ok('Denúncia enviada. Obrigado por ajudar a manter a plataforma segura!')
  }],
  ['GET', /^\/admin\/denuncias$/, (e, _p, _c, busca) => ({
    denuncias: e.denuncias
      .filter((d) => d.den_status === (busca.get('status') ?? 'aberta'))
      .map((d) => {
        const s = d.den_alvo_tipo === 'servico' ? e.servicos.find((x) => x.serv_id === d.den_alvo_id) : undefined
        const msg = d.den_alvo_tipo === 'mensagem' ? e.mensagens.find((x) => x.msg_id === d.den_alvo_id) : undefined
        const alvo = e.usuarios.find((u) => u.usu_id === (d.den_alvo_tipo === 'usuario' ? d.den_alvo_id : msg ? msg.usu_remetente : s?.cont_usu))
        return {
          ...d, autor_nome: quem(e, d.usu_id).usu_nome, serv_titulo: s?.serv_titulo ?? null, serv_status: s?.serv_status ?? null, msg_texto: msg?.msg_texto ?? null,
          alvo_usu_id: alvo?.usu_id ?? null, alvo_nome: alvo?.usu_nome ?? null, alvo_status: alvo?.status_conta ?? null, alvo_tipo_usuario: alvo?.tipo_usuario ?? null,
        }
      }),
  })],
  ['PUT', /^\/admin\/denuncias\/(\d+)$/, (e, [id], c) => {
    const den = e.denuncias.find((d) => d.den_id === Number(id))
    if (!den) throw new ErroDemo(404, 'Denúncia não encontrada.')
    const status = c.acao === 'descartar' ? 'descartada' : 'resolvida'
    const iguais = e.denuncias.filter((d) => d.den_status === 'aberta' && d.den_alvo_tipo === den.den_alvo_tipo && d.den_alvo_id === den.den_alvo_id)
    for (const d of iguais) d.den_status = status
    registrar(e, status === 'resolvida' ? 'denuncia_resolvida' : 'denuncia_descartada', den.den_alvo_tipo === 'usuario' ? den.den_alvo_id : null, `${den.den_alvo_tipo} #${den.den_alvo_id} (${den.den_motivo})`)
    return ok(status === 'resolvida' ? `Denúncia resolvida (${iguais.length}).` : `Denúncia descartada (${iguais.length}).`)
  }],

  /* Primeiros passos (Ana já fez quatro: dá para mostrar o resgate) */
  ['GET', /^\/passos$/, (e) => situacaoPassos(e)],
  ['POST', /^\/passos\/(\w+)\/resgatar$/, (e, [codigo]) => {
    const p = situacaoPassos(e).passos.find((x) => x.codigo === codigo)
    if (!p) throw new ErroDemo(404, 'Passo não encontrado.')
    if (p.resgatado) throw new ErroDemo(400, 'Você já ganhou o XP deste passo.')
    if (!p.feito) throw new ErroDemo(400, 'Este passo ainda não foi feito.')
    e.passos.push(`${e.eu}:${codigo}`)
    ganharXp(e, e.eu, p.xp)
    return { mensagem: `Passo concluído! +${p.xp} XP`, xp: p.xp }
  }],

  /* Missões da semana (Ana tem uma pronta para resgatar) */
  ['GET', /^\/missoes$/, (e) => situacaoMissoes(e)],
  ['POST', /^\/missoes\/(\w+)\/resgatar$/, (e, [codigo]) => {
    const situacao = situacaoMissoes(e)
    const doDia = codigo.startsWith('dia_')
    const m = (doDia ? situacao.diarias : situacao.missoes).find((x) => x.codigo === codigo)
    if (!m) throw new ErroDemo(404, 'Missão não encontrada.')
    if (m.resgatada) throw new ErroDemo(400, doDia ? 'Você já resgatou esta missão hoje.' : 'Você já resgatou esta missão nesta semana.')
    if (m.progresso < m.meta) throw new ErroDemo(400, 'Esta missão ainda não foi cumprida.')
    const antes = nivelPorXp(quem(e, e.eu).free_xp ?? 0)
    e.resgatadas.push(doDia ? `${e.eu}:${codigo}:${situacao.dia}` : `${e.eu}:${codigo}`)
    ganharXp(e, e.eu, m.xp)
    return { mensagem: `Missão cumprida! +${m.xp} XP`, xp: m.xp, nivelAntes: antes, nivelDepois: nivelPorXp(quem(e, e.eu).free_xp ?? 0) }
  }],

  /* Ranking: no mês pelo histórico de XP, no geral pelo XP total */
  ['GET', /^\/ranking$/, (e, _p, _c, busca) => {
    const geral = busca.get('periodo') === 'geral'
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
    const xpDe = (u: Usuario) =>
      geral ? u.free_xp ?? 0 : e.xpEventos.filter((x) => x.usu_id === u.usu_id && new Date(x.data).getTime() >= inicioMes).reduce((a, x) => a + x.xp, 0)
    /* Ranking por cidade */
    const cidade = busca.get('cidade')
    const uf = busca.get('estado')
    const lista = e.usuarios
      .filter((u) => u.tipo_usuario === 'freelancer' && u.status_conta === 'ativa' && (!cidade || !uf || (u.usu_cid === cidade && u.usu_est === uf)))
      .map((u) => ({ usu_id: u.usu_id, usu_nome: u.usu_nome, usu_foto: u.usu_foto, free_nivel: nivelPorXp(u.free_xp ?? 0), xp: xpDe(u), moldura: aparenciaDe(e, u.usu_id).moldura, cor_nome: aparenciaDe(e, u.usu_id).cor_nome }))
      .filter((l) => l.xp > 0)
      .sort((a, b) => b.xp - a.xp)
      .map((l, i) => ({ posicao: i + 1, ...l }))
    const fim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
    return { periodo: geral ? 'geral' : 'mes', cidade: cidade && uf ? { cidade, estado: uf } : null, ranking: lista.slice(0, 10), eu: lista.find((l) => l.usu_id === e.eu) ?? null, temporada_termina: fim }
  }],
  ['PUT', /^\/admin\/cenario$/, (e, _p, c) => {
    if ('tema' in c) e.cenario.tema = c.tema as Estado['cenario']['tema']
    if ('clima' in c) e.cenario.clima = c.clima as string | null
    if ('aviso' in c) e.cenario.aviso = (c.aviso as string | null) || null
    if (c.fogos) e.cenario.fogos = Date.now()
    registrar(e, 'cenario', null, JSON.stringify(c))
    return ok('Cenário atualizado para todo mundo.', { cenario: e.cenario })
  }],
]

const MISSOES = [
  { codigo: 'candidatar', titulo: 'Caçador de projetos', descricao: 'Candidate-se a 2 projetos.', meta: 2, xp: 30 },
  { codigo: 'conversar', titulo: 'Bom de papo', descricao: 'Envie 5 mensagens para contratantes.', meta: 5, xp: 20 },
  { codigo: 'vitrine', titulo: 'Vitrine em dia', descricao: 'Adicione ou atualize 1 trabalho no portfólio.', meta: 1, xp: 25 },
  { codigo: 'entregar', titulo: 'Mão na massa', descricao: 'Marque 1 trabalho como entregue.', meta: 1, xp: 50 },
]

/* Missões do dia (iguais às do servidor): renovam à meia-noite */
const MISSOES_DIA = [
  { codigo: 'dia_entrar', titulo: 'Bom dia, castelo', descricao: 'Passe pelo castelo hoje.', meta: 1, xp: 5 },
  { codigo: 'dia_conversar', titulo: 'Recado do dia', descricao: 'Mande 1 mensagem para alguém.', meta: 1, xp: 10 },
  { codigo: 'dia_explorar', titulo: 'Olho no mural', descricao: 'Salve ou candidate-se a 1 projeto.', meta: 1, xp: 10 },
]

function progressoDoDia(e: Estado, codigo: string) {
  const dia = hojeData()
  /* Quem abre as missões já está no castelo hoje */
  if (codigo === 'dia_entrar') return 1
  const hojeEu = e.hoje[e.eu]
  if (!hojeEu || hojeEu.dia !== dia) return 0
  return codigo === 'dia_conversar' ? hojeEu.conversar : hojeEu.explorar
}

function situacaoMissoes(e: Estado) {
  if (quem(e, e.eu).tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'Missões são só para freelancers.')
  const hoje = new Date()
  const proximaSegunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + ((8 - hoje.getDay()) % 7 || 7))
  const dia = hojeData()
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1)
  return {
    semana: hoje.toISOString().slice(0, 10),
    termina: proximaSegunda.toISOString(),
    resgateDisponivel: true,
    missoes: MISSOES.map((m) => ({
      ...m,
      progresso: Math.min(e.semana[e.eu]?.[m.codigo] ?? 0, m.meta),
      resgatada: e.resgatadas.includes(`${e.eu}:${m.codigo}`),
    })),
    dia,
    dia_termina: amanha.toISOString(),
    diarias: MISSOES_DIA.map((m) => ({
      ...m,
      progresso: Math.min(progressoDoDia(e, m.codigo), m.meta),
      resgatada: e.resgatadas.includes(`${e.eu}:${m.codigo}:${dia}`),
    })),
  }
}

function situacaoPassos(e: Estado) {
  const eu = quem(e, e.eu)
  if (eu.tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'Primeiros passos são só para freelancers.')
  const passos = [
    { codigo: 'foto', titulo: 'Coloque uma foto', descricao: 'Contratantes confiam mais em quem mostra o rosto.', link: '/freelancer/perfil', feito: Boolean(eu.usu_foto) },
    { codigo: 'sobre', titulo: 'Conte sobre você', descricao: 'Escreva uma descrição curta no seu perfil.', link: '/freelancer/perfil', feito: Boolean(eu.usu_desc?.trim()) },
    { codigo: 'areas', titulo: 'Escolha suas áreas', descricao: 'Diga em que tipo de trabalho você atua.', link: '/freelancer/perfil', feito: (eu.areas ?? []).length > 0 },
    { codigo: 'portfolio', titulo: 'Mostre um trabalho', descricao: 'Adicione 1 trabalho ao seu portfólio.', link: '/freelancer/perfil', feito: e.portfolio.some((x) => x.usu_id === e.eu) },
    { codigo: 'candidatura', titulo: 'Candidate-se a um projeto', descricao: 'Encontre um projeto e mande sua candidatura.', link: '/freelancer', feito: e.candidaturas.some((x) => x.free_usu === e.eu) },
  ]
  return { resgateDisponivel: true, passos: passos.map((p) => ({ ...p, xp: 20, resgatado: e.passos.includes(`${e.eu}:${p.codigo}`) })) }
}

function camposProjeto(c: Corpo): Partial<Servico> {
  return {
    serv_qtd_dias: Number(c.qtd_dias) || null, serv_local: (c.local as Servico['serv_local']) ?? 'remoto', serv_cidade: (c.cidade as string) ?? null, serv_estado: (c.estado as string) ?? null,
    serv_habilidades: (c.habilidades as string) ?? null, serv_forma_pagamento: (c.forma_pagamento as string) ?? null, serv_vagas: Number(c.vagas) || 1,
  }
}

/* Ações do supremo: só ele, nunca em si mesmo nem em outro supremo (igual ao servidor) */
function alvoSupremo(e: Estado, id: number, admComumPode = false) {
  const eu = quem(e, e.eu)
  const alvo = quem(e, id)
  if (!eu.usu_supremo && !(admComumPode && alvo.tipo_usuario !== 'administrador')) throw new ErroDemo(403, 'Só o administrador supremo pode fazer isso.')
  if (id === e.eu) throw new ErroDemo(400, 'Você não pode fazer isso com a própria conta.')
  if (alvo.usu_supremo) throw new ErroDemo(403, 'Não é possível mexer em outro administrador supremo.')
  return alvo
}

/* ---------- Contraproposta, etapas e alertas (mesmas regras do servidor) ---------- */

function lerProposta(c: Corpo): Pick<Candidatura, 'cand_valor_proposto' | 'cand_prazo_proposto' | 'cand_mensagem'> {
  const valor = c.valor_proposto === '' || c.valor_proposto == null ? null : Number(c.valor_proposto)
  const prazo = c.prazo_proposto === '' || c.prazo_proposto == null ? null : Number(c.prazo_proposto)
  const mensagem = String(c.mensagem ?? '').trim()
  if (valor !== null && (!Number.isFinite(valor) || valor <= 0 || valor > 1_000_000)) throw new ErroDemo(400, 'Valor proposto inválido.')
  if (prazo !== null && (!Number.isInteger(prazo) || prazo < 1 || prazo > 365)) throw new ErroDemo(400, 'O prazo proposto vai de 1 a 365 dias.')
  if (mensagem.length > 500) throw new ErroDemo(400, 'O recado pode ter até 500 letras.')
  return { cand_valor_proposto: valor, cand_prazo_proposto: prazo, cand_mensagem: mensagem || null }
}

const camposProposta = (c: Candidatura) => ({
  cand_valor_proposto: c.cand_valor_proposto ?? null,
  cand_prazo_proposto: c.cand_prazo_proposto ?? null,
  cand_mensagem: c.cand_mensagem ?? null,
})

const etapasDe = (e: Estado, serv_id: number) =>
  e.etapas
    .filter((x) => x.serv_id === serv_id)
    .sort((x, y) => x.eta_ordem - y.eta_ordem || x.eta_id - y.eta_id)
    .map((x) => ({ eta_id: x.eta_id, eta_titulo: x.eta_titulo, eta_ordem: x.eta_ordem, eta_concluida_em: x.eta_concluida_em, eta_liberado_valor: x.eta_liberado_valor ?? null, eta_liberada_em: x.eta_liberada_em ?? null }))

/* Só o dono e o freelancer contratado mexem nas etapas */
function participanteDe(e: Estado, serv_id: number) {
  const s = servicoDe(e, serv_id)
  if (s.cont_usu !== e.eu && contratadoDe(e, serv_id) !== e.eu) throw new ErroDemo(404, 'Projeto não encontrado.')
  return s
}

const buscasDe = (e: Estado) =>
  e.buscas
    .filter((b) => b.usu_id === e.eu)
    .sort((x, y) => y.bus_id - x.bus_id)
    .map((b) => ({ ...b, categoria: b.tipo_id ? tipoNome(b.tipo_id) : null }))

const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/* Projeto publicado: avisa uma vez cada freelancer com alerta parecido */
function avisarBuscas(e: Estado, s: Servico) {
  const avisados = new Set<number>()
  for (const b of e.buscas) {
    if (avisados.has(b.usu_id) || b.usu_id === s.cont_usu || quem(e, b.usu_id).status_conta !== 'ativa') continue
    if (b.tipo_id && b.tipo_id !== s.tipo_id) continue
    if (b.bus_valor_min != null && s.serv_valor < b.bus_valor_min) continue
    if (b.bus_termo && !semAcento(`${s.serv_titulo} ${s.serv_desc}`).includes(semAcento(b.bus_termo))) continue
    avisados.add(b.usu_id)
    notificar(e, b.usu_id, 'Projeto novo para você', `"${s.serv_titulo}" combina com o seu alerta${b.bus_termo ? ` "${b.bus_termo}"` : ''}.`)
  }
}

/* Perfil público (/p/:id): o que o servidor devolve em /publico/freelancer/:id */
function perfilPublico(e: Estado, usu_id: number) {
  const u = e.usuarios.find((x) => x.usu_id === usu_id && x.tipo_usuario === 'freelancer' && x.status_conta === 'ativa')
  if (!u) throw new ErroDemo(404, 'Perfil não encontrado.')
  const p = perfilFreelancer(e, usu_id)
  return {
    perfil: { usu_id: u.usu_id, usu_nome: u.usu_nome, usu_desc: u.usu_desc, usu_cid: u.usu_cid, usu_est: u.usu_est, usu_foto: u.usu_foto, data_criacao: u.data_criacao },
    resumo: p.resumo,
    verificado: verificacaoDe(e, usu_id).verificado,
    tempo_resposta: tempoRespostaDe(e, usu_id),
    ...aparenciaDe(e, usu_id),
    areas: (u.areas ?? []).map(tipoNome),
    portfolio: e.portfolio.filter((x) => x.usu_id === usu_id).slice(0, 12).map(({ port_id, port_titulo, port_desc, port_link, port_img }) => ({ port_id, port_titulo, port_desc, port_link, port_img })),
    insignias: p.insignias.filter((i) => i.conquistada).map(({ codigo, nome, descricao }) => ({ codigo, nome, descricao })),
    avaliacoes: p.avaliacoes.slice(0, 6).map((x) => ({ ...x, avaliador_foto: null, avaliador_nome: nomeCurto(x.avaliador_nome) })),
  }
}

/* Métricas do painel: as mesmas contas de adminController.metricas */
function metricasAdmin(e: Estado) {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7) - 7 * 7)
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const de = new Date(inicio)
    de.setDate(de.getDate() + i * 7)
    return { inicio: de.toISOString().slice(0, 10), freelancer: 0, contratante: 0 }
  })
  for (const u of e.usuarios) {
    if (u.tipo_usuario === 'administrador') continue
    const i = Math.floor((new Date(u.data_criacao).getTime() - inicio.getTime()) / (7 * 86_400_000))
    if (semanas[i]) semanas[i][u.tipo_usuario] += 1
  }
  const porCategoria = new Map<string, number>()
  for (const s of e.servicos) if (s.serv_status !== 'rascunho') porCategoria.set(tipoNome(s.tipo_id), (porCategoria.get(tipoNome(s.tipo_id)) ?? 0) + 1)
  const conta = (st: string) => e.servicos.filter((s) => s.serv_status === st).length
  const concluidos = conta('finalizado')
  const cancelados = conta('cancelado')
  return {
    semanas,
    categorias: [...porCategoria].map(([categoria, total]) => ({ categoria, total })).sort((x, y) => y.total - x.total),
    conclusao: { concluidos, cancelados, emAndamento: conta('em_andamento'), taxa: concluidos + cancelados > 0 ? Math.round((concluidos / (concluidos + cancelados)) * 100) : null },
  }
}

/* ---------- Salvos, prazos, lembretes, selo e conquistas (mesmas regras do servidor) ---------- */

const salvosDe = (e: Estado) => e.salvos.filter((x) => x.usu_id === e.eu).sort((x, y) => y.sal_data.localeCompare(x.sal_data)).map((x) => x.serv_id)

/* Inscrições abertas e fora da fila do filtro de spam */
const aceitaCandidatura = (s: Servico) =>
  (!s.serv_candidaturas_ate || s.serv_candidaturas_ate >= hojeData()) && s.serv_moderacao !== 'pendente' && s.serv_moderacao !== 'recusado'

function lerPrazoCandidaturas(valor: unknown) {
  if (valor === undefined || valor === null || valor === '') return null
  const texto = String(valor).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw new ErroDemo(400, 'Data limite para candidaturas inválida.')
  if (texto < hojeData()) throw new ErroDemo(400, 'A data limite para candidaturas não pode estar no passado.')
  return texto
}

/* Avisa uma vez quando faltam 2 dias e outra quando o prazo vence (só quem participa do projeto) */
function gerarLembretes(e: Estado) {
  const agora = Date.now()
  for (const s of e.servicos) {
    const free = contratadoDe(e, s.serv_id)
    if (s.serv_status !== 'em_andamento' || s.serv_entregue_em || !s.serv_contratado_em || !s.serv_qtd_dias || s.serv_pausado_em) continue
    if (s.cont_usu !== e.eu && free !== e.eu) continue
    const falta = new Date(s.serv_contratado_em).getTime() + s.serv_qtd_dias * 86_400_000 - agora
    if (falta < 0 && !s.serv_lembrete_atraso_em) {
      s.serv_lembrete_atraso_em = new Date().toISOString()
      const texto = `O prazo de "${s.serv_titulo}" passou e o trabalho ainda não foi marcado como entregue.`
      notificar(e, s.cont_usu, 'Prazo vencido', `${texto} Converse com o freelancer pelo chat.`)
      if (free) notificar(e, free, 'Prazo vencido', `${texto} Combine um novo prazo com o contratante.`)
    } else if (falta >= 0 && falta <= 2 * 86_400_000 && !s.serv_lembrete_prazo_em && free) {
      s.serv_lembrete_prazo_em = new Date().toISOString()
      const dias = Math.max(1, Math.ceil(falta / 86_400_000))
      notificar(e, free, 'Prazo chegando', `${dias === 1 ? 'Falta 1 dia' : `Faltam ${dias} dias`} para o prazo de "${s.serv_titulo}".`)
    }
  }
}

function verificacaoDe(e: Estado, usu_id: number) {
  const u = quem(e, usu_id)
  const criterios = [
    { codigo: 'conta', rotulo: 'Conta confirmada', ok: u.status_conta === 'ativa' },
    { codigo: 'foto', rotulo: 'Foto no perfil', ok: Boolean(u.usu_foto) },
    { codigo: 'sobre', rotulo: 'Descrição preenchida', ok: Boolean(u.usu_desc?.trim()) },
    { codigo: 'areas', rotulo: 'Áreas de atuação', ok: (u.areas ?? []).length > 0 },
    { codigo: 'entrega', rotulo: 'Primeiro projeto concluído', ok: e.servicos.some((s) => s.serv_status === 'finalizado' && contratadoDe(e, s.serv_id) === usu_id) },
  ]
  return { verificado: criterios.every((c) => c.ok), criterios }
}

/* Mediana, em minutos, do tempo até responder (null com menos de 2 respostas) */
function tempoRespostaDe(e: Estado, usu_id: number) {
  const esperando = new Map<string, number>()
  const tempos: number[] = []
  const msgs = e.mensagens.filter((m) => m.usu_remetente === usu_id || m.usu_destinatario === usu_id).sort((x, y) => x.msg_data.localeCompare(y.msg_data))
  for (const m of msgs) {
    const chave = `${m.serv_id}:${m.usu_remetente === usu_id ? m.usu_destinatario : m.usu_remetente}`
    const quando = new Date(m.msg_data).getTime()
    if (m.usu_destinatario === usu_id) {
      if (!esperando.has(chave)) esperando.set(chave, quando)
    } else if (esperando.has(chave)) {
      const demora = quando - esperando.get(chave)!
      if (demora >= 0 && demora <= 3 * 86_400_000) tempos.push(demora)
      esperando.delete(chave)
    }
  }
  if (tempos.length < 2) return null
  tempos.sort((x, y) => x - y)
  const meio = Math.floor(tempos.length / 2)
  return Math.max(1, Math.round((tempos.length % 2 ? tempos[meio] : (tempos[meio - 1] + tempos[meio]) / 2) / 60_000))
}

const SECRETAS: Record<string, { nome: string; descricao: string; dica: string }> = {
  coruja: { nome: 'Coruja noturna', descricao: 'Mandou uma mensagem entre meia-noite e 5 da manhã.', dica: 'Algumas conversas só acontecem de madrugada.' },
  explorador: { nome: 'Explorador do castelo', descricao: 'Escondeu tudo para admirar o cenário.', dica: 'Às vezes vale a pena só olhar a paisagem.' },
  lua_cheia: { nome: 'Lua cheia', descricao: 'Esteve no castelo numa noite de lua cheia.', dica: 'Volte quando a lua estiver redonda.' },
  clima: { nome: 'Mestre do clima', descricao: 'Experimentou todos os climas do castelo.', dica: 'O céu do castelo muda como você quiser.' },
  dragao: { nome: 'Caçador de dragões', descricao: 'Ajudou o castelo a derrotar o chefão do mês.', dica: 'Juntos, até o maior dragão cai.' },
}

function liberarConquista(e: Estado, codigo: string) {
  if (!SECRETAS[codigo] || e.conquistas.some((c) => c.usu_id === e.eu && c.codigo === codigo)) return false
  e.conquistas.push({ usu_id: e.eu, codigo, data: new Date().toISOString() })
  notificar(e, e.eu, 'Conquista secreta!', `Você achou a conquista secreta "${SECRETAS[codigo].nome}"!`)
  return true
}

const conquistasDe = (e: Estado) =>
  Object.entries(SECRETAS).map(([codigo, c]) => {
    const minha = e.conquistas.find((x) => x.usu_id === e.eu && x.codigo === codigo)
    return minha
      ? { codigo, nome: c.nome, descricao: c.descricao, conquistada: true, data: minha.data }
      : { codigo, nome: '???', descricao: c.dica, conquistada: false, data: null }
  })

/* ---------- Contratação: acordo, garantia, ajustes e disputas (mesmas regras do servidor) ---------- */

const LIMITE_REVISOES = 3

const MOTIVOS_DISPUTA: Record<string, string> = {
  nao_entregou: 'O trabalho não foi entregue',
  entrega_incompleta: 'A entrega veio incompleta',
  nao_aprova: 'O contratante não aprova a entrega',
  pagamento: 'Problema com o pagamento',
  comunicacao: 'A outra pessoa sumiu',
  outro: 'Outro motivo',
}

const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

/* O projeto, quem foi contratado e o papel de quem pergunta (só participantes) */
function participacaoDe(e: Estado, serv_id: number) {
  const s = servicoDe(e, serv_id)
  const free = contratadoDe(e, serv_id)
  const papel = s.cont_usu === e.eu ? 'contratante' : free === e.eu ? 'freelancer' : null
  if (!papel || !free) throw new ErroDemo(404, 'Projeto não encontrado.')
  return { s, free, papel }
}

function acordoDe(e: Estado, p: ReturnType<typeof participacaoDe>) {
  const pessoa = (id: number) => {
    const u = quem(e, id)
    return { usu_id: u.usu_id, nome: u.usu_nome, email: u.usu_email, cidade: u.usu_cid, estado: u.usu_est }
  }
  return {
    disponivel: true,
    projeto: {
      serv_id: p.s.serv_id, serv_titulo: p.s.serv_titulo, serv_desc: p.s.serv_desc, categoria: tipoNome(p.s.tipo_id), serv_valor: p.s.serv_valor, serv_tipo_valor: p.s.serv_tipo_valor,
      serv_qtd_dias: p.s.serv_qtd_dias, serv_local: p.s.serv_local, serv_cidade: p.s.serv_cidade, serv_estado: p.s.serv_estado, serv_habilidades: p.s.serv_habilidades,
      serv_forma_pagamento: p.s.serv_forma_pagamento, serv_status: p.s.serv_status, serv_contratado_em: p.s.serv_contratado_em ?? null, serv_garantia_valor: p.s.serv_garantia_valor ?? null,
    },
    contratante: pessoa(p.s.cont_usu),
    freelancer: pessoa(p.free),
    etapas: etapasDe(e, p.s.serv_id),
    aceites: { contratante: p.s.serv_acordo_cont_em ?? null, freelancer: p.s.serv_acordo_free_em ?? null },
    meu_papel: p.papel,
  }
}

const saldoDe = (e: Estado, usu_id: number) => Math.round(e.carteira.filter((m) => m.usu_id === usu_id).reduce((t, m) => t + m.mov_valor, 0) * 100) / 100

function movimentar(e: Estado, usu_id: number, serv_id: number | null, mov_tipo: Movimento['mov_tipo'], mov_valor: number, mov_desc: string) {
  e.carteira.push({ mov_id: e.proximo++, usu_id, serv_id, mov_tipo, mov_valor, mov_desc, mov_data: new Date().toISOString() })
}

/* Primeira visita do contratante à carteira: saldo inicial da simulação */
function garantirSaldoInicial(e: Estado) {
  if (quem(e, e.eu).tipo_usuario === 'contratante' && !e.carteira.some((m) => m.usu_id === e.eu)) movimentar(e, e.eu, null, 'credito', 5000, 'Saldo inicial da simulação')
}

/* Finaliza: XP, pagamento guardado para o freelancer e aviso; devolve quanto foi pago (ou null) */
function concluirProjeto(e: Estado, s: Servico) {
  if (s.serv_status !== 'em_andamento') throw new ErroDemo(400, 'Só é possível finalizar projetos em andamento.')
  s.serv_status = 'finalizado'
  s.serv_finalizado_em = new Date().toISOString()
  const free = contratadoDe(e, s.serv_id)
  let pago: number | null = null
  if (free && s.serv_garantia_em && !s.serv_garantia_liberada_em && !s.serv_garantia_estornada_em) {
    /* Etapas já pagas saem do total: cai só o que sobrou */
    pago = restanteDaGarantia(e, s)
    s.serv_garantia_liberada_em = new Date().toISOString()
    if (pago > 0) movimentar(e, free, s.serv_id, 'recebido', pago, `Pagamento de "${s.serv_titulo}"`)
  }
  if (free) {
    ganharXp(e, free, 100)
    notificar(e, free, 'Projeto concluído', `"${s.serv_titulo}" foi finalizado. Você ganhou 100 XP!${pago ? ` O pagamento de ${reais(pago)} caiu na sua carteira.` : ''} Avalie o contratante e, se quiser, mostre o trabalho no seu portfólio.`)
  }
  return pago
}

function estornarGarantia(e: Estado, s: Servico) {
  if (!s.serv_garantia_em || s.serv_garantia_liberada_em || s.serv_garantia_estornada_em) return null
  s.serv_garantia_estornada_em = new Date().toISOString()
  /* O que já foi pago em etapas fica com o freelancer */
  const valor = restanteDaGarantia(e, s)
  if (valor > 0) movimentar(e, s.cont_usu, s.serv_id, 'estorno', valor, `Devolução de "${s.serv_titulo}"`)
  return valor
}

/* Proposta aceita no chat: muda o projeto em andamento ou a contraproposta da candidatura */
function aplicarProposta(e: Estado, msg: Estado['mensagens'][number]) {
  const s = servicoDe(e, msg.serv_id)
  const freeId = s.cont_usu === msg.usu_remetente ? msg.usu_destinatario : msg.usu_remetente
  const cand = e.candidaturas.find((x) => x.serv_id === s.serv_id && x.free_usu === freeId && x.cand_status !== 'cancelada')
  if (s.serv_status === 'em_andamento' && cand?.cand_status === 'aceita') {
    if (msg.msg_proposta_valor != null) s.serv_valor = msg.msg_proposta_valor
    if (msg.msg_proposta_prazo != null) s.serv_qtd_dias = msg.msg_proposta_prazo
    return ' O projeto foi atualizado com o novo combinado.'
  }
  if (s.serv_status === 'aberto' && cand?.cand_status === 'pendente') {
    if (msg.msg_proposta_valor != null) cand.cand_valor_proposto = msg.msg_proposta_valor
    if (msg.msg_proposta_prazo != null) cand.cand_prazo_proposto = msg.msg_proposta_prazo
    return ' A candidatura foi atualizada: vale quando o contratante aceitar.'
  }
  throw new ErroDemo(400, 'Esta proposta não vale mais: o projeto mudou de situação.')
}

/*
 * No modo demonstração a outra pessoa "lê", digita e responde sozinha depois de uns segundos,
 * para dar para ver o "Visto" e o "digitando..." funcionando. Nos testes automáticos fica desligado
 * (a não ser que o teste peça), para as contas não mudarem no meio.
 */
const RESPOSTAS: Record<'freelancer' | 'contratante', string[]> = {
  contratante: ['Ótimo, obrigado pelo retorno!', 'Combinado! Qualquer coisa me chama aqui.', 'Perfeito, fico no aguardo.'],
  freelancer: ['Pode deixar, já vou ver isso!', 'Combinado! Te mando novidades ainda hoje.', 'Beleza, obrigado pelo aviso!'],
}

function respostasLigadas() {
  try {
    return !navigator.webdriver || localStorage.getItem('demo:respostas') === '1'
  } catch {
    return false
  }
}

function responderSozinho(e: Estado, serv_id: number, outro: number, motivo: 'mensagem' | 'proposta') {
  const o = e.usuarios.find((u) => u.usu_id === outro)
  if (!o || o.tipo_usuario === 'administrador' || !respostasLigadas()) return
  const eu = e.eu
  const espera = navigator.webdriver ? 300 : 1500
  setTimeout(() => {
    const atual = ler()
    for (const m of atual.mensagens) if (m.serv_id === serv_id && m.usu_remetente === eu && m.usu_destinatario === outro) m.msg_lida = true
    atual.digitando = atual.digitando.filter((d) => !(d.serv_id === serv_id && d.usu_id === outro))
    atual.digitando.push({ serv_id, usu_id: outro, outro_id: eu, ate: Date.now() + (navigator.webdriver ? 6000 : 3500) })
    guardar()
  }, espera)
  setTimeout(() => {
    const atual = ler()
    const lista = RESPOSTAS[o.tipo_usuario as 'freelancer' | 'contratante']
    const texto = motivo === 'proposta' ? 'Recebi sua proposta! Vou olhar com calma e já te respondo.' : lista[Math.floor(Math.random() * lista.length)]
    atual.mensagens.push({ msg_id: atual.proximo++, serv_id, usu_remetente: outro, usu_destinatario: eu, msg_texto: texto, msg_data: new Date().toISOString(), msg_lida: false })
    atual.digitando = atual.digitando.filter((d) => !(d.serv_id === serv_id && d.usu_id === outro))
    guardar()
  }, espera + (navigator.webdriver ? 6000 : 3500))
}

/* Sessões de exemplo: este navegador e um celular */
function sessoesDe(e: Estado) {
  if (!e.sessoes.some((s) => s.usu_id === e.eu)) {
    e.sessoes.push(
      { ses_id: `atual-${e.eu}`, usu_id: e.eu, ses_agente: 'Este navegador', ses_ip: '187.12.*.*', ses_criada: diasAtras(0.1), ses_ultimo_uso: new Date().toISOString(), atual: true },
      { ses_id: `celular-${e.eu}`, usu_id: e.eu, ses_agente: 'Chrome no Android', ses_ip: '200.150.*.*', ses_criada: diasAtras(6), ses_ultimo_uso: diasAtras(1), atual: false },
    )
  }
  return e.sessoes.filter((s) => s.usu_id === e.eu)
}

/* Faixa do meio dos preços de projetos parecidos (igual ao servidor) */
function precosDe(e: Estado, tipo_id: number, tipo_valor: 'hora' | 'fixo') {
  if (!tipo_id) throw new ErroDemo(400, 'Escolha a categoria.')
  const valores = e.servicos
    .filter((s) => s.tipo_id === tipo_id && s.serv_tipo_valor === tipo_valor && ['aberto', 'em_andamento', 'finalizado'].includes(s.serv_status) && quem(e, s.cont_usu).status_conta === 'ativa')
    .map((s) => s.serv_valor)
    .sort((a, b) => a - b)
  if (valores.length < 3) return { sugestao: null, total: valores.length }
  const p = (q: number) => {
    const pos = (valores.length - 1) * q
    const base = Math.floor(pos)
    return valores[base + 1] !== undefined ? valores[base] + (pos - base) * (valores[base + 1] - valores[base]) : valores[base]
  }
  const redondo = (v: number) => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v))
  return { sugestao: { min: redondo(p(0.25)), max: redondo(p(0.75)), mediana: redondo(p(0.5)), tipo_valor }, total: valores.length }
}

/* ---------- Aparência, sequência, resumo, dados, ganhos, loja e eventos ---------- */

const LOJA: Record<string, { tipo: 'moldura' | 'cor' | 'tema'; nome: string; descricao: string; preco: number }> = {
  moldura_madeira: { tipo: 'moldura', nome: 'Moldura de madeira', descricao: 'Tábuas do portão do castelo.', preco: 60 },
  moldura_cristal: { tipo: 'moldura', nome: 'Moldura de cristal', descricao: 'Brilha como as janelas da torre.', preco: 150 },
  moldura_estrelas: { tipo: 'moldura', nome: 'Moldura estrelada', descricao: 'Um pedaço do céu noturno.', preco: 200 },
  moldura_dragao: { tipo: 'moldura', nome: 'Moldura do dragão', descricao: 'Escamas de quem guarda o tesouro.', preco: 300 },
  cor_ouro: { tipo: 'cor', nome: 'Nome dourado', descricao: 'Seu nome em ouro.', preco: 80 },
  cor_rosa: { tipo: 'cor', nome: 'Nome rosa', descricao: 'Seu nome em rosa-pôr-do-sol.', preco: 80 },
  cor_ciano: { tipo: 'cor', nome: 'Nome ciano', descricao: 'Seu nome em ciano de cristal.', preco: 80 },
  cor_lilas: { tipo: 'cor', nome: 'Nome lilás', descricao: 'Seu nome em lilás de feitiço.', preco: 80 },
  tema_outono: { tipo: 'tema', nome: 'Cenário de outono', descricao: 'Folhas caindo sobre o castelo.', preco: 120 },
  tema_cerejeira: { tipo: 'tema', nome: 'Cenário de cerejeira', descricao: 'Pétalas rosas ao vento.', preco: 120 },
  tema_vagalumes: { tipo: 'tema', nome: 'Cenário de vaga-lumes', descricao: 'Luzinhas piscando na noite.', preco: 150 },
  tema_aurora: { tipo: 'tema', nome: 'Cenário de aurora', descricao: 'Faixas de luz dançando no céu.', preco: 250 },
}

const CAMPO_EQUIPADO = { moldura: 'moldura', cor: 'cor_nome', tema: 'tema_cenario' } as const

/* Os 3 primeiros do ranking do mês passado */
function campeoesDe(e: Estado) {
  const agora = new Date()
  const inicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1).getTime()
  const fim = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime()
  const soma = new Map<number, number>()
  for (const x of e.xpEventos) {
    const t = new Date(x.data).getTime()
    if (t >= inicio && t < fim) soma.set(x.usu_id, (soma.get(x.usu_id) ?? 0) + x.xp)
  }
  return [...soma]
    .filter(([id]) => e.usuarios.some((u) => u.usu_id === id && u.status_conta === 'ativa'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([usu_id, xp], i) => ({ posicao: i + 1, usu_id, usu_nome: quem(e, usu_id).usu_nome, usu_foto: quem(e, usu_id).usu_foto, xp }))
}

const MOLDURA_CAMPEAO: Record<number, string> = { 1: 'campeao_ouro', 2: 'campeao_prata', 3: 'campeao_bronze' }

function disponibilidadeDe(u: Usuario) {
  const status = u.disponibilidade ?? 'disponivel'
  const ate = u.disponivel_ate ?? null
  if (status === 'disponivel' || (ate && ate < hojeData())) return { status: 'disponivel' as const, ate: null }
  return { status, ate }
}

function aparenciaDe(e: Estado, usu_id: number) {
  const u = quem(e, usu_id)
  const campeao = campeoesDe(e).find((c) => c.usu_id === usu_id)
  const g = guildaDe(e, usu_id)
  return {
    moldura: campeao ? MOLDURA_CAMPEAO[campeao.posicao] : u.moldura ?? null,
    cor_nome: u.cor_nome ?? null,
    disponibilidade: disponibilidadeDe(u),
    guilda: g ? { gui_id: g.gui_id, nome: g.nome, brasao: g.brasao, cor: g.cor } : null,
    testes: e.testes.filter((t) => t.usu_id === usu_id && t.aprovado_em).map((t) => tipoNome(t.tipo_id)),
    mascote: u.mascote ? { especie: u.mascote, nome: u.mascote_nome ?? '' } : null,
  }
}

/* Igual a contaController.calcularSequencia: um dia perdido não apaga a chama, dois seguidos apagam */
function calcularSequencia(dias: string[]) {
  const feitos = new Set(dias)
  const hoje = hojeData()
  const DIA = 86_400_000
  let cursor = new Date(`${hoje}T12:00:00`).getTime()
  if (!feitos.has(hoje)) cursor -= DIA
  let atual = 0
  let falhas = 0
  let perdeuOntem = false
  for (let i = 0; i < 400; i++) {
    const d = dataLocal(cursor)
    if (feitos.has(d)) {
      atual += 1
      falhas = 0
    } else {
      falhas += 1
      if (i === 0) perdeuOntem = true
      if (falhas >= 2) break
    }
    cursor -= DIA
  }
  const base = new Date(`${hoje}T12:00:00`).getTime()
  const ultimos7 = Array.from({ length: 7 }, (_, i) => {
    const d = dataLocal(base - (6 - i) * DIA)
    return { dia: d, feito: feitos.has(d) }
  })
  return { dias: atual, hoje: feitos.has(hoje), em_risco: perdeuOntem && !feitos.has(hoje), ultimos7 }
}

function resumoDe(e: Estado) {
  const u = quem(e, e.eu)
  const semana = Date.now() - 7 * 86_400_000
  const itens: { titulo: string; detalhes: string[]; link: string }[] = []
  if (u.tipo_usuario === 'freelancer') {
    const novos = e.servicos.filter((s) => s.serv_status === 'aberto' && new Date(s.serv_data_criacao).getTime() >= semana && (!(u.areas ?? []).length || (u.areas ?? []).includes(s.tipo_id)))
    if (novos.length) itens.push({ titulo: `${novos.length} ${novos.length === 1 ? 'projeto novo' : 'projetos novos'} na sua área`, detalhes: novos.slice(0, 3).map((s) => s.serv_titulo), link: '/freelancer' })
  } else {
    const esperando = e.candidaturas.filter((c) => c.cand_status === 'pendente' && servicoDe(e, c.serv_id).cont_usu === e.eu).length
    if (esperando) itens.push({ titulo: `${esperando} ${esperando === 1 ? 'candidatura esperando' : 'candidaturas esperando'} a sua resposta`, detalhes: [], link: '/contratante/candidatos' })
  }
  const pendentes = e.servicos.filter((s) => s.serv_status === 'finalizado' && (s.cont_usu === e.eu || contratadoDe(e, s.serv_id) === e.eu) && !e.avaliacoes.some((a) => a.serv_id === s.serv_id && a.usu_avaliador === e.eu)).length
  if (pendentes) itens.push({ titulo: `Você tem ${pendentes} ${pendentes === 1 ? 'avaliação pendente' : 'avaliações pendentes'}`, detalhes: [], link: `/${u.tipo_usuario}/avaliacoes` })
  const naoLidas = e.mensagens.filter((m) => m.usu_destinatario === e.eu && !m.msg_lida).length
  if (naoLidas) itens.push({ titulo: `${naoLidas} ${naoLidas === 1 ? 'mensagem não lida' : 'mensagens não lidas'}`, detalhes: [], link: `/${u.tipo_usuario}/mensagens` })
  return { nome: u.usu_nome.split(' ')[0], itens }
}

function dadosDe(e: Estado) {
  const u = quem(e, e.eu)
  return {
    gerado_em: new Date().toISOString(),
    aviso: 'Estes são todos os dados que o ContrateJá guarda sobre a sua conta (LGPD, art. 18). Modo demonstração: dados de exemplo.',
    conta: u,
    projetos_publicados: e.servicos.filter((s) => s.cont_usu === e.eu),
    candidaturas: e.candidaturas.filter((c) => c.free_usu === e.eu),
    portfolio: e.portfolio.filter((p) => p.usu_id === e.eu),
    mensagens: e.mensagens.filter((m) => m.usu_remetente === e.eu || m.usu_destinatario === e.eu).map((m) => ({ ...m, msg_arquivo: undefined })),
    avaliacoes_feitas: e.avaliacoes.filter((a) => a.usu_avaliador === e.eu),
    avaliacoes_recebidas: e.avaliacoes.filter((a) => a.usu_avaliado === e.eu && visivel(e, a)),
    notificacoes: e.notificacoes.filter((n) => n.usu_id === e.eu),
    carteira: e.carteira.filter((m) => m.usu_id === e.eu),
    alertas_de_busca: e.buscas.filter((b) => b.usu_id === e.eu),
    projetos_salvos: e.salvos.filter((s) => s.usu_id === e.eu),
    conquistas: e.conquistas.filter((c) => c.usu_id === e.eu),
    cosmeticos: e.compras.filter((c) => c.usu_id === e.eu),
    eventos: e.eventos.filter((x) => x.usu_id === e.eu),
    dias_ativos: e.atividade[e.eu] ?? [],
    freelancers_favoritos: e.favoritos.filter((f) => f.usu_id === e.eu),
    testes_de_habilidade: e.testes.filter((t) => t.usu_id === e.eu),
    guilda: guildaDe(e, e.eu)?.nome ?? null,
    visitas_ao_perfil: e.visitas.filter((v) => v.usu_id === e.eu).length,
  }
}

function ganhosDe(e: Estado) {
  if (quem(e, e.eu).tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'O painel de ganhos é só para freelancers.')
  const projetos = e.servicos.filter((s) => s.serv_status === 'finalizado' && contratadoDe(e, s.serv_id) === e.eu)
  const minhas = e.candidaturas.filter((c) => c.free_usu === e.eu)
  const conta = (st: string) => minhas.filter((c) => c.cand_status === st).length
  const agora = new Date()
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1)
    return { mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, total: 0, projetos: 0 }
  })
  const porCategoria = new Map<string, { categoria: string; total: number; projetos: number }>()
  let total = 0
  let contados = 0
  let semValor = 0
  for (const s of projetos) {
    const v = s.serv_garantia_liberada_em ? s.serv_garantia_valor ?? 0 : s.serv_tipo_valor === 'fixo' ? s.serv_valor : null
    if (v === null) {
      semValor += 1
      continue
    }
    total += v
    contados += 1
    const d = new Date(s.serv_finalizado_em ?? s.serv_data_criacao)
    const m = meses.find((x) => x.mes === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    if (m) {
      m.total += v
      m.projetos += 1
    }
    const cat = tipoNome(s.tipo_id)
    const c = porCategoria.get(cat) ?? { categoria: cat, total: 0, projetos: 0 }
    c.total += v
    c.projetos += 1
    porCategoria.set(cat, c)
  }
  const respondidas = conta('aceita') + conta('recusada')
  return {
    meses, total, projetos: contados, sem_valor: semValor, media_por_projeto: contados ? Math.round((total / contados) * 100) / 100 : null,
    candidaturas: { aceitas: conta('aceita'), recusadas: conta('recusada'), pendentes: conta('pendente') },
    taxa_aceite: respondidas ? Math.round((conta('aceita') / respondidas) * 100) : null,
    categorias: [...porCategoria.values()].sort((a, b) => b.total - a.total),
  }
}

function lojaDe(e: Estado) {
  const u = quem(e, e.eu)
  if (u.tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'Você não tem permissão para acessar este recurso.')
  const minhas = e.compras.filter((c) => c.usu_id === e.eu)
  const gasto = minhas.reduce((t, c) => t + c.preco, 0)
  const campeao = campeoesDe(e).find((c) => c.usu_id === e.eu)
  return {
    disponivel: true,
    xp_total: u.free_xp ?? 0,
    xp_gasto: gasto,
    xp_livre: Math.max(0, (u.free_xp ?? 0) - gasto),
    equipado: { moldura: u.moldura ?? null, cor: u.cor_nome ?? null, tema: u.tema_cenario ?? null },
    campeao: campeao ? { posicao: campeao.posicao } : null,
    itens: Object.entries(LOJA).map(([codigo, item]) => ({ codigo, ...item, comprado: minhas.some((c) => c.codigo === codigo) })),
  }
}

/* Um item a cada 10 segundos no máximo (igual ao servidor) */
const INTERVALO_COLETA = 10_000
const ultimaColeta = new Map<number, number>()

function eventoDe(e: Estado) {
  const ev = eventoAtual()
  const insignias = e.eventos
    .filter((x) => x.usu_id === e.eu && x.completo_em)
    .map((x) => ({ codigo: x.codigo, ano: x.ano, nome: EVENTOS[x.codigo as CodigoEvento]?.insignia ?? x.codigo, data: x.completo_em }))
  if (!ev) return { disponivel: true, evento: null, insignias }
  const linha = e.eventos.find((x) => x.usu_id === e.eu && x.codigo === ev.codigo && x.ano === ev.ano)
  return { disponivel: true, evento: { ...ev, achados: linha?.qtd ?? 0, completo: Boolean(linha?.completo_em), resgatado: Boolean(linha?.resgatado) }, insignias }
}

/* ---------- Home pública (mesma conta de publicoController.js do servidor) ---------- */

/* "Ana Paula Freitas" -> "Ana F." */
function nomeCurto(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length < 2) return partes[0] ?? 'Usuário'
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`
}

function depoimentosPublicos(e: Estado) {
  const visiveis = e.avaliacoes.filter((a) => visivel(e, a))
  const notas = visiveis.map((a) => a.aval_nota)
  return {
    media: notas.length ? Math.round((notas.reduce((x, y) => x + y, 0) / notas.length) * 10) / 10 : null,
    total: notas.length,
    depoimentos: visiveis
      .filter((a) => a.aval_nota >= 4 && (a.aval_comentario ?? '').trim().length >= 20 && quem(e, a.usu_avaliador).status_conta === 'ativa' && quem(e, a.usu_avaliado).status_conta === 'ativa')
      .sort((x, y) => y.aval_data.localeCompare(x.aval_data))
      .slice(0, 8)
      .map((a) => {
        const autor = quem(e, a.usu_avaliador)
        const alvo = quem(e, a.usu_avaliado)
        const autorFreelancer = autor.tipo_usuario === 'freelancer'
        return {
          id: a.aval_id,
          nota: a.aval_nota,
          texto: (a.aval_comentario ?? '').trim(),
          data: a.aval_data,
          categoria: tipoNome(servicoDe(e, a.serv_id).tipo_id),
          autor: nomeCurto(autor.usu_nome),
          papel: autorFreelancer ? 'freelancer' : 'contratante',
          nivel: autorFreelancer ? nivelPorXp(autor.free_xp ?? 0) : null,
          sobre: nomeCurto(alvo.usu_nome),
          sobre_nivel: !autorFreelancer && alvo.tipo_usuario === 'freelancer' ? nivelPorXp(alvo.free_xp ?? 0) : null,
        }
      }),
  }
}

/* ---------- Reino: etapas pagas, bônus, recibo, reuniões, favoritos, testes, guildas, mascote, visitas e álbum ---------- */

const centavos = (v: number) => Math.round(v * 100) / 100

/* O que ainda está guardado na garantia (etapas aprovadas já saíram) */
function restanteDaGarantia(e: Estado, s: Servico) {
  if (!s.serv_garantia_em) return 0
  const pago = e.etapas.filter((x) => x.serv_id === s.serv_id).reduce((t, x) => t + (x.eta_liberado_valor ?? 0), 0)
  return Math.max(0, centavos((s.serv_garantia_valor ?? 0) - pago))
}

function contarHoje(e: Estado, campo: 'conversar' | 'explorar') {
  const dia = hojeData()
  const atual = e.hoje[e.eu]
  e.hoje[e.eu] = atual && atual.dia === dia ? { ...atual, [campo]: atual[campo] + 1 } : { dia, conversar: 0, explorar: 0, [campo]: 1 }
}

function guildaDe(e: Estado, usu_id: number) {
  const m = e.membros.find((x) => x.usu_id === usu_id)
  return m ? e.guildas.find((g) => g.gui_id === m.gui_id) ?? null : null
}

function registrarVisita(e: Estado, usu_id: number, chave: string, origem: 'publico' | 'contratante') {
  if (usu_id === e.eu) return
  const dia = hojeData()
  if (!e.visitas.some((v) => v.usu_id === usu_id && v.dia === dia && v.chave === chave)) e.visitas.push({ usu_id, dia, chave, origem })
}

function pendentesDe(e: Estado) {
  return e.servicos
    .filter((s) => s.serv_status === 'finalizado' && (s.cont_usu === e.eu || contratadoDe(e, s.serv_id) === e.eu))
    .map((s) => ({ s, outro: s.cont_usu === e.eu ? contratadoDe(e, s.serv_id) : s.cont_usu }))
    .filter(({ s, outro }) => outro && !e.avaliacoes.some((a) => a.serv_id === s.serv_id && a.usu_avaliador === e.eu))
    .map(({ s, outro }) => ({
      serv_id: s.serv_id, serv_titulo: s.serv_titulo, usu_id: outro!, usu_nome: quem(e, outro!).usu_nome, usu_foto: quem(e, outro!).usu_foto,
      outro_ja_avaliou: e.avaliacoes.some((a) => a.serv_id === s.serv_id && a.usu_avaliador === outro && a.usu_avaliado === e.eu),
    }))
}

const quandoTexto = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const MAX_MEMBROS = 6
const BRASOES = ['escudo', 'espada', 'dragao', 'coroa', 'estrela', 'arvore']
const CORES_GUILDA = ['ouro', 'ciano', 'rosa', 'lilas', 'verde', 'vermelho']

function xpDoMes(e: Estado, usu_id: number) {
  const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  return e.xpEventos.filter((x) => x.usu_id === usu_id && new Date(x.data).getTime() >= inicio).reduce((t, x) => t + x.xp, 0)
}

function listaGuildas(e: Estado) {
  return e.guildas
    .map((g) => {
      const deles = e.membros.filter((m) => m.gui_id === g.gui_id)
      return { gui_id: g.gui_id, nome: g.nome, lema: g.lema, brasao: g.brasao, cor: g.cor, membros: deles.length, xp_mes: deles.reduce((t, m) => t + xpDoMes(e, m.usu_id), 0) }
    })
    .sort((a, b) => b.xp_mes - a.xp_mes || b.membros - a.membros || a.nome.localeCompare(b.nome))
    .map((g, i) => ({ ...g, posicao: i + 1 }))
}

function situacaoGuildas(e: Estado) {
  if (quem(e, e.eu).tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'Você não tem permissão para acessar este recurso.')
  const lista = listaGuildas(e)
  const g = guildaDe(e, e.eu)
  const minha = g
    ? (() => {
        const membros = e.membros
          .filter((m) => m.gui_id === g.gui_id)
          .sort((a, b) => (a.papel === b.papel ? a.entrou.localeCompare(b.entrou) : a.papel === 'lider' ? -1 : 1))
          .map((m) => {
            const u = quem(e, m.usu_id)
            return { usu_id: u.usu_id, usu_nome: u.usu_nome, usu_foto: u.usu_foto, free_nivel: nivelPorXp(u.free_xp ?? 0), gme_papel: m.papel, gme_entrou: m.entrou, xp_mes: xpDoMes(e, u.usu_id) }
          })
        return { gui_id: g.gui_id, nome: g.nome, lema: g.lema, brasao: g.brasao, cor: g.cor, criada: g.criada, dono: g.dono, membros, xp_mes: membros.reduce((t, m) => t + m.xp_mes, 0), posicao: lista.find((x) => x.gui_id === g.gui_id)?.posicao ?? null, meu_papel: e.membros.find((m) => m.usu_id === e.eu)?.papel }
      })()
    : null
  return { disponivel: true, max_membros: MAX_MEMBROS, minha, guildas: lista }
}

function lerGuilda(c: Corpo) {
  const nome = String(c.nome ?? '').trim().replace(/\s+/g, ' ')
  const lema = String(c.lema ?? '').trim()
  const brasao = String(c.brasao ?? 'escudo')
  const cor = String(c.cor ?? 'ouro')
  if (nome.length < 3 || nome.length > 30) throw new ErroDemo(400, 'O nome da guilda vai de 3 a 30 letras.')
  if (lema.length > 120) throw new ErroDemo(400, 'O lema pode ter até 120 letras.')
  if (!BRASOES.includes(brasao)) throw new ErroDemo(400, 'Escolha um dos brasões.')
  if (!CORES_GUILDA.includes(cor)) throw new ErroDemo(400, 'Escolha uma das cores.')
  return { nome, lema: lema || null, brasao, cor }
}

/* Sair: se a liderança sair, quem entrou primeiro assume; guilda vazia acaba */
function tirarDaGuilda(e: Estado, gui_id: number, usu_id: number) {
  const saindo = e.membros.find((m) => m.gui_id === gui_id && m.usu_id === usu_id)
  if (!saindo) return
  e.membros = e.membros.filter((m) => m !== saindo)
  const resto = e.membros.filter((m) => m.gui_id === gui_id).sort((a, b) => a.entrou.localeCompare(b.entrou))
  if (resto.length === 0) e.guildas = e.guildas.filter((g) => g.gui_id !== gui_id)
  else if (saindo.papel === 'lider' && !resto.some((m) => m.papel === 'lider')) {
    resto[0].papel = 'lider'
    const g = e.guildas.find((x) => x.gui_id === gui_id)
    if (g) g.dono = resto[0].usu_id
  }
}

const RARIDADE: Record<string, 'bronze' | 'prata' | 'ouro'> = { primeiro_projeto: 'bronze', vitrine: 'bronze', nota_maxima: 'prata', em_ascensao: 'prata', veterano: 'ouro', nivel_5: 'ouro' }

function albumDe(e: Estado) {
  const freelancers = e.usuarios.filter((u) => u.tipo_usuario === 'freelancer' && u.status_conta === 'ativa')
  const ativos = e.usuarios.filter((u) => u.status_conta === 'ativa')
  const pct = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0)
  const minhas = quem(e, e.eu).tipo_usuario === 'freelancer' ? perfilFreelancer(e, e.eu).insignias : perfilFreelancer(e, e.eu).insignias.map((i) => ({ ...i, conquistada: false, data: null, progresso: 0 }))
  return {
    insignias: minhas.map((i) => ({
      ...i,
      raridade: RARIDADE[i.codigo] ?? 'bronze',
      porcentagem: pct(freelancers.filter((f) => perfilFreelancer(e, f.usu_id).insignias.find((x) => x.codigo === i.codigo)?.conquistada).length, freelancers.length),
    })),
    secretas: conquistasDe(e).map((c) => ({ ...c, porcentagem: pct(e.conquistas.filter((x) => x.codigo === c.codigo).length, ativos.length) })),
    total_freelancers: freelancers.length,
  }
}

function testesDe(e: Estado) {
  return TIPOS.map((t) => ({ ...t, area: areaDaCategoria(t.tipo_nome) }))
    .filter((t) => t.area)
    .map((t) => {
      const m = e.testes.find((x) => x.usu_id === e.eu && x.tipo_id === t.tipo_id)
      const refazer = m && !m.aprovado_em ? new Date(m.ultima_em).getTime() + ESPERA_REFAZER : null
      return {
        tipo_id: t.tipo_id, nome: t.tipo_nome, perguntas: BANCO[t.area!].length, aprovado_em: m?.aprovado_em ?? null, ultima_em: m?.ultima_em ?? null,
        acertos: m?.acertos ?? null, pode_refazer_em: refazer && refazer > Date.now() ? new Date(refazer).toISOString() : null,
      }
    })
}

function testeDe(tipoId: number) {
  const t = TIPOS.find((x) => x.tipo_id === tipoId)
  const area = t ? areaDaCategoria(t.tipo_nome) : null
  if (!t || !area) throw new ErroDemo(404, 'Ainda não há teste para esta área.')
  return { ...t, area }
}

const ROTAS_REINO: Rota[] = [
  /* Pagamento por etapa: o contratante aprova uma etapa feita e libera a parte dela */
  ['POST', /^\/servicos\/(\d+)\/etapas\/(\d+)\/aprovar$/, (e, [id, etaId]) => {
    const s = participanteDe(e, Number(id))
    if (s.cont_usu !== e.eu) throw new ErroDemo(403, 'Quem aprova a etapa é o contratante.')
    const free = contratadoDe(e, s.serv_id)
    if (s.serv_status !== 'em_andamento' || !free) throw new ErroDemo(400, 'O projeto não está mais em andamento.')
    const etapa = e.etapas.find((x) => x.eta_id === Number(etaId) && x.serv_id === s.serv_id)
    if (!etapa) throw new ErroDemo(404, 'Etapa não encontrada.')
    if (!etapa.eta_concluida_em) throw new ErroDemo(400, 'O freelancer ainda não marcou esta etapa como feita.')
    if (etapa.eta_liberada_em) throw new ErroDemo(400, 'Esta etapa já foi paga.')
    if (!s.serv_garantia_em || s.serv_garantia_liberada_em || s.serv_garantia_estornada_em) throw new ErroDemo(400, 'Guarde o pagamento na garantia antes de pagar por etapa.')
    const faltam = e.etapas.filter((x) => x.serv_id === s.serv_id && !x.eta_liberada_em).length
    const restante = restanteDaGarantia(e, s)
    if (restante <= 0) throw new ErroDemo(400, 'Não sobrou valor guardado para esta etapa.')
    const parte = faltam === 1 ? restante : centavos(restante / faltam)
    Object.assign(etapa, { eta_liberada_em: new Date().toISOString(), eta_liberado_valor: parte })
    movimentar(e, free, s.serv_id, 'etapa', parte, `Etapa "${etapa.eta_titulo}" de "${s.serv_titulo}"`)
    notificar(e, free, 'Etapa paga', `O contratante aprovou "${etapa.eta_titulo}" de "${s.serv_titulo}". ${reais(parte)} caíram na sua carteira.`)
    return ok(`Etapa aprovada: ${reais(parte)} foram para o freelancer.`, { etapas: etapasDe(e, s.serv_id) })
  }],

  /* Bônus no fim do projeto */
  ['POST', /^\/servicos\/(\d+)\/bonus$/, (e, [id], c) => {
    const valor = centavos(Number(c.valor))
    const recado = String(c.recado ?? '').trim()
    if (!Number.isFinite(valor) || valor < 1) throw new ErroDemo(400, 'O bônus é de pelo menos R$ 1,00.')
    if (valor > 5000) throw new ErroDemo(400, 'Na simulação o bônus vai até R$ 5000,00.')
    if (recado.length > 200) throw new ErroDemo(400, 'O recado pode ter até 200 letras.')
    const p = participacaoDe(e, Number(id))
    if (p.papel !== 'contratante') throw new ErroDemo(404, 'Projeto não encontrado.')
    if (p.s.serv_status !== 'finalizado') throw new ErroDemo(400, 'O bônus é dado depois que o projeto é finalizado.')
    if (p.s.serv_bonus_em) throw new ErroDemo(400, 'Você já deu um bônus neste projeto.')
    garantirSaldoInicial(e)
    if (saldoDe(e, e.eu) < valor) throw new ErroDemo(400, 'Saldo fictício insuficiente. Adicione saldo na sua carteira.')
    Object.assign(p.s, { serv_bonus_valor: valor, serv_bonus_em: new Date().toISOString(), serv_bonus_recado: recado || null })
    movimentar(e, e.eu, p.s.serv_id, 'bonus', -valor, `Bônus de "${p.s.serv_titulo}"`)
    movimentar(e, p.free, p.s.serv_id, 'bonus', valor, `Bônus de "${p.s.serv_titulo}"`)
    notificar(e, p.free, 'Você ganhou um bônus!', `${quem(e, e.eu).usu_nome} mandou ${reais(valor)} de bônus por "${p.s.serv_titulo}".${recado ? ` Recado: ${recado}` : ''}`)
    return ok(`Bônus de ${reais(valor)} enviado. Obrigado por reconhecer o bom trabalho!`, { saldo: saldoDe(e, e.eu) })
  }],

  /* Recibo do projeto concluído */
  ['GET', /^\/servicos\/(\d+)\/recibo$/, (e, [id]) => {
    const p = participacaoDe(e, Number(id))
    if (p.s.serv_status !== 'finalizado') throw new ErroDemo(400, 'O recibo sai quando o projeto é finalizado.')
    const acordo = acordoDe(e, p)
    const pagamentos = e.carteira
      .filter((m) => m.serv_id === p.s.serv_id && m.usu_id === p.free && m.mov_valor > 0)
      .sort((x, y) => x.mov_id - y.mov_id)
      .map(({ mov_tipo, mov_valor, mov_desc, mov_data }) => ({ mov_tipo, mov_valor, mov_desc, mov_data }))
    return {
      recibo: {
        numero: `CJ-${String(p.s.serv_id).padStart(6, '0')}`,
        codigo: ((p.s.serv_id * 2246822519) >>> 0).toString(16).toUpperCase().padStart(10, '0').slice(0, 10),
        projeto: acordo.projeto, contratante: acordo.contratante, freelancer: acordo.freelancer,
        contratado_em: p.s.serv_contratado_em ?? null, entregue_em: p.s.serv_entregue_em, finalizado_em: p.s.serv_finalizado_em ?? null,
        etapas: acordo.etapas, pagamentos, total_pago: centavos(pagamentos.reduce((t, m) => t + m.mov_valor, 0)), bonus: p.s.serv_bonus_valor ?? null,
      },
      meu_papel: p.papel,
    }
  }],

  /* Reunião marcada pelo chat */
  ['POST', /^\/mensagens\/reuniao$/, (e, _p, c) => {
    const serv_id = Number(c.serv_id)
    const destino = Number(c.destinatario_id)
    const quando = new Date(String(c.quando ?? ''))
    const link = String(c.link ?? '').trim()
    const recado = String(c.texto ?? '').trim().slice(0, 300)
    if (Number.isNaN(quando.getTime())) throw new ErroDemo(400, 'Escolha o dia e a hora da reunião.')
    const falta = quando.getTime() - Date.now()
    if (falta < 15 * 60_000) throw new ErroDemo(400, 'Marque a reunião com pelo menos 15 minutos de antecedência.')
    if (falta > 60 * 86_400_000) throw new ErroDemo(400, 'Dá para marcar reuniões até 60 dias para a frente.')
    if (link && !/^https:\/\/\S{4,290}$/i.test(link)) throw new ErroDemo(400, 'O link da chamada precisa começar com https://')
    if (bloqueadosDemo(e, e.eu, destino)) throw new ErroDemo(403, 'Não dá para falar com esta pessoa: uma de vocês bloqueou a outra.')
    /* Horários de atendimento do freelancer da conversa */
    for (const p of [quem(e, e.eu), quem(e, destino)].filter((u) => u.tipo_usuario === 'freelancer' && u.horarios)) {
      const h = p.horarios as NonNullable<Usuario['horarios']>
      if (!h.dias.includes(quando.getDay()) || quando.getHours() < h.de || quando.getHours() >= h.ate) {
        throw new ErroDemo(400, `${p.usu_nome.split(' ')[0]} atende ${h.dias.map((d) => DIAS_CURTOS[d]).join(', ')}, das ${h.de}h às ${h.ate}h. Escolha um horário dentro disso.`)
      }
    }
    servicoDe(e, serv_id)
    const legivel = quandoTexto(quando.toISOString())
    const m = {
      msg_id: e.proximo++, serv_id, usu_remetente: e.eu, usu_destinatario: destino, msg_texto: recado || `Reunião proposta para ${legivel}`, msg_data: new Date().toISOString(), msg_lida: false,
      msg_reuniao_em: quando.toISOString(), msg_reuniao_link: link || null, msg_reuniao_status: 'pendente' as const,
    }
    e.mensagens.push(m)
    notificar(e, destino, 'Convite para reunião', `${quem(e, e.eu).usu_nome} quer conversar ${legivel}.`)
    return ok('Convite de reunião enviado.', { msg_id: m.msg_id })
  }],
  ['PUT', /^\/mensagens\/reuniao\/(\d+)$/, (e, [id], c) => {
    const acoes: Record<string, 'aceita' | 'recusada' | 'cancelada'> = { aceitar: 'aceita', recusar: 'recusada', cancelar: 'cancelada' }
    const acao = acoes[String(c.acao)]
    if (!acao) throw new ErroDemo(400, 'Escolha aceitar, recusar ou cancelar.')
    const msg = e.mensagens.find((m) => m.msg_id === Number(id))
    if (!msg || ![msg.usu_remetente, msg.usu_destinatario].includes(e.eu) || !msg.msg_reuniao_status) throw new ErroDemo(404, 'Reunião não encontrada.')
    if (acao === 'cancelada') {
      if (msg.usu_remetente !== e.eu) throw new ErroDemo(403, 'Só quem marcou pode cancelar. Você pode recusar.')
      if (!['pendente', 'aceita'].includes(msg.msg_reuniao_status)) throw new ErroDemo(400, 'Esta reunião já foi encerrada.')
    } else {
      if (msg.usu_destinatario !== e.eu) throw new ErroDemo(403, 'Quem responde é quem recebeu o convite.')
      if (msg.msg_reuniao_status !== 'pendente') throw new ErroDemo(400, 'Este convite já foi respondido.')
      if (new Date(msg.msg_reuniao_em!).getTime() < Date.now()) throw new ErroDemo(400, 'A hora desta reunião já passou. Marque outra.')
    }
    msg.msg_reuniao_status = acao
    const outro = msg.usu_remetente === e.eu ? msg.usu_destinatario : msg.usu_remetente
    const verbo = { aceita: 'aceitou', recusada: 'recusou', cancelada: 'cancelou' }[acao]
    notificar(e, outro, `Reunião ${acao}`, `${quem(e, e.eu).usu_nome} ${verbo} a reunião de ${quandoTexto(msg.msg_reuniao_em!)}.`)
    return ok({ aceita: 'Reunião confirmada! Avisamos uma hora antes.', recusada: 'Convite recusado.', cancelada: 'Reunião cancelada.' }[acao])
  }],

  /* Freelancers favoritos do contratante */
  ['GET', /^\/usuarios\/favoritos$/, (e) => ({ disponivel: true, ids: e.favoritos.filter((f) => f.usu_id === e.eu).sort((a, b) => b.data.localeCompare(a.data)).map((f) => f.fav_usu_id) })],
  ['POST', /^\/usuarios\/favoritos\/(\d+)$/, (e, [id]) => {
    const alvo = quem(e, Number(id))
    if (alvo.tipo_usuario !== 'freelancer') throw new ErroDemo(404, 'Freelancer não encontrado.')
    if (!e.favoritos.some((f) => f.usu_id === e.eu && f.fav_usu_id === alvo.usu_id)) e.favoritos.push({ usu_id: e.eu, fav_usu_id: alvo.usu_id, data: new Date().toISOString() })
    return ok('Freelancer guardado nos favoritos.', { ids: e.favoritos.filter((f) => f.usu_id === e.eu).map((f) => f.fav_usu_id) })
  }],
  ['DELETE', /^\/usuarios\/favoritos\/(\d+)$/, (e, [id]) => {
    e.favoritos = e.favoritos.filter((f) => !(f.usu_id === e.eu && f.fav_usu_id === Number(id)))
    return ok('Tirado dos favoritos.', { ids: e.favoritos.filter((f) => f.usu_id === e.eu).map((f) => f.fav_usu_id) })
  }],

  /* Mascote e visitas ao perfil */
  ['PUT', /^\/usuarios\/eu\/mascote$/, (e, _p, c) => {
    const u = quem(e, e.eu)
    if (u.tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'Você não tem permissão para acessar este recurso.')
    const especie = String(c.especie ?? '')
    const nome = String(c.nome ?? '').trim().replace(/\s+/g, ' ')
    if (!['dragao', 'gato', 'coruja', 'slime'].includes(especie)) throw new ErroDemo(400, 'Escolha um dos bichinhos.')
    if (nome.length < 2 || nome.length > 20) throw new ErroDemo(400, 'Dê um nome de 2 a 20 letras ao mascote.')
    Object.assign(u, { mascote: especie, mascote_nome: nome })
    return ok(`${nome} agora mora no seu castelo!`, { mascote: { especie, nome } })
  }],
  ['GET', /^\/usuarios\/eu\/visitas$/, (e) => {
    if (quem(e, e.eu).tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'Você não tem permissão para acessar este recurso.')
    const minhas = e.visitas.filter((v) => v.usu_id === e.eu)
    const dias = Array.from({ length: 7 }, (_, i) => {
      const dia = dataLocal(Date.now() - (6 - i) * 86_400_000)
      return { dia, total: minhas.filter((v) => v.dia === dia).length }
    })
    const naSemana = new Set(dias.map((d) => d.dia))
    const inicioPassada = dataLocal(Date.now() - 13 * 86_400_000)
    return {
      disponivel: true,
      dias,
      semana: dias.reduce((t, d) => t + d.total, 0),
      semana_passada: minhas.filter((v) => !naSemana.has(v.dia) && v.dia >= inicioPassada).length,
      contratantes: minhas.filter((v) => naSemana.has(v.dia) && v.origem === 'contratante').length,
    }
  }],

  /* Testes de habilidade */
  ['GET', /^\/testes$/, (e) => {
    if (quem(e, e.eu).tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'Você não tem permissão para acessar este recurso.')
    return { disponivel: true, para_passar: ACERTOS_PARA_PASSAR, xp: XP_TESTE, testes: testesDe(e) }
  }],
  ['GET', /^\/testes\/(\d+)$/, (_e, [id]) => {
    const t = testeDe(Number(id))
    return { tipo_id: t.tipo_id, nome: t.tipo_nome, para_passar: ACERTOS_PARA_PASSAR, perguntas: BANCO[t.area].map(({ enunciado, opcoes }) => ({ enunciado, opcoes })) }
  }],
  ['POST', /^\/testes\/(\d+)$/, (e, [id], c) => {
    const t = testeDe(Number(id))
    const perguntas = BANCO[t.area]
    const respostas = c.respostas as unknown[]
    if (!Array.isArray(respostas) || respostas.length !== perguntas.length) throw new ErroDemo(400, 'Responda todas as perguntas.')
    const anterior = e.testes.find((x) => x.usu_id === e.eu && x.tipo_id === t.tipo_id)
    if (anterior?.aprovado_em) throw new ErroDemo(400, 'Você já passou neste teste.')
    if (anterior && Date.now() - new Date(anterior.ultima_em).getTime() < ESPERA_REFAZER) throw new ErroDemo(429, 'Dá para tentar de novo 24 horas depois da última tentativa.')
    const acertos = perguntas.reduce((n, p, i) => n + (Number(respostas[i]) === p.certa ? 1 : 0), 0)
    const aprovado = acertos >= ACERTOS_PARA_PASSAR
    const agora = new Date().toISOString()
    const linha = { usu_id: e.eu, tipo_id: t.tipo_id, acertos, total: perguntas.length, ultima_em: agora, aprovado_em: aprovado ? agora : null }
    e.testes = [...e.testes.filter((x) => x !== anterior), linha]
    if (aprovado) {
      ganharXp(e, e.eu, XP_TESTE)
      notificar(e, e.eu, 'Teste aprovado!', `Você passou no teste de ${t.tipo_nome} e ganhou o selo da área (+${XP_TESTE} XP).`)
    }
    return {
      acertos, total: perguntas.length, aprovado, gabarito: aprovado ? perguntas.map((p) => p.certa) : null,
      mensagem: aprovado
        ? `Aprovado! ${acertos} de ${perguntas.length}. O selo de ${t.tipo_nome} já aparece no seu perfil. +${XP_TESTE} XP`
        : `${acertos} de ${perguntas.length}: faltou pouco. Precisa de ${ACERTOS_PARA_PASSAR} acertos; dá para tentar de novo amanhã.`,
    }
  }],

  /* Guildas */
  ['GET', /^\/guildas$/, (e) => situacaoGuildas(e)],
  ['POST', /^\/guildas$/, (e, _p, c) => {
    situacaoGuildas(e)
    if (guildaDe(e, e.eu)) throw new ErroDemo(400, 'Você já está numa guilda. Saia dela para fundar outra.')
    const campos = lerGuilda(c)
    if (e.guildas.some((g) => g.nome.toLowerCase() === campos.nome.toLowerCase())) throw new ErroDemo(409, 'Já existe uma guilda com esse nome.')
    const gui_id = e.proximo++
    const agora = new Date().toISOString()
    e.guildas.push({ gui_id, ...campos, dono: e.eu, criada: agora })
    e.membros.push({ gui_id, usu_id: e.eu, papel: 'lider', entrou: agora })
    return ok(`A guilda ${campos.nome} foi fundada! Chame outros freelancers para entrar.`, { gui_id })
  }],
  ['POST', /^\/guildas\/sair$/, (e) => {
    const g = guildaDe(e, e.eu)
    if (!g) throw new ErroDemo(400, 'Você não está em nenhuma guilda.')
    tirarDaGuilda(e, g.gui_id, e.eu)
    return ok(`Você saiu da ${g.nome}.`)
  }],
  ['PUT', /^\/guildas\/(\d+)$/, (e, [id], c) => {
    const g = e.guildas.find((x) => x.gui_id === Number(id))
    if (!g) throw new ErroDemo(404, 'Guilda não encontrada.')
    if (e.membros.find((m) => m.gui_id === g.gui_id && m.usu_id === e.eu)?.papel !== 'lider') throw new ErroDemo(403, 'Só a liderança muda o brasão e o lema.')
    const { lema, brasao, cor } = lerGuilda({ nome: g.nome, ...c })
    Object.assign(g, { lema, brasao, cor })
    return ok('Guilda atualizada.')
  }],
  ['POST', /^\/guildas\/(\d+)\/entrar$/, (e, [id]) => {
    situacaoGuildas(e)
    if (guildaDe(e, e.eu)) throw new ErroDemo(400, 'Você já está numa guilda. Saia dela primeiro.')
    const g = e.guildas.find((x) => x.gui_id === Number(id))
    if (!g) throw new ErroDemo(404, 'Guilda não encontrada.')
    if (e.membros.filter((m) => m.gui_id === g.gui_id).length >= MAX_MEMBROS) throw new ErroDemo(400, `A guilda já está cheia (${MAX_MEMBROS} membros).`)
    e.membros.push({ gui_id: g.gui_id, usu_id: e.eu, papel: 'membro', entrou: new Date().toISOString() })
    for (const m of e.membros.filter((x) => x.gui_id === g.gui_id && x.papel === 'lider')) notificar(e, m.usu_id, 'Novo membro na guilda', `${quem(e, e.eu).usu_nome} entrou na ${g.nome}.`)
    return ok(`Bem-vindo à ${g.nome}!`)
  }],
  ['DELETE', /^\/guildas\/(\d+)\/membros\/(\d+)$/, (e, [id, usuId]) => {
    const gui_id = Number(id)
    if (e.membros.find((m) => m.gui_id === gui_id && m.usu_id === e.eu)?.papel !== 'lider') throw new ErroDemo(403, 'Só a liderança tira membros.')
    if (Number(usuId) === e.eu) throw new ErroDemo(400, 'Para sair, use "Sair da guilda".')
    if (!e.membros.some((m) => m.gui_id === gui_id && m.usu_id === Number(usuId))) throw new ErroDemo(404, 'Essa pessoa não está na guilda.')
    tirarDaGuilda(e, gui_id, Number(usuId))
    notificar(e, Number(usuId), 'Você saiu da guilda', `A liderança tirou você da ${e.guildas.find((g) => g.gui_id === gui_id)?.nome ?? 'guilda'}.`)
    return ok('Membro removido.')
  }],

  /* Álbum de insígnias */
  ['GET', /^\/conquistas\/album$/, (e) => albumDe(e)],
]

/* ---------- Entrada ---------- */

const espera = (ms: number, sinal?: AbortSignal) =>
  new Promise<void>((pronto, falha) => {
    const id = setTimeout(pronto, ms)
    sinal?.addEventListener('abort', () => {
      clearTimeout(id)
      falha(new DOMException('Cancelado', 'AbortError'))
    })
  })

/* Responde como o servidor: devolve os dados ou lança { status, mensagem } */
/* ---------- Agenda, retrospectiva, marcos, preferências, convite, comparação, pausa, mural e administração ---------- */

const DIA_MS = 86_400_000

const vistoDe = (u: Usuario) => (u.mostrar_online === false ? null : (u.visto_em ?? null))

/* Projetos em que a pessoa trabalha: os dela (contratante) ou onde foi contratada (freelancer) */
const projetosDe = (e: Estado, usu_id: number) => e.servicos.filter((s) => s.cont_usu === usu_id || contratadoDe(e, s.serv_id) === usu_id)

const prazoDe = (s: Servico) => (s.serv_contratado_em && s.serv_qtd_dias ? new Date(new Date(s.serv_contratado_em).getTime() + s.serv_qtd_dias * DIA_MS).toISOString() : null)

function agendaDe(e: Estado) {
  const eu = quem(e, e.eu)
  const eventos: { tipo: string; data: string; titulo: string; serv_id: number; link?: string | null }[] = []
  for (const s of projetosDe(e, e.eu)) {
    const prazo = prazoDe(s)
    if (s.serv_status === 'em_andamento' && prazo) {
      eventos.push({
        tipo: s.serv_pausado_em ? 'pausa' : 'prazo',
        data: prazo,
        titulo: s.serv_pausado_em ? `Prazo pausado: ${s.serv_titulo}` : s.serv_entregue_em ? `Entregue, esperando aprovação: ${s.serv_titulo}` : `Entrega de ${s.serv_titulo}`,
        serv_id: s.serv_id,
      })
    }
    if (eu.tipo_usuario === 'contratante' && s.cont_usu === e.eu && s.serv_status === 'aberto' && s.serv_candidaturas_ate) {
      eventos.push({ tipo: 'inscricoes', data: `${s.serv_candidaturas_ate}T23:59:00`, titulo: `Inscrições encerram: ${s.serv_titulo}`, serv_id: s.serv_id })
    }
    for (const et of e.etapas.filter((x) => x.serv_id === s.serv_id && x.eta_concluida_em && Date.now() - new Date(x.eta_concluida_em).getTime() < 90 * DIA_MS)) {
      eventos.push({ tipo: 'etapa', data: et.eta_concluida_em as string, titulo: `Etapa entregue: ${et.eta_titulo} (${s.serv_titulo})`, serv_id: s.serv_id })
    }
  }
  for (const m of e.mensagens.filter((x) => x.msg_reuniao_em && (x.msg_reuniao_status === 'pendente' || x.msg_reuniao_status === 'aceita') && (x.usu_remetente === e.eu || x.usu_destinatario === e.eu))) {
    eventos.push({
      tipo: 'reuniao',
      data: m.msg_reuniao_em as string,
      titulo: `${m.msg_reuniao_status === 'pendente' ? 'Reunião (esperando resposta)' : 'Reunião'}: ${servicoDe(e, m.serv_id).serv_titulo}`,
      serv_id: m.serv_id,
      link: m.msg_reuniao_link ?? null,
    })
  }
  return eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
}

const MESES_DEMO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function retrospectivaDe(e: Estado, ano: number) {
  const eu = quem(e, e.eu)
  const freelancer = eu.tipo_usuario === 'freelancer'
  const doAno = (d?: string | null) => Boolean(d) && new Date(d as string).getFullYear() === ano
  const concluidos = projetosDe(e, e.eu).filter((s) => s.serv_status === 'finalizado' && doAno(s.serv_finalizado_em))
  const porArea = new Map<string, number>()
  for (const s of concluidos) porArea.set(tipoNome(s.tipo_id), (porArea.get(tipoNome(s.tipo_id)) ?? 0) + 1)
  const area = [...porArea.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  let dinheiro = 0
  if (freelancer) {
    for (const m of e.carteira) if (m.usu_id === e.eu && doAno(m.mov_data) && ['recebido', 'etapa', 'bonus'].includes(m.mov_tipo)) dinheiro += Math.max(0, m.mov_valor)
    /* Projetos antigos da demonstração não têm movimento na carteira: entra o valor combinado */
    for (const s of concluidos) if (!e.carteira.some((m) => m.serv_id === s.serv_id && m.usu_id === e.eu)) dinheiro += s.serv_tipo_valor === 'fixo' ? s.serv_valor : 0
  } else {
    for (const s of concluidos) dinheiro += s.serv_tipo_valor === 'fixo' ? s.serv_valor : 0
  }
  const notas = e.avaliacoes.filter((a) => a.usu_avaliado === e.eu && doAno(a.aval_data) && visivel(e, a))
  const enviadas = e.mensagens.filter((m) => m.usu_remetente === e.eu && doAno(m.msg_data))
  const porMes = new Map<number, number>()
  for (const m of enviadas) porMes.set(new Date(m.msg_data).getMonth(), (porMes.get(new Date(m.msg_data).getMonth()) ?? 0) + 1)
  const mesForte = [...porMes.entries()].sort((a, b) => b[1] - a[1])[0]
  let insigniaRara = null
  if (freelancer) {
    const minhas = perfilFreelancer(e, e.eu).insignias.filter((i) => i.conquistada)
    const donos = (codigo: string) => e.usuarios.filter((u) => u.tipo_usuario === 'freelancer' && perfilFreelancer(e, u.usu_id).insignias.some((i) => i.codigo === codigo && i.conquistada)).length
    const rara = minhas.map((i) => ({ ...i, total: donos(i.codigo) })).sort((a, b) => a.total - b.total)[0]
    if (rara) insigniaRara = { nome: rara.nome, descricao: rara.descricao, donos: rara.total }
  }
  return {
    ano,
    papel: eu.tipo_usuario,
    projetos: concluidos.length,
    area_favorita: area,
    dinheiro: Math.round(dinheiro * 100) / 100,
    avaliacoes: notas.length,
    media: notas.length ? Math.round((notas.reduce((s, a) => s + a.aval_nota, 0) / notas.length) * 10) / 10 : null,
    melhor_nota: notas.length ? Math.max(...notas.map((a) => a.aval_nota)) : null,
    mensagens: enviadas.length,
    mes_mais_ativo: mesForte ? MESES_DEMO[mesForte[0]] : null,
    parceiros: new Set(enviadas.map((m) => m.usu_destinatario)).size,
    xp: freelancer ? e.xpEventos.filter((x) => x.usu_id === e.eu && doAno(x.data)).reduce((s, x) => s + x.xp, 0) + concluidos.length * 100 : null,
    insignia_rara: insigniaRara,
  }
}

function marcosDe(e: Estado) {
  const eu = quem(e, e.eu)
  const criada = new Date(eu.data_criacao)
  const lista: { codigo: string; titulo: string; descricao: string; data: string | null }[] = []
  for (const anos of [1, 2, 3]) {
    const quando = new Date(criada.getFullYear() + anos, criada.getMonth(), criada.getDate())
    lista.push({ codigo: `conta_${anos}`, titulo: anos === 1 ? '1 ano de castelo' : `${anos} anos de castelo`, descricao: `${anos === 1 ? 'Um ano' : `${anos} anos`} desde que você chegou ao ContrateJá.`, data: quando.getTime() <= Date.now() ? quando.toISOString() : null })
  }
  const concluidos = projetosDe(e, e.eu).filter((s) => s.serv_status === 'finalizado' && s.serv_finalizado_em).sort((a, b) => String(a.serv_finalizado_em).localeCompare(String(b.serv_finalizado_em)))
  for (const n of [1, 10, 25, 50]) {
    lista.push({ codigo: `projeto_${n}`, titulo: n === 1 ? 'Primeiro projeto' : `${n}º projeto`, descricao: n === 1 ? 'O primeiro projeto concluído a gente nunca esquece.' : `${n} projetos concluídos no ContrateJá.`, data: concluidos[n - 1]?.serv_finalizado_em ?? null })
  }
  const cinco = e.avaliacoes.filter((a) => a.usu_avaliado === e.eu && a.aval_nota === 5 && visivel(e, a)).sort((a, b) => a.aval_data.localeCompare(b.aval_data))[0]
  lista.push({ codigo: 'nota_5', titulo: 'Primeira nota 5', descricao: 'Alguém deu 5 estrelas para o seu trabalho.', data: cinco?.aval_data ?? null })
  return { desde: eu.data_criacao, projetos: concluidos.length, marcos: lista.map((m) => ({ ...m, conquistado: Boolean(m.data) })) }
}

function lerModeloDemo(c: Corpo) {
  const titulo = String(c.titulo ?? '').trim()
  const texto = String(c.texto ?? '').trim()
  if (!titulo || titulo.length > 60) throw new ErroDemo(400, 'Dê um nome de até 60 letras para a carta.')
  if (texto.length < 10) throw new ErroDemo(400, 'A carta precisa de pelo menos 10 letras.')
  if (texto.length > 500) throw new ErroDemo(400, 'A carta pode ter até 500 letras.')
  return { mod_titulo: titulo, mod_texto: texto }
}

const nomeCurtoDemo = (nome: string) => {
  const [primeiro, segundo] = nome.split(' ')
  return segundo ? `${primeiro} ${segundo[0]}.` : primeiro
}

/* ---------- Rodada das 30 sugestões ---------- */

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const bloqueadosDemo = (e: Estado, a: number, b: number) => e.bloqueios.some((x) => (x.usu_id === a && x.bloqueado_id === b) || (x.usu_id === b && x.bloqueado_id === a))

function mediasCriterioDemo(e: Estado, usu_id: number) {
  const com = e.avaliacoes.filter((a) => a.usu_avaliado === usu_id && visivel(e, a) && a.aval_comunicacao)
  if (!com.length) return null
  const media = (campo: 'aval_comunicacao' | 'aval_prazo' | 'aval_qualidade') => {
    const v = com.map((a) => a[campo]).filter((x): x is number => typeof x === 'number')
    return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null
  }
  return { comunicacao: media('aval_comunicacao'), prazo: media('aval_prazo'), qualidade: media('aval_qualidade'), total: com.length }
}

function reputacaoContratanteDemo(e: Estado, usu_id: number) {
  const projetos = e.servicos.filter((s) => s.cont_usu === usu_id && ['em_andamento', 'finalizado'].includes(s.serv_status))
  const finalizados = projetos.filter((s) => s.serv_status === 'finalizado')
  const comAcordo = projetos.filter((s) => s.serv_acordo_free_em || s.serv_garantia_em)
  const pagou = comAcordo.filter((s) => s.serv_garantia_em).length
  const demoras = finalizados.filter((s) => s.serv_entregue_em && s.serv_finalizado_em).map((s) => (new Date(s.serv_finalizado_em as string).getTime() - new Date(s.serv_entregue_em as string).getTime()) / DIA_MS).sort((a, b) => a - b)
  const mediana = demoras.length ? demoras[Math.floor(demoras.length / 2)] : null
  const avaliados = finalizados.filter((s) => e.avaliacoes.some((a) => a.serv_id === s.serv_id && a.usu_avaliador === usu_id)).length
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null)
  const selos: { codigo: string; texto: string }[] = []
  if (comAcordo.length >= 2 && pagou / comAcordo.length >= 0.9) selos.push({ codigo: 'paga', texto: 'Guarda o pagamento em dia' })
  if (demoras.length >= 2 && (mediana ?? 99) <= 2) selos.push({ codigo: 'aprova', texto: 'Aprova a entrega rápido' })
  if (finalizados.length >= 2 && avaliados / finalizados.length >= 0.9) selos.push({ codigo: 'avalia', texto: 'Avalia sempre' })
  return { projetos_concluidos: finalizados.length, pagamento_em_dia: pct(pagou, comAcordo.length), dias_para_aprovar: mediana === null ? null : Math.round(mediana * 10) / 10, avalia: pct(avaliados, finalizados.length), selos }
}

function registrarMudancasDemo(e: Estado, s: Servico, c: Corpo) {
  if (s.serv_status !== 'aberto') return
  const moeda = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`
  const novos: [string, string, string][] = []
  if (c.titulo !== undefined && String(c.titulo) !== s.serv_titulo) novos.push(['título', s.serv_titulo, String(c.titulo)])
  if (c.valor !== undefined && Number(c.valor) !== Number(s.serv_valor)) novos.push(['valor', moeda(s.serv_valor), moeda(Number(c.valor))])
  if (c.qtd_dias !== undefined && Number(c.qtd_dias || 0) !== Number(s.serv_qtd_dias ?? 0)) novos.push(['prazo', `${s.serv_qtd_dias ?? '—'} dias`, `${c.qtd_dias || '—'} dias`])
  if (c.local !== undefined && String(c.local) !== s.serv_local) novos.push(['local', s.serv_local, String(c.local)])
  if (!novos.length) return
  for (const [campo, antes, depois] of novos) e.mudancas.push({ serv_id: s.serv_id, campo, antes, depois, data: new Date().toISOString() })
  const importantes = novos.filter(([campo]) => campo !== 'título')
  if (!importantes.length) return
  const texto = `"${s.serv_titulo}" mudou depois da sua candidatura: ${importantes.map(([campo, a, d]) => `${campo} ${a} → ${d}`).join('; ')}.`
  for (const cand of e.candidaturas.filter((x) => x.serv_id === s.serv_id && x.cand_status === 'pendente')) notificar(e, cand.free_usu, 'Projeto mudou depois da candidatura', texto)
}

/* Semana ISO "2026-W43" e mês "2026-10" (igual ao servidor, no relógio local) */
function semanaDemo(agora = new Date()) {
  const d = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()))
  const dia = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dia)
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d.getTime() - inicio.getTime()) / 86_400_000 + 1) / 7)).padStart(2, '0')}`
}
const mesDemo = (agora = new Date()) => `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

const CHEFOES_DEMO = ['Dragão de Brasa', 'Grifo de Gelo', 'Serpente das Brumas', 'Golem de Pedra', 'Fênix Sombria', 'Kraken do Fosso']
const TEMAS_DEMO = [
  'Logo para uma padaria', 'Página inicial de uma pet shop', 'Cartaz de festa junina', 'Ícone em pixel art de um castelo',
  'Post de Instagram para uma cafeteria', 'Mascote para um time de futebol de bairro', 'Cardápio de uma pizzaria', 'Tela de login de um app de receitas',
  'Convite de aniversário infantil', 'Banner para uma loja de bicicletas', 'Capa de podcast sobre tecnologia', 'Embalagem de um sabonete artesanal',
]
const temaDemo = (semana: string) => TEMAS_DEMO[(Number(semana.slice(0, 4)) * 53 + Number(semana.slice(6))) % TEMAS_DEMO.length]

function chefaoDemo(e: Estado) {
  const agora = new Date()
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime()
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1)
  const noMes = (d?: string | null) => Boolean(d) && new Date(d as string).getTime() >= inicio && new Date(d as string).getTime() < fim.getTime()
  const golpes = e.servicos.filter((s) => s.serv_status === 'finalizado' && noMes(s.serv_finalizado_em)).map((s) => contratadoDe(e, s.serv_id)).filter((x): x is number => x !== null)
  const notas5 = e.avaliacoes.filter((a) => a.aval_nota === 5 && noMes(a.aval_data) && quem(e, a.usu_avaliado).tipo_usuario === 'freelancer').length
  const dano = golpes.length * 3 + notas5
  return {
    mes: mesDemo(), nome: CHEFOES_DEMO[(agora.getFullYear() * 12 + agora.getMonth()) % CHEFOES_DEMO.length], vida_max: 30, vida: Math.max(0, 30 - dano), dano,
    golpes: golpes.length, participantes: new Set(golpes).size, participei: golpes.includes(e.eu), derrotado: dano >= 30,
    resgatado: e.chefao.some((x) => x.usu_id === e.eu && x.mes === mesDemo()), xp: 80, termina: fim.toISOString(),
  }
}

function enviosDemo(e: Estado, semana: string) {
  return e.envios
    .filter((x) => x.semana === semana)
    .map((x) => ({
      env_id: x.env_id, titulo: x.titulo, link: x.link, desc: x.desc, data: x.data, autor: nomeCurtoDemo(quem(e, x.usu_id).usu_nome),
      votos: e.votos.filter((v) => v.env_id === x.env_id).length, votei: e.votos.some((v) => v.env_id === x.env_id && v.usu_id === e.eu), meu: x.usu_id === e.eu,
    }))
    .sort((a, b) => b.votos - a.votos || a.data.localeCompare(b.data))
}

const GALHOS_DEMO: { codigo: string; titulo: string; descricao: string; meta: (d: { projetos: number; teste: boolean; avaliacoes: number; media: number }) => [number, number] }[] = [
  { codigo: 'primeiro', titulo: 'Primeiro passo', descricao: 'Concluir 1 projeto na área', meta: (d) => [d.projetos, 1] },
  { codigo: 'teste', titulo: 'Testado', descricao: 'Passar no teste de habilidade da área', meta: (d) => [d.teste ? 1 : 0, 1] },
  { codigo: 'tres', titulo: 'Mão na massa', descricao: 'Concluir 3 projetos na área', meta: (d) => [d.projetos, 3] },
  { codigo: 'nota', titulo: 'Bem avaliado', descricao: 'Média 4,5 ou mais em 3 avaliações da área', meta: (d) => [d.avaliacoes >= 3 && d.media >= 4.5 ? 1 : 0, 1] },
  { codigo: 'mestre', titulo: 'Mestre', descricao: 'Concluir 10 projetos na área', meta: (d) => [d.projetos, 10] },
]

function arvoreDemo(e: Estado, usu_id: number) {
  const u = quem(e, usu_id)
  const feitos = e.servicos.filter((s) => s.serv_status === 'finalizado' && contratadoDe(e, s.serv_id) === usu_id)
  const areas = new Set([...(u.areas ?? []), ...feitos.map((s) => s.tipo_id)])
  return [...areas].map((tipo_id) => {
    const daArea = feitos.filter((s) => s.tipo_id === tipo_id)
    const notas = e.avaliacoes.filter((a) => a.usu_avaliado === usu_id && visivel(e, a) && daArea.some((s) => s.serv_id === a.serv_id))
    const d = { projetos: daArea.length, teste: e.testes.some((t) => t.usu_id === usu_id && t.tipo_id === tipo_id && t.aprovado_em), avaliacoes: notas.length, media: notas.length ? notas.reduce((s, a) => s + a.aval_nota, 0) / notas.length : 0 }
    const galhos = GALHOS_DEMO.map((g) => {
      const [feito, meta] = g.meta(d)
      return { codigo: g.codigo, titulo: g.titulo, descricao: g.descricao, progresso: Math.min(feito, meta), meta, aceso: feito >= meta }
    })
    return { tipo_id, area: tipoNome(tipo_id), acesos: galhos.filter((g) => g.aceso).length, galhos }
  }).sort((a, b) => b.acesos - a.acesos || a.area.localeCompare(b.area))
}

function missoesGuildaDemo(e: Estado, gui_id: number) {
  const membros = e.membros.filter((m) => m.gui_id === gui_id).map((m) => m.usu_id)
  const agora = new Date()
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime()
  const noMes = (d?: string | null) => Boolean(d) && new Date(d as string).getTime() >= inicio
  const projetos = e.servicos.filter((s) => s.serv_status === 'finalizado' && noMes(s.serv_finalizado_em) && membros.includes(contratadoDe(e, s.serv_id) ?? 0)).length
  const notas5 = e.avaliacoes.filter((a) => a.aval_nota === 5 && membros.includes(a.usu_avaliado) && noMes(a.aval_data)).length
  const testes = e.testes.filter((t) => membros.includes(t.usu_id) && noMes(t.aprovado_em)).length
  return [
    { codigo: 'projetos', titulo: 'Concluir 5 projetos no mês', progresso: projetos, meta: 5, enfeite: 'estandarte' },
    { codigo: 'notas', titulo: 'Receber 3 notas 5', progresso: notas5, meta: 3, enfeite: 'coroa' },
    { codigo: 'testes', titulo: 'Passar em 2 testes de habilidade', progresso: testes, meta: 2, enfeite: 'louros' },
    { codigo: 'time', titulo: 'Ter 4 membros ou mais', progresso: membros.length, meta: 4, enfeite: 'estrelas' },
  ].map((m) => ({ ...m, progresso: Math.min(m.progresso, m.meta), feita: m.progresso >= m.meta }))
}

/* Projeto em que a pessoa trabalha, com o dono e o freelancer contratado */
function trabalhoDe(e: Estado, serv_id: number) {
  const s = participanteDe(e, serv_id)
  return { s, dono: s.cont_usu, freelancer: contratadoDe(e, s.serv_id) }
}

function resumoHorasDemo(e: Estado, s: Servico) {
  const registros = e.horas.filter((h) => h.serv_id === s.serv_id).sort((a, b) => b.hor_id - a.hor_id)
  const soma = (st: string) => registros.filter((r) => r.hor_status === st).reduce((t, r) => t + (r.hor_minutos ?? 0), 0)
  return {
    disponivel: true, por_hora: s.serv_tipo_valor === 'hora', registros, minutos_aprovados: soma('aprovada'), minutos_pendentes: soma('pendente'),
    valor_hora: s.serv_valor, valor_aprovado: Math.round((soma('aprovada') / 60) * s.serv_valor * 100) / 100, rodando: registros.find((r) => r.hor_status === 'rodando') ?? null,
  }
}

const listaCriteriosDemo = (e: Estado, serv_id: number) =>
  e.criterios.filter((c) => c.serv_id === serv_id).map((c) => ({ cri_id: c.cri_id, cri_texto: c.cri_texto, cri_entregue_em: c.cri_entregue_em, cri_aprovado_em: c.cri_aprovado_em }))

function repetirDemo(e: Estado, original: Servico) {
  const novo = servico(e.proximo++, original.cont_usu, original.tipo_id, original.serv_titulo, original.serv_desc, original.serv_valor, original.serv_tipo_valor, 'aberto', 0, {
    serv_qtd_dias: original.serv_qtd_dias, serv_local: original.serv_local, serv_cidade: original.serv_cidade, serv_estado: original.serv_estado, serv_habilidades: original.serv_habilidades, serv_repetido_de: original.serv_id,
  })
  e.servicos.unshift(novo)
  const free = contratadoDe(e, original.serv_id)
  if (free) {
    e.convites.push({ conv_id: e.proximo++, serv_id: novo.serv_id, free_usu: free, conv_mensagem: 'Projeto do mês: quer fazer de novo?', conv_status: 'pendente', conv_data: new Date().toISOString() })
    notificar(e, free, 'Você recebeu um convite!', `"${original.serv_titulo}" voltou este mês e o contratante quer você de novo.`)
  }
  return novo
}

const ROTAS_TRINTA: Rota[] = [
  /* Bloqueio */
  ['GET', /^\/usuarios\/eu\/bloqueados$/, (e) => ({
    disponivel: true,
    bloqueados: e.bloqueios.filter((b) => b.usu_id === e.eu).map((b) => ({ usu_id: b.bloqueado_id, usu_nome: quem(e, b.bloqueado_id).usu_nome, tipo_usuario: quem(e, b.bloqueado_id).tipo_usuario, blo_data: b.blo_data })),
  })],
  ['POST', /^\/usuarios\/bloqueios\/(\d+)$/, (e, [id]) => {
    const alvo = quem(e, Number(id))
    if (alvo.usu_id === e.eu) throw new ErroDemo(400, 'Escolha outra pessoa para bloquear.')
    if (alvo.tipo_usuario === 'administrador') throw new ErroDemo(400, 'Não dá para bloquear a administração.')
    if (!e.bloqueios.some((b) => b.usu_id === e.eu && b.bloqueado_id === alvo.usu_id)) e.bloqueios.push({ usu_id: e.eu, bloqueado_id: alvo.usu_id, blo_data: new Date().toISOString() })
    return ok('Pessoa bloqueada. Ela não consegue mais falar com você nem se candidatar aos seus projetos.')
  }],
  ['DELETE', /^\/usuarios\/bloqueios\/(\d+)$/, (e, [id]) => {
    e.bloqueios = e.bloqueios.filter((b) => !(b.usu_id === e.eu && b.bloqueado_id === Number(id)))
    return ok('Pessoa desbloqueada.')
  }],

  /* Horários, anotações privadas e "me avise quando estiver livre" */
  ['PUT', /^\/usuarios\/eu\/horarios$/, (e, _p, c) => {
    const u = quem(e, e.eu)
    if (c.horarios === null) {
      u.horarios = null
      return ok('Horários apagados.')
    }
    const h = (c.horarios ?? {}) as { dias?: number[]; de?: number; ate?: number }
    const dias = [...new Set((h.dias ?? []).map(Number).filter((d) => d >= 0 && d <= 6))].sort()
    const de = Number(h.de)
    const ate = Number(h.ate)
    if (!dias.length || !Number.isInteger(de) || !Number.isInteger(ate) || de >= ate || de < 0 || ate > 24) throw new ErroDemo(400, 'Escolha pelo menos um dia e um horário de início antes do fim.')
    u.horarios = { dias, de, ate }
    return ok('Horários salvos.', { horarios: u.horarios })
  }],
  ['GET', /^\/usuarios\/notas\/(\d+)$/, (e, [id]) => {
    const n = e.notas.find((x) => x.usu_id === e.eu && x.alvo_id === Number(id))
    return { disponivel: true, texto: n?.texto ?? '', atualizada_em: n?.data ?? null }
  }],
  ['PUT', /^\/usuarios\/notas\/(\d+)$/, (e, [id], c) => {
    const texto = String(c.texto ?? '').trim()
    if (texto.length > 1000) throw new ErroDemo(400, 'A anotação pode ter até 1000 letras.')
    e.notas = e.notas.filter((x) => !(x.usu_id === e.eu && x.alvo_id === Number(id)))
    if (!texto) return ok('Anotação apagada.')
    e.notas.push({ usu_id: e.eu, alvo_id: Number(id), texto, data: new Date().toISOString() })
    return ok('Anotação salva. Só você vê.')
  }],
  ['GET', /^\/usuarios\/freelancers\/(\d+)\/aviso-livre$/, (e, [id]) => ({ disponivel: true, ativo: e.avisosLivre.some((a) => a.usu_id === e.eu && a.free_usu_id === Number(id)) })],
  ['POST', /^\/usuarios\/freelancers\/(\d+)\/aviso-livre$/, (e, [id]) => {
    const f = quem(e, Number(id))
    if (!e.avisosLivre.some((a) => a.usu_id === e.eu && a.free_usu_id === f.usu_id)) e.avisosLivre.push({ usu_id: e.eu, free_usu_id: f.usu_id })
    return ok(`Combinado: avisamos quando ${f.usu_nome.split(' ')[0]} estiver livre.`)
  }],
  ['DELETE', /^\/usuarios\/freelancers\/(\d+)\/aviso-livre$/, (e, [id]) => {
    e.avisosLivre = e.avisosLivre.filter((a) => !(a.usu_id === e.eu && a.free_usu_id === Number(id)))
    return ok('Aviso cancelado.')
  }],

  /* Horas trabalhadas */
  ['GET', /^\/servicos\/(\d+)\/horas$/, (e, [id]) => resumoHorasDemo(e, trabalhoDe(e, Number(id)).s)],
  ['POST', /^\/servicos\/(\d+)\/horas$/, (e, [id], c) => {
    const { s, dono, freelancer } = trabalhoDe(e, Number(id))
    if (freelancer !== e.eu) throw new ErroDemo(404, 'Projeto não encontrado entre os seus trabalhos.')
    if (s.serv_tipo_valor !== 'hora') throw new ErroDemo(400, 'Este projeto tem valor fixo: não precisa registrar horas.')
    if (s.serv_status !== 'em_andamento') throw new ErroDemo(400, 'Só dá para registrar horas em projetos em andamento.')
    const desc = String(c.desc ?? '').trim().slice(0, 200) || null
    const rodando = e.horas.find((h) => h.serv_id === s.serv_id && h.usu_id === e.eu && h.hor_status === 'rodando')
    if (c.acao === 'iniciar') {
      if (rodando) throw new ErroDemo(400, 'O cronômetro já está rodando.')
      e.horas.push({ hor_id: e.proximo++, serv_id: s.serv_id, usu_id: e.eu, hor_inicio: new Date().toISOString(), hor_fim: null, hor_minutos: null, hor_desc: desc, hor_status: 'rodando' })
      return ok('Cronômetro ligado. Bom trabalho!')
    }
    if (c.acao === 'parar') {
      if (!rodando) throw new ErroDemo(400, 'O cronômetro não está rodando.')
      const minutos = Math.max(1, Math.min(720, Math.round((Date.now() - new Date(rodando.hor_inicio).getTime()) / 60_000)))
      Object.assign(rodando, { hor_fim: new Date().toISOString(), hor_minutos: minutos, hor_status: 'pendente', ...(desc ? { hor_desc: desc } : {}) })
      notificar(e, dono, 'Horas para aprovar', `${minutos} min registrados em "${s.serv_titulo}". Aprove no histórico.`)
      return ok(`${minutos} min registrados. O contratante vai aprovar.`, { minutos })
    }
    if (c.acao === 'manual') {
      const minutos = Number(c.minutos)
      if (!Number.isInteger(minutos) || minutos < 5 || minutos > 720) throw new ErroDemo(400, 'Informe de 5 minutos a 12 horas.')
      if (!desc) throw new ErroDemo(400, 'Conte o que foi feito nessas horas.')
      const dia = c.dia ? `${String(c.dia).slice(0, 10)}T12:00:00` : new Date().toISOString()
      e.horas.push({ hor_id: e.proximo++, serv_id: s.serv_id, usu_id: e.eu, hor_inicio: dia, hor_fim: dia, hor_minutos: minutos, hor_desc: desc, hor_status: 'pendente' })
      notificar(e, dono, 'Horas para aprovar', `${minutos} min registrados em "${s.serv_titulo}". Aprove no histórico.`)
      return ok('Horas registradas. O contratante vai aprovar.')
    }
    throw new ErroDemo(400, 'Ação inválida.')
  }],
  ['PUT', /^\/servicos\/(\d+)\/horas\/(\d+)$/, (e, [id, horId], c) => {
    const { s, dono, freelancer } = trabalhoDe(e, Number(id))
    const r = e.horas.find((h) => h.hor_id === Number(horId) && h.serv_id === s.serv_id)
    if (!r) throw new ErroDemo(404, 'Registro não encontrado.')
    if (c.acao === 'apagar') {
      if (freelancer !== e.eu || r.hor_status !== 'pendente') throw new ErroDemo(403, 'Só dá para apagar horas suas que ainda não foram aprovadas.')
      e.horas = e.horas.filter((h) => h.hor_id !== r.hor_id)
      return ok('Registro apagado.')
    }
    if (c.acao !== 'aprovar' && c.acao !== 'recusar') throw new ErroDemo(400, 'Ação inválida.')
    if (dono !== e.eu) throw new ErroDemo(403, 'Quem aprova as horas é o contratante.')
    if (r.hor_status !== 'pendente') throw new ErroDemo(400, 'Este registro já foi decidido.')
    r.hor_status = c.acao === 'aprovar' ? 'aprovada' : 'recusada'
    if (freelancer) notificar(e, freelancer, c.acao === 'aprovar' ? 'Horas aprovadas' : 'Horas recusadas', `${r.hor_minutos} min em "${s.serv_titulo}" foram ${c.acao === 'aprovar' ? 'aprovados' : 'recusados'}.`)
    return ok(c.acao === 'aprovar' ? 'Horas aprovadas.' : 'Horas recusadas.')
  }],

  /* Critérios de aceite */
  ['GET', /^\/servicos\/(\d+)\/criterios$/, (e, [id]) => ({ disponivel: true, criterios: listaCriteriosDemo(e, trabalhoDe(e, Number(id)).s.serv_id) })],
  ['POST', /^\/servicos\/(\d+)\/criterios$/, (e, [id], c) => {
    const { s, dono, freelancer } = trabalhoDe(e, Number(id))
    if (dono !== e.eu) throw new ErroDemo(404, 'Projeto não encontrado entre os seus.')
    if (s.serv_status !== 'em_andamento') throw new ErroDemo(400, 'Os critérios são definidos com o projeto em andamento.')
    const texto = String(c.texto ?? '').trim()
    if (texto.length < 3 || texto.length > 150) throw new ErroDemo(400, 'Escreva o critério com 3 a 150 letras (ex.: "Logo em PNG e SVG").')
    if (e.criterios.filter((x) => x.serv_id === s.serv_id).length >= 12) throw new ErroDemo(400, 'Um projeto pode ter até 12 critérios.')
    e.criterios.push({ cri_id: e.proximo++, serv_id: s.serv_id, cri_texto: texto, cri_entregue_em: null, cri_aprovado_em: null })
    if (freelancer) notificar(e, freelancer, 'Critério de aceite novo', `"${s.serv_titulo}": ${texto}`)
    return ok('Critério adicionado.', { criterios: listaCriteriosDemo(e, s.serv_id) })
  }],
  ['PUT', /^\/servicos\/(\d+)\/criterios\/(\d+)$/, (e, [id, criId], c) => {
    const { s, dono, freelancer } = trabalhoDe(e, Number(id))
    const cri = e.criterios.find((x) => x.cri_id === Number(criId) && x.serv_id === s.serv_id)
    if (!cri) throw new ErroDemo(404, 'Critério não encontrado.')
    const agora = new Date().toISOString()
    if ((c.acao === 'entregue' || c.acao === 'desfazer') && freelancer === e.eu) {
      if (cri.cri_aprovado_em) throw new ErroDemo(400, 'Este critério já foi aprovado.')
      cri.cri_entregue_em = c.acao === 'entregue' ? agora : null
    } else if ((c.acao === 'aprovar' || c.acao === 'reprovar') && dono === e.eu) {
      if (c.acao === 'aprovar' && !cri.cri_entregue_em) throw new ErroDemo(400, 'O freelancer ainda não marcou este critério como entregue.')
      if (c.acao === 'aprovar') cri.cri_aprovado_em = agora
      else Object.assign(cri, { cri_aprovado_em: null, cri_entregue_em: null })
      if (c.acao === 'reprovar' && freelancer) notificar(e, freelancer, 'Critério para refazer', `"${s.serv_titulo}": ${cri.cri_texto}`)
    } else if (c.acao === 'apagar' && dono === e.eu) {
      if (cri.cri_aprovado_em) throw new ErroDemo(400, 'Critério aprovado não pode ser apagado.')
      e.criterios = e.criterios.filter((x) => x.cri_id !== cri.cri_id)
    } else throw new ErroDemo(403, 'Você não pode fazer isso neste critério.')
    return ok('Critério atualizado.', { criterios: listaCriteriosDemo(e, s.serv_id) })
  }],

  /* Versões da entrega, projeto recorrente e trabalho de amostra */
  ['GET', /^\/servicos\/(\d+)\/versoes$/, (e, [id]) => ({ disponivel: true, versoes: e.versoes.filter((v) => v.serv_id === trabalhoDe(e, Number(id)).s.serv_id).sort((a, b) => b.ver_numero - a.ver_numero) })],
  ['PUT', /^\/servicos\/(\d+)\/repetir$/, (e, [id], c) => {
    const { s, dono } = trabalhoDe(e, Number(id))
    if (dono !== e.eu) throw new ErroDemo(404, 'Projeto não encontrado entre os seus.')
    if (s.serv_status !== 'finalizado') throw new ErroDemo(400, 'Dá para repetir projetos concluídos.')
    const proximo = new Date(new Date().getFullYear(), new Date().getMonth() + 1, Math.min(new Date().getDate(), 28))
    const data = dataLocal(proximo.getTime())
    Object.assign(s, { serv_repetir: Boolean(c.ativo), serv_repetir_em: c.ativo ? data : null })
    return ok(c.ativo ? `Combinado: este projeto volta todo mês (o próximo em ${data.split('-').reverse().join('/')}), já com convite para o mesmo freelancer.` : 'O projeto não vai mais se repetir.', { repetir_em: c.ativo ? data : null })
  }],
  ['POST', /^\/servicos\/(\d+)\/repetir-agora$/, (e, [id]) => {
    const { s, dono } = trabalhoDe(e, Number(id))
    if (dono !== e.eu) throw new ErroDemo(404, 'Projeto não encontrado entre os seus.')
    if (s.serv_status !== 'finalizado') throw new ErroDemo(400, 'Dá para repetir projetos concluídos.')
    const novo = repetirDemo(e, s)
    return ok('Projeto publicado de novo, com convite para o mesmo freelancer.', { serv_id: novo.serv_id })
  }],
  ['POST', /^\/servicos\/amostra$/, (e, _p, c) => {
    const f = quem(e, Number(c.usu_id))
    const titulo = String(c.titulo ?? '').trim()
    const descricao = String(c.descricao ?? '').trim()
    const valor = Number(c.valor)
    const prazo = Number(c.prazo)
    if (f.tipo_usuario !== 'freelancer') throw new ErroDemo(404, 'Freelancer não encontrado.')
    if (titulo.length < 5 || titulo.length > 150) throw new ErroDemo(400, 'Dê um título de 5 a 150 letras para a amostra.')
    if (descricao.length < 10) throw new ErroDemo(400, 'Explique o que a amostra precisa ter.')
    if (!Number.isFinite(valor) || valor <= 0 || valor > 300) throw new ErroDemo(400, 'A amostra vale até R$ 300.')
    if (!Number.isInteger(prazo) || prazo < 1 || prazo > 7) throw new ErroDemo(400, 'O prazo da amostra vai de 1 a 7 dias.')
    if (e.servicos.some((s) => s.cont_usu === e.eu && s.serv_amostra_de === f.usu_id && ['aberto', 'em_andamento'].includes(s.serv_status))) throw new ErroDemo(400, `Já existe uma amostra com ${f.usu_nome.split(' ')[0]} em andamento.`)
    const novo = servico(e.proximo++, e.eu, Number(c.tipo_id) || (f.areas ?? [1])[0], `Amostra: ${titulo}`.slice(0, 150), descricao, valor, 'fixo', 'aberto', 0, { serv_qtd_dias: prazo, serv_amostra_de: f.usu_id })
    e.servicos.unshift(novo)
    e.convites.push({ conv_id: e.proximo++, serv_id: novo.serv_id, free_usu: f.usu_id, conv_mensagem: 'Trabalho de amostra antes de um projeto maior.', conv_status: 'pendente', conv_data: new Date().toISOString() })
    notificar(e, f.usu_id, 'Convite para um trabalho de amostra', `Um contratante quer testar seu trabalho antes de um projeto maior: "${titulo}" (até R$ ${valor}).`)
    return ok(`Amostra criada e ${f.usu_nome.split(' ')[0]} foi convidado.`, { serv_id: novo.serv_id })
  }],

  /* Pedido de orçamento */
  ['GET', /^\/orcamentos$/, (e) => {
    const eu = quem(e, e.eu)
    const meus = eu.tipo_usuario === 'contratante' ? e.orcamentos.filter((o) => o.usu_id === e.eu) : e.orcamentos.filter((o) => o.respostas.some((r) => r.usu_id === e.eu))
    return {
      disponivel: true,
      pedidos: meus.sort((a, b) => b.orc_id - a.orc_id).map((o) => ({
        orc_id: o.orc_id, pergunta: o.pergunta, tipo_id: null, fechado: o.fechado, data: o.data,
        ...(eu.tipo_usuario === 'contratante' ? {} : { contratante: quem(e, o.usu_id).usu_nome }),
        respostas: o.respostas.filter((r) => eu.tipo_usuario === 'contratante' || r.usu_id === e.eu).map((r) => ({ ...r, nome: quem(e, r.usu_id).usu_nome, foto: quem(e, r.usu_id).usu_foto })),
      })),
    }
  }],
  ['POST', /^\/orcamentos$/, (e, _p, c) => {
    const pergunta = String(c.pergunta ?? '').trim()
    const ids = [...new Set((Array.isArray(c.freelancers) ? c.freelancers : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    if (pergunta.length < 15 || pergunta.length > 600) throw new ErroDemo(400, 'Descreva o que precisa em 15 a 600 letras.')
    if (ids.length < 1 || ids.length > 3) throw new ErroDemo(400, 'Escolha de 1 a 3 freelancers.')
    for (const id of ids) if (quem(e, id).tipo_usuario !== 'freelancer') throw new ErroDemo(400, 'Algum dos freelancers escolhidos não está disponível.')
    const orc_id = e.proximo++
    e.orcamentos.push({ orc_id, usu_id: e.eu, pergunta, fechado: false, data: new Date().toISOString(), respostas: ids.map((usu_id) => ({ usu_id, status: 'aguardando', valor: null, prazo: null, texto: null, data: null })) })
    for (const id of ids) notificar(e, id, 'Pedido de orçamento', `${quem(e, e.eu).usu_nome.split(' ')[0]} quer saber quanto você cobra: "${pergunta.slice(0, 100)}"`)
    return ok(`Pedido enviado para ${ids.length} ${ids.length === 1 ? 'freelancer' : 'freelancers'}.`, { orc_id })
  }],
  ['PUT', /^\/orcamentos\/(\d+)\/resposta$/, (e, [id], c) => {
    const o = e.orcamentos.find((x) => x.orc_id === Number(id))
    const r = o?.respostas.find((x) => x.usu_id === e.eu)
    if (!o || !r) throw new ErroDemo(404, 'Pedido não encontrado.')
    if (o.fechado) throw new ErroDemo(400, 'O contratante já encerrou este pedido.')
    if (c.recusar) {
      Object.assign(r, { status: 'recusado', data: new Date().toISOString() })
      return ok('Pedido recusado.')
    }
    const valor = c.valor === '' || c.valor == null ? null : Number(c.valor)
    const prazo = c.prazo === '' || c.prazo == null ? null : Number(c.prazo)
    const texto = String(c.texto ?? '').trim().slice(0, 500) || null
    if (valor !== null && (!Number.isFinite(valor) || valor <= 0)) throw new ErroDemo(400, 'Valor inválido.')
    if (prazo !== null && (!Number.isInteger(prazo) || prazo < 1 || prazo > 365)) throw new ErroDemo(400, 'O prazo vai de 1 a 365 dias.')
    if (valor === null && !texto) throw new ErroDemo(400, 'Informe o valor ou explique como você cobra.')
    Object.assign(r, { status: 'respondido', valor, prazo, texto, data: new Date().toISOString() })
    notificar(e, o.usu_id, 'Orçamento respondido', `${quem(e, e.eu).usu_nome.split(' ')[0]} respondeu o seu pedido de orçamento.`)
    return ok('Orçamento enviado ao contratante.')
  }],
  ['PUT', /^\/orcamentos\/(\d+)\/fechar$/, (e, [id]) => {
    const o = e.orcamentos.find((x) => x.orc_id === Number(id) && x.usu_id === e.eu)
    if (!o) throw new ErroDemo(404, 'Pedido não encontrado.')
    o.fechado = true
    return ok('Pedido encerrado.')
  }],

  /* Comunidade: chefão, desafio, árvore e missões da guilda */
  ['GET', /^\/comunidade\/chefao$/, (e) => chefaoDemo(e)],
  ['POST', /^\/comunidade\/chefao\/resgatar$/, (e) => {
    const c = chefaoDemo(e)
    if (!c.derrotado) throw new ErroDemo(400, `${c.nome} ainda tem ${c.vida} de vida. Concluam mais projetos!`)
    if (!c.participei) throw new ErroDemo(400, 'O prêmio é de quem concluiu pelo menos um projeto neste mês.')
    if (c.resgatado) throw new ErroDemo(400, 'Você já pegou o prêmio deste mês.')
    e.chefao.push({ usu_id: e.eu, mes: c.mes })
    ganharXp(e, e.eu, 80)
    liberarConquista(e, 'dragao')
    return ok(`${c.nome} derrotado! +80 XP e a conquista "Caçador de dragões".`, { xp: 80 })
  }],
  ['GET', /^\/comunidade\/desafio$/, (e) => {
    const semana = semanaDemo()
    const anterior = semanaDemo(new Date(Date.now() - 7 * DIA_MS))
    const envios = enviosDemo(e, semana)
    const venc = enviosDemo(e, anterior)[0]
    const fim = new Date()
    fim.setDate(fim.getDate() + ((7 - (fim.getDay() || 7)) % 7))
    fim.setHours(23, 59, 0, 0)
    return { disponivel: true, semana, tema: temaDemo(semana), termina: fim.toISOString(), xp: 60, envios, meu_envio: envios.find((x) => x.meu) ?? null, anterior: { semana: anterior, tema: temaDemo(anterior), vencedor: venc && venc.votos ? venc.autor : null } }
  }],
  ['POST', /^\/comunidade\/desafio$/, (e, _p, c) => {
    if (quem(e, e.eu).tipo_usuario !== 'freelancer') throw new ErroDemo(403, 'Só freelancers participam do desafio (contratantes votam).')
    const titulo = String(c.titulo ?? '').trim()
    const link = String(c.link ?? '').trim()
    if (titulo.length < 3 || titulo.length > 80) throw new ErroDemo(400, 'Dê um nome de 3 a 80 letras para o trabalho.')
    if (!/^https:\/\/\S+$/i.test(link)) throw new ErroDemo(400, 'Mande o link do trabalho começando com https:// (Behance, Drive, Figma...).')
    if (e.envios.some((x) => x.semana === semanaDemo() && x.usu_id === e.eu)) throw new ErroDemo(400, 'Você já mandou um trabalho nesta semana.')
    e.envios.push({ env_id: e.proximo++, semana: semanaDemo(), usu_id: e.eu, titulo, link, desc: String(c.desc ?? '').trim().slice(0, 300) || null, data: new Date().toISOString() })
    return ok('Trabalho enviado! Agora é torcer pelos votos.')
  }],
  ['POST', /^\/comunidade\/desafio\/(\d+)\/voto$/, (e, [id]) => {
    const envio = e.envios.find((x) => x.env_id === Number(id) && x.semana === semanaDemo())
    if (!envio) throw new ErroDemo(404, 'Este trabalho não está no desafio desta semana.')
    if (envio.usu_id === e.eu) throw new ErroDemo(400, 'Não vale votar no próprio trabalho.')
    if (e.votos.some((v) => v.env_id === envio.env_id && v.usu_id === e.eu)) {
      e.votos = e.votos.filter((v) => !(v.env_id === envio.env_id && v.usu_id === e.eu))
      return ok('Voto tirado.', { votei: false })
    }
    e.votos.push({ env_id: envio.env_id, usu_id: e.eu })
    return ok('Voto registrado!', { votei: true })
  }],
  ['GET', /^\/comunidade\/arvore$/, (e) => ({ areas: arvoreDemo(e, e.eu) })],
  ['GET', /^\/comunidade\/arvore\/(\d+)$/, (e, [id]) => ({ areas: arvoreDemo(e, Number(id)) })],
  ['GET', /^\/comunidade\/guildas\/(\d+)\/missoes$/, (e, [id]) => {
    const g = e.guildas.find((x) => x.gui_id === Number(id))
    if (!g) throw new ErroDemo(404, 'Guilda não encontrada.')
    return { guilda: g.nome, missoes: missoesGuildaDemo(e, g.gui_id), termina: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString() }
  }],

  /* Admin: funil e saúde; Modo TV: números */
  ['GET', /^\/admin\/funil$/, (e) => {
    const free = e.usuarios.filter((u) => u.tipo_usuario === 'freelancer' && u.status_conta !== 'banida')
    const cont = e.usuarios.filter((u) => u.tipo_usuario === 'contratante' && u.status_conta !== 'banida')
    const candidatou = free.filter((u) => e.candidaturas.some((c) => c.free_usu === u.usu_id))
    const contratado = free.filter((u) => e.candidaturas.some((c) => c.free_usu === u.usu_id && c.cand_status === 'aceita'))
    const concluiu = free.filter((u) => e.servicos.some((s) => s.serv_status === 'finalizado' && contratadoDe(e, s.serv_id) === u.usu_id))
    const comTaxa = (lista: { passo: string; total: number }[]) => lista.map((p, i) => ({ ...p, do_anterior: i === 0 || !lista[i - 1].total ? null : Math.round((p.total / lista[i - 1].total) * 100) }))
    const deCont = (filtro: (s: Servico) => boolean) => cont.filter((u) => e.servicos.some((s) => s.cont_usu === u.usu_id && filtro(s))).length
    return {
      dias: null,
      freelancer: comTaxa([
        { passo: 'Cadastrou', total: free.length },
        { passo: 'Completou o perfil', total: free.filter((u) => u.usu_foto && u.usu_desc).length },
        { passo: 'Se candidatou', total: candidatou.length },
        { passo: 'Foi contratado', total: contratado.length },
        { passo: 'Concluiu um projeto', total: concluiu.length },
      ]),
      contratante: comTaxa([
        { passo: 'Cadastrou', total: cont.length },
        { passo: 'Publicou um projeto', total: deCont((s) => s.serv_status !== 'rascunho') },
        { passo: 'Contratou alguém', total: deCont((s) => ['em_andamento', 'finalizado'].includes(s.serv_status)) },
        { passo: 'Concluiu um projeto', total: deCont((s) => s.serv_status === 'finalizado') },
      ]),
    }
  }],
  ['GET', /^\/admin\/saude$/, () => ({
    banco: { ok: true, ms: 3, erro: null }, email: false, push: false, migracoes: 18, erros_24h: 4, ultima_migracao_ok: true,
    tarefas: { lembretes: new Date(Date.now() - 25 * 60_000).toISOString(), limpeza: new Date(Date.now() - 7 * 3_600_000).toISOString() },
    servidor: { no_ar_desde: new Date(Date.now() - 2 * 86_400_000).toISOString(), memoria_mb: 86, node: 'demonstração', vercel: false },
    verificado_em: new Date().toISOString(), demonstracao: true,
  })],
  ['GET', /^\/publico\/numeros$/, (e) => {
    const notas = e.avaliacoes.map((a) => a.aval_nota)
    return {
      freelancers: e.usuarios.filter((u) => u.tipo_usuario === 'freelancer' && u.status_conta === 'ativa').length,
      contratantes: e.usuarios.filter((u) => u.tipo_usuario === 'contratante' && u.status_conta === 'ativa').length,
      projetos_abertos: e.servicos.filter((s) => s.serv_status === 'aberto').length,
      projetos_concluidos: e.servicos.filter((s) => s.serv_status === 'finalizado').length,
      avaliacoes: notas.length,
      nota_media: notas.length ? Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 10) / 10 : null,
      online: e.usuarios.filter((u) => u.visto_em && Date.now() - new Date(u.visto_em).getTime() < 5 * 60_000).length,
      atualizado_em: new Date().toISOString(),
    }
  }],
]

const ROTAS_EXTRAS: Rota[] = [
  ['GET', /^\/usuarios\/eu\/agenda$/, (e) => ({ eventos: agendaDe(e) })],
  ['GET', /^\/usuarios\/eu\/retrospectiva$/, (e, _p, _c, busca) => {
    const ano = Number(busca.get('ano')) || new Date().getFullYear()
    if (ano < 2020 || ano > new Date().getFullYear()) throw new ErroDemo(400, 'Ano inválido.')
    return retrospectivaDe(e, ano)
  }],
  ['GET', /^\/usuarios\/eu\/marcos$/, (e) => marcosDe(e)],

  /* Avisos por tipo e privacidade */
  ['GET', /^\/usuarios\/eu\/avisos$/, (e) => ({ disponivel: true, categorias: CATEGORIAS_AVISO, canais: ['sino', 'celular'], avisos: quem(e, e.eu).avisos ?? avisosPadrao() })],
  ['PUT', /^\/usuarios\/eu\/avisos$/, (e, _p, c) => {
    const novo = avisosPadrao()
    const pedido = (c.avisos ?? {}) as Partial<PreferenciaAvisos>
    for (const canal of ['sino', 'celular'] as const) for (const cat of CATEGORIAS_AVISO) novo[canal][cat] = pedido[canal]?.[cat] !== false
    quem(e, e.eu).avisos = novo
    return ok('Avisos salvos.', { avisos: novo })
  }],
  ['GET', /^\/usuarios\/eu\/privacidade$/, (e) => {
    const u = quem(e, e.eu)
    return { disponivel: true, mostrar_online: u.mostrar_online !== false, aparecer_busca: u.aparecer_busca !== false }
  }],
  ['PUT', /^\/usuarios\/eu\/privacidade$/, (e, _p, c) => {
    const u = quem(e, e.eu)
    if (typeof c.mostrar_online === 'boolean') u.mostrar_online = c.mostrar_online
    if (typeof c.aparecer_busca === 'boolean') u.aparecer_busca = c.aparecer_busca
    return ok('Privacidade salva.')
  }],

  /* Convide um amigo */
  ['GET', /^\/usuarios\/eu\/indicacao$/, (e) => {
    const u = quem(e, e.eu)
    u.indicacao_codigo ??= `${u.usu_nome.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()}-${String(u.usu_id).padStart(4, '7')}`
    return {
      disponivel: true,
      codigo: u.indicacao_codigo,
      link: `${location.origin}/cadastro?convite=${u.indicacao_codigo}`,
      xp_por_amigo: 50,
      indicados: e.usuarios.filter((x) => x.indicado_por === e.eu).map((x) => ({ nome: nomeCurtoDemo(x.usu_nome), tipo: x.tipo_usuario, premiado: Boolean(x.indicacao_premiada), desde: x.data_criacao })),
    }
  }],

  /* Cartas de candidatura salvas */
  ['GET', /^\/usuarios\/eu\/modelos$/, (e) => ({ disponivel: true, modelos: e.modelos.filter((m) => m.usu_id === e.eu) })],
  ['POST', /^\/usuarios\/eu\/modelos$/, (e, _p, c) => {
    const dados = lerModeloDemo(c)
    if (e.modelos.filter((m) => m.usu_id === e.eu).length >= 10) throw new ErroDemo(400, 'Dá para guardar até 10 cartas. Apague uma para criar outra.')
    const modelo = { mod_id: e.proximo++, usu_id: e.eu, ...dados }
    e.modelos.push(modelo)
    return ok('Carta guardada.', { modelo })
  }],
  ['PUT', /^\/usuarios\/eu\/modelos\/(\d+)$/, (e, [id], c) => {
    const m = e.modelos.find((x) => x.mod_id === Number(id) && x.usu_id === e.eu)
    if (!m) throw new ErroDemo(404, 'Carta não encontrada.')
    Object.assign(m, lerModeloDemo(c))
    return ok('Carta atualizada.')
  }],
  ['DELETE', /^\/usuarios\/eu\/modelos\/(\d+)$/, (e, [id]) => {
    const antes = e.modelos.length
    e.modelos = e.modelos.filter((x) => !(x.mod_id === Number(id) && x.usu_id === e.eu))
    if (e.modelos.length === antes) throw new ErroDemo(404, 'Carta não encontrada.')
    return ok('Carta apagada.')
  }],

  /* Comparar freelancers */
  ['GET', /^\/usuarios\/freelancers\/comparar$/, (e, _p, _c, busca) => {
    const ids = [...new Set((busca.get('ids') ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 3)
    if (ids.length < 2) throw new ErroDemo(400, 'Escolha de 2 a 3 freelancers para comparar.')
    return {
      freelancers: ids
        .map((id) => e.usuarios.find((u) => u.usu_id === id && u.tipo_usuario === 'freelancer' && u.status_conta === 'ativa'))
        .filter((u): u is Usuario => Boolean(u))
        .map((u) => {
          const feitos = e.servicos.filter((s) => s.serv_status === 'finalizado' && contratadoDe(e, s.serv_id) === u.usu_id)
          const fixos = feitos.filter((s) => s.serv_tipo_valor === 'fixo')
          const { media, total } = mediaDe(e, u.usu_id)
          return {
            usu_id: u.usu_id, usu_nome: u.usu_nome, usu_foto: u.usu_foto, usu_cid: u.usu_cid, usu_est: u.usu_est, data_criacao: u.data_criacao,
            free_nivel: nivelPorXp(u.free_xp ?? 0), free_xp: u.free_xp ?? 0, free_rank: total ? media : 0,
            ...aparenciaDe(e, u.usu_id),
            avaliacoes: total,
            projetos_concluidos: feitos.length,
            preco_medio: fixos.length ? Math.round(fixos.reduce((s, x) => s + x.serv_valor, 0) / fixos.length) : null,
            areas: (u.areas ?? []).map(tipoNome),
            tempo_resposta: tempoRespostaDe(e, u.usu_id),
            verificado: verificacaoDe(e, u.usu_id).verificado,
          }
        }),
    }
  }],

  /* Pausar o prazo */
  ['POST', /^\/servicos\/(\d+)\/pausa$/, (e, [id], c) => {
    const s = participanteDe(e, Number(id))
    const outro = s.cont_usu === e.eu ? contratadoDe(e, s.serv_id) : s.cont_usu
    if (s.serv_status !== 'em_andamento' || !outro) throw new ErroDemo(400, 'Só dá para pausar projetos em andamento.')
    if (s.serv_entregue_em) throw new ErroDemo(400, 'O trabalho já foi entregue: não precisa pausar o prazo.')
    if (s.serv_pausado_em) throw new ErroDemo(400, 'O prazo já está pausado.')
    if (s.serv_pausa_pedida_por) throw new ErroDemo(400, 'Já existe um pedido de pausa esperando resposta.')
    const motivo = String(c.motivo ?? '').trim()
    if (motivo.length < 5 || motivo.length > 200) throw new ErroDemo(400, 'Conte o motivo da pausa (de 5 a 200 letras).')
    Object.assign(s, { serv_pausa_pedida_por: e.eu, serv_pausa_motivo: motivo })
    notificar(e, outro, 'Pedido de pausa no prazo', `Pediram para pausar o prazo de "${s.serv_titulo}": ${motivo}`)
    return ok('Pedido enviado. O prazo pausa quando a outra pessoa aceitar.')
  }],
  ['PUT', /^\/servicos\/(\d+)\/pausa$/, (e, [id], c) => {
    const s = participanteDe(e, Number(id))
    const outro = (s.cont_usu === e.eu ? contratadoDe(e, s.serv_id) : s.cont_usu) ?? s.cont_usu
    const acao = c.acao
    if (acao === 'aceitar' || acao === 'recusar' || acao === 'cancelar') {
      if (!s.serv_pausa_pedida_por) throw new ErroDemo(400, 'Não há pedido de pausa esperando resposta.')
      const pediu = s.serv_pausa_pedida_por === e.eu
      if (acao === 'cancelar' ? !pediu : pediu) throw new ErroDemo(403, acao === 'cancelar' ? 'Só quem pediu pode desistir.' : 'Quem responde é a outra pessoa.')
      if (acao === 'aceitar') {
        Object.assign(s, { serv_pausado_em: new Date().toISOString(), serv_pausa_pedida_por: null })
        notificar(e, outro, 'Prazo pausado', `A pausa de "${s.serv_titulo}" foi aceita. O prazo fica parado até alguém retomar.`)
        return ok('Prazo pausado. Retome quando o trabalho puder continuar.')
      }
      Object.assign(s, { serv_pausa_pedida_por: null, serv_pausa_motivo: null })
      if (acao === 'recusar') notificar(e, outro, 'Pausa recusada', `O pedido de pausa de "${s.serv_titulo}" foi recusado. Conversem pelo chat.`)
      return ok(acao === 'recusar' ? 'Pedido recusado.' : 'Pedido cancelado.')
    }
    if (acao === 'retomar') {
      if (!s.serv_pausado_em) throw new ErroDemo(400, 'O prazo não está pausado.')
      const dias = Math.min(60, Math.max(1, Math.ceil((Date.now() - new Date(s.serv_pausado_em).getTime()) / DIA_MS)))
      Object.assign(s, { serv_pausado_em: null, serv_pausa_motivo: null, serv_qtd_dias: (s.serv_qtd_dias ?? 0) + dias, serv_pausa_dias: (s.serv_pausa_dias ?? 0) + dias, serv_lembrete_prazo_em: null, serv_lembrete_atraso_em: null })
      const texto = `O prazo de "${s.serv_titulo}" voltou a correr, com ${dias === 1 ? '1 dia a mais' : `${dias} dias a mais`}.`
      notificar(e, outro, 'Prazo retomado', texto)
      return ok(texto, { dias })
    }
    throw new ErroDemo(400, 'Ação inválida.')
  }],

  /* Mural do reino (público, sem dados pessoais) */
  ['GET', /^\/publico\/mural$/, (e) => {
    const desde = Date.now() - 30 * DIA_MS
    const recente = (d?: string | null) => Boolean(d) && new Date(d as string).getTime() >= desde
    const nome = (id: number) => {
      const u = quem(e, id)
      return u.aparecer_busca === false ? 'Alguém' : nomeCurtoDemo(u.usu_nome)
    }
    const itens: { tipo: string; data: string; texto: string; brasao?: string; cor?: string }[] = []
    for (const g of e.guildas.filter((x) => recente(x.criada))) itens.push({ tipo: 'guilda', data: g.criada, texto: `A guilda ${g.nome} foi fundada.`, brasao: g.brasao, cor: g.cor })
    for (const t of e.testes.filter((x) => recente(x.aprovado_em))) itens.push({ tipo: 'teste', data: t.aprovado_em as string, texto: `${nome(t.usu_id)} passou no teste de ${tipoNome(t.tipo_id)}.` })
    for (const s of e.servicos.filter((x) => x.serv_status === 'finalizado' && recente(x.serv_finalizado_em))) itens.push({ tipo: 'projeto', data: s.serv_finalizado_em as string, texto: `Um projeto de ${tipoNome(s.tipo_id)} foi concluído.` })
    const chegaram = e.usuarios.filter((u) => Date.now() - new Date(u.data_criacao).getTime() < 7 * DIA_MS).length
    if (chegaram) itens.push({ tipo: 'chegada', data: new Date().toISOString(), texto: chegaram === 1 ? '1 pessoa chegou ao castelo esta semana.' : `${chegaram} pessoas chegaram ao castelo esta semana.` })
    return { itens: itens.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 25) }
  }],
  /* Erros do site: no modo demonstração não há servidor para guardar */
  ['POST', /^\/publico\/erros$/, () => null],

  /* Administração: fila do filtro de spam e monitor de erros */
  ['GET', /^\/admin\/moderacao$/, (e) => ({
    disponivel: true,
    projetos: e.servicos.filter((s) => s.serv_moderacao === 'pendente').map((s) => ({
      serv_id: s.serv_id, serv_titulo: s.serv_titulo, serv_desc: s.serv_desc, serv_valor: s.serv_valor, serv_tipo_valor: s.serv_tipo_valor,
      serv_moderacao_motivo: s.serv_moderacao_motivo, serv_data_criacao: s.serv_data_criacao, tipo_nome: tipoNome(s.tipo_id), usu_id: s.cont_usu, usu_nome: quem(e, s.cont_usu).usu_nome,
    })),
  })],
  ['PUT', /^\/admin\/moderacao\/(\d+)$/, (e, [id], c) => {
    const s = e.servicos.find((x) => x.serv_id === Number(id) && x.serv_moderacao === 'pendente')
    if (!s) throw new ErroDemo(404, 'Projeto não está na fila de revisão.')
    const motivo = String(c.motivo ?? '').trim().slice(0, 200)
    if (c.acao !== 'aprovar' && c.acao !== 'recusar') throw new ErroDemo(400, 'Ação inválida.')
    if (c.acao === 'recusar' && motivo.length < 5) throw new ErroDemo(400, 'Explique ao contratante por que o projeto foi recusado.')
    Object.assign(s, { serv_moderacao: c.acao === 'aprovar' ? 'aprovado' : 'recusado', serv_moderacao_motivo: c.acao === 'aprovar' ? null : motivo })
    notificar(e, s.cont_usu, c.acao === 'aprovar' ? 'Projeto aprovado' : 'Projeto não aprovado',
      c.acao === 'aprovar' ? `"${s.serv_titulo}" passou na revisão e já aparece para os freelancers.` : `"${s.serv_titulo}" não foi publicado: ${motivo}. Edite o projeto para mandar de novo.`)
    return ok(c.acao === 'aprovar' ? 'Projeto aprovado e publicado.' : 'Projeto recusado. O contratante foi avisado.')
  }],
  ['GET', /^\/admin\/erros$/, (e) => ({ disponivel: true, erros: [...e.erros].sort((a, b) => b.err_ultima.localeCompare(a.err_ultima)) })],
  ['DELETE', /^\/admin\/erros$/, (e) => {
    e.erros = []
    return ok('Lista de erros limpa.')
  }],
  ['DELETE', /^\/admin\/erros\/(\d+)$/, (e, [id]) => {
    e.erros = e.erros.filter((x) => x.err_id !== Number(id))
    return ok('Erro marcado como resolvido.')
  }],
]

export async function responderDemo(metodo: string, caminho: string, token: string | null, corpo: unknown, sinal?: AbortSignal) {
  const e = ler()
  const url = new URL(caminho, 'http://demo')

  /* Quem está logado vem do token (assim o "entrar como" troca de conta) */
  try {
    const id = token ? JSON.parse(atob(token.split('.')[1])).id : null
    if (id && id !== e.eu) {
      if (quem(e, e.eu).usu_supremo) e.supremo = e.eu
      e.eu = id
    }
    if (id === e.supremo) e.supremo = null
  } catch {
    /* Token de verdade de antes: segue com a conta do modo */
  }
  /* "Visto por último" de quem está usando */
  const euAgora = e.usuarios.find((u) => u.usu_id === e.eu)
  if (euAgora) euAgora.visto_em = new Date().toISOString()

  /* Mensagens novas: o servidor segura a resposta até chegar algo; aqui confere a cada meio segundo (as respostas automáticas chegam assim) */
  if (url.pathname === '/mensagens/novas') {
    const minhas = () => ler().mensagens.filter((m) => m.usu_remetente === e.eu || m.usu_destinatario === e.eu)
    const ultimoDe = () => minhas().reduce((m, x) => Math.max(m, x.msg_id), 0)
    const desde = url.searchParams.get('desde')
    if (desde === null) return { mensagens: [], ultimo: ultimoDe() }
    const limite = Date.now() + 25_000
    while (Date.now() < limite) {
      const novas = minhas().filter((m) => m.msg_id > Number(desde))
      if (novas.length) return structuredClone({ mensagens: novas.map((m) => ({ ...m, msg_arquivo: undefined })), ultimo: ultimoDe() })
      await espera(500, sinal)
    }
    return { mensagens: [], ultimo: Number(desde) }
  }

  await espera(180 + Math.random() * 220, sinal)

  for (const [m, padrao, responder] of [...ROTAS_TRINTA, ...ROTAS_EXTRAS, ...ROTAS_REINO, ...ROTAS]) {
    const achou = url.pathname.match(padrao)
    if (m !== metodo || !achou) continue
    const resposta = responder(e, achou.slice(1), (corpo ?? {}) as Corpo, url.searchParams)
    guardar()
    return structuredClone(resposta)
  }

  throw new ErroDemo(404, 'Isso ainda não existe no modo demonstração.')
}

export { ErroDemo }
