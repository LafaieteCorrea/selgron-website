# Debug APK release (crash no boot) — sessao 2026-04-24

Contexto salvo para retomar depois.

## Emulador usado para diagnostico

- Android Studio, Pixel 8 API 34 (x86_64)
- `adb devices` mostra `emulator-5554 device`
- `C:\sp` = junction para o projeto (workaround MAX_PATH do Windows)

## Stack de toolchain local (scoop)

- JDK 17 Temurin: `~\scoop\apps\temurin17-jdk\current`
- Android cmdline-tools: `~\scoop\apps\android-clt\current`
- SDK Platform 36, Build-Tools 36.0.0, NDK 27.1.12297006 instalados
- Long paths habilitado no registro (HKLM `LongPathsEnabled=1`)
- Env vars persistidas no user scope: `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`

## Comandos para rodar build local (release)

```powershell
$env:ANDROID_HOME = "$env:USERPROFILE\scoop\apps\android-clt\current"
$env:JAVA_HOME    = "$env:USERPROFILE\scoop\apps\temurin17-jdk\current"
$env:EXPO_PUBLIC_SUPABASE_URL      = "https://tqlvirdfuwoxibywkvfw.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_SAUdijTkv8qH5xrVO3uu6Q_H07VOo8E"
Set-Location C:\sp\android
.\gradlew.bat assembleRelease --no-daemon
```

APK gerado em `C:\sp\android\app\build\outputs\apk\release\app-release.apk`.

Para instalar no emulador:
```powershell
adb uninstall br.com.selgron.fieldtech
adb install -r "C:\sp\android\app\build\outputs\apk\release\app-release.apk"
adb shell am start -n br.com.selgron.fieldtech/.MainActivity
```

Para ver crash:
```powershell
adb logcat -d *:E | Select-String -Pattern "FATAL|ReferenceError|TypeError|ReactNativeJS"
```

## Sequencia de erros encontrados (novo erro a cada fix)

1. **`ReferenceError: Property 'FormData' doesn't exist`**
   - Causa: Hermes em release nao expoe `FormData` como global (RN 0.81
     removeu o `setUpFormData.js` automatico).
   - Fix aplicado: `polyfills.ts` com
     `import RNFormData from 'react-native/Libraries/Network/FormData'`
     + atribuicao a `globalThis.FormData`.

2. **`TypeError: Cannot assign to property 'protocol' which has only a getter`**
   - Causa: `react-native-url-polyfill` usa `whatwg-url-without-unicode`,
     e em alguma release-mode do bundler (minificacao?) o getter/setter
     de `protocol` nao tem setter. `@supabase/supabase-js` faz
     `url.protocol = 'https:'` internamente e crasha.
   - **Pendente:** monkey-patch em `URL.prototype` nao resolveu. Proxima
     tentativa seria substituir o polyfill por outro (ex:
     `react-native-polyfill-globals` ou implementacao custom) OU
     atualizar @supabase/supabase-js para versao que nao faca esse set.
   - Verificado: em `node_modules/whatwg-url-without-unicode/lib/URL-impl.js`
     linhas 57/61 tem `get protocol()` E `set protocol(v)`. Entao o
     problema NAO eh missing setter na source — pode ser minification
     removendo o setter, ou getter-only estar em outro lugar da chain
     (URL.js wrapper vs URL-impl.js).

## Arquivos criados/alterados nesta sessao (nao commitados ainda)

- `polyfills.ts` (novo) — polyfill FormData e tentativa de patch URL
- `index.ts` — importa `./polyfills` como primeiro statement
- `App.tsx` — removido polyfill inline que nao funcionava por ES hoisting
- `logcat_2026-04-24_14-03-22.txt` — anexo do log do user

Tambem ja commitados nesta sessao:
- Supabase usa AsyncStorage em nativo (commit `a38c956`)
- `const URL` renomeado para `SUPABASE_URL` (commit `3e0a103`)
- `react-native-url-polyfill` instalado (commit `4e4056d`)

## Proximas tentativas para retomar

1. Debuggar a fonte real do set-only getter em URL (inspecionar o Webidl2js
   gerado: `node_modules/whatwg-url-without-unicode/lib/URL.js`).
2. Trocar `react-native-url-polyfill` por:
   - `react-native-polyfill-globals` (mais completo), ou
   - `whatwg-fetch` + `event-target-shim`, ou
   - implementacao minima custom com apenas o que supabase precisa.
3. Verificar se o problema nao eh o `@supabase/supabase-js@^2.104.0`
   especificamente; tentar downgrade para `~2.57.0` (versao estavel
   conhecida para RN).
4. Alternativa drastica: trocar `@supabase/supabase-js` por chamadas
   diretas via `fetch` ao endpoint REST do Supabase.

## Arquivos intermediarios

- `C:\Users\lafaiete\AppData\Local\Temp\gradle-release11.log` — ultimo
  log do gradle build
- `.env.local` no root do projeto com as env vars do Supabase (gitignored)
