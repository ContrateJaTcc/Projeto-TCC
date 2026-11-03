import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Map as IconeMapa, PawPrint, Check, Lock, MapPin, Save } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import Mascote from '../components/reino/mascote'
import Desenho from '../components/pixel/desenho'
import { ESPECIES, REGIOES, faseDoNivel, regiaoDoNivel, ROTULO_FASE, type Especie } from '../utils/reino'
import { xpDoNivel } from '../utils/xp'
import { comemorar } from '../utils/preferencias'
import MuralReino from '../components/reino/mural'
import QuartoCastelo from '../components/reino/quarto'
import type { GuildaResumo } from '../utils/aparencia'
import comum from './comum.module.css'
import styles from './Reino.module.css'

interface Eu {
  usu_nome?: string
  mascote?: { especie: string; nome: string } | null
  cor_nome?: string | null
  moldura?: string | null
  guilda?: GuildaResumo | null
  testes?: string[]
}

/* Pontos do caminho no mapa (em unidades do desenho: 200 x 100) */
const PONTOS: [number, number][] = [
  [16, 80], [42, 62], [68, 80], [94, 58], [120, 76], [146, 52], [168, 70], [186, 30],
]

const COR = { R: '#c2412d', W: '#fff3d6', D: '#1b1b30', Y: '#e8b13a', G: '#3f9a52', B: '#7a4b2a', A: '#2aa3bb', L: '#7c55b8', S: '#8d8fa8' }

/* Um desenhinho 7x7 para cada região, na ordem do mapa */
const MARCOS: string[][] = [
  ['...R...', '..RRR..', '.RRRRR.', 'RRRRRRR', '.WWWWW.', '.WWDWW.', '.WWDWW.'],
  ['Y..Y..Y', 'YY.YY.Y', '.Y..Y..', 'GY.GY.G', '.G..G..', 'GGGGGGG', '.......'],
  ['..GGG..', '.GGGGG.', 'GGGGGGG', '.GGGGG.', '..GGG..', '...B...', '...B...'],
  ['.......', 'B.....B', 'BBBBBBB', 'B.B.B.B', 'AAAAAAA', '.A.A.A.', 'AAAAAAA'],
  ['RWRWRWR', 'RWRWRWR', '.B...B.', '.B...B.', '.BYYYB.', '.B...B.', '.......'],
  ['...L...', '..LLL..', '.LLLLL.', '..SSS..', '..SDS..', '..SSS..', '..SSS..'],
  ['...W...', '..WSW..', '..SSS..', '.SSSSS.', '.SSSSSS', 'SSSSSSS', 'SSSSSSS'],
  ['S.S.S.S', 'SSSSSSS', '.SSSSS.', '.SRSRS.', '.SSSSS.', '.SSDSS.', '.SSDSS.'],
]

/* Mapa do reino: cada nível é uma região; o mascote mostra onde a pessoa está */
export default function Reino() {
  const toast = useToast()
  const [eu, setEu] = useState<Eu | null>(null)
  const [xp, setXp] = useState<number | null>(null)
  const [nivel, setNivel] = useState(1)
  const [erro, setErro] = useState('')
  const [especie, setEspecie] = useState<Especie>('gato')
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [trofeus, setTrofeus] = useState(0)

  const carregar = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([api<Eu>('/usuarios/eu'), api<{ resumo: { xp: number; nivel: number }; insignias?: { conquistada: boolean }[] }>('/perfil/freelancer/eu')])
      setEu(u)
      setTrofeus((p.insignias ?? []).filter((i) => i.conquistada).length)
      setXp(p.resumo.xp)
      setNivel(p.resumo.nivel)
      if (u.mascote) {
        setEspecie(u.mascote.especie as Especie)
        setNome(u.mascote.nome)
      }
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível abrir o mapa.')
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const r = await api<{ mensagem: string; mascote: { especie: string; nome: string } }>('/usuarios/eu/mascote', { metodo: 'PUT', corpo: { especie, nome } })
      setEu((atual) => ({ ...atual, mascote: r.mascote }))
      toast.mostrar(r.mensagem, 'sucesso')
      comemorar()
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível salvar o mascote.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setErro(''); carregar() }} />
  if (!eu || xp === null) return <Carregando variante="lista" />

  const { atual, proxima } = regiaoDoNivel(nivel)
  const indiceAtual = REGIOES.indexOf(atual)
  const falta = proxima ? Math.max(0, xpDoNivel(proxima.nivel) - xp) : 0
  const inicioRegiao = xpDoNivel(atual.nivel)
  const porcento = proxima ? Math.min(100, Math.round(((xp - inicioRegiao) / (xpDoNivel(proxima.nivel) - inicioRegiao)) * 100)) : 100
  const temMascote = eu.mascote !== undefined
  const mudou = !eu.mascote || eu.mascote.especie !== especie || eu.mascote.nome !== nome.trim()
  const [px, py] = PONTOS[indiceAtual]

  return (
    <div className={comum.pagina}>
      <h1 className="placa">Mapa do reino</h1>
      <p className={`${comum.subtitulo} placa`}>
        Cada nível leva a uma região nova do reino. Conclua projetos, receba boas avaliações e cumpra missões para avançar
        {temMascote ? ' com o seu mascote.' : '.'}
      </p>

      <section className={`${comum.painel} ${styles.mapaPainel}`} aria-labelledby="titulo-mapa">
        <h2 id="titulo-mapa"><IconeMapa size={22} strokeWidth={2.2} /> Você está em {atual.nome}</h2>
        <svg className={styles.mapa} viewBox="0 0 200 100" shapeRendering="crispEdges" role="img" aria-label={`Mapa do reino: você está na região ${indiceAtual + 1} de ${REGIOES.length}, ${atual.nome}`}>
          {/* Rio que corta o mapa */}
          <path d="M80 0h8v40h16v8h-16v52h-8v-52h-16v-8h16z" fill="#7fc6d6" opacity="0.55" />
          {/* Caminho: feito até aqui (cheio) e o que falta (tracejado) */}
          <polyline points={PONTOS.slice(0, indiceAtual + 1).map((p) => p.join(',')).join(' ')} fill="none" stroke="#7a4b2a" strokeWidth="3" />
          <polyline points={PONTOS.slice(indiceAtual).map((p) => p.join(',')).join(' ')} fill="none" stroke="#7a4b2a" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          {PONTOS.map(([x, y], i) => {
            const alcancada = i <= indiceAtual
            return (
              <g key={i} className={alcancada ? '' : styles.bloqueada}>
                <rect x={x - 9} y={y - 9} width="18" height="18" fill={i === indiceAtual ? '#ffd45e' : '#fff3d6'} stroke="#1b1b30" strokeWidth="1" />
                <g transform={`translate(${x - 7} ${y - 7}) scale(2)`}>
                  <Desenho linhas={MARCOS[i]} cores={COR} />
                </g>
                <text x={x} y={y + 16} textAnchor="middle" className={styles.numeroRegiao}>{REGIOES[i].nivel}</text>
              </g>
            )
          })}
          {/* O mascote (ou um alfinete) em cima da região atual */}
          {eu.mascote ? (
            <g transform={`translate(${px - 8} ${py - 30})`}>
              <Mascote especie={eu.mascote.especie} nivel={nivel} cor={eu.cor_nome} tamanho={16} parado />
            </g>
          ) : (
            <g transform={`translate(${px - 4} ${py - 22})`}>
              <Desenho linhas={['.RRR.', 'RRWRR', 'RRRRR', '.RRR.', '..R..', '..R..']} cores={COR} />
            </g>
          )}
        </svg>

        <div className={styles.progresso}>
          <div className={styles.barra} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcento} aria-label={proxima ? `Caminho até ${proxima.nome}` : 'Fim do mapa'}>
            <span style={{ width: `${porcento}%` }} />
          </div>
          <span className={comum.nota}>
            {proxima ? `Faltam ${falta} XP para chegar em ${proxima.nome} (nível ${proxima.nivel}).` : 'Você chegou ao Salão do Castelo, o fim do mapa!'}
          </span>
        </div>

        <ol className={styles.regioes}>
          {REGIOES.map((r, i) => {
            const estado = i < indiceAtual ? 'passou' : i === indiceAtual ? 'aqui' : 'falta'
            return (
              <li key={r.nivel} className={styles[estado]}>
                <span className={styles.icone} aria-hidden="true">
                  {estado === 'passou' ? <Check size={14} strokeWidth={2.8} /> : estado === 'aqui' ? <MapPin size={14} strokeWidth={2.6} /> : <Lock size={13} strokeWidth={2.4} />}
                </span>
                <span className={styles.textoRegiao}>
                  <strong>Nível {r.nivel} · {r.nome}</strong>
                  <small>{r.descricao}</small>
                </span>
                <span className={styles.oculto}>{estado === 'passou' ? 'já passou' : estado === 'aqui' ? 'você está aqui' : 'ainda não chegou'}</span>
              </li>
            )
          })}
        </ol>
      </section>

      {temMascote && (
        <section className={`${comum.painel} ${styles.mascotePainel}`} aria-labelledby="titulo-mascote-reino">
          <h2 id="titulo-mascote-reino"><PawPrint size={22} strokeWidth={2.2} /> {eu.mascote ? `${eu.mascote.nome}, seu mascote` : 'Adote um mascote'}</h2>
          <div className={styles.mascoteCorpo}>
            <div className={styles.palco}>
              <Mascote especie={especie} nivel={nivel} cor={eu.cor_nome} tamanho={112} nome={nome.trim() || 'Seu mascote'} />
            </div>
            <form className={styles.form} onSubmit={salvar}>
              <p className={comum.nota}>
                Ele é {ROTULO_FASE[faseDoNivel(nivel)].toLowerCase()} agora. No nível 3 ganha um cachecol (na cor do nome que você comprar na{' '}
                <Link to="/freelancer/loja" viewTransition>loja</Link>) e no nível 6 vira adulto, com coroa. Aparece no seu perfil público e no portfólio.
              </p>
              <fieldset className={styles.especies}>
                <legend>Bichinho</legend>
                {ESPECIES.map((s) => (
                  <button key={s.codigo} type="button" className={`${styles.especie} ${especie === s.codigo ? styles.escolhida : ''}`} onClick={() => setEspecie(s.codigo)} aria-pressed={especie === s.codigo}>
                    <Mascote especie={s.codigo} nivel={nivel} cor={eu.cor_nome} tamanho={44} parado />
                    <span>{s.nome}</span>
                  </button>
                ))}
              </fieldset>
              <label>
                Nome
                <input value={nome} minLength={2} maxLength={20} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Faísca" required />
              </label>
              <button type="submit" className={comum.botaoOuro} disabled={salvando || nome.trim().length < 2 || !mudou}>
                {salvando ? <span className="spinner" /> : <Save size={15} strokeWidth={2.4} />} {eu.mascote ? 'Salvar mudanças' : 'Adotar'}
              </button>
            </form>
          </div>
        </section>
      )}

      {eu && (
        <section className={styles.quarto} aria-labelledby="titulo-quarto">
          <h2 id="titulo-quarto" className="placa">Seu quarto no castelo</h2>
          <QuartoCastelo nome={eu.usu_nome ?? 'Você'} nivel={nivel} insignias={trofeus} testes={eu.testes?.length ?? 0} moldura={eu.moldura} cor_nome={eu.cor_nome} mascote={eu.mascote} guilda={eu.guilda} />
          <p className={`${comum.nota} placa`}>Cada insígnia vira um troféu na estante. Molduras e cores da loja mudam o quadro e o tapete; o quarto aparece no seu perfil público.</p>
        </section>
      )}

      <div className={styles.mural}>
        <MuralReino />
      </div>
    </div>
  )
}
