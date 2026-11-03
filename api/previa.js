/*
 * Prévia do link (Open Graph) para o perfil público e o certificado.
 * O site é uma SPA: o WhatsApp, o LinkedIn e outros robôs de prévia não rodam JavaScript,
 * então só veriam o título genérico. O vercel.json manda só esses robôs para cá; aqui a função
 * busca os dados no servidor e devolve um HTML pequeno com título e descrição da pessoa ou do projeto.
 * Gente de verdade continua indo direto para o site.
 */

const API = (process.env.VITE_API_URL || 'https://backendtcc-zeta.vercel.app').replace(/\/+$/, '')

const escapar = (t) =>
    String(t ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

const curto = (t, max) => {
    const limpo = String(t ?? '').replace(/\s+/g, ' ').trim()
    return limpo.length > max ? `${limpo.slice(0, max - 1).trimEnd()}…` : limpo
}

export function montarHtml({ site, caminho, titulo, descricao }) {
    const url = `${site}${caminho}`
    const imagem = `${site}/og-imagem.png`
    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapar(titulo)}</title>
<meta name="description" content="${escapar(descricao)}" />
<meta property="og:type" content="profile" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:site_name" content="ContrateJá" />
<meta property="og:title" content="${escapar(titulo)}" />
<meta property="og:description" content="${escapar(descricao)}" />
<meta property="og:url" content="${escapar(url)}" />
<meta property="og:image" content="${escapar(imagem)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapar(titulo)}" />
<meta name="twitter:description" content="${escapar(descricao)}" />
<meta name="twitter:image" content="${escapar(imagem)}" />
<link rel="canonical" href="${escapar(url)}" />
</head>
<body>
<h1>${escapar(titulo)}</h1>
<p>${escapar(descricao)}</p>
<p><a href="${escapar(url)}">Abrir no ContrateJá</a></p>
</body>
</html>`
}

async function buscar(caminho) {
    const resposta = await fetch(`${API}${caminho}`, { headers: { 'User-Agent': 'ContrateJaPrevia/1.0 (bot)', Accept: 'application/json' } })
    if (!resposta.ok) return null
    return resposta.json()
}

/* Monta título e descrição de cada tipo de página (null = usa a prévia padrão do site) */
export async function dadosDaPrevia(tipo, id) {
    if (tipo === 'perfil') {
        const d = await buscar(`/publico/freelancer/${id}`)
        if (!d?.perfil) return null
        const r = d.resumo ?? {}
        const nota = r.totalAvaliacoes > 0 ? ` · nota ${Number(r.media).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} (${r.totalAvaliacoes})` : ''
        const areas = d.areas?.length ? `${d.areas.slice(0, 3).join(', ')}. ` : ''
        return {
            titulo: `${d.perfil.usu_nome} · Freelancer nível ${r.nivel ?? 1} no ContrateJá`,
            descricao: curto(`${areas}${r.concluidos ?? 0} projetos concluídos${nota}. ${d.perfil.usu_desc ?? 'Veja o portfólio e as avaliações.'}`, 200)
        }
    }
    if (tipo === 'certificado') {
        const d = await buscar(`/publico/certificado/${id}`)
        const c = d?.certificado
        if (!c) return null
        const nota = c.nota ? ` com nota ${c.nota} de 5` : ''
        return {
            titulo: `Certificado: ${c.titulo}`,
            descricao: curto(`${c.freelancer} concluiu "${c.titulo}" (${c.categoria}) para ${c.cliente}${nota}. Código de verificação ${c.codigo}.`, 200)
        }
    }
    return null
}

export default async function handler(req, res) {
    const tipo = String(req.query.tipo ?? '')
    /* /p/12-ana-freelancer: o número na frente é o que vale */
    const id = Number.parseInt(String(req.query.id ?? ''), 10)
    const site = `https://${req.headers['x-forwarded-host'] ?? req.headers.host}`
    const caminho = tipo === 'certificado' ? `/certificado/${id}` : `/p/${req.query.id ?? ''}`

    let dados = null
    if (Number.isInteger(id) && id > 0) {
        try {
            dados = await dadosDaPrevia(tipo, id)
        } catch {
            dados = null
        }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    /* A prévia pode ficar guardada 10 minutos na borda da Vercel */
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600')
    res.status(200).send(
        montarHtml({
            site,
            caminho,
            titulo: dados?.titulo ?? 'ContrateJá: freelancers e contratantes numa jornada de conquistas',
            descricao: dados?.descricao ?? 'Publique projetos, candidate-se e suba de nível. Projetos de verdade, XP, insígnias e ranking.'
        })
    )
}
