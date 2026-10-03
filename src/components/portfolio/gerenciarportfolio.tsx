import { useCallback, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import QuadroPortfolio from './quadroportfolio'
import type { ItemPortfolio } from './quadroportfolio'
import { api, ErroApi } from '../../services/api'
import { useToast } from '../../context/useToast'
import Carregando from '../carregando/carregando'
import styles from './gerenciarportfolio.module.css'

const CAMPOS_VAZIOS = { port_titulo: '', port_desc: '', port_link: '', port_img: '' }

/*
 * Bloco autossuficiente: carrega, cria, edita e remove os trabalhos do
 * freelancer logado. Fica separado da pagina de perfil para que nenhuma das
 * duas partes precise conhecer o estado da outra.
 */
export default function GerenciarPortfolio() {
  const toast = useToast()
  const [itens, setItens] = useState<ItemPortfolio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [formAberto, setFormAberto] = useState(false)
  /* Com um item em edicao, o mesmo formulario faz PUT em vez de POST. */
  const [editando, setEditando] = useState<ItemPortfolio | null>(null)
  const [campos, setCampos] = useState(CAMPOS_VAZIOS)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    try {
      const dados = await api<{ itens: ItemPortfolio[] }>('/portfolio/meu')
      setItens(dados.itens)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(carregar, 0)
    return () => clearTimeout(t)
  }, [carregar])

  function abrirNovo() {
    setEditando(null)
    setCampos(CAMPOS_VAZIOS)
    setFormAberto(true)
    setErro('')
  }

  function abrirEdicao(item: ItemPortfolio) {
    setEditando(item)
    setCampos({
      port_titulo: item.port_titulo,
      port_desc: item.port_desc,
      port_link: item.port_link ?? '',
      port_img: item.port_img ?? '',
    })
    setFormAberto(true)
    setErro('')
  }

  function fechar() {
    setFormAberto(false)
    setEditando(null)
    setCampos(CAMPOS_VAZIOS)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSalvando(true)

    try {
      await api(editando ? `/portfolio/${editando.port_id}` : '/portfolio', {
        metodo: editando ? 'PUT' : 'POST',
        corpo: campos,
      })

      toast.mostrar(editando ? 'Trabalho atualizado!' : 'Trabalho adicionado ao portfólio!')
      fechar()
      await carregar()
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível salvar o trabalho.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(item: ItemPortfolio) {
    setErro('')
    setExcluindo(item.port_id)

    try {
      await api(`/portfolio/${item.port_id}`, { metodo: 'DELETE' })
      toast.mostrar(`"${item.port_titulo}" removido do portfólio.`, 'info')
      await carregar()
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível remover o trabalho.')
    } finally {
      setExcluindo(null)
    }
  }

  const alterar = (campo: keyof typeof CAMPOS_VAZIOS, valor: string) =>
    setCampos((atuais) => ({ ...atuais, [campo]: valor }))

  return (
    <section className={styles.secao}>
      <div className={styles.topo}>
        <div>
          <h2>Portfólio</h2>
          <p className={styles.subtitulo}>
            Os trabalhos adicionados aqui aparecem para o contratante quando ele
            avalia a sua candidatura.
          </p>
        </div>

        <button type="button" className={styles.novo} onClick={abrirNovo}>
          <Plus size={16} strokeWidth={2.4} />
          Adicionar trabalho
        </button>
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      {formAberto && (
        <form className={styles.form} onSubmit={salvar}>
          <div className={styles.formTopo}>
            <strong>{editando ? 'Editar trabalho' : 'Novo trabalho'}</strong>
            <button type="button" onClick={fechar} aria-label="Fechar">
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          <label>
            Título
            <input
              type="text"
              value={campos.port_titulo}
              onChange={(e) => alterar('port_titulo', e.target.value)}
              maxLength={150}
              placeholder="Ex.: Identidade visual para cafeteria"
              required
            />
          </label>

          <label>
            Descrição
            <textarea
              value={campos.port_desc}
              onChange={(e) => alterar('port_desc', e.target.value)}
              rows={4}
              placeholder="O que você fez, quais ferramentas usou e qual foi o resultado."
              required
            />
          </label>

          <div className={styles.linha}>
            <label>
              Link do trabalho <span>(opcional)</span>
              <input
                type="url"
                value={campos.port_link}
                onChange={(e) => alterar('port_link', e.target.value)}
                maxLength={255}
                placeholder="https://..."
              />
            </label>

            <label>
              Endereço da imagem <span>(opcional)</span>
              <input
                type="url"
                value={campos.port_img}
                onChange={(e) => alterar('port_img', e.target.value)}
                maxLength={255}
                placeholder="https://..."
              />
            </label>
          </div>

          {/* A imagem do trabalho fica hospedada fora: aqui o banco guarda so
              o endereco. Diferente do avatar, que e enviado como arquivo. */}
          <p className={styles.dica}>
            Hospede a imagem em algum lugar (Imgur, Google Drive com link público,
            Behance) e cole aqui o endereço que termina em .jpg ou .png.
          </p>

          <div className={styles.formAcoes}>
            <button type="button" className={styles.cancelar} onClick={fechar}>
              Cancelar
            </button>
            <button type="submit" className={styles.salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Adicionar'}
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <Carregando variante="cartoes" quantidade={3} />
      ) : itens.length === 0 ? (
        <div className={styles.vazio}>
          <strong>Seu portfólio está vazio</strong>
          <p>
            Adicione os trabalhos que você já fez. Contratantes costumam olhar o
            portfólio antes de escolher entre os candidatos.
          </p>
        </div>
      ) : (
        <QuadroPortfolio
          itens={itens}
          onEditar={abrirEdicao}
          onExcluir={excluir}
          excluindo={excluindo}
        />
      )}
    </section>
  )
}
