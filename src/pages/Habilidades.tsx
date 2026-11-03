import { Link } from 'react-router-dom'
import Carregando from '../components/carregando/carregando'
import ArvoreArea from '../components/reino/arvore'
import { useArvore } from '../utils/arvore'
import comum from './comum.module.css'
import styles from './Habilidades.module.css'

/* Árvore de habilidades: uma árvore por área, que acende com projetos, testes e boas notas */
export default function Habilidades() {
  const areas = useArvore()

  if (!areas) return <Carregando variante="cartoes" quantidade={3} />

  const acesos = areas.reduce((s, a) => s + a.acesos, 0)
  const total = areas.reduce((s, a) => s + a.galhos.length, 0)

  return (
    <div className={comum.pagina}>
      <h1 className="placa">Árvore de habilidades</h1>
      <p className={`${comum.subtitulo} placa`}>
        Cada área em que você trabalha tem uma árvore. Os galhos acendem com projetos concluídos, o teste de habilidade e boas notas:
        {total ? ` você já acendeu ${acesos} de ${total}.` : ''} Os contratantes veem as suas árvores no portfólio.
      </p>
      {areas.length === 0 ? (
        <p className={`${comum.painel} ${comum.nota}`}>
          Escolha as suas áreas de atuação no <Link to="/freelancer/perfil">perfil</Link> para a árvore começar a crescer.
        </p>
      ) : (
        <div className={styles.grade}>
          {areas.map((a) => <ArvoreArea key={a.tipo_id} area={a} />)}
        </div>
      )}
    </div>
  )
}
