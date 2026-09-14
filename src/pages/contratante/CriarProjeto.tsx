import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './CriarProjeto.module.css'

function CriarProjeto() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projetoId = searchParams.get('id')

  const [etapa, setEtapa] = useState(1)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [tipoValor, setTipoValor] = useState('fixo')
  const [valor, setValor] = useState('')
  const [qtdDias, setQtdDias] = useState('')
  const [local, setLocal] = useState('remoto')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [habilidades, setHabilidades] = useState('')
  const [vagas, setVagas] = useState('1')
  const [formaPagamento, setFormaPagamento] = useState('')

  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState('')

  const categorias: Record<string, number> = {
    'Desenvolvimento Web': 1,
    'Design': 2,
    'Marketing': 3,
    'Redação e Tradução': 4,
    'Programação': 5,
  }

  useEffect(() => {
  if (!projetoId) {
    return
  }

  async function carregarProjeto() {
    try {
      const token = localStorage.getItem('token')

      if (!token) {
        setErro('Você precisa estar logado.')
        return
      }

      const resposta = await fetch(
  `https://backendtcc-zeta.vercel.app/servicos/${projetoId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErro(dados.erro || 'Erro ao carregar projeto.')
        return
      }

      const projeto = dados.projeto

      setTitulo(projeto.serv_titulo || '')
      setDescricao(projeto.serv_desc || '')
      setCategoria(projeto.categoria || '')
      setTipoValor(projeto.serv_tipo_valor || 'fixo')
      setValor(String(projeto.serv_valor || ''))
      setQtdDias(
        projeto.serv_qtd_dias !== null
          ? String(projeto.serv_qtd_dias)
          : ''
      )
      setLocal(projeto.serv_local || 'remoto')
      setCidade(projeto.serv_cidade || '')
      setEstado(projeto.serv_estado || '')
      setHabilidades(projeto.serv_habilidades || '')
      setVagas(String(projeto.serv_vagas || 1))
      setFormaPagamento(projeto.serv_forma_pagamento || '')
    } catch (erro) {
      console.error(erro)
      setErro('Não foi possível carregar o projeto.')
    }
  }

  carregarProjeto()
}, [projetoId])

  function continuar() {
    setErro('')
    setEtapa(2)
  }

  function editarProjeto() {
    setErro('')
    setEtapa(1)
  }

  async function publicarProjeto(statusProjeto: 'aberto' | 'rascunho') {
    setErro('')
    setPublicando(true)

    try {
      const token = localStorage.getItem('token')

      if (!token) {
        setErro('Você precisa estar logado para publicar um projeto.')
        return
      }

      const tipo_id = categorias[categoria]

      if (!tipo_id) {
        setErro('Categoria inválida.')
        return
      }

      const resposta = await fetch(
  projetoId
    ? `https://backendtcc-zeta.vercel.app/servicos/${projetoId}`
    : 'https://backendtcc-zeta.vercel.app/servicos',
  {
    method: projetoId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            titulo,
            descricao,
            tipo_id,
            valor: Number(valor),
            tipo_valor: tipoValor,
            qtd_dias: Number(qtdDias),
            local,
            cidade: cidade || null,
            estado: estado || null,
            habilidades: habilidades || null,
            forma_pagamento: formaPagamento || null,
            vagas: Number(vagas),
            status: statusProjeto,
          }),
        }
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErro(dados.erro || 'Erro ao publicar projeto.')
        return
      }

      console.log('Projeto publicado:', dados.projeto)

      navigate('/contratante')
    } catch (erro) {
      console.error(erro)
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setPublicando(false)
    }
  }

  if (etapa === 2) {
    return (
      <main className={styles.pagina}>
        <div className={styles.cabecalho}>
          <span className={styles.etapa}>2 de 2</span>

          <h1>Revise seu projeto</h1>

          <p>
            Confira as informações antes de publicar seu projeto.
          </p>
        </div>

        <div className={styles.revisao}>
          <section className={styles.secao}>
            <h2>Informações do projeto</h2>

            <div className={styles.informacao}>
              <span>Título</span>
              <strong>{titulo || 'Não informado'}</strong>
            </div>

            <div className={styles.informacao}>
              <span>Descrição</span>
              <p>{descricao || 'Não informado'}</p>
            </div>

            <div className={styles.informacao}>
              <span>Categoria</span>
              <strong>{categoria || 'Não informado'}</strong>
            </div>
          </section>

          <section className={styles.secao}>
            <h2>Orçamento e prazo</h2>

            <div className={styles.informacao}>
              <span>Tipo de orçamento</span>
              <strong>
                {tipoValor === 'fixo' ? 'Valor fixo' : 'Por hora'}
              </strong>
            </div>

            <div className={styles.informacao}>
              <span>Valor</span>
              <strong>
                {valor ? `R$ ${valor}` : 'Não informado'}
              </strong>
            </div>

            <div className={styles.informacao}>
              <span>Prazo</span>
              <strong>
                {qtdDias ? `${qtdDias} dias` : 'Não informado'}
              </strong>
            </div>
          </section>

          <section className={styles.secao}>
            <h2>Local do trabalho</h2>

            <div className={styles.informacao}>
              <span>Modalidade</span>
              <strong>{local}</strong>
            </div>

            {(local === 'hibrido' || local === 'presencial') && (
              <div className={styles.informacao}>
                <span>Localização</span>
                <strong>
                  {cidade && estado
                    ? `${cidade} - ${estado}`
                    : 'Não informado'}
                </strong>
              </div>
            )}
          </section>

          <section className={styles.secao}>
            <h2>Profissionais e pagamento</h2>

            <div className={styles.informacao}>
              <span>Quantidade de profissionais</span>
              <strong>{vagas}</strong>
            </div>

            <div className={styles.informacao}>
              <span>Forma de pagamento</span>
              <strong>
                {formaPagamento || 'Não informado'}
              </strong>
            </div>

            <div className={styles.informacao}>
              <span>Habilidades necessárias</span>
              <p>{habilidades || 'Nenhuma informada'}</p>
            </div>
          </section>

          {erro && (
            <p style={{ color: 'red' }}>
              {erro}
            </p>
          )}

          <div className={styles.acoes}>
            <button
              type="button"
              onClick={editarProjeto}
              disabled={publicando}
            >
              Editar projeto
            </button>

            <button
              type="button"
              onClick={() => publicarProjeto('aberto')}
              disabled={publicando}
            >
              {publicando ? 'Publicando...' : 'Publicar projeto'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.pagina}>
      <div className={styles.cabecalho}>
        <span className={styles.etapa}>1 de 2</span>

        <h1>Crie seu projeto</h1>

        <p>
          Encontre o profissional ideal para realizar seu trabalho.
        </p>
      </div>

      <form
        className={styles.formulario}
        onSubmit={(event) => {
          event.preventDefault()
          continuar()
        }}
      >
        <section className={styles.secao}>
          <h2>Informações do projeto</h2>

          <label>
            Título do projeto
            <input
              type="text"
              placeholder="Ex: Criar site para minha empresa"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
            />
          </label>

          <label>
            Descrição
            <textarea
              placeholder="Descreva o que você precisa..."
              rows={6}
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
          </label>

          <label>
            Categoria
            <select
              value={categoria}
              onChange={(event) => setCategoria(event.target.value)}
            >
              <option value="" disabled>
                Selecione uma categoria
              </option>

              <option value="Desenvolvimento Web">
                Desenvolvimento Web
              </option>

              <option value="Design">
                Design
              </option>

              <option value="Marketing">
                Marketing
              </option>

              <option value="Redação e Tradução">
                Redação e Tradução
              </option>

              <option value="Programação">
                Programação
              </option>
            </select>
          </label>
        </section>

        <section className={styles.secao}>
          <h2>Orçamento e prazo</h2>

          <div className={styles.linha}>
            <label>
              Tipo de orçamento
              <select
                value={tipoValor}
                onChange={(event) =>
                  setTipoValor(event.target.value)
                }
              >
                <option value="fixo">Valor fixo</option>
                <option value="hora">Por hora</option>
              </select>
            </label>

            <label>
              Valor
              <input
                type="number"
                min="0"
                placeholder="0,00"
                value={valor}
                onChange={(event) =>
                  setValor(event.target.value)
                }
              />
            </label>
          </div>

          <label>
            Prazo em dias
            <input
              type="number"
              min="1"
              placeholder="Ex: 15"
              value={qtdDias}
              onChange={(event) =>
                setQtdDias(event.target.value)
              }
            />
          </label>
        </section>

        <section className={styles.secao}>
          <h2>Local do trabalho</h2>

          <label>
            Modalidade
            <select
              value={local}
              onChange={(event) =>
                setLocal(event.target.value)
              }
            >
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
              <option value="presencial">Presencial</option>
            </select>
          </label>

          {(local === 'hibrido' || local === 'presencial') && (
            <div className={styles.linha}>
              <label>
                Cidade
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={cidade}
                  onChange={(event) =>
                    setCidade(event.target.value)
                  }
                />
              </label>

              <label>
                Estado
                <input
                  type="text"
                  maxLength={2}
                  placeholder="Ex: SP"
                  value={estado}
                  onChange={(event) =>
                    setEstado(event.target.value.toUpperCase())
                  }
                />
              </label>
            </div>
          )}
        </section>

        <section className={styles.secao}>
          <h2>Profissionais e pagamento</h2>

          <label>
            Quantidade de profissionais
            <input
              type="number"
              min="1"
              value={vagas}
              onChange={(event) =>
                setVagas(event.target.value)
              }
            />
          </label>

          <label>
            Forma de pagamento
            <input
              type="text"
              placeholder="Ex: Pix, transferência..."
              value={formaPagamento}
              onChange={(event) =>
                setFormaPagamento(event.target.value)
              }
            />
          </label>

          <label>
            Habilidades necessárias
            <textarea
              placeholder="Ex: React, JavaScript, CSS..."
              rows={3}
              value={habilidades}
              onChange={(event) =>
                setHabilidades(event.target.value)
              }
            />
          </label>
        </section>

        <div className={styles.acoes}>
          <button
            type="button"
            onClick={() => navigate('/contratante')}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => publicarProjeto('rascunho')}
          >
            Salvar rascunho
          </button>

          <button type="submit">
            Continuar
          </button>
        </div>
      </form>
    </main>
  )
}

export default CriarProjeto