import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import styles from './cadastro.module.css'
import type { Perfil } from './etapaperfil'
import { api, ErroApi, salvarSessao } from '../../services/api'
import { pedirTokenGoogle, type DadosGoogle } from '../../services/google'
import { useRole } from '../../context/useRole'
import CampoSenha from '../camposenha/camposenha'
import type { PedidoConfirmacao } from './confirmaremail'
import { mascararCpf, mascararTelefone } from '../../utils/mascaras'
import { nomeOficial, useNomesCidades } from '../../utils/cidades'
import {
  ESTADOS,
  ROTULO_FORCA,
  analisarTelefone,
  dataHaAnos,
  emailValido,
  erroCpf,
  erroNascimento,
  erroNome,
  erroSenha,
  forcaSenha,
  IDADE_MINIMA,
} from '../../utils/validacao'

interface EtapaFormularioProps {
  perfil: Perfil
  onTrocarPerfil: (perfil: Perfil) => void
  /* Código do "Convide um amigo" (vem do link) */
  convite?: string
  /* Cadastro Google */
  google: DadosGoogle | null
  onGoogle: (dados: DadosGoogle | null) => void
  onVoltar: () => void
  onCriarConta: (email: string) => void
  /* O servidor pediu para confirmar o e-mail com o código que mandou */
  onConfirmarEmail?: (pedido: PedidoConfirmacao) => void
}

interface RespostaSessao extends Partial<PedidoConfirmacao> {
  token?: string
  tipo?: Perfil
  cadastroNecessario?: boolean
  google?: { email: string; nome: string; sobrenome: string }
}

/* Ordem dos campos na tela (o primeiro com problema recebe o foco ao enviar) */
const CAMPOS = ['nome', 'sobrenome', 'email', 'senha', 'confirmar', 'cpf', 'telefone', 'nascimento', 'estado', 'cidade', 'termos'] as const
type Campo = (typeof CAMPOS)[number]

export default function EtapaFormulario({
  perfil,
  onTrocarPerfil,
  convite = '',
  google,
  onGoogle,
  onVoltar,
  onCriarConta,
  onConfirmarEmail,
}: EtapaFormularioProps) {
  const navigate = useNavigate()
  const { setRole } = useRole()

  const [nome, setNome] = useState(google?.nome ?? '')
  const [sobrenome, setSobrenome] = useState(google?.sobrenome ?? '')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [codigoConvite, setCodigoConvite] = useState(convite)

  /* Só mostra o erro de um campo depois que a pessoa sai dele (ou tenta enviar) */
  const [tocados, setTocados] = useState<Set<Campo>>(new Set())
  const [tentouEnviar, setTentouEnviar] = useState(false)

  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const nomesCidades = useNomesCidades(estado)
  const telefoneInfo = analisarTelefone(telefone)
  const forca = forcaSenha(senha)

  const problemas: Record<Campo, string> = {
    nome: erroNome(nome, 'nome'),
    sobrenome: erroNome(sobrenome, 'sobrenome'),
    email: google ? '' : !email.trim() ? 'Informe o e-mail.' : emailValido(email) ? '' : 'Confira o e-mail (exemplo: nome@gmail.com).',
    senha: google ? '' : erroSenha(senha),
    confirmar: google ? '' : !confirmar ? 'Repita a senha.' : confirmar !== senha ? 'As senhas não são iguais.' : '',
    cpf: erroCpf(cpf),
    telefone: telefoneInfo.erro,
    nascimento: erroNascimento(dataNasc),
    estado: estado ? '' : 'Escolha o estado.',
    cidade: !estado
      ? 'Escolha o estado primeiro.'
      : !cidade.trim()
        ? 'Informe a cidade.'
        : nomesCidades && !nomeOficial(nomesCidades, cidade)
          ? `Não achamos "${cidade.trim()}" em ${estado}. Escolha uma cidade da lista.`
          : '',
    termos: aceitouTermos ? '' : 'É preciso aceitar os Termos para criar a conta.',
  }

  const mostrar = (c: Campo) => (tocados.has(c) || tentouEnviar ? problemas[c] : '')
  const tocar = (c: Campo) => setTocados((t) => (t.has(c) ? t : new Set(t).add(c)))

  /* id, aviso de erro e saída do campo, iguais em todos */
  const ligar = (c: Campo) => ({
    id: `cad-${c}`,
    'aria-invalid': Boolean(mostrar(c)) || undefined,
    'aria-describedby': `cad-${c}-msg`,
    onBlur: () => tocar(c),
  })

  /* Embaixo de cada campo: o erro, a confirmação (ok) ou uma dica */
  const aviso = (campo: Campo, ok?: string | false | null, dica?: string) => {
    const texto = mostrar(campo)
    return (
      <small id={`cad-${campo}-msg`} className={texto ? styles.msgErro : ok ? styles.msgOk : undefined} aria-live="polite">
        {texto || (ok ? <><Check size={13} strokeWidth={3} aria-hidden="true" /> {ok}</> : dica)}
      </small>
    )
  }

  /* Login */
  const entrar = (token: string, tipo?: Perfil) => {
    const tipoReal = salvarSessao(token, tipo)

    if (!tipoReal) return false

    setRole(tipoReal)
    navigate(`/${tipoReal}`)
    return true
  }

  const handleGoogle = async () => {
    setErro('')
    setCarregando(true)

    try {
      const accessToken = await pedirTokenGoogle()

      const dados = await api<RespostaSessao>('/auth/google', {
        metodo: 'POST',
        corpo: { accessToken },
        publico: true,
      })

      /* Conta Google existente */
      if (dados.token) {
        if (!entrar(dados.token, dados.tipo)) {
          setErro('Não foi possível identificar o tipo da sua conta. Tente novamente.')
        }
        return
      }

      if (dados.cadastroNecessario && dados.google) {
        onGoogle({ token: accessToken, ...dados.google })
        if (dados.google.nome) setNome(dados.google.nome)
        if (dados.google.sobrenome) setSobrenome(dados.google.sobrenome)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }

  /* Ao sair do campo, "sao jose dos campos" vira "São José dos Campos" */
  const acertarCidade = () => {
    tocar('cidade')
    const oficial = nomesCidades && nomeOficial(nomesCidades, cidade)
    if (oficial) setCidade(oficial)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setErro('')
    setTentouEnviar(true)

    const primeiro = CAMPOS.find((c) => problemas[c])
    if (primeiro) {
      setErro('Confira os campos marcados em vermelho.')
      document.getElementById(`cad-${primeiro}`)?.focus()
      return
    }

    setCarregando(true)

    try {
      const dados = await api<RespostaSessao>('/auth/register', {
        metodo: 'POST',
        publico: true,
        corpo: {
          nome: `${nome.trim()} ${sobrenome.trim()}`,
          ...(google ? { googleToken: google.token } : { email: email.trim().toLowerCase(), senha }),
          cpf,
          telefone,
          data_nasc: dataNasc,
          cidade: (nomesCidades && nomeOficial(nomesCidades, cidade)) || cidade.trim(),
          estado,
          tipo: perfil,
          aceitouTermos,
          ...(codigoConvite.trim() ? { convite: codigoConvite.trim().toUpperCase() } : {}),
        },
      })

      /* Sessão Google */
      if (dados?.token && entrar(dados.token, dados.tipo)) return

      /* Falta confirmar o e-mail */
      if (dados?.confirmarEmail && dados.desafio && onConfirmarEmail) {
        onConfirmarEmail({ confirmarEmail: true, email: dados.email ?? email, desafio: dados.desafio })
        return
      }

      onCriarConta(google?.email ?? email.trim().toLowerCase())
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form className={styles.formulario} onSubmit={handleSubmit} noValidate>
      <button
        type="button"
        className={styles.btnVoltar}
        onClick={onVoltar}
      >
        <ArrowLeft size={15} strokeWidth={2.4} />
        Voltar
      </button>

      <h2>Crie sua conta</h2>

      {google ? (
        <p className={styles.avisoGoogle}>
          Conectado com o Google como <strong>{google.email}</strong>. Complete os dados abaixo
          para criar sua conta.{' '}
          <button type="button" onClick={() => onGoogle(null)}>
            Usar outro e-mail
          </button>
        </p>
      ) : (
        <>
          <div className={styles.botoesSociais}>
            <button
              type="button"
              className={styles.btnSocial}
              onClick={handleGoogle}
              disabled={carregando}
            >
              Continuar com Google
            </button>
          </div>

          <div className={styles.divisor}>
            <span>ou crie manualmente</span>
          </div>
        </>
      )}

      <label>
        Você vai usar o ContrateJá como
        <select id="cad-perfil" value={perfil} onChange={(e) => onTrocarPerfil(e.target.value as Perfil)}>
          <option value="freelancer">Freelancer: quero trabalhar em projetos</option>
          <option value="contratante">Contratante: quero contratar pessoas</option>
        </select>
      </label>

      <div className={styles.linhaForm}>
        <div className={styles.campo}>
          <label htmlFor="cad-nome">Primeiro nome</label>
          <input
            {...ligar('nome')}
            type="text"
            autoComplete="given-name"
            maxLength={60}
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          {aviso('nome')}
        </div>

        <div className={styles.campo}>
          <label htmlFor="cad-sobrenome">Sobrenome</label>
          <input
            {...ligar('sobrenome')}
            type="text"
            autoComplete="family-name"
            maxLength={89}
            placeholder="Seu sobrenome"
            value={sobrenome}
            onChange={(e) => setSobrenome(e.target.value)}
          />
          {aviso('sobrenome')}
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="cad-email">E-mail</label>
        <input
          {...ligar('email')}
          type="email"
          autoComplete="email"
          maxLength={150}
          placeholder="seu@email.com"
          value={google ? google.email : email}
          readOnly={Boolean(google)}
          onChange={(e) => setEmail(e.target.value)}
        />
        {aviso('email')}
      </div>

      {!google && (
        <>
          <div className={styles.campo}>
            <label htmlFor="cad-senha">Senha</label>
            <CampoSenha
              {...ligar('senha')}
              autoComplete="new-password"
              maxLength={72}
              placeholder="Crie uma senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            {senha && (
              <span className={styles.forca} data-nivel={forca}>
                <span className={styles.forcaBarra} aria-hidden="true"><span /></span>
                Força da senha: {ROTULO_FORCA[forca]}
              </span>
            )}
            {aviso('senha', '', 'Pelo menos 6 caracteres. Misture letras, números e símbolos para ficar forte.')}
          </div>

          <div className={styles.campo}>
            <label htmlFor="cad-confirmar">Confirmar senha</label>
            <CampoSenha
              {...ligar('confirmar')}
              autoComplete="new-password"
              maxLength={72}
              placeholder="Repita a senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
            {aviso('confirmar', confirmar && !problemas.confirmar && !problemas.senha ? 'As senhas conferem' : '')}
          </div>
        </>
      )}

      <div className={styles.linhaForm}>
        <div className={styles.campo}>
          <label htmlFor="cad-cpf">CPF</label>
          <input
            {...ligar('cpf')}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(mascararCpf(e.target.value))}
          />
          {aviso('cpf', !problemas.cpf ? 'CPF válido' : '', 'Não aparece no seu perfil.')}
        </div>

        <div className={styles.campo}>
          <label htmlFor="cad-telefone">Telefone</label>
          <input
            {...ligar('telefone')}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={15}
            placeholder="(00) 00000-0000"
            value={telefone}
            onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          />
          {aviso('telefone', telefoneInfo.descricao, 'Com DDD. Não aparece no seu perfil.')}
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="cad-nascimento">Data de nascimento</label>
        <input
          {...ligar('nascimento')}
          type="date"
          autoComplete="bday"
          min={dataHaAnos(120)}
          max={dataHaAnos(IDADE_MINIMA)}
          value={dataNasc}
          onChange={(e) => setDataNasc(e.target.value)}
        />
        {aviso('nascimento', '', `É preciso ter ${IDADE_MINIMA} anos ou mais.`)}
      </div>

      <div className={styles.linhaForm}>
        <div className={`${styles.campo} ${styles.campoUf}`}>
          <label htmlFor="cad-estado">Estado</label>
          <select
            {...ligar('estado')}
            autoComplete="address-level1"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value)
              tocar('estado')
            }}
          >
            <option value="">Escolha</option>
            {ESTADOS.map(([sigla, nomeUf]) => (
              <option key={sigla} value={sigla}>{sigla} - {nomeUf}</option>
            ))}
          </select>
          {aviso('estado')}
        </div>

        <div className={styles.campo}>
          <label htmlFor="cad-cidade">Cidade</label>
          <input
            {...ligar('cidade')}
            onBlur={acertarCidade}
            type="text"
            autoComplete="address-level2"
            list={estado ? 'cad-lista-cidades' : undefined}
            disabled={!estado}
            maxLength={100}
            placeholder={estado ? 'Comece a digitar' : 'Escolha o estado antes'}
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
          {nomesCidades && (
            <datalist id="cad-lista-cidades">
              {nomesCidades.map((n) => <option key={n} value={n} />)}
            </datalist>
          )}
          {aviso(
            'cidade',
            cidade && nomesCidades && !problemas.cidade ? `${nomeOficial(nomesCidades, cidade)}/${estado}` : '',
            estado ? 'Escolha uma das cidades sugeridas.' : ''
          )}
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="cad-convite">Código de convite (opcional)</label>
        <input
          id="cad-convite"
          type="text"
          autoComplete="off"
          maxLength={12}
          placeholder="Ex.: ANA-7K2Q"
          value={codigoConvite}
          onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
        />
        <small>Alguém te convidou? Com o código, vocês dois ganham XP no seu primeiro projeto.</small>
      </div>

      <label className={styles.termos}>
        <input
          {...ligar('termos')}
          type="checkbox"
          checked={aceitouTermos}
          onChange={(e) => {
            setAceitouTermos(e.target.checked)
            tocar('termos')
          }}
        />
        <span>
          Li e aceito os{' '}
          <Link to="/termos" target="_blank" rel="noopener">
            Termos de Uso e a Política de Privacidade
          </Link>
          .
        </span>
      </label>
      {aviso('termos')}

      {erro && (
        <p className="msg-erro" role="alert">
          {erro}
        </p>
      )}

      <button
        type="submit"
        className={styles.btnPrimario}
        disabled={carregando}
      >
        {carregando ? 'Criando conta...' : `Criar conta de ${perfil}`}
      </button>

      <p className={styles.linkLogin}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
  )
}
