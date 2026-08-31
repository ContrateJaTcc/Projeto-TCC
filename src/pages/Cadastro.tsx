import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import logo from '../components/imgs/logo.png'
import EtapaPerfil, { type Perfil } from '../components/cadastro/etapaperfil'
import EtapaFormulario from '../components/cadastro/etapaformulario'
import { useRole } from '../context/useRole'
import styles from '../components/cadastro/cadastro.module.css'

const etapas = [
  { numero: 1, titulo: 'Escolha seu perfil' },
  { numero: 2, titulo: 'Crie sua conta' },
  { numero: 3, titulo: 'Comece a evoluir' },
]

export default function Cadastro() {
  const navigate = useNavigate()
  const { setRole } = useRole()
  const [etapa, setEtapa] = useState<'perfil' | 'formulario'>('perfil')
  const [perfil, setPerfil] = useState<Perfil>('freelancer')

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
            onVoltar={() => setEtapa('perfil')}
            onCriarConta={() => {
              setRole(perfil)
              navigate(`/${perfil}`)
            }}
          />
        )}
      </main>
    </div>
  )
}
