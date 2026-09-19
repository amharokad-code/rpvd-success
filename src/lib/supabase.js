// Client Supabase unique pour tout le frontend (contrat §3).
// App.jsx doit importer ce singleton au lieu de créer son propre client.
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
