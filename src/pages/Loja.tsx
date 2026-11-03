import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Store, Sparkles, Check, Crown, Info } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useToast } from '../context/useToast'
import Avatar from '../components/avatar/avatar'
import { NomeColorido } from '../components/aparencia/aparencia'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { definirTemaCenario } from '../utils/temacenario'
import comum from './comum.module.css'
import styles from './Loja.module.css'

type Tipo = 'moldura' | 'cor' | 'tema'

interface Item {
  codigo: string
  tipo: Tipo
  nome: string
  descricao: string
  preco: number
  comprado: boolean
}

interface DadosLoja {
  disponivel: boolean
  xp_total: number
  xp_gasto: number
  xp_livre: number
  equipado: Partial<Record<Tipo, string | null>>
  campeao: { posicao: number } | null
  itens: Item[]
}

interface Eu {
  usu_nome: string
  usu_foto: string | null
}

const SECOES: { tipo: Tipo; titulo: string; dica: string }[] = [
  { tipo: 'moldura', titulo: 'Molduras', dica: 'Aparecem em volta da sua foto para todo mundo: na busca de freelancers, no perfil público e no ranking.' },
  { tipo: 'cor', titulo: 'Cor do nome', dica: 'Seu nome ganha cor nos cartões da busca, no perfil e no ranking.' },
  { tipo: 'tema', titulo: 'Cenários', dica: 'Mudam o céu do castelo só para você, em toda a sua área do site.' },
]

const LUGAR = ['', 'campeão', 'vice-campeão', 'terceiro lugar']

/* Loja de cosméticos: o XP que sobra vira molduras, cores de nome e cenários (o nível não cai) */
export default function Loja() {
  const toast = useToast()
  const [dados, setDados] = useState<DadosLoja | null>(null)
  const [eu, setEu] = useState<Eu | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const [loja, perfil] = await Promise.all([api<DadosLoja>('/loja'), api<Eu>('/usuarios/eu')])
      setDados(loja)
      setEu(perfil)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível abrir a loja.')
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  async function agir(item: Item, acao: 'comprar' | 'equipar' | 'tirar') {
    setOcupado(item.codigo)
    try {
      const r =
        acao === 'comprar'
          ? await api<DadosLoja & { mensagem: string }>(`/loja/${item.codigo}/comprar`, { metodo: 'POST' })
          : await api<DadosLoja & { mensagem: string }>('/loja/equipar', { metodo: 'PUT', corpo: { tipo: item.tipo, codigo: acao === 'tirar' ? null : item.codigo } })
      setDados(r)
      toast.mostrar(r.mensagem, 'sucesso')
      if (item.tipo === 'tema') definirTemaCenario(r.equipado.tema ?? null)
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível concluir.', 'erro')
    } finally {
      setOcupado(null)
    }
  }

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => { setErro(''); carregar() }} />
  if (!dados || !eu) return <Carregando variante="lista" />

  const nome = eu.usu_nome
  const moldura = dados.campeao ? `campeao_${['', 'ouro', 'prata', 'bronze'][dados.campeao.posicao]}` : dados.equipado.moldura ?? null

  return (
    <div className={comum.pagina}>
      <h1 className="placa">Loja do castelo</h1>
      <p className={`${comum.subtitulo} placa`}>Troque o XP que sobra por enfeites. Gastar XP não baixa o seu nível: ele conta todo o XP que você já ganhou.</p>

      {!dados.disponivel ? (
        <div className={comum.vazio}>
          <Store size={28} strokeWidth={2} />
          <strong>A loja está sendo montada</strong>
          <p>Assim que o servidor for atualizado, os itens aparecem aqui.</p>
        </div>
      ) : (
        <>
          <section className={`${comum.painel} ${styles.vitrine}`}>
            <Avatar nome={nome} foto={eu.usu_foto} size={72} especial={moldura} />
            <div className={styles.vitrineTexto}>
              <strong className={styles.nome}><NomeColorido nome={nome} cor={dados.equipado.cor} /></strong>
              <span className={comum.nota}>É assim que os outros veem você agora.</span>
              {dados.campeao && (
                <span className={styles.campeao}>
                  <Crown size={14} strokeWidth={2.4} /> Você foi {LUGAR[dados.campeao.posicao]} da temporada passada: a moldura da temporada vale
                  durante este mês todo.
                </span>
              )}
            </div>
            <div className={styles.carteiraXp} aria-label={`${dados.xp_livre} XP para gastar`}>
              <Sparkles size={18} strokeWidth={2.2} />
              <strong>{dados.xp_livre}</strong>
              <span>XP para gastar</span>
              <small>{dados.xp_total} ganhos · {dados.xp_gasto} gastos</small>
            </div>
          </section>

          {SECOES.map((secao) => (
            <section key={secao.tipo} className={styles.secao} aria-labelledby={`loja-${secao.tipo}`}>
              <header>
                <h2 id={`loja-${secao.tipo}`} className="placa">{secao.titulo}</h2>
                <p className={`${comum.nota} placa`}>{secao.dica}</p>
              </header>
              <ul className={styles.grade}>
                {dados.itens.filter((i) => i.tipo === secao.tipo).map((item) => {
                  const equipado = dados.equipado[item.tipo] === item.codigo
                  const falta = item.preco - dados.xp_livre
                  return (
                    <li key={item.codigo} className={`${styles.item} ${equipado ? styles.equipado : ''}`}>
                      <div className={styles.previa} aria-hidden="true">
                        {item.tipo === 'moldura' && <Avatar nome={nome} foto={eu.usu_foto} size={52} especial={item.codigo} />}
                        {item.tipo === 'cor' && <strong className={styles.nomePrevia}><NomeColorido nome={nome.split(' ')[0]} cor={item.codigo} /></strong>}
                        {item.tipo === 'tema' && <span className={`${styles.ceu} ${styles[item.codigo] ?? ''}`} />}
                      </div>
                      <strong>{item.nome}</strong>
                      <span className={styles.descricao}>{item.descricao}</span>
                      {item.comprado ? (
                        equipado ? (
                          <button type="button" className={comum.botao} onClick={() => agir(item, 'tirar')} disabled={ocupado === item.codigo}>
                            <Check size={15} strokeWidth={2.6} /> Usando · tirar
                          </button>
                        ) : (
                          <button type="button" className={comum.botaoOuro} onClick={() => agir(item, 'equipar')} disabled={ocupado === item.codigo}>
                            Usar
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          className={comum.botaoOuro}
                          onClick={() => agir(item, 'comprar')}
                          disabled={ocupado === item.codigo || falta > 0}
                          aria-label={`Comprar ${item.nome} por ${item.preco} XP`}
                        >
                          {ocupado === item.codigo ? <span className="spinner" /> : <Sparkles size={15} strokeWidth={2.4} />} {item.preco} XP
                        </button>
                      )}
                      {!item.comprado && falta > 0 && <span className={styles.falta}>Faltam {falta} XP</span>}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          <p className={styles.dicaXp}>
            <Info size={15} strokeWidth={2.2} aria-hidden="true" />
            Ganhe mais XP concluindo projetos, recebendo boas avaliações e cumprindo as{' '}
            <Link to="/freelancer" viewTransition>missões da semana</Link>.
          </p>
        </>
      )}
    </div>
  )
}
