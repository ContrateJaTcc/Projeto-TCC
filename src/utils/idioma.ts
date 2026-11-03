import { useEffect, useState } from 'react'
import { lerPreferencias, type Idioma } from './preferencias'

/*
 * Site em inglês (Configurações > Idioma). O português é o texto original de cada componente;
 * t() devolve a tradução quando o inglês está escolhido e existe tradução, senão o próprio texto.
 * Vale para os textos principais: menus, rodapés, login, cadastro e as seções das Configurações.
 */

const INGLES: Record<string, string> = {
  /* Menus da área logada */
  'Encontre projetos': 'Find projects',
  'Em andamento': 'In progress',
  'Histórico': 'History',
  'Mensagens': 'Messages',
  'Meu perfil': 'My profile',
  'Projetos': 'Projects',
  'Freelancers': 'Freelancers',
  'Painel': 'Dashboard',
  'Dashboard': 'Dashboard',
  'Carteira': 'Wallet',
  'Meus ganhos': 'My earnings',
  'Loja do castelo': 'Castle shop',
  'Agenda': 'Calendar',
  'Projetos no mapa': 'Projects on the map',
  'Mapa do reino': 'Kingdom map',
  'Guildas': 'Guilds',
  'Testes de habilidade': 'Skill tests',
  'Álbum de insígnias': 'Badge album',
  'Arena: chefão e desafio': 'Arena: boss and challenge',
  'Árvore de habilidades': 'Skill tree',
  'Pedidos de orçamento': 'Quote requests',
  'Orçamentos': 'Quotes',
  'Meu currículo': 'My résumé',
  'Retrospectiva do ano': 'Year in review',
  'Convide um amigo': 'Invite a friend',
  'Central de ajuda': 'Help center',
  'Freelancers favoritos': 'Favorite freelancers',
  'Freelancers no mapa': 'Freelancers on the map',
  'Configurações': 'Settings',
  'Sair': 'Log out',
  'Buscar': 'Search',
  /* Rodapés e páginas públicas */
  'Página inicial': 'Home',
  'Termos de uso': 'Terms of use',
  'Ajuda': 'Help',
  'Sobre': 'About',
  'Sobre o projeto': 'About the project',
  'Entrar': 'Log in',
  'Criar conta': 'Sign up',
  'Minha área': 'My area',
  'Modo TV': 'TV mode',
  'Início': 'Home',
  'Como funciona': 'How it works',
  'Comparação': 'Comparison',
  'Clientes': 'Clients',
  'Suporte': 'Support',
  'Fale conosco': 'Contact us',
  'Portfólio': 'Portfolio',
  'Candidate-se': 'Apply',
  'Contratantes': 'Clients',
  'Poste projeto': 'Post a project',
  'Encontre freelancers': 'Find freelancers',
  'Política de privacidade': 'Privacy policy',
  'A plataforma que transforma seu trabalho em uma jornada de conquistas e evolução profissional.': 'The platform that turns your work into a journey of achievements and professional growth.',
  'Todos os direitos reservados.': 'All rights reserved.',
  /* Login */
  'Bem-vindo de volta ao': 'Welcome back to',
  'Continuar com Google': 'Continue with Google',
  'ou entre com e-mail': 'or log in with e-mail',
  'E-mail': 'E-mail',
  'Senha': 'Password',
  'Sua senha': 'Your password',
  'Manter conectado': 'Keep me logged in',
  'Esqueci minha senha': 'Forgot my password',
  'Entrando...': 'Logging in...',
  'Ainda não tem conta?': "Don't have an account?",
  'Cadastre-se': 'Sign up',
  'ou experimente sem conta': 'or try it without an account',
  'Modo demonstração: o site inteiro com dados de exemplo, sem precisar de internet nem de servidor.': 'Demo mode: the whole site with sample data, no internet or server needed.',
  'Freelancer': 'Freelancer',
  'Contratante': 'Client',
  /* Cadastro */
  'Bem-Vindo ao': 'Welcome to',
  'Complete esses passos rápidos para criar sua conta e começar sua jornada.': 'Complete these quick steps to create your account and start your journey.',
  'Escolha seu perfil': 'Choose your profile',
  'Crie sua conta': 'Create your account',
  'Comece a evoluir': 'Start leveling up',
  'Qual perfil te descreve melhor?': 'Which profile describes you best?',
  'Trabalhe, ganhe dinheiro e evolua': 'Work, earn money and level up',
  'Poste projetos e contrate pessoas': 'Post projects and hire people',
  'Continuar': 'Continue',
  /* Configurações */
  'Aparência': 'Appearance',
  'Acessibilidade': 'Accessibility',
  'Notificações': 'Notifications',
  'Navegação': 'Navigation',
  'Segurança': 'Security',
  'Conta': 'Account',
  'Privacidade': 'Privacy',
  'Privacidade e dados': 'Privacy and data',
  'Cartas': 'Letters',
  'Atalhos': 'Shortcuts',
  'Atalhos de teclado': 'Keyboard shortcuts',
  'Idioma': 'Language',
  'O texto dos menus, rodapés, login, cadastro e das seções das Configurações. O resto do site continua em português.': 'Menus, footers, login, sign-up and Settings sections. The rest of the site stays in Portuguese.',
}

let atual: Idioma = lerPreferencias().idioma

export function t(texto: string) {
  return atual === 'en' ? INGLES[texto] ?? texto : texto
}

/* Componentes que usam t() chamam este hook para trocar de idioma na hora */
export function useIdioma() {
  const [idioma, setIdioma] = useState<Idioma>(atual)
  useEffect(() => {
    const mudar = () => {
      atual = lerPreferencias().idioma
      setIdioma(atual)
    }
    window.addEventListener('preferencias', mudar)
    return () => window.removeEventListener('preferencias', mudar)
  }, [])
  return idioma
}
