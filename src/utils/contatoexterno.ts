/*
 * Contato por fora no chat (o servidor tem o mesmo em services/contatoExterno.js):
 * antes da contratação, telefone, e-mail ou "me chama no zap" costumam ser o começo de golpe.
 */

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/i
const TELEFONE = /(?:\+?55[\s-]?)?\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/
const APLICATIVOS = /\b(whats\s?app|whats|wpp|zap|telegram|insta(gram)?|discord|signal)\b/i

export function temContatoExterno(texto: string) {
  if (!texto) return false
  return EMAIL.test(texto) || APLICATIVOS.test(texto) || TELEFONE.test(texto.replace(/R\$\s?[\d.,]+/g, ''))
}
