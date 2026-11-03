import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Share2, Lock, PartyPopper } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { baixarCartao, type Cartao } from '../utils/cartaopixel'
import { formatarData, formatarMoeda } from '../utils/formatar'
import comum from './comum.module.css'
import styles from './Retrospectiva.module.css'

interface Dados {
  ano: number
  papel: 'freelancer' | 'contratante'
  projetos: number
  area_favorita: string | null
  dinheiro: number
  avaliacoes: number
  media: number | null
  melhor_nota: number | null
  mensagens: number
  mes_mais_ativo: string | null
  parceiros: number
  xp: number | null
  insignia_rara: { nome: string; descricao: string; donos: number } | null
}

interface Marco {
  codigo: string
  titulo: string
  descricao: string
  data: string | null
  conquistado: boolean
}

/* Os cartões da retrospectiva, só com o que a pessoa tem (sem cartão de "0 avaliações") */
function montarCartoes(d: Dados, nome: string): Cartao[] {
  const rodape = `${nome} · ContrateJá`
  const topo = `Retrospectiva ${d.ano}`
  const free = d.papel === 'freelancer'
  const lista: Cartao[] = [
    {
      topo, rodape, cor: 'ouro',
      destaque: String(d.projetos),
      legenda: d.projetos === 1 ? 'projeto concluído neste ano' : 'projetos concluídos neste ano',
    },
  ]
  if (d.dinheiro > 0) lista.push({ topo, rodape, cor: 'verde', destaque: formatarMoeda(d.dinheiro), legenda: free ? 'ganhos com o seu trabalho' : 'investidos em talentos do castelo' })
  if (d.area_favorita) lista.push({ topo, rodape, cor: 'ciano', destaque: d.area_favorita, legenda: 'foi a sua área do ano' })
  if (d.melhor_nota) lista.push({ topo, rodape, cor: 'ouro', destaque: `${'★'.repeat(d.melhor_nota)}`, legenda: `melhor nota recebida${d.media ? ` (média ${d.media.toLocaleString('pt-BR')} em ${d.avaliacoes} ${d.avaliacoes === 1 ? 'avaliação' : 'avaliações'})` : ''}` })
  if (d.insignia_rara) lista.push({ topo, rodape, cor: 'roxo', destaque: d.insignia_rara.nome, legenda: `a insígnia mais rara que você conquistou: só ${d.insignia_rara.donos} ${d.insignia_rara.donos === 1 ? 'pessoa tem' : 'pessoas têm'}` })
  if (d.xp) lista.push({ topo, rodape, cor: 'roxo', destaque: `+${d.xp.toLocaleString('pt-BR')} XP`, legenda: 'de experiência no castelo' })
  if (d.mensagens > 0) lista.push({ topo, rodape, cor: 'ciano', destaque: String(d.mensagens), legenda: `mensagens trocadas com ${d.parceiros} ${d.parceiros === 1 ? 'pessoa' : 'pessoas'}${d.mes_mais_ativo ? `, mais em ${d.mes_mais_ativo}` : ''}` })
  lista.push({ topo, rodape, cor: 'ouro', destaque: 'Obrigado!', legenda: d.projetos ? 'Que o próximo ano tenha ainda mais missões cumpridas.' : 'O primeiro projeto está logo ali. Bora?' })
  return lista
}

const cartaoDoMarco = (m: Marco, nome: string): Cartao => ({
  topo: 'Marco conquistado',
  destaque: m.titulo,
  legenda: `${m.descricao}${m.data ? ` (${formatarData(m.data)})` : ''}`,
  rodape: `${nome} · ContrateJá`,
  cor: m.codigo.startsWith('conta') ? 'roxo' : m.codigo.startsWith('nota') ? 'ouro' : 'verde',
})

/* Retrospectiva do ano no estilo "Wrapped", em cartões para baixar, e os marcos da conta */
export default function Retrospectiva() {
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [dados, setDados] = useState<Dados | null>(null)
  const [marcos, setMarcos] = useState<{ desde: string | null; marcos: Marco[] } | null>(null)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [atual, setAtual] = useState(0)

  useEffect(() => {
    let vivo = true
    Promise.all([api<Dados>(`/usuarios/eu/retrospectiva?ano=${ano}`), api<{ usu_nome: string }>('/usuarios/eu')])
      .then(([d, eu]) => {
        if (!vivo) return
        setDados(d)
        setNome(eu.usu_nome)
        setAtual(0)
      })
      .catch((e) => vivo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível montar a retrospectiva.'))
    return () => {
      vivo = false
    }
  }, [ano])

  useEffect(() => {
    api<{ desde: string | null; marcos: Marco[] }>('/usuarios/eu/marcos').then(setMarcos).catch(() => setMarcos({ desde: null, marcos: [] }))
  }, [])

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  if (!dados) return <Carregando variante="detalhe" />

  const cartoes = montarCartoes(dados, nome)
  const cartao = cartoes[Math.min(atual, cartoes.length - 1)]
  const primeiroAno = marcos?.desde ? new Date(marcos.desde).getFullYear() : anoAtual
  const anos = Array.from({ length: Math.max(1, anoAtual - primeiroAno + 1) }, (_, i) => anoAtual - i)
  const podeCompartilhar = typeof navigator !== 'undefined' && 'share' in navigator

  const ir = (n: number) => setAtual((a) => Math.max(0, Math.min(cartoes.length - 1, a + n)))

  return (
    <div className={`${comum.pagina} ${comum.estreita}`}>
      <h1 className="placa">Retrospectiva</h1>
      <p className={`${comum.subtitulo} placa`}>O seu ano no castelo em cartões de pixel art. Baixe e compartilhe os que você mais gostar.</p>

      {anos.length > 1 && (
        <div className={styles.anos} role="group" aria-label="Ano">
          {anos.map((a) => (
            <button key={a} type="button" className={comum.botao} aria-pressed={a === ano} onClick={() => setAno(a)}>{a}</button>
          ))}
        </div>
      )}

      <section
        className={styles.palco}
        aria-roledescription="carrossel"
        aria-label={`Retrospectiva ${dados.ano}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') ir(1)
          if (e.key === 'ArrowLeft') ir(-1)
        }}
      >
        <div className={`${styles.cartao} ${styles[cartao.cor ?? 'ouro']}`} aria-live="polite" aria-label={`Cartão ${atual + 1} de ${cartoes.length}`} role="group">
          <span className={styles.topo}>{cartao.topo}</span>
          <strong className={styles.destaque}>{cartao.destaque}</strong>
          <span className={styles.legenda}>{cartao.legenda}</span>
          <span className={styles.rodape}>{cartao.rodape}</span>
        </div>

        <div className={styles.controles}>
          <button type="button" className={comum.botao} onClick={() => ir(-1)} disabled={atual === 0} aria-label="Cartão anterior">
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
          <ol className={styles.pontos} aria-label="Cartões">
            {cartoes.map((c, i) => (
              <li key={i}>
                <button type="button" aria-label={`Ir para o cartão ${i + 1}: ${c.destaque}`} aria-current={i === atual} onClick={() => setAtual(i)} />
              </li>
            ))}
          </ol>
          <button type="button" className={comum.botao} onClick={() => ir(1)} disabled={atual === cartoes.length - 1} aria-label="Próximo cartão">
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className={styles.acoes}>
          <button type="button" className={comum.botaoOuro} onClick={() => baixarCartao(cartao, `retrospectiva-${dados.ano}-${atual + 1}.png`)}>
            <Download size={16} strokeWidth={2.2} /> Baixar este cartão
          </button>
          {podeCompartilhar && (
            <button type="button" className={comum.botao} onClick={() => baixarCartao(cartao, `retrospectiva-${dados.ano}-${atual + 1}.png`, true)}>
              <Share2 size={16} strokeWidth={2.2} /> Compartilhar
            </button>
          )}
        </div>
      </section>

      <section className={comum.painel}>
        <h2><PartyPopper size={20} strokeWidth={2.2} /> Marcos</h2>
        <p className={comum.nota}>Datas especiais da sua conta. Os conquistados viram um cartão para baixar.</p>
        {!marcos ? (
          <Carregando variante="cartoes" quantidade={3} />
        ) : (
          <ul className={styles.marcos}>
            {marcos.marcos.map((m) => (
              <li key={m.codigo} className={m.conquistado ? styles.marcoFeito : styles.marcoFalta}>
                {m.conquistado ? <PartyPopper size={18} strokeWidth={2.2} aria-hidden="true" /> : <Lock size={18} strokeWidth={2.2} aria-hidden="true" />}
                <div>
                  <strong>{m.titulo}</strong>
                  <span className={comum.nota}>{m.conquistado && m.data ? `Conquistado em ${formatarData(m.data)}` : m.descricao}</span>
                </div>
                {m.conquistado && (
                  <button type="button" className={comum.botao} onClick={() => baixarCartao(cartaoDoMarco(m, nome), `marco-${m.codigo}.png`)} aria-label={`Baixar o cartão de ${m.titulo}`}>
                    <Download size={15} strokeWidth={2.2} /> Cartão
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
