import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Star, ShieldCheck, X } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import Carregando from '../../components/carregando/carregando'
import EstadoErro from '../../components/carregando/estadoerro'
import Avatar from '../../components/avatar/avatar'
import { SeloGuilda, SelosTeste } from '../../components/reino/selos'
import type { Aparencia } from '../../utils/aparencia'
import { formatarData, formatarMoeda, textoTempoResposta } from '../../utils/formatar'
import { lerComparacao, salvarComparacao } from '../../utils/comparacao'
import comum from '../comum.module.css'
import styles from './Comparar.module.css'

interface Comparado extends Aparencia {
  usu_id: number
  usu_nome: string
  usu_foto: string | null
  usu_cid: string | null
  usu_est: string | null
  data_criacao: string
  free_nivel: number
  free_xp: number
  free_rank: number | string
  avaliacoes: number
  projetos_concluidos: number
  preco_medio: number | null
  areas: string[]
  tempo_resposta: number | null
  verificado: boolean
}

/* O melhor de cada linha ganha a estrela (empate: todos ganham) */
function melhores(lista: Comparado[], valor: (f: Comparado) => number | null, menorGanha = false) {
  const numeros = lista.map(valor).filter((v): v is number => v !== null && v > 0)
  if (numeros.length < 2) return new Set<number>()
  const alvo = menorGanha ? Math.min(...numeros) : Math.max(...numeros)
  return new Set(lista.filter((f) => valor(f) === alvo).map((f) => f.usu_id))
}

/* Até 3 freelancers lado a lado: o contratante escolhe na busca e decide aqui */
export default function Comparar() {
  const [params, setParams] = useSearchParams()
  const ids = (params.get('ids') ?? lerComparacao().join(',')).split(',').map(Number).filter(Boolean).slice(0, 3)
  const chave = ids.join(',')
  const [lista, setLista] = useState<Comparado[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (chave.split(',').filter(Boolean).length < 2) return
    let vivo = true
    api<{ freelancers: Comparado[] }>(`/usuarios/freelancers/comparar?ids=${chave}`)
      .then((d) => vivo && setLista(d.freelancers))
      .catch((e) => vivo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível comparar.'))
    return () => {
      vivo = false
    }
  }, [chave])

  function tirar(id: number) {
    const restantes = ids.filter((x) => x !== id)
    salvarComparacao(restantes)
    setLista((l) => l?.filter((f) => f.usu_id !== id) ?? null)
    setParams(restantes.length ? { ids: restantes.join(',') } : {}, { replace: true })
  }

  const voltar = (
    <Link to="/contratante/freelancers" className={comum.voltar} viewTransition>
      <ArrowLeft size={15} strokeWidth={2.4} /> Voltar para a busca
    </Link>
  )

  if (ids.length < 2) {
    return (
      <div className={comum.pagina}>
        {voltar}
        <h1 className="placa">Comparar freelancers</h1>
        <p className={`${comum.painel} ${comum.nota}`}>Marque "Comparar" em 2 ou 3 cartões na busca de freelancers para ver tudo lado a lado.</p>
      </div>
    )
  }
  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  if (!lista) return <Carregando variante="cartoes" quantidade={3} />

  const nota = (f: Comparado) => (f.avaliacoes ? Number(f.free_rank) : null)
  const estrelas = {
    nivel: melhores(lista, (f) => f.free_nivel),
    nota: melhores(lista, nota),
    projetos: melhores(lista, (f) => f.projetos_concluidos),
    resposta: melhores(lista, (f) => f.tempo_resposta, true),
    preco: melhores(lista, (f) => f.preco_medio, true),
  }
  const melhor = (grupo: keyof typeof estrelas, id: number) =>
    estrelas[grupo].has(id) ? (
      <span className={styles.melhor}><Star size={13} strokeWidth={2.4} aria-hidden="true" /> melhor</span>
    ) : null

  const linhas: { rotulo: string; valor: (f: Comparado) => React.ReactNode }[] = [
    { rotulo: 'Nível', valor: (f) => <>Nível {f.free_nivel} <span className={comum.nota}>({f.free_xp} XP)</span> {melhor('nivel', f.usu_id)}</> },
    { rotulo: 'Nota média', valor: (f) => (nota(f) ? <>{nota(f)?.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ★ <span className={comum.nota}>({f.avaliacoes})</span> {melhor('nota', f.usu_id)}</> : <span className={comum.nota}>Sem avaliações</span>) },
    { rotulo: 'Projetos concluídos', valor: (f) => <>{f.projetos_concluidos} {melhor('projetos', f.usu_id)}</> },
    { rotulo: 'Responde em', valor: (f) => (f.tempo_resposta ? <>{textoTempoResposta(f.tempo_resposta)} {melhor('resposta', f.usu_id)}</> : <span className={comum.nota}>Ainda sem dados</span>) },
    { rotulo: 'Preço médio (projetos fixos)', valor: (f) => (f.preco_medio ? <>{formatarMoeda(f.preco_medio)} {melhor('preco', f.usu_id)}</> : <span className={comum.nota}>Ainda sem dados</span>) },
    { rotulo: 'Testes de habilidade', valor: (f) => (f.testes?.length ? <SelosTeste testes={f.testes} /> : <span className={comum.nota}>Nenhum</span>) },
    { rotulo: 'Áreas', valor: (f) => f.areas.join(', ') || <span className={comum.nota}>Não informou</span> },
    { rotulo: 'Guilda', valor: (f) => (f.guilda ? <SeloGuilda guilda={f.guilda} /> : <span className={comum.nota}>Sem guilda</span>) },
    { rotulo: 'Cidade', valor: (f) => [f.usu_cid, f.usu_est].filter(Boolean).join('/') || '—' },
    { rotulo: 'No castelo desde', valor: (f) => formatarData(f.data_criacao) },
  ]

  return (
    <div className={comum.pagina}>
      {voltar}
      <h1 className="placa">Comparar freelancers</h1>
      <p className={`${comum.subtitulo} placa`}>A estrela marca quem se sai melhor em cada linha. Preço e tempo de resposta: menor é melhor.</p>

      <div className={styles.quadro} style={{ '--colunas': lista.length } as React.CSSProperties} role="table" aria-label="Comparação de freelancers">
        <div className={styles.cabeca} role="row">
          {lista.map((f) => (
            <div key={f.usu_id} className={styles.pessoa} role="columnheader">
              <button type="button" className={styles.tirar} onClick={() => tirar(f.usu_id)} aria-label={`Tirar ${f.usu_nome} da comparação`}>
                <X size={15} strokeWidth={2.6} />
              </button>
              <Avatar nome={f.usu_nome} foto={f.usu_foto} nivel={f.free_nivel} especial={f.moldura} size={56} />
              <strong>{f.usu_nome}</strong>
              {f.verificado && <span className={styles.verificado}><ShieldCheck size={13} strokeWidth={2.4} aria-hidden="true" /> Verificado</span>}
              <Link to={`/contratante/freelancer/${f.usu_id}`} className={comum.botao} viewTransition>Ver portfólio</Link>
            </div>
          ))}
        </div>
        {linhas.map((l) => (
          <div key={l.rotulo} className={styles.linha} role="row">
            <span className={styles.rotulo} role="rowheader">{l.rotulo}</span>
            {lista.map((f) => (
              <div key={f.usu_id} className={styles.valor} role="cell">{l.valor(f)}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
