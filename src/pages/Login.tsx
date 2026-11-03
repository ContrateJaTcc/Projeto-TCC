import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../components/imgs/logo.png'
import { useRole } from '../context/useRole'
import type { Role } from '../context/role-context-def'
import { api, ErroApi, salvarSessao } from '../services/api'
import { pedirTokenGoogle } from '../services/google'

import CampoSenha from '../components/camposenha/camposenha'
import { caminhoInicial } from '../utils/preferencias'
import { comecarDemo } from '../services/demo'
import { t, useIdioma } from '../utils/idioma'
import ConfirmarEmail, { type PedidoConfirmacao } from '../components/cadastro/confirmaremail'
import styles from '../components/login/login.module.css'

interface RespostaLogin {
  token: string
  tipo?: Role
}

/* Supremo ou verificação em 2 etapas: a senha foi aceita, mas falta o código que chegou por e-mail */
interface PedidoCodigo {
  codigoNecessario: true
  desafio: string
  email: string
}

interface RespostaGoogle extends Partial<RespostaLogin> {
  cadastroNecessario?: boolean
  google?: { email: string; nome: string; sobrenome: string }
}

export default function Login() {
  const navigate = useNavigate()
  const { setRole } = useRole()
  useIdioma()

  /* Confirmação */
  const location = useLocation()
  /* destino: para onde voltar depois de entrar (ex.: a busca feita na home) */
  const vindoDe = location.state as { cadastrado?: boolean; senhaRedefinida?: boolean; email?: string; destino?: string } | null
  const aviso = vindoDe?.cadastrado
    ? 'Conta criada com sucesso! Entre com seu e-mail e senha.'
    : vindoDe?.senhaRedefinida
      ? 'Senha redefinida! Entre com a nova senha.'
      : ''

  const [email, setEmail] = useState(vindoDe?.email ?? '')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  /* Manter conectado: a sessão dura 30 dias em vez de 1 hora */
  const [lembrar, setLembrar] = useState(false)
  const [pedido, setPedido] = useState<PedidoCodigo | null>(null)
  const [codigo, setCodigo] = useState('')
  /* E-mail ainda não confirmado: o servidor mandou um código */
  const [confirmacao, setConfirmacao] = useState<PedidoConfirmacao | null>(null)

  /* Entrar */
  const entrar = (dados: RespostaLogin) => {
    const tipoReal = salvarSessao(dados.token, dados.tipo)

    if (!tipoReal) {
      setErro('Não foi possível identificar o tipo da sua conta. Tente novamente.')
      return
    }

    setRole(tipoReal)
    /* Só volta para o destino se ele for da área da própria conta */
    const destino = vindoDe?.destino
    /* Sem destino: a página inicial escolhida nas Configurações */
    navigate(destino?.startsWith(`/${tipoReal}`) ? destino : caminhoInicial(tipoReal))
  }

  /* Modo demonstração: entra com dados de exemplo, sem servidor (só freelancer ou contratante: admin não se escolhe) */
  /* (A página de login já é um pacote à parte: importar a demonstração aqui não pesa o resto do site) */
  const entrarNaDemo = (papel: Role) => entrar({ token: comecarDemo(papel), tipo: papel })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setErro('')
    setCarregando(true)

    try {
      /* Segundo passo do supremo: confere o código */
      if (pedido) {
        entrar(await api<RespostaLogin>('/auth/codigo', { metodo: 'POST', corpo: { desafio: pedido.desafio, codigo }, publico: true }))
        return
      }

      const dados = await api<RespostaLogin | PedidoCodigo | PedidoConfirmacao>('/auth/login', {
        metodo: 'POST',
        corpo: { email: email.trim(), senha, lembrar },
        publico: true,
      })

      if ('confirmarEmail' in dados) {
        setConfirmacao(dados)
        return
      }

      if ('codigoNecessario' in dados) {
        setPedido(dados)
        setCodigo('')
        return
      }

      entrar(dados)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }

  const handleGoogle = async () => {
    setErro('')
    setCarregando(true)

    try {
      const accessToken = await pedirTokenGoogle()

      const dados = await api<RespostaGoogle>('/auth/google', {
        metodo: 'POST',
        corpo: { accessToken, lembrar },
        publico: true,
      })

      if (dados.token) {
        entrar({ token: dados.token, tipo: dados.tipo })
        return
      }

      /* Google sem cadastro */
      if (dados.cadastroNecessario && dados.google) {
        navigate('/cadastro', {
  state: { google: { token: accessToken, ...dados.google } },
})
      }
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : 'Não foi possível conectar ao servidor.'
      )
    } finally {
      setCarregando(false)
    }
  }

  if (confirmacao) {
    return (
      <div className={styles.pagina}>
        <div className={styles.cartao}>
          <ConfirmarEmail pedido={confirmacao} aoConfirmar={(d) => entrar({ token: d.token, tipo: d.tipo })} aoVoltar={() => setConfirmacao(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pagina}>
      <form className={styles.cartao} onSubmit={handleSubmit}>
        <Link to="/" className={styles.logo}>
          <img src={logo} alt="ContrateJá" />
        </Link>

        <h1>
          {t('Bem-vindo de volta ao')} <span>ContrateJá</span>
        </h1>

        <button
          type="button"
          className={styles.btnSocial}
          onClick={handleGoogle}
          disabled={carregando}
        >
          {t('Continuar com Google')}
        </button>

        <div className={styles.divisor}>
          <span>{t('ou entre com e-mail')}</span>
        </div>

        {pedido ? (
          /* Segundo passo do supremo: o código que chegou por e-mail */
          <div className={styles.formulario}>
            <p className={styles.textoCodigo}>
              Enviamos um código de 6 números para <strong>{pedido.email}</strong>. Ele vale por 10 minutos.
            </p>
            <label>
              Código
              <input
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                className={styles.campoCodigo}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <button type="button" className={styles.linkEsqueci} onClick={() => setPedido(null)}>
              Voltar e entrar de novo
            </button>
          </div>
        ) : (
        <div className={styles.formulario}>
          <label>
            {t('E-mail')}
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            {t('Senha')}
            <CampoSenha
              required
              placeholder={t('Sua senha')}
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>

          <div className={styles.linhaOpcoes}>
            <label className={styles.lembrar}>
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
              {t('Manter conectado')}
            </label>
            <Link to="/esqueci-senha" state={{ email }} className={styles.linkEsqueci}>
              {t('Esqueci minha senha')}
            </Link>
          </div>
        </div>
        )}

        {aviso && !erro && (
          <p className="msg-ok">
            {aviso}
          </p>
        )}

        {erro && (
          <p className="msg-erro">
            {erro}
          </p>
        )}

        <button
          type="submit"
          className={styles.btnPrimario}
          disabled={carregando}
        >
          {carregando ? t('Entrando...') : pedido ? 'Confirmar código' : t('Entrar')}
        </button>

        <p className={styles.linkCadastro}>
          {t('Ainda não tem conta?')} <Link to="/cadastro">{t('Cadastre-se')}</Link>
        </p>

        <div className={styles.divisor}>
          <span>{t('ou experimente sem conta')}</span>
        </div>

        <div className={styles.demo}>
          <p>{t('Modo demonstração: o site inteiro com dados de exemplo, sem precisar de internet nem de servidor.')}</p>
          <div className={styles.demoBotoes}>
            <button type="button" onClick={() => entrarNaDemo('freelancer')}>{t('Freelancer')}</button>
            <button type="button" onClick={() => entrarNaDemo('contratante')}>{t('Contratante')}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
