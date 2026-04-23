---
name: Projeto Selgron Field Tech App
description: App mobile interno da Selgron para técnicos de campo — estado atual, stack e decisões tomadas
type: project
---
App mobile interno da **Selgron Industrial Ltda** para técnicos de campo. MVP funcional, com suporte a web e mobile (iOS/Android).

## Repositório
```
https://github.com/rafaelduwe/project-selgron-website
```

## Localização local
```
C:\Users\rafael.duwe\Desktop\ProjetoApp\selgron-field-tech\
```

## Como rodar
```bash
cd "C:\Users\rafael.duwe\Desktop\ProjetoApp\selgron-field-tech"
npx expo start
# 'a' para emulador Android | 'w' para web browser
```

## Stack
- React Native + Expo SDK 54
- TypeScript
- Storage: memória pura (sem AsyncStorage — causava travamento no emulador)
- PDF: expo-print + expo-sharing (mobile) | window.open (web)
- Câmera/Galeria: expo-image-picker (base64 direto, allowsMultipleSelection no OS)
- Assinatura digital: react-native-signature-canvas (mobile) | canvas HTML (web)
- Date picker: componente próprio puro JS (DatePicker.tsx)
- Navegação: @react-navigation/bottom-tabs + stack

## Identidade visual
- Cor primária: #F5A200 (laranja Selgron)
- Fundo: #1A1A1A (preto industrial)
- Estilo: industrial, robusto

## Funções implementadas

### 1. Gerador de Token
- Código de 6 dígitos, válido 1 minuto
- Algoritmo: `((dia×13) + (mês×7) + (hora×17) + (minuto×31)) × 1337 mod 1000000`
- 100% offline
- `src/screens/TokenScreen.tsx` + `src/utils/token.ts`

### 2. Relatório de Reembolso
- Fluxo: criar relatório → adicionar despesas → gerar PDF
- Despesas: tipo, valor, data (calendário), foto (câmera OU galeria), nota extraviada
- PDF mobile: expo-print → shareAsync | PDF web: window.open com HTML
- `src/screens/ReembolsoScreen.tsx`, `src/components/DatePicker.tsx`

### 3. Ordem de Serviço (OS)
- Formulário em 5 etapas: identificação → máquina → horas → serviço → peças
- Validação de campos obrigatórios com borda vermelha ao tentar avançar sem preencher
- Fotos do atendimento: câmera ou galeria (seleção múltipla), grid de miniaturas
- Assinatura digital cross-platform: SignaturePad.tsx (native) + SignaturePad.web.tsx (canvas HTML)
- `src/screens/OSScreen.tsx`

## Problemas já resolvidos (não regredir)
- AsyncStorage travava no emulador → storage em memória pura (`src/utils/storage.ts`)
- datetimepicker nativo quebrou → DatePicker.tsx puro JS
- Fotos não apareciam no PDF → base64 capturado direto no ImagePicker
- @expo/vector-icons não carregava → emojis nos ícones do menu
- SignatureCanvas não funciona no web → SignaturePad.web.tsx com canvas HTML
- Alert.alert com callbacks não funciona no web → fluxo direto via Platform.OS check
- PDF no web era print da tela → window.open com HTML gerado
- Galeria não abria no web → dois botões separados (Câmera / Galeria) sem Alert

## Próximos passos
- Deploy no Vercel (build: `npx expo export --platform web`, output: `dist`)
- Fase 2: migrar storage para Supabase (PostgreSQL + Auth + Storage)
- Tela de admin: gestão de usuários + histórico global de OS e reembolsos
- Validar algoritmo do token com time de automação/CLP
- Confirmar valor R$/km com financeiro

## Why: decisões de arquitetura
- **Storage em memória**: AsyncStorage travava indefinidamente no emulador Android no MVP
- **Platform.OS checks**: comportamentos divergentes entre web e native para Alert, PDF e assinatura
- **base64 direto**: `uri` file:// não funciona em HTML do PDF; base64 embutido resolve
