import { useState } from 'react'
import Header from '../components/header/header'
import Hero from '../components/hero/hero'
import Categories from '../components/categories/categories'
import HowItWorks from '../components/howitworks/howitworks'
import Comparison from '../components/comparison/comparison'
import Testimonials from '../components/testimonials/testimonials'
import Contact from '../components/contact/contact'
import Footer from '../components/footer/footer'

export default function PublicHome() {
  const [perfil, setPerfil] = useState<'free' | 'cont'>('free')

  return (
    <>
      <Header perfil={perfil} setPerfil={setPerfil} />
      <Hero perfil={perfil} />
      <Categories perfil={perfil} />
      <HowItWorks perfil={perfil} />
      <Comparison />
      <Testimonials />
      <Contact />
      <Footer />
    </>
  )
}
