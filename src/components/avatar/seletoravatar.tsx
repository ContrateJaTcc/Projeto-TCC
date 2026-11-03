import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import Avatar from './avatar'
import styles from './seletoravatar.module.css'

interface SeletorAvatarProps {
  nome: string
  foto: string | null
  onMudar: (foto: string | null) => void
}

/* Tamanho do avatar */
const LADO = 256

/* Limite do arquivo */
const LIMITE_ARQUIVO = 10 * 1024 * 1024

/* Recorte e redução */
function reduzir(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()

    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))

    leitor.onload = () => {
      const img = new Image()

      img.onerror = () =>
        reject(new Error('Formato de imagem não suportado pelo navegador. Use JPG, PNG ou WEBP.'))

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = LADO
        canvas.height = LADO

        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'))
          return
        }

        /* Fundo branco */
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, LADO, LADO)

        const lado = Math.min(img.width, img.height)
        const x = (img.width - lado) / 2
        const y = (img.height - lado) / 2

        ctx.drawImage(img, x, y, lado, lado, 0, 0, LADO, LADO)

        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }

      img.src = leitor.result as string
    }

    leitor.readAsDataURL(arquivo)
  })
}

export default function SeletorAvatar({ nome, foto, onMudar }: SeletorAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    setErro('')

    if (!arquivo.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem.')
      return
    }

    if (arquivo.size > LIMITE_ARQUIVO) {
      setErro('A imagem é muito grande. Escolha uma de até 10 MB.')
      return
    }

    setProcessando(true)

    try {
      onMudar(await reduzir(arquivo))
    } catch (problema) {
      setErro(problema instanceof Error ? problema.message : 'Não foi possível usar esta imagem.')
    } finally {
      setProcessando(false)
      /* Limpa input */
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={styles.seletor}>
      <Avatar nome={nome} size={96} foto={foto} />

      <div className={styles.controles}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={escolher}
          className={styles.input}
          id="avatar-arquivo"
        />

        <label htmlFor="avatar-arquivo" className={styles.escolher}>
          <Camera size={15} strokeWidth={2.2} />
          {processando ? 'Processando...' : foto ? 'Trocar foto' : 'Escolher foto'}
        </label>

        {foto && (
          <button type="button" className={styles.remover} onClick={() => onMudar(null)}>
            <Trash2 size={14} strokeWidth={2.2} />
            Remover
          </button>
        )}

        <p className={styles.dica}>
          A imagem é recortada em quadrado e reduzida para {LADO}x{LADO} aqui no
          navegador antes de ser enviada.
        </p>

        {erro && <p className={styles.erro}>{erro}</p>}
      </div>
    </div>
  )
}
