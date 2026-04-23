import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Modal,
} from 'react-native';
import { Colors } from '../theme/colors';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Modal recuperação de senha
  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [enviandoRecuperar, setEnviandoRecuperar] = useState(false);
  const [erroRecuperar, setErroRecuperar] = useState('');
  const [sucessoRecuperar, setSucessoRecuperar] = useState('');

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

  function abrirModalRecuperar() {
    setEmailRecuperar(email);
    setErroRecuperar('');
    setSucessoRecuperar('');
    setModalRecuperar(true);
  }

  async function enviarRecuperacao() {
    if (!emailRecuperar) {
      setErroRecuperar('Informe seu email.');
      return;
    }
    setErroRecuperar('');
    setSucessoRecuperar('');
    setEnviandoRecuperar(true);
    const { pedirRecuperacaoSenha } = require('../utils/storage');
    const err = await pedirRecuperacaoSenha(emailRecuperar.trim().toLowerCase());
    setEnviandoRecuperar(false);
    if (err) {
      setErroRecuperar(err);
    } else {
      setSucessoRecuperar('Enviamos um link de recuperação para seu email. Verifique sua caixa de entrada.');
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

        <TouchableOpacity style={styles.linkRecuperar} onPress={abrirModalRecuperar}>
          <Text style={styles.linkRecuperarTexto}>Esqueci minha senha</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal: Esqueci minha senha ── */}
      <Modal visible={modalRecuperar} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Recuperar senha</Text>
            <Text style={styles.modalSubtitulo}>
              Informe seu email e enviaremos um link para redefinir a senha.
            </Text>

            {erroRecuperar ? <Text style={styles.msgErro}>{erroRecuperar}</Text> : null}
            {sucessoRecuperar ? <Text style={styles.msgSucesso}>{sucessoRecuperar}</Text> : null}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={emailRecuperar}
              onChangeText={setEmailRecuperar}
              placeholder="seu@selgron.com.br"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalRecuperar(false)}>
                <Text style={styles.botaoCancelarTexto}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botaoSalvar}
                onPress={enviarRecuperacao}
                disabled={enviandoRecuperar}
              >
                {enviandoRecuperar
                  ? <ActivityIndicator color={Colors.textDark} />
                  : <Text style={styles.botaoSalvarTexto}>Enviar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  linkRecuperar: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkRecuperarTexto: {
    color: Colors.primary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: Colors.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalTitulo: { color: Colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitulo: { color: Colors.textSecondary, fontSize: 13, marginBottom: 16 },
  modalBotoes: { flexDirection: 'row', gap: 12, marginTop: 8 },
  botaoCancelar: {
    flex: 1, padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  botaoCancelarTexto: { color: Colors.textSecondary, fontWeight: 'bold' },
  botaoSalvar: {
    flex: 1, padding: 12, borderRadius: 8,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  botaoSalvarTexto: { color: Colors.textDark, fontWeight: 'bold' },
  msgErro: {
    color: '#ff6b6b', backgroundColor: '#2d1010',
    padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13,
  },
  msgSucesso: {
    color: '#6bff9e', backgroundColor: '#0d2d1a',
    padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13,
  },
});
