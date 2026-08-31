import { useState } from 'react'
import { Search, ArrowLeft, X, Send } from 'lucide-react'
import { getConversas } from '../data/mock'
import Avatar from '../components/avatar/avatar'
import styles from './Mensagens.module.css'

export default function Mensagens() {
  const conversas = getConversas()
  const [ativaId, setAtivaId] = useState<string | null>(null)
  const [texto, setTexto] = useState('')

  const ativa = conversas.find((c) => c.id === ativaId) ?? null

  return (
    <div className={styles.pagina}>
      <h1>Mensagens</h1>

      <div className={styles.busca}>
        <Search size={17} strokeWidth={2.2} />
        <input type="text" placeholder="Buscar conversa..." />
      </div>

      <div className={styles.lista}>
        {conversas.map((c) => (
          <button key={c.id} type="button" className={styles.item} onClick={() => setAtivaId(c.id)}>
            <Avatar nome={c.nome} size={52} />
            <div className={styles.textos}>
              <strong>{c.nome}</strong>
              <span>{c.ultimaMensagem}</span>
            </div>
          </button>
        ))}
      </div>

      {ativa && (
        <div className={styles.backdrop} onClick={() => setAtivaId(null)}>
          <div className={styles.chat} onClick={(e) => e.stopPropagation()}>
            <div className={styles.chatHeader}>
              <button type="button" className={styles.chatVoltar} onClick={() => setAtivaId(null)} aria-label="Voltar">
                <ArrowLeft size={17} strokeWidth={2.2} />
              </button>
              <Avatar nome={ativa.nome} size={38} />
              <span className={styles.chatNome}>{ativa.nome}</span>
              <button type="button" className={styles.chatFechar} onClick={() => setAtivaId(null)} aria-label="Fechar">
                <X size={19} strokeWidth={2.2} />
              </button>
            </div>

            <div className={styles.mensagens}>
              {ativa.mensagens.map((m) => (
                <div key={m.id} className={`${styles.bolha} ${m.autor === 'eu' ? styles.enviada : styles.recebida}`}>
                  {m.texto}
                  <span className={styles.hora}>{m.hora}</span>
                </div>
              ))}
            </div>

            <form
              className={styles.inputBar}
              onSubmit={(e) => {
                e.preventDefault()
                setTexto('')
              }}
            >
              <input
                type="text"
                placeholder="Escreva sua mensagem..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <button type="submit" className={styles.enviar} aria-label="Enviar">
                <Send size={16} strokeWidth={2.2} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
