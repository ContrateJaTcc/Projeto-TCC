import { useState } from 'react'
import { Wand2, Shuffle, X } from 'lucide-react'
import { CORES_CABELO, FUNDOS, PADRAO_AVATAR, PELES, ROUPAS, avatarComoPng, pixelsDoAvatar, type OpcoesAvatar } from '../../utils/avatarpixel'
import styles from './perfil.module.css'

const CABELOS: [OpcoesAvatar['cabelo'], string][] = [['curto', 'Curto'], ['longo', 'Longo'], ['coque', 'Coque'], ['moicano', 'Moicano'], ['careca', 'Sem cabelo']]
const ACESSORIOS: [OpcoesAvatar['acessorio'], string][] = [['nenhum', 'Nenhum'], ['oculos', 'Óculos'], ['bone', 'Boné'], ['chapeu', 'Chapéu de bruxa']]

const sortear = <T,>(lista: readonly T[]) => lista[Math.floor(Math.random() * lista.length)]

/* Desenho do avatar em SVG (a prévia; o PNG sai do mesmo desenho) */
function Previa({ opcoes, lado }: { opcoes: OpcoesAvatar; lado: number }) {
  return (
    <svg width={lado} height={lado} viewBox="0 0 16 16" shapeRendering="crispEdges" role="img" aria-label="Prévia do avatar">
      {pixelsDoAvatar(opcoes).map(([x, y, cor], i) => <rect key={i} x={x} y={y} width="1" height="1" fill={cor} />)}
    </svg>
  )
}

function Cores({ rotulo, cores, valor, aoMudar }: { rotulo: string; cores: string[]; valor: string; aoMudar: (c: string) => void }) {
  return (
    <fieldset className={styles.editorGrupo}>
      <legend>{rotulo}</legend>
      <div className={styles.cores}>
        {cores.map((c, i) => (
          <button
            key={c}
            type="button"
            className={`${styles.cor} ${valor === c ? styles.corAtiva : ''}`}
            style={{ background: c }}
            onClick={() => aoMudar(c)}
            aria-label={`${rotulo} ${i + 1}`}
            aria-pressed={valor === c}
          />
        ))}
      </div>
    </fieldset>
  )
}

/* Editor de avatar em pixel: para quem não quer usar foto, monta um bonequinho no estilo do castelo */
export default function EditorAvatar({ aoUsar, aoFechar }: { aoUsar: (foto: string) => void; aoFechar: () => void }) {
  const [o, setO] = useState<OpcoesAvatar>(PADRAO_AVATAR)
  const mudar = (m: Partial<OpcoesAvatar>) => setO((atual) => ({ ...atual, ...m }))

  function aleatorio() {
    setO({ pele: sortear(PELES), cabelo: sortear(CABELOS)[0], corCabelo: sortear(CORES_CABELO), roupa: sortear(ROUPAS), fundo: sortear(FUNDOS), acessorio: sortear(ACESSORIOS)[0] })
  }

  return (
    <div className={styles.editor} role="group" aria-label="Montar avatar em pixel">
      <div className={styles.editorTopo}>
        <strong><Wand2 size={16} strokeWidth={2.2} /> Monte seu avatar</strong>
        <button type="button" onClick={aoFechar} aria-label="Fechar o editor de avatar"><X size={16} strokeWidth={2.4} /></button>
      </div>
      <div className={styles.editorCorpo}>
        <div className={styles.editorPrevia}>
          <Previa opcoes={o} lado={128} />
          <button type="button" className={styles.botaoPequeno} onClick={aleatorio}>
            <Shuffle size={14} strokeWidth={2.4} /> Sortear
          </button>
        </div>
        <div className={styles.editorOpcoes}>
          <Cores rotulo="Pele" cores={PELES} valor={o.pele} aoMudar={(pele) => mudar({ pele })} />
          <fieldset className={styles.editorGrupo}>
            <legend>Cabelo</legend>
            <div className={styles.chips}>
              {CABELOS.map(([v, r]) => (
                <button key={v} type="button" aria-pressed={o.cabelo === v} className={o.cabelo === v ? styles.chipAtivo : ''} onClick={() => mudar({ cabelo: v })}>{r}</button>
              ))}
            </div>
          </fieldset>
          {o.cabelo !== 'careca' && <Cores rotulo="Cor do cabelo" cores={CORES_CABELO} valor={o.corCabelo} aoMudar={(corCabelo) => mudar({ corCabelo })} />}
          <Cores rotulo="Roupa" cores={ROUPAS} valor={o.roupa} aoMudar={(roupa) => mudar({ roupa })} />
          <Cores rotulo="Fundo" cores={FUNDOS} valor={o.fundo} aoMudar={(fundo) => mudar({ fundo })} />
          <fieldset className={styles.editorGrupo}>
            <legend>Acessório</legend>
            <div className={styles.chips}>
              {ACESSORIOS.map(([v, r]) => (
                <button key={v} type="button" aria-pressed={o.acessorio === v} className={o.acessorio === v ? styles.chipAtivo : ''} onClick={() => mudar({ acessorio: v })}>{r}</button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
      <button type="button" className={styles.usarAvatar} onClick={() => aoUsar(avatarComoPng(o))}>
        Usar este avatar
      </button>
    </div>
  )
}
