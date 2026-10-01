// Page « Accueil » (/accueil) : la présentation complète de la méthode (ancienne landing),
// accessible depuis la page principale Bootcamp. Le bouton de fin de page mène à l'app (/app),
// où se fait la connexion par lien magique.
import { RegionProvider, useCopy } from '../context/RegionContext'
import LanguageSwitch from '../components/LanguageSwitch'
import SiteNav from '../components/SiteNav'
import LandingPage from './LandingPage'

function Inner() {
  const { region } = useCopy()
  const lang = region === 'us' || region === 'uk' ? 'en' : 'fr'
  return (
    <>
      <SiteNav current="accueil" className="left-3" />
      <LanguageSwitch className="fixed right-4 top-4 z-50" />
      <LandingPage
        market={region}
        lang={lang}
        onAgeConfirm={() => {
          window.location.href = '/app'
        }}
      />
    </>
  )
}

export default function AccueilPage() {
  return (
    <RegionProvider>
      <Inner />
    </RegionProvider>
  )
}
