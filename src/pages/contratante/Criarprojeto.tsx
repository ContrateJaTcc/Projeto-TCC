import styles from './CriarProjeto.module.css'

function CriarProjeto() {
  return (
    <main className={styles.pagina}>
      <div className={styles.cabecalho}>
        <span className={styles.etapa}>1 de 2</span>

        <h1>Crie seu projeto</h1>

        <p>
          Encontre o profissional ideal para realizar seu trabalho.
        </p>
      </div>

      <form className={styles.formulario}>
        <section className={styles.secao}>
          <h2>Informações do projeto</h2>

          <label>
            Título do projeto
            <input type="text" placeholder="Ex: Criar site para minha empresa" />
          </label>

          <label>
            Descrição
            <textarea
              placeholder="Descreva o que você precisa..."
              rows={6}
            />
          </label>

          <label>
            Categoria
            <select defaultValue="">
              <option value="" disabled>
                Selecione uma categoria
              </option>
              <option value="design">Design</option>
              <option value="programacao">Programação</option>
              <option value="marketing">Marketing</option>
              <option value="redacao">Redação</option>
            </select>
          </label>
        </section>

        <section className={styles.secao}>
          <h2>Orçamento e prazo</h2>

          <div className={styles.linha}>
            <label>
              Tipo de orçamento
              <select defaultValue="fixo">
                <option value="fixo">Valor fixo</option>
                <option value="hora">Por hora</option>
              </select>
            </label>

            <label>
              Valor
              <input type="number" min="0" placeholder="R$ 0,00" />
            </label>
          </div>

          <label>
            Prazo em dias
            <input type="number" min="1" placeholder="Ex: 15" />
          </label>
        </section>

        <section className={styles.secao}>
          <h2>Local do trabalho</h2>

          <label>
            Modalidade
            <select defaultValue="remoto">
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
              <option value="presencial">Presencial</option>
            </select>
          </label>
        </section>

        <section className={styles.secao}>
          <h2>Profissionais e pagamento</h2>

          <label>
            Quantidade de profissionais
            <input type="number" min="1" defaultValue="1" />
          </label>

          <label>
            Forma de pagamento
            <input
              type="text"
              placeholder="Ex: Pix, transferência..."
            />
          </label>

          <label>
            Habilidades necessárias
            <textarea
              placeholder="Ex: React, JavaScript, CSS..."
              rows={3}
            />
          </label>
        </section>

        <div className={styles.acoes}>
          <button type="button">Cancelar</button>
          <button type="button">Salvar rascunho</button>
          <button type="submit">Continuar</button>
        </div>
      </form>
    </main>
  )
}

export default CriarProjeto