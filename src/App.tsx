import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { RoleProvider } from './context/RoleContext'
import PrivateLayout from './components/layout/privatelayout'
import PublicHome from './pages/PublicHome'
import Cadastro from './pages/Cadastro'
import Login from './pages/Login'
import FreelancerDashboard from './pages/freelancer/Dashboard'
import ContratanteDashboard from './pages/contratante/Dashboard'
import Candidatos from './pages/contratante/Candidatos'
import CriarProjeto from './pages/contratante/CriarProjeto'
import ProjetoDetalhe from './pages/ProjetoDetalhe'
import Historico from './pages/Historico'
import Mensagens from './pages/Mensagens'


function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/login" element={<Login />} />

          <Route element={<PrivateLayout />}>
            <Route path="/freelancer" element={<FreelancerDashboard />} />
            <Route path="/freelancer/projetos/:id" element={<ProjetoDetalhe />} />
            <Route path="/freelancer/entregues" element={<Historico apenasEntregues />} />
            <Route path="/freelancer/historico" element={<Historico />} />
            <Route path="/freelancer/mensagens" element={<Mensagens />} />

            <Route path="/contratante" element={<ContratanteDashboard />} />
            <Route path="/contratante/candidatos" element={<Candidatos />} />
            <Route path="/contratante/projetos/:id" element={<ProjetoDetalhe />} />
            <Route path="/contratante/historico" element={<Historico />} />
            <Route path="/contratante/mensagens" element={<Mensagens />} />
            <Route path="/contratante/criar-projeto" element={<CriarProjeto />} />
          </Route>

          <Route path="/restrita" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  )
}

export default App
