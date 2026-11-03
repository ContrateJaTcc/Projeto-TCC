import { somenteDigitos } from './mascaras'

/*
 * Regras do cadastro e do perfil. O servidor confere as mesmas coisas (services/validacao.js):
 * aqui é só para avisar a pessoa antes de enviar, campo por campo.
 */

export const ESTADOS: [sigla: string, nome: string][] = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'],
  ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'],
  ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'],
  ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins'],
]

export const ehEstado = (uf: string) => ESTADOS.some(([sigla]) => sigla === uf)

/* CPF: 11 dígitos, não todos iguais, e os dois dígitos verificadores batendo */
export function cpfValido(valor: string) {
  const d = somenteDigitos(valor)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (ate: number) => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

export function erroCpf(valor: string) {
  const d = somenteDigitos(valor)
  if (!d) return 'Informe o CPF.'
  if (d.length < 11) return 'O CPF tem 11 números.'
  return cpfValido(d) ? '' : 'Este CPF não existe. Confira os números.'
}

/* DDDs em uso no Brasil (Anatel) e o estado de cada um */
const DDDS: Record<string, string> = {
  11: 'SP', 12: 'SP', 13: 'SP', 14: 'SP', 15: 'SP', 16: 'SP', 17: 'SP', 18: 'SP', 19: 'SP',
  21: 'RJ', 22: 'RJ', 24: 'RJ', 27: 'ES', 28: 'ES',
  31: 'MG', 32: 'MG', 33: 'MG', 34: 'MG', 35: 'MG', 37: 'MG', 38: 'MG',
  41: 'PR', 42: 'PR', 43: 'PR', 44: 'PR', 45: 'PR', 46: 'PR', 47: 'SC', 48: 'SC', 49: 'SC',
  51: 'RS', 53: 'RS', 54: 'RS', 55: 'RS',
  61: 'DF', 62: 'GO', 64: 'GO', 63: 'TO', 65: 'MT', 66: 'MT', 67: 'MS', 68: 'AC', 69: 'RO',
  71: 'BA', 73: 'BA', 74: 'BA', 75: 'BA', 77: 'BA', 79: 'SE',
  81: 'PE', 87: 'PE', 82: 'AL', 83: 'PB', 84: 'RN', 85: 'CE', 88: 'CE', 86: 'PI', 89: 'PI',
  91: 'PA', 93: 'PA', 94: 'PA', 92: 'AM', 97: 'AM', 95: 'RR', 96: 'AP', 98: 'MA', 99: 'MA',
}

export interface Telefone {
  erro: string
  /* "Celular de SP", quando o número é válido */
  descricao: string
}

/* Celular: DDD + 9 + 8 números. Fixo: DDD + 8 números começando de 2 a 5 */
export function analisarTelefone(valor: string): Telefone {
  const d = somenteDigitos(valor)
  if (!d) return { erro: 'Informe o telefone com DDD.', descricao: '' }
  if (d.length < 10) return { erro: 'Faltam números: use DDD + número.', descricao: '' }
  const uf = DDDS[d.slice(0, 2)]
  if (!uf) return { erro: `O DDD ${d.slice(0, 2)} não existe.`, descricao: '' }
  const numero = d.slice(2)
  if (/^(\d)\1+$/.test(numero)) return { erro: 'Este número não parece real.', descricao: '' }
  if (d.length === 11) {
    if (numero[0] !== '9') return { erro: 'Celular com 11 números começa com 9 depois do DDD.', descricao: '' }
    return { erro: '', descricao: `Celular de ${uf}` }
  }
  if (!/[2-5]/.test(numero[0])) return { erro: 'Celular precisa do 9 na frente; fixo começa de 2 a 5.', descricao: '' }
  return { erro: '', descricao: `Telefone fixo de ${uf}` }
}

/* Mesma regra de e-mail do servidor: algo@algo.algo, sem espaços */
export const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())

/* Letras (com acento), espaço, hífen e apóstrofo; pelo menos 2 letras */
export function erroNome(nome: string, rotulo: string) {
  const t = nome.trim()
  if (!t) return `Informe o ${rotulo}.`
  if (!/^[\p{L}][\p{L}\s'’-]*$/u.test(t)) return `O ${rotulo} só pode ter letras.`
  if (t.replace(/[^\p{L}]/gu, '').length < 2) return `O ${rotulo} precisa de pelo menos 2 letras.`
  return ''
}

export const IDADE_MINIMA = 18

/* "AAAA-MM-DD" de hoje menos tantos anos (para o max/min do campo de data) */
export function dataHaAnos(anos: number, hoje = new Date()) {
  const d = new Date(hoje.getFullYear() - anos, hoje.getMonth(), hoje.getDate())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function erroNascimento(data: string, hoje = new Date()) {
  if (!data) return 'Informe a data de nascimento.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(new Date(`${data}T12:00:00`).getTime())) return 'Data inválida.'
  if (data > dataHaAnos(0, hoje)) return 'A data não pode ser no futuro.'
  if (data < dataHaAnos(120, hoje)) return 'Confira o ano de nascimento.'
  if (data > dataHaAnos(IDADE_MINIMA, hoje)) return `É preciso ter ${IDADE_MINIMA} anos ou mais para usar o ContrateJá.`
  return ''
}

export const SENHA_MINIMA = 6

/* Senhas que aparecem no topo de todo vazamento: o servidor recusa também */
const SENHAS_COMUNS = ['123456', '1234567', '12345678', '123456789', '1234567890', '654321', '111111', '000000', '123123', 'abc123', 'senha', 'senha1', 'senha123', 'password', 'qwerty', 'qwerty123', 'abcdef', 'iloveyou', 'contrateja']

export function erroSenha(senha: string) {
  if (!senha) return 'Crie uma senha.'
  if (senha.length < SENHA_MINIMA) return `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`
  if (SENHAS_COMUNS.includes(senha.toLowerCase()) || /^(.)\1+$/.test(senha)) return 'Essa senha é muito fácil de adivinhar. Escolha outra.'
  return ''
}

/* 0 a 4, para a barrinha de força */
export function forcaSenha(senha: string) {
  if (erroSenha(senha)) return 0
  const pontos =
    1 +
    Number(senha.length >= 10) +
    Number(/[a-z]/.test(senha) && /[A-Z]/.test(senha)) +
    Number(/\d/.test(senha) && /\D/.test(senha)) +
    Number(/[^\p{L}\d]/u.test(senha))
  return Math.min(4, pontos)
}

export const ROTULO_FORCA = ['Fraca demais', 'Fraca', 'Razoável', 'Boa', 'Forte']
