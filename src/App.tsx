import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { RoleProvider } from './context/RoleContext'
import { ToastProvider } from './components/toast/ToastProvider'
import ScrollToTop from './components/layout/scrolltotop'
import TransicaoPortal from './components/transicao/transicaoportal'
import FundoPixel from './components/fundo/fundopixel'
import PrivateLayout from './components/layout/privatelayout'
import { FaixaAviso } from './components/layout/faixas'
import PublicHome from './pages/PublicHome'
import Carregando from './components/carregando/carregando'
import LimiteErro from './components/layout/limiteerro'

/* Cada página só é baixada quando alguém abre (o pacote inicial fica bem menor) */
const Cadastro = lazy(() => import('./pages/Cadastro'))
const Login = lazy(() => import('./pages/Login'))
const EsqueciSenha = lazy(() => import('./pages/EsqueciSenha'))
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'))
const FreelancerDashboard = lazy(() => import('./pages/freelancer/Dashboard'))
const Perfil = lazy(() => import('./pages/Perfil'))
const ContratanteDashboard = lazy(() => import('./pages/contratante/Dashboard'))
const Candidatos = lazy(() => import('./pages/contratante/Candidatos'))
const Freelancers = lazy(() => import('./pages/contratante/Freelancers'))
const PortfolioFreelancer = lazy(() => import('./pages/contratante/PortfolioFreelancer'))
const CriarProjeto = lazy(() => import('./pages/contratante/CriarProjeto'))
const ProjetoDetalhe = lazy(() => import('./pages/ProjetoDetalhe'))
const Historico = lazy(() => import('./pages/Historico'))
const Avaliacoes = lazy(() => import('./pages/Avaliacoes'))
const Mensagens = lazy(() => import('./pages/Mensagens'))
const Termos = lazy(() => import('./pages/Termos'))
const Sobre = lazy(() => import('./pages/Sobre'))
const PerfilPublico = lazy(() => import('./pages/PerfilPublico'))
const PainelAdmin = lazy(() => import('./pages/admin/Painel'))
const RelatorioAdmin = lazy(() => import('./pages/admin/Relatorio'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const Acordo = lazy(() => import('./pages/Acordo'))
const Carteira = lazy(() => import('./pages/Carteira'))
const Ganhos = lazy(() => import('./pages/Ganhos'))
const Loja = lazy(() => import('./pages/Loja'))
const Certificado = lazy(() => import('./pages/Certificado'))
const Recibo = lazy(() => import('./pages/Recibo'))
const Guildas = lazy(() => import('./pages/Guildas'))
const Testes = lazy(() => import('./pages/Testes'))
const Album = lazy(() => import('./pages/Album'))
const Reino = lazy(() => import('./pages/Reino'))
const MapaProjetos = lazy(() => import('./pages/MapaProjetos'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Retrospectiva = lazy(() => import('./pages/Retrospectiva'))
const Convidar = lazy(() => import('./pages/Convidar'))
const Ajuda = lazy(() => import('./pages/Ajuda'))
const Comparar = lazy(() => import('./pages/contratante/Comparar'))
const Arena = lazy(() => import('./pages/Arena'))
const Habilidades = lazy(() => import('./pages/Habilidades'))
const Orcamentos = lazy(() => import('./pages/Orcamentos'))
const Curriculo = lazy(() => import('./pages/Curriculo'))
const ModoTv = lazy(() => import('./pages/ModoTv'))


function App() {
  return (
    <RoleProvider>
      <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <FundoPixel />
        <TransicaoPortal />
        <FaixaAviso />
        <LimiteErro>
        <Suspense fallback={<Carregando variante="detalhe" />}>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/ajuda" element={<Ajuda />} />
          <Route path="/tv" element={<ModoTv />} />
          <Route path="/p/:slug" element={<PerfilPublico />} />
          <Route path="/certificado/:id" element={<Certificado />} />

          <Route element={<PrivateLayout />}>
            <Route path="/freelancer" element={<FreelancerDashboard />} />
            <Route path="/freelancer/projetos/:id" element={<ProjetoDetalhe />} />
            <Route path="/freelancer/entregues" element={<Historico apenasEntregues />} />
            <Route path="/freelancer/historico" element={<Historico />} />
            <Route path="/freelancer/avaliacoes" element={<Avaliacoes />} />
            <Route path="/freelancer/mensagens" element={<Mensagens />} />
            <Route path="/freelancer/perfil" element={<Perfil papel="freelancer" />} />
            <Route path="/freelancer/configuracoes" element={<Configuracoes />} />
            <Route path="/freelancer/acordo/:id" element={<Acordo />} />
            <Route path="/freelancer/carteira" element={<Carteira />} />
            <Route path="/freelancer/ganhos" element={<Ganhos />} />
            <Route path="/freelancer/loja" element={<Loja />} />
            <Route path="/freelancer/recibo/:id" element={<Recibo />} />
            <Route path="/freelancer/guildas" element={<Guildas />} />
            <Route path="/freelancer/testes" element={<Testes />} />
            <Route path="/freelancer/insignias" element={<Album />} />
            <Route path="/freelancer/reino" element={<Reino />} />
            <Route path="/freelancer/mapa" element={<MapaProjetos />} />
            <Route path="/freelancer/agenda" element={<Agenda />} />
            <Route path="/freelancer/retrospectiva" element={<Retrospectiva />} />
            <Route path="/freelancer/convidar" element={<Convidar />} />
            <Route path="/freelancer/arena" element={<Arena />} />
            <Route path="/freelancer/habilidades" element={<Habilidades />} />
            <Route path="/freelancer/orcamentos" element={<Orcamentos />} />
            <Route path="/freelancer/curriculo" element={<Curriculo />} />

            <Route path="/contratante" element={<ContratanteDashboard />} />
            <Route path="/contratante/candidatos" element={<Candidatos />} />
            <Route path="/contratante/freelancers" element={<Freelancers />} />
            <Route path="/contratante/freelancer/:usuId" element={<PortfolioFreelancer />} />
            <Route path="/contratante/projetos/:id" element={<ProjetoDetalhe />} />
            <Route path="/contratante/historico" element={<Historico />} />
            <Route path="/contratante/avaliacoes" element={<Avaliacoes />} />
            <Route path="/contratante/mensagens" element={<Mensagens />} />
            <Route path="/contratante/criar-projeto" element={<CriarProjeto />} />
            <Route path="/contratante/perfil" element={<Perfil papel="contratante" />} />
            <Route path="/contratante/configuracoes" element={<Configuracoes />} />
            <Route path="/contratante/acordo/:id" element={<Acordo />} />
            <Route path="/contratante/carteira" element={<Carteira />} />
            <Route path="/contratante/recibo/:id" element={<Recibo />} />
            <Route path="/contratante/agenda" element={<Agenda />} />
            <Route path="/contratante/retrospectiva" element={<Retrospectiva />} />
            <Route path="/contratante/convidar" element={<Convidar />} />
            <Route path="/contratante/comparar" element={<Comparar />} />
            <Route path="/contratante/arena" element={<Arena />} />
            <Route path="/contratante/orcamentos" element={<Orcamentos />} />

            <Route path="/administrador" element={<PainelAdmin />} />
            <Route path="/administrador/configuracoes" element={<Configuracoes />} />
            <Route path="/administrador/relatorio" element={<RelatorioAdmin />} />
          </Route>

          <Route path="/restrita" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </LimiteErro>
      </BrowserRouter>
      </ToastProvider>
    </RoleProvider>
  )
}

export default App
