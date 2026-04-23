import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Colors } from '../theme/colors';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function handleLogin() {
    if (!email || !senha) {
      setErro('Preencha email e senha.');
      return;
    }
    setErro('');
    setLoading(true);
    const { login } = require('../utils/storage');
    const usuario = await login(email.trim().toLowerCase(), senha);
    setLoading(false);
    if (usuario) {
      onLogin();
    } else {
      setErro('Email ou senha incorretos.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/selgron-logo.png')}
          style={styles.logoImagem}
          resizeMode="contain"
        />
        <Text style={styles.logoSub}>Plataforma Interna - Selgron</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.titulo}>Acesso ao sistema</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="seu@selgron.com.br"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••"
          placeholderTextColor={Colors.textSecondary}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <TouchableOpacity
          style={[styles.botao, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.textDark} />
            : <Text style={styles.botaoTexto}>Entrar</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 116,
  },
  logoImagem: {
    width: '95%' as any,
    height: 180,
    marginBottom: 12,
  },
  logoSub: {
    fontSize: 15,
    color: Colors.textSecondary,
    letterSpacing: 3,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  botao: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoTexto: {
    color: Colors.textDark,
    fontWeight: 'bold',
    fontSize: 16,
  },
  erro: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: '#2d1010',
    padding: 10,
    borderRadius: 8,
  },
});
