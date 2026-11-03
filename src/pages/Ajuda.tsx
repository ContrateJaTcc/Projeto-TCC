import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, LifeBuoy, ArrowRight } from 'lucide-react'
import PaginaPublica from '../components/layout/topopublico'
import { useRole } from '../context/useRole'
import { normalizarCidade as normalizar } from '../utils/cidades'
import styles from './Ajuda.module.css'

type Papel = 'freelancer' | 'contratante' | 'administrador'

interface Pergunta {
  grupo: string
  pergunta: string
  resposta: string
  /* Página certa para resolver; {papel} vira a área de quem está logado */
  link?: { texto: string; para: string }
  /* Palavras que a pessoa pode digitar na busca e que não aparecem no texto */
  sinonimos?: string
}

const PERGUNTAS: Pergunta[] = [
  { grupo: 'Conta', pergunta: 'Como crio a minha conta?', resposta: 'Clique em Cadastre-se, escolha se vai trabalhar (freelancer) ou contratar (contratante) e preencha os dados. CPF, telefone, cidade e estado são conferidos na hora; o CPF e o telefone nunca aparecem no seu perfil.', link: { texto: 'Criar conta', para: '/cadastro' }, sinonimos: 'registrar inscrever' },
  { grupo: 'Conta', pergunta: 'Esqueci a minha senha. E agora?', resposta: 'Na tela de login, use "Esqueci minha senha". Mandamos um link para o seu e-mail que vale por 60 minutos.', link: { texto: 'Recuperar a senha', para: '/esqueci-senha' }, sinonimos: 'perdi senha recuperar' },
  { grupo: 'Conta', pergunta: 'Como troco a minha senha?', resposta: 'Em Configurações > Conta. Por segurança, pedimos a senha atual. Se você entrou pelo Google e nunca criou senha, use "Esqueci minha senha" para criar uma.', link: { texto: 'Abrir as Configurações', para: '/{papel}/configuracoes' } },
  { grupo: 'Conta', pergunta: 'Posso trocar de freelancer para contratante?', resposta: 'O tipo da conta é escolhido no cadastro (dá para trocar no próprio formulário antes de criar). Depois disso, quem muda é a administração: fale com o suporte pela página Sobre.' },
  { grupo: 'Conta', pergunta: 'Como baixo os meus dados ou excluo a conta?', resposta: 'Em Configurações > Privacidade e dados: "Baixar meus dados" gera um arquivo com tudo o que guardamos (LGPD) e "Excluir conta" apaga a conta para sempre.', link: { texto: 'Abrir as Configurações', para: '/{papel}/configuracoes' }, sinonimos: 'lgpd apagar deletar' },
  { grupo: 'Projetos', pergunta: 'Como publico um projeto?', resposta: 'Na área do contratante, use "Criar projeto": título, descrição, categoria, valor, prazo e local. O site sugere um valor justo pela média da categoria.', link: { texto: 'Criar projeto', para: '/contratante/criar-projeto' }, sinonimos: 'postar anunciar vaga' },
  { grupo: 'Projetos', pergunta: 'Por que o meu projeto está "em revisão"?', resposta: 'Projetos com termos de golpe (como "dinheiro fácil" ou "pix antecipado"), link encurtado ou valor fora do normal passam por uma revisão rápida da administração antes de aparecer. Se for recusado, você recebe o motivo e pode editar para mandar de novo.', sinonimos: 'spam bloqueado moderacao aprovado' },
  { grupo: 'Projetos', pergunta: 'Como me candidato a um projeto?', resposta: 'Abra o projeto e clique em Candidatar-se. Dá para propor outro valor ou prazo e mandar um recado. Guarde os recados que você mais usa como cartas salvas para não digitar tudo de novo.', link: { texto: 'Ver projetos abertos', para: '/freelancer' }, sinonimos: 'aplicar vaga carta' },
  { grupo: 'Projetos', pergunta: 'Como comparo freelancers antes de contratar?', resposta: 'Na busca de freelancers, marque "Comparar" em até 3 cartões e abra a comparação: nível, nota, prazo de resposta, testes, projetos concluídos e preço médio lado a lado.', link: { texto: 'Buscar freelancers', para: '/contratante/freelancers' } },
  { grupo: 'Pagamentos', pergunta: 'Como funciona a garantia?', resposta: 'Depois de assinar o termo de acordo, o contratante guarda o valor na garantia. O dinheiro fica parado até a entrega ser aprovada; aí cai na carteira do freelancer. No TCC, o pagamento é simulado: nenhum dinheiro de verdade circula.', link: { texto: 'Ver a carteira', para: '/{papel}/carteira' }, sinonimos: 'dinheiro pagar receber seguro' },
  { grupo: 'Pagamentos', pergunta: 'E se o freelancer sumir?', resposta: 'Abra uma disputa no histórico do projeto e conte o que aconteceu. A administração analisa e pode devolver o valor da garantia ao contratante.', link: { texto: 'Abrir o histórico', para: '/{papel}/historico' }, sinonimos: 'golpe reclamar devolver estorno' },
  { grupo: 'Pagamentos', pergunta: 'Dá para pagar por etapa?', resposta: 'Sim. O contratante divide o projeto em etapas; quando o freelancer entrega uma, o contratante aprova e paga aquela parte. O que sobra continua na garantia.', sinonimos: 'parcela parte' },
  { grupo: 'Prazos', pergunta: 'Preciso de mais tempo. Dá para pausar o prazo?', resposta: 'Dá. No histórico do projeto em andamento, peça a pausa e conte o motivo (por exemplo, esperando material do cliente). Quando a outra pessoa aceitar, o prazo para de contar; ao retomar, os dias parados entram no prazo.', link: { texto: 'Abrir o histórico', para: '/{papel}/historico' }, sinonimos: 'atraso adiar' },
  { grupo: 'Prazos', pergunta: 'Onde vejo todos os meus prazos e reuniões?', resposta: 'Na Agenda: um calendário do mês com as entregas, as reuniões marcadas no chat e as etapas. Dá para levar tudo para o Google Agenda ou o calendário do celular.', link: { texto: 'Abrir a agenda', para: '/{papel}/agenda' }, sinonimos: 'calendario reuniao' },
  { grupo: 'Castelo', pergunta: 'Como ganho XP e subo de nível?', resposta: 'Concluindo projetos, recebendo boas avaliações, cumprindo missões do dia e da semana, passando nos testes de habilidade e convidando amigos. O XP também compra cosméticos na loja.', link: { texto: 'Ver o mapa do reino', para: '/freelancer/reino' }, sinonimos: 'nivel pontos insignia' },
  { grupo: 'Castelo', pergunta: 'Como funciona o "Convide um amigo"?', resposta: 'Cada conta tem um link de convite. Quando a pessoa que entrou por ele conclui o primeiro projeto, os dois ganham 50 XP (contas de freelancer).', link: { texto: 'Pegar meu link', para: '/{papel}/convidar' }, sinonimos: 'indicar indicacao' },
  { grupo: 'Segurança', pergunta: 'Por que a nota da avaliação não aparece na hora?', resposta: 'A avaliação é às cegas: a nota só aparece quando os dois avaliaram o projeto (ou depois de 7 dias). Assim ninguém dá nota baixa por vingança.', sinonimos: 'estrela nota' },
  { grupo: 'Segurança', pergunta: 'Apareceu um aviso de contato por fora no chat. O que é?', resposta: 'Antes da contratação, pedir telefone, e-mail ou WhatsApp costuma ser o começo de golpe. O aviso lembra que fora da plataforma não há garantia nem disputa.' },
  { grupo: 'Segurança', pergunta: 'Como deixo a conta mais segura?', resposta: 'Ligue a verificação em 2 etapas em Configurações > Segurança: no login, além da senha, pedimos um código mandado por e-mail. Lá também dá para ver e desconectar os aparelhos onde sua conta está aberta.', link: { texto: 'Abrir as Configurações', para: '/{papel}/configuracoes' }, sinonimos: '2fa codigo sessao' },
  { grupo: 'Privacidade', pergunta: 'Dá para esconder quando estou online?', resposta: 'Sim. Em Configurações > Privacidade, desligue "Mostrar quando estou online". Freelancers também podem sumir da busca e do mapa sem apagar a conta.', link: { texto: 'Abrir as Configurações', para: '/{papel}/configuracoes' }, sinonimos: 'visto por ultimo invisivel' },
  { grupo: 'Privacidade', pergunta: 'Estou recebendo avisos demais. Como escolho?', resposta: 'Em Configurações > Notificações, escolha o que chega no sino e no celular para cada tipo: mensagens, projetos, pagamentos, avaliações e conquistas. Avisos de segurança da conta sempre chegam.', link: { texto: 'Abrir as Configurações', para: '/{papel}/configuracoes' }, sinonimos: 'notificacao sino push celular silenciar' },
]

/* Central de ajuda: perguntas frequentes com busca, cada uma levando para a página certa */
export default function Ajuda() {
  const { role } = useRole()
  const [busca, setBusca] = useState('')

  const resultado = useMemo(() => {
    const termos = normalizar(busca).split(' ').filter(Boolean)
    if (!termos.length) return PERGUNTAS
    return PERGUNTAS.filter((p) => {
      const alvo = normalizar(`${p.grupo} ${p.pergunta} ${p.resposta} ${p.sinonimos ?? ''}`)
      return termos.every((t) => alvo.includes(t))
    })
  }, [busca])

  const grupos = [...new Set(resultado.map((p) => p.grupo))]

  /* Área de quem está logado; sem login, o link leva ao login (que volta para a página depois) */
  const caminho = (para: string) => {
    if (!para.includes('{papel}') && !para.startsWith('/freelancer') && !para.startsWith('/contratante')) return { to: para }
    const papel = (role ?? null) as Papel | null
    const destino = para.replace('{papel}', papel ?? 'freelancer')
    if (!papel) return { to: '/login', state: { destino } }
    /* Página da outra área (ex.: contratante abrindo "Ver projetos abertos") vai para o painel da própria */
    return { to: destino.startsWith(`/${papel}`) ? destino : `/${papel}` }
  }

  return (
    <PaginaPublica>
      <div className={styles.pagina}>
        <section className={`${styles.abertura} entrada`}>
          <h1><LifeBuoy size={34} strokeWidth={2.2} aria-hidden="true" /> Central de ajuda</h1>
          <p>As dúvidas mais comuns, com o caminho certo para resolver cada uma.</p>
          <label className={styles.busca}>
            <Search size={18} strokeWidth={2.4} aria-hidden="true" />
            <span className="sr-only">Buscar na ajuda</span>
            <input type="search" placeholder='Ex.: "garantia", "pausar prazo", "senha"' value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          <p className={styles.contagem} aria-live="polite">
            {busca ? `${resultado.length} ${resultado.length === 1 ? 'resposta encontrada' : 'respostas encontradas'}` : `${PERGUNTAS.length} perguntas`}
          </p>
        </section>

        {resultado.length === 0 && (
          <p className={styles.vazio}>
            Nada encontrado. Tente outra palavra ou fale com a gente pelo <Link to="/sobre">formulário de contato</Link>.
          </p>
        )}

        {grupos.map((g) => (
          <section key={g} className={styles.grupo} aria-labelledby={`ajuda-${normalizar(g)}`}>
            <h2 id={`ajuda-${normalizar(g)}`}>{g}</h2>
            {resultado.filter((p) => p.grupo === g).map((p) => (
              <details key={p.pergunta} className={styles.item} open={busca.length > 2 && resultado.length <= 3}>
                <summary>{p.pergunta}</summary>
                <p>{p.resposta}</p>
                {p.link && (
                  <Link {...caminho(p.link.para)} className={styles.link} viewTransition>
                    {p.link.texto} <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
                  </Link>
                )}
              </details>
            ))}
          </section>
        ))}
      </div>
    </PaginaPublica>
  )
}
