import { Component, type ReactNode } from 'react'
import { relatarErro } from '../../utils/monitor'
import styles from './limiteerro.module.css'

interface Estado {
  erro: Error | null
}

/*
 * Se uma página quebrar, aparece esta tela em vez da página em branco (e o erro vai para o monitor).
 * "chave" muda a cada troca de página: assim, sair da página que quebrou volta ao normal.
 */
export default class LimiteErro extends Component<{ children: ReactNode; chave?: string }, Estado> {
  state: Estado = { erro: null }

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro }
  }

  componentDidCatch(erro: Error) {
    relatarErro(erro)
  }

  componentDidUpdate(anterior: { chave?: string }) {
    if (anterior.chave !== this.props.chave && this.state.erro) this.setState({ erro: null })
  }

  render() {
    if (!this.state.erro) return this.props.children
    /* Versão nova do site publicada com a aba aberta: o pedaço da página mudou de nome */
    const versaoNova = /dynamically imported module|Importing a module script failed|Loading chunk/i.test(this.state.erro.message)
    return (
      <div className={styles.caixa} role="alert">
        <h1>{versaoNova ? 'O site foi atualizado' : 'Algo deu errado nesta página'}</h1>
        <p>
          {versaoNova
            ? 'Saiu uma versão nova enquanto esta aba estava aberta. Recarregue para continuar.'
            : 'O erro já foi avisado para a equipe. Tente recarregar; se continuar, volte para o início.'}
        </p>
        <div className={styles.botoes}>
          <button type="button" onClick={() => location.reload()}>Recarregar</button>
          <a href="/">Voltar para o início</a>
        </div>
      </div>
    )
  }
}
