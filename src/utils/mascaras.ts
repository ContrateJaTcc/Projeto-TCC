/*
 * Máscaras aplicadas enquanto o usuário digita.
 *
 * Cada função descarta tudo que não é dígito, limita a quantidade de dígitos
 * e monta o formato de novo. Assim colar "123.456.789-09", "12345678909" ou
 * um texto com espaços dá sempre o mesmo resultado.
 */

export function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, '')
}

/* 000.000.000-00 */
export function mascararCpf(valor: string) {
  return somenteDigitos(valor)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

/*
 * (00) 0000-0000 para fixo (10 dígitos) e (00) 00000-0000 para celular
 * (11 dígitos). O hífen muda de lugar quando o 11º dígito é digitado.
 */
export function mascararTelefone(valor: string) {
  const d = somenteDigitos(valor).slice(0, 11)

  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
