import { createClient } from '@supabase/supabase-js';

const URL  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const KEY  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Bug conhecido do @supabase/auth-js: o NavigatorLock do localStorage
// ("lock:sb-*") pode travar getSession() quando a aba anterior crashou ou
// outra aba segura o lock. Limpa locks presos antes de instanciar e
// substitui o lock por uma passthrough simples.
if (typeof window !== 'undefined') {
  try {
    const keys = Object.keys(window.localStorage);
    for (const k of keys) {
      if (k.startsWith('lock:') || k.includes('@supabase/gotrue-js.lock')) {
        window.localStorage.removeItem(k);
      }
    }
  } catch { /* localStorage pode estar bloqueado */ }
}

export const supabase = createClient(URL, KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Desativa o NavigatorLock: executa direto sem travar entre abas.
    // Esse lock é a causa mais comum de getSession() ficar pendurado.
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
});
