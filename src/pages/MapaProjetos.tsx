import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, LocateFixed, List, Wifi, X } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import { useToast } from '../context/useToast'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import { useCidades, distanciaKm, textoDistancia, type Ponto } from '../utils/cidades'
import { formatarValorServico } from '../utils/formatar'
import type { PontoMapa } from '../components/mapa/mapa'
import comum from './comum.module.css'
import styles from './MapaProjetos.module.css'

const Mapa = lazy(() => import('../components/mapa/mapa'))

interface Projeto {
  serv_id: number
  serv_titulo: string
  categoria: string
  serv_valor: number | string
  serv_tipo_valor: 'hora' | 'fixo'
  serv_local: 'remoto' | 'hibrido' | 'presencial'
  serv_cidade: string | null
  serv_estado: string | null
  contratante_nome?: string
}

interface Eu {
  usu_cid?: string | null
  usu_est?: string | null
}

const RAIOS = [25, 50, 100, 300]
const LOCAL = { presencial: 'Presencial', hibrido: 'Híbrido', remoto: 'Remoto' }

/* Projetos presenciais e híbridos no mapa, pela cidade, com o filtro "perto de mim" */
export default function MapaProjetos() {
  const toast = useToast()
  const { achar, erro: erroCidades } = useCidades()
  const [projetos, setProjetos] = useState<Projeto[] | null>(null)
  const [eu, setEu] = useState<Eu>({})
  const [erro, setErro] = useState('')
  const [origem, setOrigem] = useState<'cidade' | 'aqui'>('cidade')
  const [aqui, setAqui] = useState<Ponto | null>(null)
  const [localizando, setLocalizando] = useState(false)
  const [raio, setRaio] = useState<number | null>(100)
  const [selecionado, setSelecionado] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    Promise.all([api<{ projetos: Projeto[] }>('/servicos/abertos'), api<Eu>('/usuarios/eu', { silencioso: true }).catch(() => ({}))])
      .then(([p, u]) => {
        if (!vivo) return
        setProjetos(p.projetos)
        setEu(u)
      })
      .catch((e) => vivo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar os projetos.'))
    return () => {
      vivo = false
    }
  }, [])

  const minhaCidade = achar ? achar(eu.usu_cid, eu.usu_est) : null
  const centro = origem === 'aqui' ? aqui : minhaCidade
  /* Sem saber onde a pessoa está, o raio não faz sentido: mostra o Brasil todo */
  const raioUsado = centro ? raio : null

  /* Projetos com lugar no mapa, a distância de cada um e quantos ficaram de fora */
  const { noMapa, remotos, semCidade } = useMemo(() => {
    const lista = projetos ?? []
    const comLugar: (Projeto & { ponto: Ponto; chave: string; km: number | null })[] = []
    let semCidade = 0
    for (const p of lista) {
      if (p.serv_local === 'remoto') continue
      const ponto = achar?.(p.serv_cidade, p.serv_estado)
      if (!ponto) {
        semCidade += 1
        continue
      }
      comLugar.push({ ...p, ponto, chave: `${p.serv_estado}:${p.serv_cidade}`, km: centro ? distanciaKm(centro, ponto) : null })
    }
    return { noMapa: comLugar, remotos: lista.filter((p) => p.serv_local === 'remoto').length, semCidade }
  }, [projetos, achar, centro])

  const noRaio = useMemo(
    () => noMapa.filter((p) => raioUsado === null || p.km === null || p.km <= raioUsado).sort((a, b) => (a.km ?? 0) - (b.km ?? 0)),
    [noMapa, raioUsado]
  )

  /* Um marcador por cidade, com quantos projetos tem lá */
  const pontos: PontoMapa[] = useMemo(() => {
    const porCidade = new Map<string, PontoMapa>()
    for (const p of noRaio) {
      const atual = porCidade.get(p.chave)
      if (atual) atual.quantidade += 1
      else porCidade.set(p.chave, { chave: p.chave, ponto: p.ponto, quantidade: 1, rotulo: `${p.serv_cidade}/${p.serv_estado}` })
    }
    for (const ponto of porCidade.values()) ponto.rotulo = `${ponto.rotulo}: ${ponto.quantidade} ${ponto.quantidade === 1 ? 'projeto' : 'projetos'}`
    return [...porCidade.values()]
  }, [noRaio])

  const lista = selecionado ? noRaio.filter((p) => p.chave === selecionado) : noRaio
  const cidadeSelecionada = selecionado ? noRaio.find((p) => p.chave === selecionado) : null

  function usarOndeEstou() {
    if (!('geolocation' in navigator)) {
      toast.mostrar('Este navegador não informa a localização.', 'erro')
      return
    }
    setLocalizando(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        /* Duas casas decimais bastam (uns 1 km) e a posição não sai do aparelho */
        setAqui({ lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100 })
        setOrigem('aqui')
        setLocalizando(false)
      },
      () => {
        toast.mostrar('Não deu para pegar a localização. Dá para liberar no cadeado da barra de endereço.', 'erro')
        setLocalizando(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
    )
  }

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  if (!projetos || (!achar && !erroCidades)) return <Carregando variante="lista" />
  if (erroCidades) return <EstadoErro mensagem="Não foi possível carregar o mapa das cidades." onTentarDeNovo={() => window.location.reload()} />

  const ondeTexto = origem === 'aqui' ? 'onde você está agora' : eu.usu_cid && eu.usu_est ? `${eu.usu_cid}/${eu.usu_est}` : null

  return (
    <div className={comum.pagina}>
      <Link to="/freelancer" className={comum.voltar} viewTransition>
        <List size={16} strokeWidth={2.4} /> Ver em lista
      </Link>
      <h1 className="placa">Projetos no mapa</h1>
      <p className={`${comum.subtitulo} placa`}>
        Projetos presenciais e híbridos pela cidade. O mapa mostra só a cidade de cada projeto, nunca o endereço.
      </p>

      <div className={`${comum.painel} ${styles.controles}`}>
        <label>
          Perto de
          <select
            value={origem}
            onChange={(e) => {
              if (e.target.value === 'aqui') usarOndeEstou()
              else setOrigem('cidade')
            }}
          >
            <option value="cidade">{minhaCidade ? `Minha cidade (${eu.usu_cid}/${eu.usu_est})` : 'Minha cidade (complete no perfil)'}</option>
            <option value="aqui">Onde estou agora</option>
          </select>
        </label>
        <label>
          Até
          <select value={raio ?? ''} onChange={(e) => setRaio(e.target.value ? Number(e.target.value) : null)} disabled={!centro}>
            {RAIOS.map((r) => (
              <option key={r} value={r}>{r} km</option>
            ))}
            <option value="">Brasil inteiro</option>
          </select>
        </label>
        <button type="button" className={comum.botao} onClick={usarOndeEstou} disabled={localizando}>
          {localizando ? <span className="spinner" /> : <LocateFixed size={16} strokeWidth={2.2} />} Usar minha localização
        </button>
        {!centro && origem === 'cidade' && (
          <span className={comum.nota}>
            Sem a sua cidade no perfil, o mapa mostra o Brasil inteiro. <Link to="/freelancer/perfil" viewTransition>Completar o perfil</Link>
          </span>
        )}
      </div>

      <div className={styles.grade}>
        <Suspense fallback={<div className={styles.esperaMapa}>Abrindo o mapa…</div>}>
          <Mapa
            pontos={pontos}
            centro={centro}
            raioKm={raioUsado}
            selecionado={selecionado}
            aoEscolher={setSelecionado}
            descricao={`Mapa com ${noRaio.length} ${noRaio.length === 1 ? 'projeto' : 'projetos'} em ${pontos.length} ${pontos.length === 1 ? 'cidade' : 'cidades'}${ondeTexto ? `, perto de ${ondeTexto}` : ''}`}
          />
        </Suspense>

        <section className={`${comum.painel} ${styles.lista}`} aria-labelledby="titulo-lista-mapa" aria-live="polite">
          <h2 id="titulo-lista-mapa">
            <MapPin size={20} strokeWidth={2.2} />
            {cidadeSelecionada ? `${cidadeSelecionada.serv_cidade}/${cidadeSelecionada.serv_estado}` : `${noRaio.length} ${noRaio.length === 1 ? 'projeto' : 'projetos'}`}
          </h2>
          {selecionado && (
            <button type="button" className={styles.limpar} onClick={() => setSelecionado(null)}>
              <X size={14} strokeWidth={2.6} /> Ver todas as cidades
            </button>
          )}
          {lista.length === 0 ? (
            <p className={comum.nota}>
              {raioUsado ? `Nenhum projeto presencial até ${raioUsado} km${ondeTexto ? ` de ${ondeTexto}` : ''}. Tente um raio maior.` : 'Nenhum projeto presencial ou híbrido aberto agora.'}
            </p>
          ) : (
            <ul className={styles.itens}>
              {lista.map((p) => (
                <li key={p.serv_id}>
                  <Link to={`/freelancer/projetos/${p.serv_id}`} viewTransition>
                    <strong>{p.serv_titulo}</strong>
                  </Link>
                  <span>{p.categoria} · {LOCAL[p.serv_local]}</span>
                  <span className={styles.ondeFica}>
                    <MapPin size={13} strokeWidth={2.4} aria-hidden="true" /> {p.serv_cidade}/{p.serv_estado}
                    {p.km !== null && <b> · {textoDistancia(p.km)}</b>}
                  </span>
                  <span className={styles.valor}>{formatarValorServico(p.serv_valor, p.serv_tipo_valor)}</span>
                </li>
              ))}
            </ul>
          )}
          {(remotos > 0 || semCidade > 0) && (
            <p className={styles.foraDoMapa}>
              <Wifi size={14} strokeWidth={2.2} aria-hidden="true" />
              {remotos > 0 && `${remotos} ${remotos === 1 ? 'projeto remoto não aparece' : 'projetos remotos não aparecem'} no mapa (dá para fazer de qualquer lugar). `}
              {semCidade > 0 && `${semCidade} sem cidade reconhecida.`}{' '}
              <Link to="/freelancer" viewTransition>Ver todos em lista</Link>
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
