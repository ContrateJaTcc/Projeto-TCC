import styles from './fundopixel.module.css'

/*
 * Fogos sobre o castelo, no mesmo sistema de coordenadas do desenho (480 x 300).
 * Cada fogo sobe como uma faísca e estoura em dois anéis de pixels com rastro, que caem um pouco e somem.
 */
const ESTOUROS = [
  { x: 192, y: 50, raio: 26, atraso: 0 },
  { x: 300, y: 36, raio: 30, atraso: 0.5 },
  { x: 244, y: 22, raio: 22, atraso: 1.1 },
  { x: 150, y: 70, raio: 20, atraso: 1.6 },
  { x: 346, y: 70, raio: 24, atraso: 2.1 },
]
const CORES = ['#fbf5ef', '#f2d3ab', '#c69fa5', '#f2d3ab', '#fbf5ef']
/* Pixels por anel */
const PARTICULAS = 16
const SUBIDA = 46

/* Deslocamento final de um pixel do estouro */
const ponta = (ang: number, r: number, parte = 1) => ({
  '--dx': `${Math.round(Math.cos(ang) * r * parte)}px`,
  '--dy': `${Math.round(Math.sin(ang) * r * parte)}px`,
})

export default function Fogos() {
  return (
    <svg className={styles.fogos} viewBox="0 0 480 300" shapeRendering="crispEdges" aria-hidden>
      {ESTOUROS.map((e, i) => (
        <g key={i} fill={CORES[i]}>
          <rect
            className={styles.faisca}
            x={e.x}
            y={e.y + SUBIDA}
            width={1}
            height={3}
            style={{ '--sobe': `${-SUBIDA}px`, animationDelay: `${e.atraso}s` } as React.CSSProperties}
          />
          {[1, 0.55].flatMap((anel) =>
            Array.from({ length: PARTICULAS }, (_, k) => {
              const ang = ((k + anel) / PARTICULAS) * Math.PI * 2 + i
              const r = e.raio * anel
              const atraso = { animationDelay: `${e.atraso}s` }
              return [
                /* Rastro: um pixel mais apagado, um pouco atrás da ponta */
                <rect key={`r${anel}-${k}`} className={`${styles.particula} ${styles.rastro}`} x={e.x} y={e.y} width={1} height={1} style={{ ...ponta(ang, r, 0.78), ...atraso } as React.CSSProperties} />,
                <rect key={`p${anel}-${k}`} className={styles.particula} x={e.x} y={e.y} width={anel === 1 ? 2 : 1} height={anel === 1 ? 2 : 1} style={{ ...ponta(ang, r), ...atraso } as React.CSSProperties} />,
              ]
            })
          )}
        </g>
      ))}
    </svg>
  )
}
