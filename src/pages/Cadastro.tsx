import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import logo from '../components/imgs/logo.png'
import EtapaPerfil, { type Perfil } from '../components/cadastro/etapaperfil'
import EtapaFormulario from '../components/cadastro/etapaformulario'
import ConfirmarEmail, { type PedidoConfirmacao } from '../components/cadastro/confirmaremail'
import { salvarSessao } from '../services/api'
import { useRole } from '../context/useRole'
import styles from '../components/cadastro/cadastro.module.css'
import type { DadosGoogle } from '../services/google'
import { t, useIdioma } from '../utils/idioma'

const etapas = [
  { numero: 1, titulo: 'Escolha seu perfil' },
  { numero: 2, titulo: 'Crie sua conta' },
  { numero: 3, titulo: 'Comece a evoluir' },
]

export default function Cadastro() {
  const navigate = useNavigate()
  useIdioma()
  /* Vindo do Google */
  const vindoDoLogin = useLocation().state as { google?: DadosGoogle; perfil?: Perfil } | null

  const [etapa, setEtapa] = useState<'perfil' | 'formulario'>('perfil')
  const [perfil, setPerfil] = useState<Perfil>(vindoDoLogin?.perfil ?? 'freelancer')
  const [google, setGoogle] = useState<DadosGoogle | null>(vindoDoLogin?.google ?? null)
  const [confirmacao, setConfirmacao] = useState<PedidoConfirmacao | null>(null)
  const { setRole } = useRole()

  /* Convide um amigo: o link de convite traz ?convite=ANA-7K2Q */
  const [params] = useSearchParams()
  const convite = (params.get('convite') ?? '').trim().toUpperCase().slice(0, 12)

  const etapaAtual = confirmacao ? 3 : etapa === 'perfil' ? 1 : 2

  return (
    <div className={styles.pagina}>
      <aside className={styles.painelLateral}>
        <Link to="/" className={styles.logo}>
          <img src={logo} alt="ContrateJá" />
        </Link>

        <div>
          <h1>{t('Bem-Vindo ao')} <span>ContrateJá</span></h1>
          <p className={styles.tagline}>
            {t('Complete esses passos rápidos para criar sua conta e começar sua jornada.')}
          </p>
        </div>

        {convite && (
          <p className={styles.convite}>
            Você chegou por um convite. Quando concluir o seu primeiro projeto, você e quem convidou ganham XP.
          </p>
        )}

        <ol className={styles.listaEtapas}>
          {etapas.map((e) => (
            <li
              key={e.numero}
              className={
                e.numero === etapaAtual ? styles.etapaAtiva : e.numero < etapaAtual ? styles.etapaConcluida : ''
              }
            >
              <span className={styles.numeroEtapa}>{e.numero < etapaAtual ? <Check size={14} strokeWidth={3} /> : e.numero}</span>
              {t(e.titulo)}
            </li>
          ))}
        </ol>
      </aside>

      <main className={styles.painelFormulario}>
        {confirmacao ? (
          <ConfirmarEmail
            pedido={confirmacao}
            aoConfirmar={(sessao) => {
              const tipo = salvarSessao(sessao.token, sessao.tipo)
              if (!tipo) return
              setRole(tipo)
              navigate(`/${tipo}`, { viewTransition: true })
            }}
          />
        ) : etapa === 'perfil' ? (
          <EtapaPerfil
            selecionado={perfil}
            onSelecionar={setPerfil}
            onContinuar={() => setEtapa('formulario')}
          />
        ) : (
          <EtapaFormulario
            perfil={perfil}
            onTrocarPerfil={setPerfil}
            convite={convite}
            google={google}
            onGoogle={setGoogle}
            onVoltar={() => setEtapa('perfil')}
            onConfirmarEmail={setConfirmacao}
            onCriarConta={(email) => {
              /* Vai para o login */
              navigate('/login', { state: { cadastrado: true, email } })
            }}
          />
        )}
      </main>
    </div>
  )
}
