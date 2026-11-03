/* Busca rápida (components/busca/paletacomandos.tsx): o botão do cabeçalho e o menu do celular abrem por este evento */
export const EVENTO_PALETA = 'abrir-paleta'
export const abrirPaleta = () => window.dispatchEvent(new Event(EVENTO_PALETA))
