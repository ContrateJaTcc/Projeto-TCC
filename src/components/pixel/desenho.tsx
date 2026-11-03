/*
 * Desenho em texto: cada letra é uma cor e "." é vazio. Vira um caminho SVG por cor,
 * com cada letra ocupando um pixel inteiro (usado nas surpresas do cenário e nas ilustrações)
 */
export default function Desenho({ linhas, cores, x = 0, y = 0, className }: { linhas: string[]; cores: Record<string, string>; x?: number; y?: number; className?: string }) {
  const porCor: Record<string, string> = {}
  linhas.forEach((linha, j) => {
    ;[...linha].forEach((letra, i) => {
      if (letra === '.' || !cores[letra]) return
      porCor[letra] = (porCor[letra] ?? '') + `M${x + i} ${y + j}h1v1h-1z`
    })
  })
  return (
    <g className={className}>
      {Object.entries(porCor).map(([letra, d]) => (
        <path key={letra} d={d} fill={cores[letra]} />
      ))}
    </g>
  )
}
