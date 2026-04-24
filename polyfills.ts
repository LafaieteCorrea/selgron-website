// Polyfills (URL + FormData) — DEVE ser o primeiro import do index.ts.
// Sem isso, @supabase/supabase-js crasha em Hermes/release com
// "ReferenceError: Property 'FormData' doesn't exist".

import 'react-native-url-polyfill/auto';
// @ts-expect-error — path interno do RN, nao tem .d.ts publico
import RNFormData from 'react-native/Libraries/Network/FormData';

const g: any = globalThis;

// ── FormData polyfill (Hermes release nao expoe por default) ───────────
if (typeof g.FormData === 'undefined') {
  g.FormData = RNFormData;
}

// ── URL.prototype.protocol precisa ser setter/getter ───────────────────
// whatwg-url-without-unicode (usado pelo react-native-url-polyfill) expoe
// 'protocol' como getter-only. @supabase/supabase-js tenta fazer
// `url.protocol = 'https:'` e quebra com:
//   "TypeError: Cannot assign to property 'protocol' which has only a getter"
// Adiciona setter que reescreve via href.
if (typeof g.URL !== 'undefined') {
  const proto = g.URL.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'protocol');
  if (desc && desc.get && !desc.set) {
    Object.defineProperty(proto, 'protocol', {
      configurable: true,
      get: desc.get,
      set(value: string) {
        const cleaned = String(value).replace(/:$/, '');
        const href = this.href as string;
        this.href = href.replace(/^[^:]+/, cleaned);
      },
    });
  }
}
