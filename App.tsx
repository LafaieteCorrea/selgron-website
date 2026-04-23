import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/colors';
import { supabase } from './src/utils/supabase';
import { setUsuarioAtual } from './src/utils/storage';

export default function App() {
  const [logado, setLogado] = useState(false);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [inicializando, setInicializando] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') return;

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

      const { data: perfil } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!perfil || perfil.ativo === false) {
        await supabase.auth.signOut();
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
    });

    return () => subscription.unsubscribe();
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
