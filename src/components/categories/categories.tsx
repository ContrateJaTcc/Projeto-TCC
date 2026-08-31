import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, Minus } from 'lucide-react'
import { CategoryIcon } from '../../data/categoryIcons'
import styles from './categories.module.css'

interface CategoriesProps {
  perfil: 'free' | 'cont'
}

interface Categoria {
  label: string
  descricao: string
  pessoa: { nome: string; papel: string }
  stats: string[]
  insignias: string[]
}

// Quantos cards ficam visíveis antes de precisar expandir.
const LIMITE = 6

const categorias: Categoria[] = [
  {
    label: 'Web Design',
    descricao:
      'Projetos de criação de interfaces, landing pages e identidade visual para o ambiente web. Se você domina ferramentas como Figma, Adobe XD ou tem olho afiado para estética digital, esses projetos são para você.',
    pessoa: { nome: 'Julio Mairo de Souza', papel: 'Web Designer' },
    stats: ['1 projeto ativo', '4.8 média de avaliação', 'R$30 - 50 faixa de valor'],
    insignias: ['20 projetos', 'Prazo respeitado', '+1000 notas 5'],
  },
  {
    label: 'Marketing e vendas',
    descricao:
      'Projetos para quem entende de audiência, engajamento e resultado. Gestão de redes, tráfego pago, SEO e email marketing — se você move números, aqui tem contratantes prontos para te contratar.',
    pessoa: { nome: 'Camila Rezende', papel: 'Especialista em Marketing' },
    stats: ['1 projeto ativo', '4.8 média de avaliação', 'R$30 - 50 faixa de valor'],
    insignias: ['35 campanhas', 'Entrega no prazo', '+800 notas 5'],
  },
  {
    label: 'Serviços legais',
    descricao:
      'Projetos para quem entende de contratos, conformidade e proteção do negócio. Pareceres, revisão de documentos e suporte jurídico para autônomos e pequenas empresas que precisam de segurança legal.',
    pessoa: { nome: 'Fernando Alcântara', papel: 'Advogado Consultor' },
    stats: ['1 projeto ativo', '4.8 média de avaliação', 'R$40 - 70 faixa de valor'],
    insignias: ['15 contratos', 'Sigilo garantido', '+400 notas 5'],
  },
  {
    label: 'Administração',
    descricao:
      'Projetos para quem é organizado e gosta de colocar ordem na rotina de outras pessoas. Agenda, documentos, atendimento e processos para escritórios e profissionais autônomos.',
    pessoa: { nome: 'Patrícia Nunes', papel: 'Assistente Administrativa' },
    stats: ['1 projeto ativo', '4.8 média de avaliação', 'R$25 - 45 faixa de valor'],
    insignias: ['40 processos', 'Sempre pontual', '+600 notas 5'],
  },
  {
    label: 'Finanças',
    descricao:
      'Projetos para quem entende de números, fluxo de caixa e planejamento. Organização financeira, relatórios e consultoria para autônomos e pequenas empresas que querem clareza nas contas.',
    pessoa: { nome: 'Rafael Costa', papel: 'Consultor Financeiro' },
    stats: ['1 projeto ativo', '4.8 média de avaliação', 'R$30 - 50 faixa de valor'],
    insignias: ['25 relatórios', 'Prazo respeitado', '+900 notas 5'],
  },
  {
    label: 'Desenvolvimento',
    descricao:
      'Projetos de código para quem constrói na prática. Sites, aplicativos, integrações e automações — se você domina uma stack e entrega funcionando, aqui tem contratante procurando exatamente isso.',
    pessoa: { nome: 'Diego Matheus', papel: 'Desenvolvedor Full Stack' },
    stats: ['1 projeto ativo', '4.9 média de avaliação', 'R$50 - 90 faixa de valor'],
    insignias: ['30 entregas', 'Código documentado', '+700 notas 5'],
  },
  {
    label: 'Redação e conteúdo',
    descricao:
      'Projetos para quem escreve bem e sabe adaptar o tom. Artigos, textos para site, roteiros e conteúdo para redes — se a sua escrita prende a atenção, os projetos estão aqui.',
    pessoa: { nome: 'Beatriz Lemos', papel: 'Redatora de Conteúdo' },
    stats: ['1 projeto ativo', '4.7 média de avaliação', 'R$25 - 45 faixa de valor'],
    insignias: ['120 artigos', 'Sem plágio', '+500 notas 5'],
  },
  {
    label: 'Vídeo e animação',
    descricao:
      'Projetos de edição, motion e animação para quem conta história em movimento. Vídeos para redes, institucionais e vinhetas — traga seu portfólio e mostre seu ritmo de corte.',
    pessoa: { nome: 'Thiago Moraes', papel: 'Editor de Vídeo' },
    stats: ['1 projeto ativo', '4.8 média de avaliação', 'R$45 - 80 faixa de valor'],
    insignias: ['60 vídeos', 'Entrega rápida', '+450 notas 5'],
  },
  {
    label: 'Tradução',
    descricao:
      'Projetos de tradução e revisão para quem transita entre idiomas com naturalidade. Documentos, legendas e material técnico que precisa soar nativo, não traduzido.',
    pessoa: { nome: 'Larissa Prado', papel: 'Tradutora' },
    stats: ['1 projeto ativo', '4.9 média de avaliação', 'R$35 - 60 faixa de valor'],
    insignias: ['80 documentos', 'Revisão dupla', '+300 notas 5'],
  },
  {
    label: 'Fotografia',
    descricao:
      'Projetos para quem tem olhar e sabe tratar imagem. Ensaios, fotos de produto e cobertura de eventos, com edição inclusa — se você entrega imagem pronta para publicar, cadastre-se.',
    pessoa: { nome: 'Marcos Vinícius', papel: 'Fotógrafo' },
    stats: ['1 projeto ativo', '4.7 média de avaliação', 'R$40 - 75 faixa de valor'],
    insignias: ['45 ensaios', 'Edição inclusa', '+350 notas 5'],
  },
]

export default function Categories({ perfil }: CategoriesProps) {
  const [selecionada, setSelecionada] = useState(0)
  const [expandido, setExpandido] = useState(false)
  const titulo = perfil === 'free' ? 'Encontre projetos' : 'Encontre freelancers'
  const categoria = categorias[selecionada]

  // Recolhido mostra sempre LIMITE cards. Quando a selecionada está fora dessa
  // faixa ela ocupa o lugar da última, em vez de ser somada à lista: assim o
  // card ativo continua visível e o botão não é empurrado sozinho para a
  // linha de baixo.
  const indices = categorias.map((_, i) => i)
  const visiveis = expandido
    ? indices
    : selecionada < LIMITE
      ? indices.slice(0, LIMITE)
      : [...indices.slice(0, LIMITE - 1), selecionada]

  return (
    <section className={styles.categorias} id="categorias">
      <h2>{titulo}</h2>

      <div className={styles.grid}>
        {visiveis.map((i) => {
          const c = categorias[i]
          return (
            <button
              key={c.label}
              type="button"
              className={`${styles.card} ${i % 2 === 0 ? styles.verde : styles.roxo} ${i === selecionada ? styles.selecionada : ''}`}
              onClick={() => setSelecionada(i)}
            >
              <span className={styles.icone}><CategoryIcon categoria={c.label} size={18} strokeWidth={2.2} /></span>
              <span className={styles.label}>{c.label}</span>
            </button>
          )
        })}

        {categorias.length > LIMITE && (
          <button
            type="button"
            className={styles.verMais}
            onClick={() => setExpandido(!expandido)}
            aria-expanded={expandido}
          >
            <span className={styles.verMaisIcone}>
              {expandido ? <Minus size={18} strokeWidth={2.4} /> : <Plus size={18} strokeWidth={2.4} />}
            </span>
            <span className={styles.label}>
              {expandido ? 'Ver menos' : `Mais ${categorias.length - LIMITE} categorias`}
            </span>
          </button>
        )}
      </div>

      <article className={styles.detalhe}>
        <div className={styles.cabecalho}>
          <span className={styles.iconeDetalhe}><CategoryIcon categoria={categoria.label} size={24} strokeWidth={2} /></span>
          <div>
            <h3>{categoria.pessoa.nome}</h3>
            <p className={styles.papel}>{categoria.pessoa.papel}</p>
          </div>
        </div>

        <p className={styles.descricao}>{categoria.descricao}</p>

        <div className={styles.stats}>
          {categoria.stats.map((s) => (
            <span key={s} className={styles.stat}>{s}</span>
          ))}
        </div>

        <span className={styles.insigniasLabel}>INSÍGNIAS DO FREELANCER</span>
        <div className={styles.insignias}>
          {categoria.insignias.map((t) => (
            <span key={t} className={styles.insignia}>{t}</span>
          ))}
        </div>

        <Link to="/login" className={styles.botao}>
          Ver todos os freelancers de {categoria.label} <ArrowRight size={16} strokeWidth={2.4} />
        </Link>
      </article>
    </section>
  )
}
