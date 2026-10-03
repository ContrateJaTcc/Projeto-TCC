import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import logo from '../components/imgs/logo.png'
import EtapaPerfil, { type Perfil } from '../components/cadastro/etapaperfil'
import EtapaFormulario from '../components/cadastro/etapaformulario'
import styles from '../components/cadastro/cadastro.module.css'
import type { DadosGoogle } from '../services/google'

const etapas = [
  { numero: 1, titulo: 'Escolha seu perfil' },
  { numero: 2, titulo: 'Crie sua conta' },
  { numero: 3, titulo: 'Comece a evoluir' },
]

export default function Cadastro() {
  const navigate = useNavigate()
  /* Vindo do "Continuar com Google" do login, com uma conta Google ainda sem cadastro. */
  const vindoDoLogin = useLocation().state as { google?: DadosGoogle; perfil?: Perfil } | null

  const [etapa, setEtapa] = useState<'perfil' | 'formulario'>('perfil')
  const [perfil, setPerfil] = useState<Perfil>(vindoDoLogin?.perfil ?? 'freelancer')
  const [google, setGoogle] = useState<DadosGoogle | null>(vindoDoLogin?.google ?? null)

  const etapaAtual = etapa === 'perfil' ? 1 : 2

  return (
    <div className={styles.pagina}>
      <aside className={styles.painelLateral}>
        <Link to="/" className={styles.logo}>
          <img src={logo} alt="ContrateJá" />
        </Link>

        <div>
          <h1>Bem-Vindo ao <span>ContrateJá</span></h1>
          <p className={styles.tagline}>
            Complete esses passos rápidos para criar sua conta e começar sua jornada.
          </p>
        </div>

        <ol className={styles.listaEtapas}>
          {etapas.map((e) => (
            <li
              key={e.numero}
              className={
                e.numero === etapaAtual ? styles.etapaAtiva : e.numero < etapaAtual ? styles.etapaConcluida : ''
              }
            >
              <span className={styles.numeroEtapa}>{e.numero < etapaAtual ? <Check size={14} strokeWidth={3} /> : e.numero}</span>
              {e.titulo}
            </li>
          ))}
        </ol>
      </aside>

      <main className={styles.painelFormulario}>
        {etapa === 'perfil' ? (
          <EtapaPerfil
            selecionado={perfil}
            onSelecionar={setPerfil}
            onContinuar={() => setEtapa('formulario')}
          />
        ) : (
          <EtapaFormulario
            perfil={perfil}
            google={google}
            onGoogle={setGoogle}
            onVoltar={() => setEtapa('perfil')}
            onCriarConta={(email) => {
              /* O cadastro não devolve token. Abrir o dashboard aqui fazia a
                 primeira requisição voltar 401 e mostrar "sessão expirou".
                 O login salva o token e define o papel a partir do servidor. */
              navigate('/login', { state: { cadastrado: true, email } })
            }}
          />
        )}
      </main>
    </div>
  )
}
