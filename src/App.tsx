import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { RoleProvider } from './context/RoleContext'
import { ToastProvider } from './components/toast/ToastProvider'
import ScrollToTop from './components/layout/scrolltotop'
import PrivateLayout from './components/layout/privatelayout'
import PublicHome from './pages/PublicHome'
import Cadastro from './pages/Cadastro'
import Login from './pages/Login'
import EsqueciSenha from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import FreelancerDashboard from './pages/freelancer/Dashboard'
import Perfil from './pages/Perfil'
import ContratanteDashboard from './pages/contratante/Dashboard'
import Candidatos from './pages/contratante/Candidatos'
import PortfolioFreelancer from './pages/contratante/PortfolioFreelancer'
import CriarProjeto from './pages/contratante/CriarProjeto'
import ProjetoDetalhe from './pages/ProjetoDetalhe'
import Historico from './pages/Historico'
import Mensagens from './pages/Mensagens'


function App() {
  return (
    <RoleProvider>
      <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

          <Route element={<PrivateLayout />}>
            <Route path="/freelancer" element={<FreelancerDashboard />} />
            <Route path="/freelancer/projetos/:id" element={<ProjetoDetalhe />} />
            <Route path="/freelancer/entregues" element={<Historico apenasEntregues />} />
            <Route path="/freelancer/historico" element={<Historico />} />
            <Route path="/freelancer/mensagens" element={<Mensagens />} />
            <Route path="/freelancer/perfil" element={<Perfil papel="freelancer" />} />

            <Route path="/contratante" element={<ContratanteDashboard />} />
            <Route path="/contratante/candidatos" element={<Candidatos />} />
            <Route path="/contratante/freelancer/:usuId" element={<PortfolioFreelancer />} />
            <Route path="/contratante/projetos/:id" element={<ProjetoDetalhe />} />
            <Route path="/contratante/historico" element={<Historico />} />
            <Route path="/contratante/mensagens" element={<Mensagens />} />
            <Route path="/contratante/criar-projeto" element={<CriarProjeto />} />
            <Route path="/contratante/perfil" element={<Perfil papel="contratante" />} />
          </Route>

          <Route path="/restrita" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </RoleProvider>
  )
}

export default App
