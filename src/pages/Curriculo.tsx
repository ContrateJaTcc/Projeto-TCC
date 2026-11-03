import { useEffect, useState } from 'react'
import { Printer, MapPin, Mail, Star } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import type { PerfilFreelancer } from '../components/gamificacao/tipos'
import { formatarData } from '../utils/formatar'
import { linkPerfilPublico } from '../utils/perfilpublico'
import styles from './Curriculo.module.css'

interface Eu {
  usu_id: number
  usu_nome: string
  usu_email: string
  usu_desc: string | null
  usu_cid: string | null
  usu_est: string | null
  data_criacao?: string
  testes?: string[]
}

/* Data de hoje para o rodapé (fora do render: o lint pede componentes puros) */
const hoje = () => formatarData(new Date().toISOString())

interface Projeto {
  serv_id: number
  serv_titulo: string
  categoria: string
  serv_status: string
  serv_finalizado_em?: string | null
  nota_recebida?: number | null
}

/*
 * Currículo automático: perfil, projetos concluídos, notas, insígnias e testes num documento limpo.
 * "Baixar PDF" abre a impressão do navegador (Salvar como PDF); na tela, a folha imita o papel.
 */
export default function Curriculo() {
  const [eu, setEu] = useState<Eu | null>(null)
  const [perfil, setPerfil] = useState<PerfilFreelancer | null>(null)
  const [areas, setAreas] = useState<string[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    Promise.all([
      api<Eu>('/usuarios/eu'),
      api<PerfilFreelancer>('/perfil/freelancer/eu'),
      api<{ areas: { tipo_nome: string }[] }>('/usuarios/eu/areas').catch(() => ({ areas: [] })),
      api<{ itens: Projeto[] }>('/historico').catch(() => ({ itens: [] })),
    ])
      .then(([u, p, a, h]) => {
        if (!vivo) return
        setEu(u)
        setPerfil(p)
        setAreas(a.areas.map((x) => x.tipo_nome))
        setProjetos(h.itens.filter((i) => i.serv_status === 'finalizado'))
      })
      .catch((e) => vivo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível montar o currículo.'))
    return () => {
      vivo = false
    }
  }, [])

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  if (!eu || !perfil) return <Carregando variante="detalhe" />

  const local = [eu.usu_cid, eu.usu_est].filter(Boolean).join(' - ')
  const insignias = perfil.insignias.filter((i) => i.conquistada)
  const avaliacoes = perfil.avaliacoes.filter((a) => a.aval_comentario).slice(0, 3)

  return (
    <div className={styles.pagina}>
      <div className={styles.barra}>
        <p className="placa">O seu currículo se monta sozinho com o que você fez no castelo.</p>
        <button type="button" className={styles.imprimir} onClick={() => window.print()}>
          <Printer size={16} strokeWidth={2.2} /> Baixar PDF
        </button>
      </div>

      <article className={styles.folha} aria-label={`Currículo de ${eu.usu_nome}`}>
        <header className={styles.cabecalho}>
          <h1>{eu.usu_nome}</h1>
          <p className={styles.cargo}>{areas.length ? areas.join(' · ') : 'Freelancer'}</p>
          <p className={styles.contato}>
            {local && <span><MapPin size={13} aria-hidden="true" /> {local}</span>}
            <span><Mail size={13} aria-hidden="true" /> {eu.usu_email}</span>
            <span>Perfil: {linkPerfilPublico(eu.usu_id, eu.usu_nome)}</span>
          </p>
        </header>

        {eu.usu_desc && (
          <section>
            <h2>Sobre</h2>
            <p>{eu.usu_desc}</p>
          </section>
        )}

        <section>
          <h2>Em números</h2>
          <ul className={styles.numeros}>
            <li><strong>{perfil.resumo.concluidos}</strong> projetos concluídos</li>
            <li><strong>{perfil.resumo.totalAvaliacoes ? perfil.resumo.media.toLocaleString('pt-BR') : '—'}</strong> nota média ({perfil.resumo.totalAvaliacoes} avaliações)</li>
            <li><strong>Nível {perfil.resumo.nivel}</strong> ({perfil.resumo.xp} XP)</li>
            {eu.data_criacao && <li><strong>{formatarData(eu.data_criacao)}</strong> na plataforma desde</li>}
          </ul>
        </section>

        {projetos.length > 0 && (
          <section>
            <h2>Projetos concluídos</h2>
            <ul className={styles.projetos}>
              {projetos.slice(0, 12).map((p) => (
                <li key={p.serv_id}>
                  <strong>{p.serv_titulo}</strong>
                  <span>{p.categoria}{p.serv_finalizado_em ? ` · ${formatarData(p.serv_finalizado_em)}` : ''}</span>
                  {p.nota_recebida ? <span className={styles.nota}><Star size={12} aria-hidden="true" /> {p.nota_recebida}/5</span> : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(eu.testes?.length || insignias.length > 0) && (
          <section>
            <h2>Testes e conquistas</h2>
            <ul className={styles.etiquetas}>
              {eu.testes?.map((t) => <li key={t}>Teste de habilidade: {t}</li>)}
              {insignias.map((i) => <li key={i.codigo}>{i.nome}</li>)}
            </ul>
          </section>
        )}

        {avaliacoes.length > 0 && (
          <section>
            <h2>O que dizem os clientes</h2>
            {avaliacoes.map((a) => (
              <blockquote key={a.aval_id} className={styles.citacao}>
                “{a.aval_comentario}”
                <cite>{a.avaliador_nome}, {a.serv_titulo}</cite>
              </blockquote>
            ))}
          </section>
        )}

        <footer className={styles.rodape}>Gerado pelo ContrateJá em {hoje()}. Dados conferidos pela plataforma.</footer>
      </article>
    </div>
  )
}
