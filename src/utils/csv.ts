/*
 * Planilha (CSV) para abrir no Excel ou no Google Planilhas.
 * Ponto e vírgula separa as colunas (o Excel em português espera assim) e o BOM no começo
 * faz os acentos aparecerem certos.
 */

type Valor = string | number | boolean | null | undefined

const celula = (v: Valor) => {
  if (v === null || v === undefined) return ''
  const texto = typeof v === 'number' ? String(v).replace('.', ',') : String(v)
  /* Aspas em volta quando tem separador, aspas ou quebra de linha */
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function baixarCsv(nome: string, cabecalho: string[], linhas: Valor[][]) {
  const conteudo = [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n')
  const arquivo = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(arquivo)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* "2026-10-24T15:00:00Z" -> "24/10/2026" */
export const dataCsv = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')
