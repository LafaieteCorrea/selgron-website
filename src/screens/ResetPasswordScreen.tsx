import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Colors } from '../theme/colors';
import { redefinirSenha, logout } from '../utils/storage';

export default function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  async function handleSalvar() {
    if (!novaSenha || novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmSenha) {
      setErro('As senhas não coincidem.');
      return;
    }
    setErro('');
    setSucesso('');
    setLoading(true);
    const err = await redefinirSenha(novaSenha);
    setLoading(false);
    if (err) {
      setErro(err);
    } else {
      setSucesso('Senha redefinida com sucesso! Faça login com sua nova senha.');
      setNovaSenha('');
      setConfirmSenha('');
      await logout();
      setTimeout(onDone, 1500);
    }
  }

  async function handleCancelar() {
    await logout();
    onDone();
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
        <Text style={styles.titulo}>Redefinir senha</Text>
        <Text style={styles.subtitulo}>Crie uma nova senha para sua conta.</Text>

        {erro ? <Text style={styles.msgErro}>{erro}</Text> : null}
        {sucesso ? <Text style={styles.msgSucesso}>{sucesso}</Text> : null}

        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={Colors.textSecondary}
          value={novaSenha}
          onChangeText={setNovaSenha}
          secureTextEntry
        />

        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••"
          placeholderTextColor={Colors.textSecondary}
          value={confirmSenha}
          onChangeText={setConfirmSenha}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.botao, loading && { opacity: 0.7 }]}
          onPress={handleSalvar}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.textDark} />
            : <Text style={styles.botaoTexto}>Salvar nova senha</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkCancelar} onPress={handleCancelar}>
          <Text style={styles.linkCancelarTexto}>Cancelar</Text>
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
    marginBottom: 80,
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
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
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
  linkCancelar: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkCancelarTexto: {
    color: Colors.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  msgErro: {
    color: '#ff6b6b', backgroundColor: '#2d1010',
    padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13,
  },
  msgSucesso: {
    color: '#6bff9e', backgroundColor: '#0d2d1a',
    padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13,
  },
});
