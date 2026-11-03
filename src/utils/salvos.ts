import { useCallback, useEffect, useState } from 'react'
import { api, ErroApi } from '../services/api'

/* Projetos salvos do freelancer: a mesma lista vale para a lista de projetos e para o detalhe */
const EVENTO = 'salvos-mudaram'

export function useSalvos(ativo: boolean, avisarErro?: (mensagem: string) => void) {
  /* null = servidor sem a migração ou ainda carregando: o botão de salvar não aparece */
  const [ids, setIds] = useState<Set<string> | null>(null)

  useEffect(() => {
    if (!ativo) return
    let vivo = true
    const carregar = () =>
      api<{ ids: number[] }>('/servicos/salvos', { silencioso: true })
        .then((d) => vivo && setIds(new Set(d.ids.map(String))))
        .catch(() => vivo && setIds(null))
    carregar()
    window.addEventListener(EVENTO, carregar)
    return () => {
      vivo = false
      window.removeEventListener(EVENTO, carregar)
    }
  }, [ativo])

  const alternar = useCallback(
    async (id: string | number) => {
      if (!ids) return
      const chave = String(id)
      const salvo = ids.has(chave)
      /* Muda na hora; se o servidor recusar, volta como estava */
      setIds((atual) => {
        const novo = new Set(atual)
        if (salvo) novo.delete(chave)
        else novo.add(chave)
        return novo
      })
      try {
        await api(`/servicos/${chave}/salvar`, { metodo: salvo ? 'DELETE' : 'POST', silencioso: true })
        window.dispatchEvent(new Event(EVENTO))
      } catch (e) {
        setIds((atual) => {
          const volta = new Set(atual)
          if (salvo) volta.add(chave)
          else volta.delete(chave)
          return volta
        })
        avisarErro?.(e instanceof ErroApi ? e.message : 'Não foi possível salvar o projeto.')
      }
    },
    [ids, avisarErro]
  )

  return { ids, alternar }
}

/* "Inscrições até 30/10 · faltam 3 dias" (null quando não há prazo) */
export function prazoCandidaturas(ate: string | null | undefined) {
  if (!ate) return null
  const [ano, mes, dia] = ate.slice(0, 10).split('-').map(Number)
  const fim = new Date(ano, mes - 1, dia)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dias = Math.round((fim.getTime() - hoje.getTime()) / 86_400_000)
  const data = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
  if (dias < 0) return { texto: 'Inscrições encerradas', urgente: true, encerrado: true }
  if (dias === 0) return { texto: 'Inscrições encerram hoje', urgente: true, encerrado: false }
  return { texto: `Inscrições até ${data} · ${dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`}`, urgente: dias <= 2, encerrado: false }
}
