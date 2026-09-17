import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardPage from "./pages/DashboardPage";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser(data.session.user);
      } else {
        const { data: newUser } = await supabase.auth.signInAnonymously();
        setUser(newUser.user);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><p className="text-amber-500">Chargement...</p></div>;

  return user ? <DashboardPage user={user} supabase={supabase} /> : null;
}
