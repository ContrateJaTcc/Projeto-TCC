import { emSilencio, lerPreferencias } from './preferencias'

let contexto: AudioContext | null = null

/* "Plim" de 8 bits quando chega mensagem */
export function tocarPlim() {
  if (!lerPreferencias().som || emSilencio()) return

  try {
    contexto ??= new AudioContext()
    const agora = contexto.currentTime

    for (const [i, freq] of [988, 1319].entries()) {
      const osc = contexto.createOscillator()
      const volume = contexto.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      volume.gain.setValueAtTime(0.05, agora + i * 0.09)
      volume.gain.exponentialRampToValueAtTime(0.0001, agora + i * 0.09 + 0.16)
      osc.connect(volume).connect(contexto.destination)
      osc.start(agora + i * 0.09)
      osc.stop(agora + i * 0.09 + 0.17)
    }
  } catch {
    /* Navegador sem áudio */
  }
}
