import { useState } from 'react'
import Header from '../components/header/header'
import Hero from '../components/hero/hero'
import Categories from '../components/categories/categories'
import HowItWorks from '../components/howitworks/howitworks'
import Comparison from '../components/comparison/comparison'
import Testimonials from '../components/testimonials/testimonials'
import Contact from '../components/contact/contact'
import Footer from '../components/footer/footer'
import MuralReino from '../components/reino/mural'

export default function PublicHome() {
  const [perfil, setPerfil] = useState<'free' | 'cont'>('free')

  return (
    /* data-area: o tema claro (pôr do sol) também vale aqui, além da área logada */
    <div data-area="home">
      <Header perfil={perfil} setPerfil={setPerfil} />
      <main>
        <Hero perfil={perfil} />
        <Categories perfil={perfil} />
        <HowItWorks perfil={perfil} />
        <Comparison />
        <Testimonials />
        <MuralReino titulo="Agora no castelo" naHome />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
