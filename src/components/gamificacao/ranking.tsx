import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Crown } from 'lucide-react'
import Avatar from '../avatar/avatar'
import { NomeColorido } from '../aparencia/aparencia'
import { api } from '../../services/api'
import styles from './missoes.module.css'

interface Posicao {
  posicao: number
  usu_id: number
  usu_nome: string
  usu_foto: string | null
  free_nivel: number
  xp: number
  moldura?: string | null
  cor_nome?: string | null
}

interface Campeao {
  posicao: number
  usu_id: number
  usu_nome: string
  usu_foto: string | null
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MOLDURA_CAMPEAO = ['', 'campeao_ouro', 'campeao_prata', 'campeao_bronze']

/* "termina em 7 dias" */
function fimDaTemporada(iso: string) {
  const dias = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
  return dias <= 1 ? 'termina amanhã' : `termina em ${dias} dias`
}

type Periodo = 'mes' | 'geral'

/* Os 10 freelancers com mais XP; no contratante, cada nome leva ao portfólio */
export default function RankingFreelancers({ linkPerfil = false, titulo = 'Ranking dos freelancers' }: { linkPerfil?: boolean; titulo?: string }) {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [dados, setDados] = useState<{ ranking: Posicao[]; eu: Posicao | null; temporada_termina?: string } | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [campeoes, setCampeoes] = useState<{ mes: string; campeoes: Campeao[] } | null>(null)
  /* Ranking por cidade: a cidade do perfil de quem está vendo */
  const [minhaCidade, setMinhaCidade] = useState<{ cidade: string; estado: string } | null>(null)
  const [soCidade, setSoCidade] = useState(false)

  useEffect(() => {
    let ativo = true
    api<{ usu_cid?: string | null; usu_est?: string | null }>('/usuarios/eu', { silencioso: true })
      .then((u) => ativo && u.usu_cid && u.usu_est && setMinhaCidade({ cidade: u.usu_cid, estado: u.usu_est }))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [])

  /* Temporada passada: os 3 primeiros do mês anterior */
  useEffect(() => {
    let ativo = true
    api<{ mes: string; campeoes: Campeao[] }>('/ranking/campeoes', { silencioso: true })
      .then((d) => ativo && setCampeoes(d))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    let ativo = true
    const cidade = soCidade && minhaCidade ? `&cidade=${encodeURIComponent(minhaCidade.cidade)}&estado=${minhaCidade.estado}` : ''
    api<{ ranking: Posicao[]; eu: Posicao | null; temporada_termina?: string }>(`/ranking?periodo=${periodo}${cidade}`, { silencioso: true })
      .then((d) => ativo && setDados(d))
      .catch(() => ativo && setFalhou(true))
    return () => {
      ativo = false
    }
  }, [periodo, soCidade, minhaCidade])

  if (falhou) return null

  const nome = (p: Posicao) =>
    linkPerfil ? (
      <Link to={`/contratante/freelancer/${p.usu_id}`} viewTransition>{p.usu_nome}</Link>
    ) : (
      p.usu_nome
    )

  return (
    <section className={styles.cartao}>
      <header className={styles.cabeca}>
        <h2><Trophy size={20} strokeWidth={2.4} /> {titulo}</h2>
        <div className={styles.periodos} role="tablist" aria-label="Período">
          {(['mes', 'geral'] as Periodo[]).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={periodo === p} className={periodo === p ? styles.periodoAtivo : ''} onClick={() => setPeriodo(p)}>
              {p === 'mes' ? 'Este mês' : 'Geral'}
            </button>
          ))}
        </div>
      </header>

      {minhaCidade && (
        <label className={styles.cidade}>
          <input type="checkbox" checked={soCidade} onChange={(e) => setSoCidade(e.target.checked)} />
          Só de {minhaCidade.cidade}/{minhaCidade.estado}
        </label>
      )}

      {periodo === 'mes' && dados?.temporada_termina && (
        <p className={styles.temporada}>
          <Crown size={14} strokeWidth={2.4} aria-hidden="true" />
          A temporada {fimDaTemporada(dados.temporada_termina)}: os 3 primeiros ganham a moldura de campeão por um mês.
        </p>
      )}

      {!dados ? (
        <p className={styles.vazio}>Carregando...</p>
      ) : dados.ranking.length === 0 ? (
        <p className={styles.vazio}>Ninguém {soCidade ? 'da sua cidade ' : ''}ganhou XP {periodo === 'mes' ? 'neste mês' : 'ainda'}. A vaga de primeiro lugar está livre!</p>
      ) : (
        <ol className={styles.lista}>
          {dados.ranking.map((p) => (
            <li key={p.usu_id} className={`${styles.posicao} ${p.posicao <= 3 ? styles[`podio${p.posicao}`] : ''} ${dados.eu?.usu_id === p.usu_id ? styles.euMesmo : ''}`}>
              <span className={styles.numero}>{p.posicao}º</span>
              <Avatar nome={p.usu_nome} size={34} foto={p.usu_foto} nivel={p.free_nivel} especial={p.moldura} />
              <div className={styles.texto}>
                <strong><NomeColorido cor={p.cor_nome}>{nome(p)}</NomeColorido></strong>
                <span>Nível {p.free_nivel}</span>
              </div>
              <span className={styles.premio}>{p.xp} XP</span>
            </li>
          ))}
        </ol>
      )}

      {dados?.eu && dados.eu.posicao > 10 && (
        <p className={styles.minhaPosicao}>Você está em {dados.eu.posicao}º, com {dados.eu.xp} XP.</p>
      )}

      {campeoes && campeoes.campeoes.length > 0 && (
        <div className={styles.campeoes}>
          <span>Campeões de {MESES[Number(campeoes.mes.slice(5, 7)) - 1]}</span>
          <ul>
            {campeoes.campeoes.map((c) => (
              <li key={c.usu_id} title={`${c.posicao}º lugar`}>
                <Avatar nome={c.usu_nome} size={30} foto={c.usu_foto} especial={MOLDURA_CAMPEAO[c.posicao]} />
                <small>{c.usu_nome.split(' ')[0]}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
