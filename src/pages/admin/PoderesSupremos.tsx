import { useState } from 'react'
import { Moon, Sun, Users, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, Sparkles, Megaphone, Send } from 'lucide-react'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import { atualizarCenarioGlobal, useCenarioGlobal } from '../../utils/cenarioglobal'
import type { CenarioGlobal } from '../../utils/preferencias'
import styles from './Painel.module.css'

const TEMAS: { valor: CenarioGlobal['tema']; rotulo: string; icone: typeof Sun }[] = [
  { valor: null, rotulo: 'Cada um', icone: Users },
  { valor: 'escuro', rotulo: 'Noite', icone: Moon },
  { valor: 'claro', rotulo: 'Pôr do sol', icone: Sun },
]

const CLIMAS: { valor: CenarioGlobal['clima']; rotulo: string; icone: typeof Sun }[] = [
  { valor: null, rotulo: 'Cada um', icone: Users },
  { valor: 'limpo', rotulo: 'Limpo', icone: Cloud },
  { valor: 'chuva', rotulo: 'Chuva', icone: CloudRain },
  { valor: 'tempestade', rotulo: 'Tempestade', icone: CloudLightning },
  { valor: 'neve', rotulo: 'Neve', icone: Snowflake },
  { valor: 'neblina', rotulo: 'Neblina', icone: CloudFog },
]

const PUBLICOS = [
  { valor: 'todos', rotulo: 'Todo mundo' },
  { valor: 'freelancer', rotulo: 'Só freelancers' },
  { valor: 'contratante', rotulo: 'Só contratantes' },
  { valor: 'administrador', rotulo: 'Só administradores' },
]

/* Aba do supremo: cenário do site inteiro e avisos para todos */
export default function PoderesSupremos() {
  const toast = useToast()
  const cenario = useCenarioGlobal()
  const [faixa, setFaixa] = useState(cenario.aviso ?? '')
  const [aviso, setAviso] = useState({ titulo: '', descricao: '', para: 'todos' })
  const [salvando, setSalvando] = useState(false)

  async function salvarCenario(mudanca: Partial<Record<keyof CenarioGlobal, unknown>>) {
    setSalvando(true)
    try {
      const dados = await api<{ mensagem: string }>('/admin/cenario', { metodo: 'PUT', corpo: mudanca })
      await atualizarCenarioGlobal()
      toast.mostrar(dados.mensagem, 'sucesso')
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível salvar o cenário.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  async function enviarAviso(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const dados = await api<{ mensagem: string }>('/admin/avisos', { metodo: 'POST', corpo: aviso })
      setAviso({ titulo: '', descricao: '', para: aviso.para })
      toast.mostrar(dados.mensagem, 'sucesso')
    } catch (err) {
      toast.mostrar(err instanceof ErroApi ? err.message : 'Não foi possível enviar o aviso.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const grupo = <T,>(rotulo: string, opcoes: { valor: T; rotulo: string; icone: typeof Sun }[], atual: T, campo: keyof CenarioGlobal) => (
    <div className={styles.campoSupremo}>
      <strong>{rotulo}</strong>
      <div className={styles.opcoesSupremo} role="group" aria-label={rotulo}>
        {opcoes.map(({ valor, rotulo: r, icone: Icone }) => (
          <button
            key={r}
            type="button"
            aria-pressed={atual === valor}
            className={atual === valor ? styles.opcaoAtiva : ''}
            disabled={salvando}
            onClick={() => salvarCenario({ [campo]: valor })}
          >
            <Icone size={15} strokeWidth={2.4} /> {r}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className={`${styles.supremoGrade} cascata`}>
      <section className={styles.cartaoSupremo}>
        <h2>Cenário do site inteiro</h2>
        <p>O que você escolher aqui vale para todo mundo, por cima das preferências de cada um. "Cada um" devolve a escolha às pessoas.</p>
        {grupo('Tema', TEMAS, cenario.tema, 'tema')}
        {grupo('Clima', CLIMAS, cenario.clima, 'clima')}
        <button type="button" className={styles.botaoSupremo} disabled={salvando} onClick={() => salvarCenario({ fogos: true })}>
          <Sparkles size={16} strokeWidth={2.4} /> Soltar fogos para todos
        </button>
      </section>

      <section className={styles.cartaoSupremo}>
        <h2>Faixa de aviso</h2>
        <p>Aparece no topo de todas as páginas, para todo mundo, até você tirar. Cada pessoa pode fechar a dela.</p>
        <form
          className={styles.formSupremo}
          onSubmit={(e) => {
            e.preventDefault()
            salvarCenario({ aviso: faixa.trim() || null })
          }}
        >
          <input value={faixa} maxLength={200} placeholder="Ex.: Manutenção hoje às 22h" onChange={(e) => setFaixa(e.target.value)} aria-label="Texto da faixa" />
          <div className={styles.acoes}>
            <button type="submit" className={styles.botaoSupremo} disabled={salvando}>
              <Megaphone size={16} strokeWidth={2.4} /> Publicar faixa
            </button>
            {cenario.aviso && (
              <button
                type="button"
                className={styles.acao}
                disabled={salvando}
                onClick={() => {
                  setFaixa('')
                  salvarCenario({ aviso: null })
                }}
              >
                Tirar faixa
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={styles.cartaoSupremo}>
        <h2>Notificação para todos</h2>
        <p>Chega no sino de notificações de cada conta ativa.</p>
        <form className={styles.formSupremo} onSubmit={enviarAviso}>
          <input required maxLength={150} placeholder="Título" value={aviso.titulo} onChange={(e) => setAviso((a) => ({ ...a, titulo: e.target.value }))} aria-label="Título" />
          <textarea required maxLength={1000} rows={3} placeholder="Mensagem" value={aviso.descricao} onChange={(e) => setAviso((a) => ({ ...a, descricao: e.target.value }))} aria-label="Mensagem" />
          <select value={aviso.para} onChange={(e) => setAviso((a) => ({ ...a, para: e.target.value }))} aria-label="Para quem">
            {PUBLICOS.map((p) => (
              <option key={p.valor} value={p.valor}>{p.rotulo}</option>
            ))}
          </select>
          <button type="submit" className={styles.botaoSupremo} disabled={salvando}>
            <Send size={16} strokeWidth={2.4} /> Enviar notificação
          </button>
        </form>
      </section>
    </div>
  )
}
