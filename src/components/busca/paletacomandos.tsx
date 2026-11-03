import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, UserRound, MessageCircle, CornerDownLeft, Compass, Eye, Plus, LayoutGrid } from 'lucide-react'
import { api } from '../../services/api'
import type { Role } from '../../context/role-context-def'
import { abrirTour } from '../../utils/tour'
import { verSoFundo } from '../../utils/preferencias'
import { EVENTO_PALETA } from '../../utils/paleta'
import styles from './paletacomandos.module.css'

type Grupo = 'Páginas' | 'Ações' | 'Projetos' | 'Pessoas' | 'Conversas'

interface Opcao {
  id: string
  grupo: Grupo
  rotulo: string
  detalhe?: string
  palavras?: string
  ir?: string
  fazer?: () => void
}

const PAGINAS: Record<Role, [string, string, string?][]> = {
  freelancer: [
    ['Encontre projetos', '/freelancer', 'inicio buscar vagas'],
    ['Em andamento', '/freelancer/entregues', 'entregar trabalhos'],
    ['Histórico', '/freelancer/historico', 'concluidos'],
    ['Avaliações pendentes', '/freelancer/avaliacoes', 'avaliar nota'],
    ['Mensagens', '/freelancer/mensagens', 'chat conversa'],
    ['Meu perfil', '/freelancer/perfil', 'portfolio insignias'],
    ['Carteira', '/freelancer/carteira', 'pagamento saldo dinheiro'],
    ['Meus ganhos', '/freelancer/ganhos', 'grafico renda'],
    ['Loja do castelo', '/freelancer/loja', 'cosmeticos moldura xp'],
    ['Projetos no mapa', '/freelancer/mapa', 'perto de mim cidade localizacao presencial distancia'],
    ['Agenda', '/freelancer/agenda', 'calendario prazo reuniao entrega'],
    ['Arena: chefão e desafio', '/freelancer/arena', 'dragao chefao desafio semana votar'],
    ['Árvore de habilidades', '/freelancer/habilidades', 'skill galho area nivel'],
    ['Pedidos de orçamento', '/freelancer/orcamentos', 'quanto cobra preco valor'],
    ['Meu currículo', '/freelancer/curriculo', 'cv pdf curriculo imprimir'],
    ['Retrospectiva do ano', '/freelancer/retrospectiva', 'wrapped resumo ano marcos'],
    ['Convide um amigo', '/freelancer/convidar', 'indicar indicacao link xp'],
    ['Central de ajuda', '/ajuda', 'duvida pergunta faq suporte'],
    ['Mapa do reino', '/freelancer/reino', 'mascote regiao nivel jornada'],
    ['Guildas', '/freelancer/guildas', 'time grupo equipe brasao'],
    ['Testes de habilidade', '/freelancer/testes', 'quiz prova selo'],
    ['Álbum de insígnias', '/freelancer/insignias', 'conquistas raras colecao'],
    ['Configurações', '/freelancer/configuracoes', 'tema senha acessibilidade'],
  ],
  contratante: [
    ['Meus projetos', '/contratante', 'inicio painel'],
    ['Criar projeto', '/contratante/criar-projeto', 'publicar novo'],
    ['Candidatos', '/contratante/candidatos', 'propostas'],
    ['Freelancers', '/contratante/freelancers', 'buscar pessoas'],
    ['Histórico', '/contratante/historico', 'concluidos'],
    ['Avaliações pendentes', '/contratante/avaliacoes', 'avaliar nota'],
    ['Mensagens', '/contratante/mensagens', 'chat conversa'],
    ['Carteira', '/contratante/carteira', 'pagamento saldo garantia'],
    ['Freelancers favoritos', '/contratante/freelancers?favoritos=1', 'salvos coracao'],
    ['Freelancers no mapa', '/contratante/freelancers?visao=mapa', 'cidade localizacao perto'],
    ['Comparar freelancers', '/contratante/comparar', 'lado a lado escolher'],
    ['Agenda', '/contratante/agenda', 'calendario prazo reuniao entrega'],
    ['Orçamentos', '/contratante/orcamentos', 'quanto custa preco pedir'],
    ['Arena: chefão e desafio', '/contratante/arena', 'dragao chefao desafio votar'],
    ['Retrospectiva do ano', '/contratante/retrospectiva', 'wrapped resumo ano marcos'],
    ['Convide um amigo', '/contratante/convidar', 'indicar indicacao link'],
    ['Central de ajuda', '/ajuda', 'duvida pergunta faq suporte'],
    ['Meu perfil', '/contratante/perfil', ''],
    ['Configurações', '/contratante/configuracoes', 'tema senha acessibilidade'],
  ],
  administrador: [
    ['Painel', '/administrador', 'usuarios denuncias disputas'],
    ['Relatório em PDF', '/administrador/relatorio', 'imprimir'],
    ['Configurações', '/administrador/configuracoes', 'tema senha'],
  ],
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const ICONE: Record<Grupo, typeof Search> = { Páginas: LayoutGrid, Ações: Compass, Projetos: FileText, Pessoas: UserRound, Conversas: MessageCircle }

/* Busca rápida (Ctrl+K): acha páginas, projetos, pessoas e conversas de qualquer lugar da área logada */
export default function PaletaComandos({ papel }: { papel: Role }) {
  const navigate = useNavigate()
  const [aberta, setAberta] = useState(false)
  const [termo, setTermo] = useState('')
  const [indice, setIndice] = useState(0)
  const [dados, setDados] = useState<Opcao[]>([])
  const campo = useRef<HTMLInputElement>(null)

  /* Ctrl+K (ou Cmd+K) e o botão do cabeçalho abrem; Esc fecha */
  useEffect(() => {
    const teclar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAberta((v) => !v)
      }
    }
    const abrir = () => setAberta(true)
    window.addEventListener('keydown', teclar)
    window.addEventListener(EVENTO_PALETA, abrir)
    return () => {
      window.removeEventListener('keydown', teclar)
      window.removeEventListener(EVENTO_PALETA, abrir)
    }
  }, [])

  /* Ao abrir: limpa a busca e carrega o que dá para achar (projetos, pessoas, conversas) */
  useEffect(() => {
    if (!aberta) return
    requestAnimationFrame(() => campo.current?.focus())
    let vivo = true
    const pedidos: Promise<Opcao[]>[] = []
    if (papel === 'freelancer') {
      pedidos.push(
        api<{ projetos: { serv_id: number; serv_titulo: string; categoria: string; contratante_nome: string }[] }>('/servicos/abertos', { silencioso: true })
          .then((d) => d.projetos.map((p) => ({ id: `p${p.serv_id}`, grupo: 'Projetos' as const, rotulo: p.serv_titulo, detalhe: `${p.categoria} · ${p.contratante_nome}`, ir: `/freelancer/projetos/${p.serv_id}` })))
      )
    }
    if (papel === 'contratante') {
      pedidos.push(
        api<{ projetos: { serv_id: number; serv_titulo: string; categoria: string; serv_status: string }[] }>('/servicos/meus', { silencioso: true })
          .then((d) => d.projetos.map((p) => ({ id: `p${p.serv_id}`, grupo: 'Projetos' as const, rotulo: p.serv_titulo, detalhe: p.categoria, ir: `/contratante/projetos/${p.serv_id}` })))
      )
      pedidos.push(
        api<{ usu_id: number; usu_nome: string; areas_atuacao: string | null }[]>('/usuarios/freelancers', { silencioso: true })
          .then((d) => d.map((f) => ({ id: `f${f.usu_id}`, grupo: 'Pessoas' as const, rotulo: f.usu_nome, detalhe: f.areas_atuacao ?? 'Freelancer', ir: `/contratante/freelancer/${f.usu_id}` })))
      )
    }
    if (papel !== 'administrador') {
      pedidos.push(
        api<{ conversas: { serv_id: number; serv_titulo: string; outro_usu_id: number; outro_nome: string }[] }>('/mensagens', { silencioso: true })
          .then((d) =>
            d.conversas.map((c) => ({
              id: `c${c.serv_id}-${c.outro_usu_id}`,
              grupo: 'Conversas' as const,
              rotulo: c.outro_nome,
              detalhe: c.serv_titulo,
              ir: `/${papel}/mensagens?serv=${c.serv_id}&com=${c.outro_usu_id}&nome=${encodeURIComponent(c.outro_nome)}&titulo=${encodeURIComponent(c.serv_titulo)}`,
            }))
          )
      )
    }
    Promise.all(pedidos.map((p) => p.catch(() => [] as Opcao[]))).then((listas) => vivo && setDados(listas.flat()))
    return () => {
      vivo = false
    }
  }, [aberta, papel])

  const fixas = useMemo<Opcao[]>(() => {
    const paginas: Opcao[] = PAGINAS[papel].map(([rotulo, ir, palavras]) => ({ id: ir, grupo: 'Páginas', rotulo, ir, palavras }))
    const acoes: Opcao[] = [
      ...(papel === 'contratante' ? [{ id: 'a-criar', grupo: 'Ações' as const, rotulo: 'Publicar um projeto novo', ir: '/contratante/criar-projeto', palavras: 'criar' }] : []),
      { id: 'a-fundo', grupo: 'Ações', rotulo: 'Ver só o fundo', palavras: 'cenario castelo paisagem', fazer: verSoFundo },
      ...(papel !== 'administrador' ? [{ id: 'a-tour', grupo: 'Ações' as const, rotulo: 'Rever o tour de boas-vindas', palavras: 'ajuda', fazer: abrirTour }] : []),
    ]
    return [...paginas, ...acoes]
  }, [papel])

  const t = semAcento(termo.trim())
  const resultados = useMemo(() => {
    const todas = [...fixas, ...dados]
    const achou = t ? todas.filter((o) => semAcento(`${o.rotulo} ${o.detalhe ?? ''} ${o.palavras ?? ''}`).includes(t)) : fixas
    return achou.slice(0, 12)
  }, [fixas, dados, t])

  /* Termo novo: volta para o primeiro resultado */
  const [termoVisto, setTermoVisto] = useState(termo)
  if (termoVisto !== termo) {
    setTermoVisto(termo)
    setIndice(0)
  }

  function fechar() {
    setAberta(false)
    setTermo('')
  }

  function escolher(o: Opcao) {
    fechar()
    if (o.fazer) o.fazer()
    else if (o.ir) navigate(o.ir, { viewTransition: true })
  }

  function teclar(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      fechar()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndice((i) => Math.min(resultados.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndice((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && resultados[indice]) {
      e.preventDefault()
      escolher(resultados[indice])
    }
  }

  if (!aberta) return null

  let grupoAnterior: Grupo | null = null

  return (
    <div className={styles.veu} onPointerDown={(e) => e.target === e.currentTarget && fechar()}>
      <div className={styles.caixa} role="dialog" aria-modal="true" aria-label="Busca rápida">
        <div className={styles.campo}>
          <Search size={18} strokeWidth={2.4} aria-hidden="true" />
          <input
            ref={campo}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={teclar}
            placeholder={papel === 'contratante' ? 'Buscar páginas, projetos, freelancers, conversas...' : 'Buscar páginas, projetos, conversas...'}
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-resultados"
            aria-activedescendant={resultados[indice] ? `paleta-${resultados[indice].id}` : undefined}
            aria-label="O que você procura?"
          />
          <kbd>Esc</kbd>
        </div>

        {resultados.length === 0 ? (
          <p className={styles.nada}>Nada encontrado para "{termo}".</p>
        ) : (
          <ul id="paleta-resultados" className={styles.lista} role="listbox" aria-label="Resultados">
            {resultados.map((o, i) => {
              const Icone = o.id === 'a-fundo' ? Eye : o.id === 'a-criar' ? Plus : ICONE[o.grupo]
              const titulo = o.grupo !== grupoAnterior ? o.grupo : null
              grupoAnterior = o.grupo
              return (
                <li key={o.id} role="presentation">
                  {titulo && <span className={styles.grupo} aria-hidden="true">{titulo}</span>}
                  <div
                    id={`paleta-${o.id}`}
                    role="option"
                    aria-selected={i === indice}
                    className={`${styles.opcao} ${i === indice ? styles.ativa : ''}`}
                    onPointerEnter={() => setIndice(i)}
                    onClick={() => escolher(o)}
                  >
                    <Icone size={16} strokeWidth={2.2} aria-hidden="true" />
                    <span className={styles.textos}>
                      <strong>{o.rotulo}</strong>
                      {o.detalhe && <small>{o.detalhe}</small>}
                    </span>
                    {i === indice && <CornerDownLeft size={14} strokeWidth={2.4} aria-hidden="true" className={styles.enter} />}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className={styles.rodape}>
          <span><kbd>↑</kbd><kbd>↓</kbd> escolher</span>
          <span><kbd>Enter</kbd> abrir</span>
          <span><kbd>Ctrl</kbd>+<kbd>K</kbd> abre de qualquer página</span>
        </p>
      </div>
    </div>
  )
}
