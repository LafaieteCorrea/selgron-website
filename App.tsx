// ATENCAO: './polyfills' tem que ser o PRIMEIRO import — configura URL
// e FormData globais antes de qualquer outra lib (ex: supabase-js) tentar
// usar. Se trocar de ordem, o app crasha no boot em Hermes/release.
import './polyfills';

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, Platform, Text, TextInput } from 'react-native';

// Ignora o "Tamanho da fonte" do sistema (Android/iOS). Sem isso, usuarios
// com zoom out deixam botoes e textos menores que o esperado.
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = false;
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = false;
import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/colors';
import { supabase } from './src/utils/supabase';
import { setUsuarioAtual } from './src/utils/storage';

function limparSessaoSupabase() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const keys = Object.keys(window.localStorage);
    for (const k of keys) {
      if (k.startsWith('sb-') || k.startsWith('supabase.')) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    // silencia — localStorage pode estar inacessivel (modo privado, etc.)
  }
}

// Envolve uma promise em um timeout. Se não resolver em ms, rejeita.
function comTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${label}`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

export default function App() {
  const [logado, setLogado] = useState(false);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [inicializando, setInicializando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function carregarPerfil(userId: string, email: string): Promise<boolean> {
      try {
        const { data: perfil, error } = await comTimeout(
          supabase.from('profiles').select('*').eq('id', userId).single(),
          5000,
          'profiles.select',
        );
        if (error || !perfil || perfil.ativo === false) return false;
        setUsuarioAtual({ id: userId, nome: perfil.nome, email, perfil: perfil.perfil });
        return true;
      } catch (e) {
        console.error('[App] erro/timeout ao carregar perfil:', e);
        return false;
      }
    }

    async function inicializar() {
      try {
        const { data } = await comTimeout(supabase.auth.getSession(), 5000, 'getSession');
        if (cancelado) return;

        const session = data?.session;
        if (!session?.user) {
          setUsuarioAtual(null);
          setLogado(false);
          setInicializando(false);
          return;
        }

        const ok = await carregarPerfil(session.user.id, session.user.email!);
        if (cancelado) return;

        if (!ok) {
          try { await comTimeout(supabase.auth.signOut(), 3000, 'signOut'); } catch {}
          limparSessaoSupabase();
          setUsuarioAtual(null);
          setLogado(false);
        } else {
          setLogado(true);
        }
        setInicializando(false);
      } catch (e) {
        console.warn('[App] init timeout/erro — limpando sessao:', e);
        if (cancelado) return;
        limparSessaoSupabase();
        setUsuarioAtual(null);
        setLogado(false);
        setInicializando(false);
      }
    }

    inicializar();

    // onAuthStateChange só pra reagir a eventos DEPOIS do cold start
    // (login, logout, recuperação de senha em outra aba, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

      if (event === 'PASSWORD_RECOVERY') {
        setRecuperandoSenha(true);
        setLogado(false);
        return;
      }
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUsuarioAtual(null);
        setLogado(false);
        return;
      }
      if (event === 'SIGNED_IN') {
        const ok = await carregarPerfil(session.user.id, session.user.email!);
        if (!ok) {
          try { await supabase.auth.signOut(); } catch {}
          limparSessaoSupabase();
          setUsuarioAtual(null);
          setLogado(false);
        } else {
          setLogado(true);
        }
      }
    });

    return () => {
      cancelado = true;
      subscription.unsubscribe();
    };
  }, []);

  if (inicializando) return (
    <View style={{ flex: 1, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#F5A200" />
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      {recuperandoSenha ? (
        <ResetPasswordScreen onDone={() => setRecuperandoSenha(false)} />
      ) : logado ? (
        <NavigationContainer>
          <AppNavigator onLogout={() => setLogado(false)} />
        </NavigationContainer>
      ) : (
        <LoginScreen onLogin={() => setLogado(true)} />
      )}
    </GestureHandlerRootView>
  );
}
