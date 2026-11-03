import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Lock, Sparkles, Store } from 'lucide-react'
import { api, ErroApi } from '../services/api'
import Carregando from '../components/carregando/carregando'
import EstadoErro from '../components/carregando/estadoerro'
import QuadroInsignias from '../components/gamificacao/insignias'
import type { Insignia } from '../components/gamificacao/tipos'
import { formatarData } from '../utils/formatar'
import comum from './comum.module.css'
import secretas from '../components/gamificacao/conquistassecretas.module.css'
import styles from './Album.module.css'

interface DadosAlbum {
  insignias: (Insignia & { raridade: string; porcentagem: number })[]
  secretas: { codigo: string; nome: string; descricao: string; conquistada: boolean; data: string | null; porcentagem: number }[]
  total_freelancers: number
}

const pct = (n: number) => (n === 0 ? 'Ninguém achou ainda' : `${n.toLocaleString('pt-BR')}% das pessoas acharam`)

/* Álbum: todas as insígnias e conquistas, as que faltam e quantos por cento das pessoas já têm cada uma */
export default function Album() {
  const [dados, setDados] = useState<DadosAlbum | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    api<DadosAlbum>('/conquistas/album')
      .then((d) => vivo && setDados(d))
      .catch((e) => vivo && setErro(e instanceof ErroApi ? e.message : 'Não foi possível abrir o álbum.'))
    return () => {
      vivo = false
    }
  }, [])

  if (erro) return <EstadoErro mensagem={erro} onTentarDeNovo={() => window.location.reload()} />
  if (!dados) return <Carregando variante="lista" />

  const conquistadas = dados.insignias.filter((i) => i.conquistada).length
  const rara = [...dados.insignias].filter((i) => i.conquistada).sort((a, b) => a.porcentagem - b.porcentagem)[0]
  const achadas = dados.secretas.filter((s) => s.conquistada).length

  return (
    <div className={comum.pagina}>
      <h1 className="placa">Álbum de insígnias</h1>
      <p className={`${comum.subtitulo} placa`}>
        Todas as insígnias do castelo, as que você já tem e as que faltam. A porcentagem mostra quantos dos {dados.total_freelancers}{' '}
        freelancers já conquistaram cada uma: quanto menor, mais rara.
      </p>

      <div className={styles.numeros}>
        <section className={`${comum.painel} ${styles.numero}`}>
          <span className={styles.rotulo}><Award size={16} strokeWidth={2.2} /> Insígnias</span>
          <strong>{conquistadas} de {dados.insignias.length}</strong>
          <span className={comum.nota}>{dados.insignias.length - conquistadas === 0 ? 'Álbum completo!' : `Faltam ${dados.insignias.length - conquistadas}`}</span>
        </section>
        <section className={`${comum.painel} ${styles.numero}`}>
          <span className={styles.rotulo}><Sparkles size={16} strokeWidth={2.2} /> A mais rara que você tem</span>
          <strong className={styles.menor}>{rara ? rara.nome : '—'}</strong>
          <span className={comum.nota}>{rara ? `${rara.porcentagem.toLocaleString('pt-BR')}% dos freelancers têm` : 'Conclua um projeto para ganhar a primeira'}</span>
        </section>
        <section className={`${comum.painel} ${styles.numero}`}>
          <span className={styles.rotulo}><Lock size={16} strokeWidth={2.2} /> Conquistas secretas</span>
          <strong>{achadas} de {dados.secretas.length}</strong>
          <span className={comum.nota}>As escondidas mostram só uma dica</span>
        </section>
      </div>

      <section className={styles.secao} aria-labelledby="titulo-insignias">
        <h2 id="titulo-insignias" className="placa">Insígnias</h2>
        <div className={comum.painel}>
          <QuadroInsignias insignias={dados.insignias} porcentagens={Object.fromEntries(dados.insignias.map((i) => [i.codigo, i.porcentagem]))} />
        </div>
      </section>

      <section className={styles.secao} aria-labelledby="titulo-secretas-album">
        <h2 id="titulo-secretas-album" className="placa">Conquistas secretas</h2>
        <ul className={secretas.grade}>
          {dados.secretas.map((c) => (
            <li key={c.codigo} className={c.conquistada ? secretas.achada : secretas.escondida}>
              <span className={secretas.icone} aria-hidden="true">
                {c.conquistada ? <Sparkles size={20} strokeWidth={2.2} /> : <Lock size={18} strokeWidth={2.2} />}
              </span>
              <strong>{c.nome}</strong>
              <p>{c.descricao}</p>
              {c.conquistada && c.data && <small>Desde {formatarData(c.data)}</small>}
              <small className={styles.porcento}>{pct(c.porcentagem)}</small>
            </li>
          ))}
        </ul>
      </section>

      <p className={styles.dica}>
        <Store size={15} strokeWidth={2.2} aria-hidden="true" />
        Insígnias dão destaque no seu perfil. O XP que você ganha no caminho vira enfeites na{' '}
        <Link to="/freelancer/loja" viewTransition>loja do castelo</Link>.
      </p>
    </div>
  )
}
