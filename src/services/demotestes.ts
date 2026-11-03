/*
 * Banco dos testes de habilidade para o modo demonstração (o mesmo de Backendtcc/src/services/testes.js).
 * No site de verdade o gabarito fica só no servidor.
 */

export const ACERTOS_PARA_PASSAR = 4
export const ESPERA_REFAZER = 24 * 60 * 60_000
export const XP_TESTE = 30

type Pergunta = { enunciado: string; opcoes: string[]; certa: number }

export const BANCO: Record<string, Pergunta[]> = {
  web: [
    { enunciado: 'Qual tag do HTML cria um link clicável?', opcoes: ['<link>', '<a>', '<href>', '<url>'], certa: 1 },
    { enunciado: 'Em CSS, qual propriedade muda o espaço de dentro do elemento, entre o conteúdo e a borda?', opcoes: ['margin', 'gap', 'padding', 'border-spacing'], certa: 2 },
    { enunciado: 'Para que serve o atributo alt de uma imagem?', opcoes: ['Deixar a imagem mais leve', 'Descrever a imagem para leitores de tela e quando ela não carrega', 'Mudar o tamanho da imagem', 'Abrir a imagem em outra aba'], certa: 1 },
    { enunciado: 'Qual unidade do CSS é relativa ao tamanho da fonte da página (do elemento html)?', opcoes: ['rem', 'px', 'vh', 'cm'], certa: 0 },
    { enunciado: 'O que mais ajuda um site a se adaptar à tela do celular?', opcoes: ['Tabelas para montar o layout', 'Imagens em BMP', 'Iframes', 'Media queries e layout flexível'], certa: 3 },
  ],
  design: [
    { enunciado: 'Qual formato de imagem é vetorial e não perde qualidade ao aumentar?', opcoes: ['JPG', 'PNG', 'SVG', 'GIF'], certa: 2 },
    { enunciado: 'Cores complementares são as que ficam...', opcoes: ['Opostas no círculo cromático', 'Lado a lado no círculo cromático', 'Na mesma cor, só mais clara', 'Entre os tons de cinza'], certa: 0 },
    { enunciado: 'O que é kerning?', opcoes: ['O espaço entre as linhas', 'O espaço entre pares de letras', 'O tamanho da fonte', 'A grossura da letra'], certa: 1 },
    { enunciado: 'Qual é o padrão de cores usado na impressão gráfica?', opcoes: ['RGB', 'HEX', 'HSL', 'CMYK'], certa: 3 },
    { enunciado: 'Para que serve a hierarquia visual?', opcoes: ['Deixar tudo do mesmo tamanho', 'Usar o maior número de cores', 'Guiar o olhar para o que é mais importante primeiro', 'Esconder informações'], certa: 2 },
  ],
  marketing: [
    { enunciado: 'O que é um CTA?', opcoes: ['Uma chamada para ação, como "Compre agora"', 'O custo total de um anúncio', 'Um canal de tráfego automático', 'Um texto alternativo de imagem'], certa: 0 },
    { enunciado: 'Taxa de conversão é...', opcoes: ['O número de seguidores', 'O custo de cada clique', 'A porcentagem de visitantes que fazem a ação desejada', 'Quantas pessoas viram o post'], certa: 2 },
    { enunciado: 'SEO é o trabalho de...', opcoes: ['Fazer anúncios pagos', 'Aparecer melhor nos resultados de busca sem pagar', 'Mandar e-mails em massa', 'Criar o logo da marca'], certa: 1 },
    { enunciado: 'Público-alvo é...', opcoes: ['Todo mundo que usa a internet', 'Os funcionários da empresa', 'Os concorrentes', 'O grupo de pessoas que a marca quer alcançar'], certa: 3 },
    { enunciado: 'Um teste A/B compara...', opcoes: ['Duas versões de algo para ver qual funciona melhor', 'Dois concorrentes', 'Um anúncio e um post', 'Dois públicos sem mudar nada'], certa: 0 },
  ],
  redacao: [
    { enunciado: 'Qual frase está certa?', opcoes: ['Fazem dois anos que moro aqui.', 'Faz dois anos que moro aqui.', 'Fazem dois ano que moro aqui.', 'Faz dois ano que moro aqui.'], certa: 1 },
    { enunciado: 'Complete: "Amanhã eu vou ___ praia."', opcoes: ['a', 'há', 'à', 'ah'], certa: 2 },
    { enunciado: 'Complete: "Eu queria ir, ___ choveu."', opcoes: ['mas', 'mais', 'más', 'mau'], certa: 0 },
    { enunciado: 'O que faz parte de uma revisão de texto?', opcoes: ['Só trocar a fonte', 'Diagramar a página', 'Traduzir para outra língua', 'Corrigir ortografia, gramática e deixar o texto mais claro'], certa: 3 },
    { enunciado: 'Complete: "___ muitas pessoas na fila."', opcoes: ['Haviam', 'Havia', 'Houveram', 'Tinham havido'], certa: 1 },
  ],
  programacao: [
    { enunciado: 'Para que serve uma variável?', opcoes: ['Guardar um valor para usar depois', 'Desenhar a tela', 'Ligar o computador', 'Apagar arquivos'], certa: 0 },
    { enunciado: 'Um laço (loop) serve para...', opcoes: ['Guardar senhas', 'Criar o banco de dados', 'Repetir instruções', 'Mudar a cor da tela'], certa: 2 },
    { enunciado: 'Na lógica, "A E B" só é verdadeiro quando...', opcoes: ['Pelo menos uma das duas é verdadeira', 'As duas são verdadeiras', 'Nenhuma é verdadeira', 'Sempre'], certa: 1 },
    { enunciado: 'Para que serve o Git?', opcoes: ['Hospedar sites', 'Editar imagens', 'Testar a internet', 'Guardar as versões do código e trabalhar em equipe'], certa: 3 },
    { enunciado: 'O que é um bug?', opcoes: ['Um erro no programa', 'Um tipo de arquivo', 'Um computador lento', 'Uma linguagem de programação'], certa: 0 },
  ],
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/* Qual área do banco vale para uma categoria (null = ainda sem teste) */
export function areaDaCategoria(tipoNome: string) {
  const n = semAcento(tipoNome)
  if (n.includes('web') || n.includes('site')) return 'web'
  if (n.includes('design')) return 'design'
  if (n.includes('marketing')) return 'marketing'
  if (n.includes('reda') || n.includes('tradu') || n.includes('revis')) return 'redacao'
  if (n.includes('program') || n.includes('software') || n.includes('aplicativo')) return 'programacao'
  return null
}
