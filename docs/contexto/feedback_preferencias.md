---
name: Preferências e feedback do Rafael
description: Como Rafael gosta de trabalhar e o que evitar
type: feedback
---

Atualizar os arquivos de contexto continuamente durante o desenvolvimento.
**Why:** Rafael quer que o contexto esteja sempre atualizado para próximas conversas.
**How to apply:** A cada implementação, bug resolvido ou decisão tomada, atualizar project_selgron_app.md imediatamente. Não acumular para o final. Atualizar tanto em `docs/contexto/` no repositório quanto em `~/.claude/projects/.../memory/`.

---

Respostas curtas e diretas — Rafael não quer explicações longas, quer ver resultado.
**Why:** Estilo de comunicação direto, prefere ação a teoria.
**How to apply:** Vai direto ao código/solução, explica só o essencial.

---

Antes de implementar qualquer coisa, confirmar o entendimento com Rafael.
**Why:** Houve casos em que o escopo não estava claro e precisou de retrabalho.
**How to apply:** Para features novas, resumir o entendimento e perguntar "faz sentido?" antes de codar.

---

Não usar AsyncStorage no projeto Selgron Field Tech App.
**Why:** Causa travamento indefinido no emulador Android — bug confirmado.
**How to apply:** Sempre usar o storage em memória em `src/utils/storage.ts` (até migração para Supabase).

---

Não usar @react-native-community/datetimepicker.
**Why:** Causou erro de módulo não resolvido no bundle do Expo Go.
**How to apply:** Usar o componente `src/components/DatePicker.tsx` que é 100% JS puro.

---

Usar emojis nos ícones de navegação em vez de @expo/vector-icons.
**Why:** @expo/vector-icons não carregava corretamente no emulador durante o MVP.
**How to apply:** Manter emojis (🔑 🧾 📋) no AppNavigator.tsx.

---

Não usar Alert.alert com callbacks para fluxo de navegação no web.
**Why:** No React Native Web, Alert.alert com botões customizados não executa os callbacks corretamente.
**How to apply:** Sempre usar `Platform.OS === 'web'` check e executar a ação diretamente sem Alert.

---

PDF no web: usar `window.open` com HTML gerado, não `Print.printAsync`.
**Why:** Print.printAsync no web imprime a tela atual (Ctrl+P), não o HTML passado como parâmetro.
**How to apply:** `if (Platform.OS === 'web') { window.open(...) } else { printToFileAsync + shareAsync }`.
