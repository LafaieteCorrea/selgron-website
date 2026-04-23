import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/colors';
import { supabase } from './src/utils/supabase';
import { setUsuarioAtual } from './src/utils/storage';

export default function App() {
  const [logado, setLogado] = useState(false);
  const [inicializando, setInicializando] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setInicializando(false), 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      if (session?.user) {
        const { data: perfil } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (perfil) {
          setUsuarioAtual({ id: session.user.id, nome: perfil.nome, email: session.user.email!, perfil: perfil.perfil });
          setLogado(true);
        }
      }
      setInicializando(false);
    }).catch(() => {
      clearTimeout(timeout);
      setInicializando(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignora TOKEN_REFRESHED e PASSWORD_RECOVERY para não interferir com re-auth de troca de senha
      if (event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') return;
      if (session?.user) {
        const { data: perfil } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (perfil) {
          setUsuarioAtual({ id: session.user.id, nome: perfil.nome, email: session.user.email!, perfil: perfil.perfil });
          setLogado(true);
        }
      } else {
        setUsuarioAtual(null);
        setLogado(false);
      }
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
      {logado ? (
        <NavigationContainer>
          <AppNavigator onLogout={() => setLogado(false)} />
        </NavigationContainer>
      ) : (
        <LoginScreen onLogin={() => setLogado(true)} />
      )}
    </GestureHandlerRootView>
  );
}
