/* Tour de boas-vindas: visto uma vez por papel; "Rever o tour" nas Configurações abre de novo */
export const EVENTO_TOUR = 'abrir-tour'

export const chaveTour = (papel: string) => `tour-visto:${papel}`

export const abrirTour = () => window.dispatchEvent(new Event(EVENTO_TOUR))
