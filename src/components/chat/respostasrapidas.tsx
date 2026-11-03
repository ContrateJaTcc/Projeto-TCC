import { useState } from 'react'
import { Zap, Pencil, Plus, X, Check } from 'lucide-react'
import styles from './chat.module.css'

const PADRAO: Record<'freelancer' | 'contratante', string[]> = {
  freelancer: ['Posso começar amanhã.', 'Pode me mandar mais detalhes?', 'Já estou trabalhando nisso!', 'Entreguei, pode conferir?'],
  contratante: ['Pode me mandar um orçamento?', 'Qual o prazo para você?', 'Ficou ótimo, obrigado!', 'Pode ajustar um detalhe?'],
}

const chave = (papel: string) => `respostas-rapidas:${papel}`

function lerRespostas(papel: 'freelancer' | 'contratante') {
  try {
    const salvas = JSON.parse(localStorage.getItem(chave(papel)) ?? 'null')
    if (Array.isArray(salvas) && salvas.every((s) => typeof s === 'string')) return salvas as string[]
  } catch {
    /* Sem armazenamento: usa as de sempre */
  }
  return PADRAO[papel]
}

/* Atalhos de frases prontas em cima do campo do chat (dá para trocar; ficam neste navegador) */
export default function RespostasRapidas({ papel, aoEscolher }: { papel: 'freelancer' | 'contratante'; aoEscolher: (texto: string) => void }) {
  const [respostas, setRespostas] = useState(() => lerRespostas(papel))
  const [editando, setEditando] = useState(false)
  const [nova, setNova] = useState('')

  function guardar(lista: string[]) {
    setRespostas(lista)
    try {
      localStorage.setItem(chave(papel), JSON.stringify(lista))
    } catch {
      /* Sem armazenamento: vale só agora */
    }
  }

  function adicionar(e: React.FormEvent) {
    e.preventDefault()
    const texto = nova.trim()
    if (!texto || respostas.includes(texto) || respostas.length >= 8) return
    guardar([...respostas, texto])
    setNova('')
  }

  return (
    <div className={styles.rapidas}>
      <div className={styles.rapidasLista} role="group" aria-label="Respostas rápidas">
        <Zap size={14} strokeWidth={2.4} className={styles.rapidasIcone} aria-hidden="true" />
        {respostas.map((r) =>
          editando ? (
            <span key={r} className={styles.rapida}>
              {r}
              <button type="button" onClick={() => guardar(respostas.filter((x) => x !== r))} aria-label={`Tirar a resposta "${r}"`}>
                <X size={12} strokeWidth={2.8} />
              </button>
            </span>
          ) : (
            <button key={r} type="button" className={styles.rapida} onClick={() => aoEscolher(r)}>
              {r}
            </button>
          )
        )}
        <button type="button" className={styles.rapidasEditar} onClick={() => setEditando((v) => !v)} aria-pressed={editando} aria-label={editando ? 'Terminar de editar respostas rápidas' : 'Editar respostas rápidas'}>
          {editando ? <Check size={13} strokeWidth={2.8} /> : <Pencil size={13} strokeWidth={2.4} />}
        </button>
      </div>
      {editando && (
        <form className={styles.rapidasForm} onSubmit={adicionar}>
          <input value={nova} maxLength={80} onChange={(e) => setNova(e.target.value)} placeholder="Nova resposta rápida" aria-label="Nova resposta rápida" />
          <button type="submit" disabled={!nova.trim() || respostas.length >= 8}><Plus size={14} strokeWidth={2.6} /> Adicionar</button>
          <button type="button" onClick={() => guardar(PADRAO[papel])}>Voltar às de sempre</button>
        </form>
      )}
    </div>
  )
}
