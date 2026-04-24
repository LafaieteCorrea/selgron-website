import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// NAO usar o identificador `URL` aqui — eh o construtor global JS
// (new URL(...)). Sobrescrever quebra bibliotecas que dependem dele
// (ex: @supabase/supabase-js faz new URL() internamente).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const isWeb = Platform.OS === 'web';

// Bug conhecido do @supabase/auth-js: o NavigatorLock do localStorage
// ("lock:sb-*") pode travar getSession() quando a aba anterior crashou ou
// outra aba segura o lock. Limpa locks presos antes de instanciar e
// substitui o lock por uma passthrough simples.
if (isWeb && typeof window !== 'undefined') {
  try {
    const keys = Object.keys(window.localStorage);
    for (const k of keys) {
      if (k.startsWith('lock:') || k.includes('@supabase/gotrue-js.lock')) {
        window.localStorage.removeItem(k);
      }
    }
  } catch { /* localStorage pode estar bloqueado */ }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Em nativo, nao tem URL de redirect; web escuta recovery flow do hash
    detectSessionInUrl: isWeb,
    // Web usa localStorage por default; nativo precisa de AsyncStorage
    // explicito, senao o client crasha ao inicializar com persistSession.
    storage: isWeb ? undefined : AsyncStorage,
    // Desativa o NavigatorLock: executa direto sem travar entre abas.
    // Esse lock é a causa mais comum de getSession() ficar pendurado.
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
});
