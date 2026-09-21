// Client Supabase unique pour tout le frontend (contrat §3).
// App.jsx doit importer ce singleton au lieu de créer son propre client.
import { createClient } from '@supabase/supabase-js'

// `persistSession`/`storage: localStorage` sont déjà les valeurs par défaut de la lib —
// explicites ici pour que "rester connecté après le lien magique" ne dépende jamais d'un
// changement de comportement par défaut dans une future version. La session survit donc à un
// rechargement, une fermeture d'onglet ou un redémarrage du navigateur, tant que le site garde
// la même origine (localStorage est scindé par domaine — changer d'URL redemande une connexion,
// ce n'est pas un bug). `autoRefreshToken` renouvelle le jeton en arrière-plan avant expiration.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
