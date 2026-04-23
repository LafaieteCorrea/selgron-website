import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Switch, Modal, Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import {
  Usuario, getUsuarios, criarUsuario, atualizarPerfil,
  deletarUsuario, alterarSenhaPropria, adminAlterarSenha,
  getUsuarioLogado,
} from '../utils/storage';

type UsuarioComAtivo = Usuario & { ativo: boolean };

export default function UserManagementScreen() {
  const usuarioLogado = getUsuarioLogado();
  const isAdmin = usuarioLogado?.perfil === 'admin';

  const [usuarios, setUsuarios] = useState<UsuarioComAtivo[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Modal novo usuário
  const [modalNovo, setModalNovo] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenhaUser, setNovaSenhaUser] = useState('');
  const [novoPerfil, setNovoPerfil] = useState<'tecnico' | 'gestor' | 'admin'>('tecnico');
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [sucessoModal, setSucessoModal] = useState('');

  // Modal trocar senha
  const [modalSenha, setModalSenha] = useState(false);
  const [usuarioSenha, setUsuarioSenha] = useState<UsuarioComAtivo | null>(null);
  const [senhaAntiga, setSenhaAntiga] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  const [sucessoSenha, setSucessoSenha] = useState('');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    setUsuarios(await getUsuarios());
    setCarregando(false);
  }

  function abrirModalSenha(u: UsuarioComAtivo) {
    setUsuarioSenha(u);
    setSenhaAntiga(''); setNovaSenha(''); setConfirmSenha('');
    setErroSenha(''); setSucessoSenha('');
    setModalSenha(true);
  }

  async function salvarSenha() {
    if (!novaSenha || novaSenha.length < 6) {
      setErroSenha('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmSenha) {
      setErroSenha('As senhas não coincidem.');
      return;
    }
    if (!usuarioSenha) return;

    setSalvandoSenha(true);
    setErroSenha('');

    let erro: string | null = null;
    const ehProprioUsuario = usuarioSenha.id === usuarioLogado?.id;

    if (ehProprioUsuario) {
      // Qualquer usuário alterando a própria senha — precisa da senha antiga
      if (!senhaAntiga) { setErroSenha('Informe a senha atual.'); setSalvandoSenha(false); return; }
      erro = await alterarSenhaPropria(senhaAntiga, novaSenha);
    } else {
      // Admin alterando senha de outro — sem senha antiga
      erro = await adminAlterarSenha(usuarioSenha.id, novaSenha);
    }

    setSalvandoSenha(false);
    if (erro) {
      setErroSenha(erro);
    } else {
      setSucessoSenha('Senha alterada com sucesso!');
      setSenhaAntiga(''); setNovaSenha(''); setConfirmSenha('');
    }
  }

  async function criarNovoUsuario() {
    if (!novoNome || !novoEmail || !novaSenhaUser) {
      setErroModal('Preencha todos os campos.');
      return;
    }
    if (novaSenhaUser.length < 6) {
      setErroModal('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setErroModal(''); setSucessoModal('');
    setSalvando(true);
    const erro = await criarUsuario(novoNome, novoEmail, novaSenhaUser, novoPerfil);
    setSalvando(false);
    if (erro) {
      setErroModal(erro);
    } else {
      setSucessoModal(`Usuário ${novoNome} criado com sucesso!`);
      setNovoNome(''); setNovoEmail(''); setNovaSenhaUser(''); setNovoPerfil('tecnico');
      carregar();
    }
  }

  async function alternarAtivo(u: UsuarioComAtivo) {
    await atualizarPerfil(u.id, { ativo: !u.ativo });
    carregar();
  }

  async function alterarPerfil(u: UsuarioComAtivo, perfil: string) {
    await atualizarPerfil(u.id, { perfil });
    carregar();
  }

  async function confirmarExclusao(u: UsuarioComAtivo) {
    const confirmar = Platform.OS === 'web'
      ? window.confirm(`Excluir o usuário "${u.nome}" permanentemente?`)
      : await new Promise<boolean>(resolve =>
          Alert.alert('Excluir usuário', `Excluir "${u.nome}" permanentemente?`, [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmar) return;
    const erro = await deletarUsuario(u.id);
    if (erro) {
      if (Platform.OS === 'web') window.alert(`Erro: ${erro}`);
      else Alert.alert('Erro', erro);
    } else {
      carregar();
    }
  }

  const PERFIS: Array<'tecnico' | 'gestor' | 'admin'> = ['tecnico', 'gestor', 'admin'];
  const ehProprioUsuario = (u: UsuarioComAtivo) => u.id === usuarioLogado?.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>{isAdmin ? 'Gestão de Usuários' : 'Meu Perfil'}</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.botaoNovo} onPress={() => { setErroModal(''); setSucessoModal(''); setModalNovo(true); }}>
            <Text style={styles.botaoNovoTexto}>+ Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      {carregando ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {usuarios.length === 0 ? (
            <Text style={styles.vazio}>Nenhum usuário encontrado.</Text>
          ) : (
            usuarios.map(u => (
              <View key={u.id} style={[styles.card, !u.ativo && styles.cardInativo]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardNome}>{u.nome}</Text>
                    <Text style={styles.cardEmail}>{u.email || '—'}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    {isAdmin && (
                      <>
                        <Text style={styles.ativoLabel}>{u.ativo ? 'Ativo' : 'Inativo'}</Text>
                        <Switch
                          value={u.ativo}
                          onValueChange={() => alternarAtivo(u)}
                          trackColor={{ false: Colors.border, true: Colors.primary }}
                          thumbColor={Colors.text}
                        />
                      </>
                    )}
                    <TouchableOpacity onPress={() => abrirModalSenha(u)} style={styles.iconBtn}>
                      <Text style={styles.iconBtnTexto}>🔒</Text>
                    </TouchableOpacity>
                    {isAdmin && !ehProprioUsuario(u) && (
                      <TouchableOpacity onPress={() => confirmarExclusao(u)} style={styles.iconBtn}>
                        <Text style={styles.iconBtnTexto}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {isAdmin && (
                  <View style={styles.perfisRow}>
                    {PERFIS.map(p => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.perfilBtn, u.perfil === p && styles.perfilBtnAtivo]}
                        onPress={() => alterarPerfil(u, p)}
                      >
                        <Text style={[styles.perfilBtnTexto, u.perfil === p && styles.perfilBtnTextoAtivo]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Modal: Novo Usuário ── */}
      <Modal visible={modalNovo} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Novo Usuário</Text>

            {erroModal ? <Text style={styles.msgErro}>{erroModal}</Text> : null}
            {sucessoModal ? <Text style={styles.msgSucesso}>{sucessoModal}</Text> : null}

            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={novoNome} onChangeText={setNovoNome}
              placeholderTextColor={Colors.textSecondary} placeholder="Nome completo" />

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={novoEmail} onChangeText={setNovoEmail}
              placeholderTextColor={Colors.textSecondary} placeholder="email@selgron.com.br"
              keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.label}>Senha</Text>
            <TextInput style={styles.input} value={novaSenhaUser} onChangeText={setNovaSenhaUser}
              placeholderTextColor={Colors.textSecondary} placeholder="Mínimo 6 caracteres"
              secureTextEntry />

            <Text style={styles.label}>Perfil</Text>
            <View style={styles.perfisRow}>
              {PERFIS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.perfilBtn, novoPerfil === p && styles.perfilBtnAtivo]}
                  onPress={() => setNovoPerfil(p)}
                >
                  <Text style={[styles.perfilBtnTexto, novoPerfil === p && styles.perfilBtnTextoAtivo]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalNovo(false)}>
                <Text style={styles.botaoCancelarTexto}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoSalvar} onPress={criarNovoUsuario} disabled={salvando}>
                {salvando
                  ? <ActivityIndicator color={Colors.textDark} />
                  : <Text style={styles.botaoSalvarTexto}>Criar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Trocar Senha ── */}
      <Modal visible={modalSenha} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Trocar Senha</Text>
            {usuarioSenha && (
              <Text style={styles.modalSubtitulo}>{usuarioSenha.nome}</Text>
            )}

            {erroSenha ? <Text style={styles.msgErro}>{erroSenha}</Text> : null}
            {sucessoSenha ? <Text style={styles.msgSucesso}>{sucessoSenha}</Text> : null}

            {/* Senha antiga só aparece se for o próprio usuário */}
            {usuarioSenha?.id === usuarioLogado?.id && (
              <>
                <Text style={styles.label}>Senha atual</Text>
                <TextInput style={styles.input} value={senhaAntiga} onChangeText={setSenhaAntiga}
                  placeholderTextColor={Colors.textSecondary} placeholder="••••••" secureTextEntry />
              </>
            )}

            <Text style={styles.label}>Nova senha</Text>
            <TextInput style={styles.input} value={novaSenha} onChangeText={setNovaSenha}
              placeholderTextColor={Colors.textSecondary} placeholder="Mínimo 6 caracteres" secureTextEntry />

            <Text style={styles.label}>Confirmar nova senha</Text>
            <TextInput style={styles.input} value={confirmSenha} onChangeText={setConfirmSenha}
              placeholderTextColor={Colors.textSecondary} placeholder="••••••" secureTextEntry />

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalSenha(false)}>
                <Text style={styles.botaoCancelarTexto}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoSalvar} onPress={salvarSenha} disabled={salvandoSenha}>
                {salvandoSenha
                  ? <ActivityIndicator color={Colors.textDark} />
                  : <Text style={styles.botaoSalvarTexto}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  titulo: { color: Colors.text, fontSize: 20, fontWeight: 'bold' },
  botaoNovo: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  botaoNovoTexto: { color: Colors.textDark, fontWeight: 'bold', fontSize: 14 },

  lista: { padding: 16, paddingTop: 4, gap: 10 },
  vazio: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },

  card: {
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, padding: 14,
  },
  cardInativo: { opacity: 0.5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardNome: { color: Colors.text, fontWeight: 'bold', fontSize: 15 },
  cardEmail: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'center', gap: 4 },
  ativoLabel: { color: Colors.textSecondary, fontSize: 11 },
  iconBtn: { padding: 4 },
  iconBtnTexto: { fontSize: 18 },

  perfisRow: { flexDirection: 'row', gap: 8 },
  perfilBtn: {
    flex: 1, padding: 8, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  perfilBtnAtivo: { backgroundColor: '#2A1E00', borderColor: Colors.primary },
  perfilBtnTexto: { color: Colors.textSecondary, fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  perfilBtnTextoAtivo: { color: Colors.primary },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: Colors.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalTitulo: { color: Colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitulo: { color: Colors.textSecondary, fontSize: 13, marginBottom: 16 },
  label: { color: Colors.textSecondary, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, color: Colors.text, fontSize: 14, marginBottom: 12,
  },
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
