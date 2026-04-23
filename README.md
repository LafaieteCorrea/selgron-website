# Selgron Field Tech

App interno da **Selgron Industrial Ltda** para técnicos de campo.  
Roda como **web app** (browser) e como **app mobile** (iOS/Android via Expo Go).

---

## Funções

| Função | Descrição |
|--------|-----------|
| 🔑 Token | Gera código de 6 dígitos válido por 1 minuto para acesso a máquinas |
| 🧾 Reembolso | Lança notas de despesa com foto e gera PDF para envio |
| 📋 OS | Preenche Ordem de Serviço com assinatura digital e gera PDF |

---

## Como rodar localmente

```bash
# Instalar dependências
npm install

# Iniciar (emulador Android)
npx expo start
# pressiona 'a' para Android | 'w' para web browser

# Build web (para deploy)
npx expo export --platform web
```

---

## Stack

- **React Native + Expo SDK 54** — web e mobile no mesmo código
- **TypeScript** — tipagem completa
- **expo-print + expo-sharing** — geração de PDF
- **expo-image-picker** — câmera e galeria (base64 direto)
- **react-native-signature-canvas** — assinatura digital (mobile)
- **Canvas HTML** — assinatura digital (web)
- **Storage em memória** — MVP sem dependências externas

---

## Deploy

| Serviço | Função |
|---------|--------|
| **Vercel** | Hospedagem do web app (build estático) |
| **Supabase** | Banco de dados, auth e storage de fotos (Fase 2) |

**Vercel config:**
- Build Command: `npx expo export --platform web`
- Output Directory: `dist`

---

## Estrutura

```
src/
  components/
    DatePicker.tsx          # Calendário puro JS (sem módulo nativo)
    SignaturePad.tsx         # Assinatura — mobile (react-native-signature-canvas)
    SignaturePad.web.tsx     # Assinatura — web (canvas HTML)
  navigation/
    AppNavigator.tsx         # Bottom tabs
  screens/
    LoginScreen.tsx
    TokenScreen.tsx
    ReembolsoScreen.tsx
    OSScreen.tsx
  theme/
    colors.ts                # #F5A200 laranja Selgron, #1A1A1A fundo
  utils/
    storage.ts               # Storage em memória (substituir por Supabase na Fase 2)
    token.ts                 # Algoritmo do token offline
```

---

## Contexto do projeto

Os arquivos em `docs/contexto/` contêm o histórico de decisões técnicas, preferências de desenvolvimento e estado do projeto — usados para manter contexto entre sessões de desenvolvimento com IA.

---

## Identidade visual

- Cor primária: `#F5A200` (laranja Selgron)
- Fundo: `#1A1A1A` (preto industrial)
- Estilo: robusto, referência em IHMs industriais
