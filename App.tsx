import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, Platform } from 'react-native';
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

export default function App() {
  const [logado, setLogado] = useState(false);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [inicializando, setInicializando] = useState(true);

  useEffect(() => {
    let resolvido = false;

    // Safety net: se onAuthStateChange nao disparar em 7s, assume sessao corrompida,
    // limpa localStorage e manda pra tela de login sem travar.
    const timeoutId = setTimeout(() => {
      if (!resolvido) {
        console.warn('[App] auth init timeout — limpando sessao');
        limparSessaoSupabase();
        setUsuarioAtual(null);
        setLogado(false);
        setInicializando(false);
      }
    }, 7000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') return;

      resolvido = true;

      if (event === 'PASSWORD_RECOVERY') {
        setRecuperandoSenha(true);
        setLogado(false);
        setInicializando(false);
        return;
      }

      if (!session?.user) {
        setUsuarioAtual(null);
        setLogado(false);
        setInicializando(false);
        return;
      }

      try {
        const { data: perfil, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !perfil || perfil.ativo === false) {
          await supabase.auth.signOut();
          limparSessaoSupabase();
          setUsuarioAtual(null);
          setLogado(false);
          setInicializando(false);
          return;
        }

        setUsuarioAtual({
          id: session.user.id,
          nome: perfil.nome,
          email: session.user.email!,
          perfil: perfil.perfil,
        });
        setLogado(true);
        setInicializando(false);
      } catch (e) {
        console.error('[App] erro ao carregar perfil:', e);
        limparSessaoSupabase();
        setUsuarioAtual(null);
        setLogado(false);
        setInicializando(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
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
