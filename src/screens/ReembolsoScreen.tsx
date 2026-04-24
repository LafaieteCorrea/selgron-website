import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Image, FlatList, Switch, Alert, Platform,
} from 'react-native';
import { showAlert } from '../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import DatePicker from '../components/DatePicker';
import {
  RelatorioReembolso, NotaReembolso, TipoNota,
  salvarRelatorio, getRelatorios,
  getUsuarioLogado, gerarId, calcularTotalNotas,
} from '../utils/storage';
import { gerarPDFReembolso } from '../utils/pdf';

type Tela = 'lista' | 'novoRelatorio' | 'adicionarNota' | 'verRelatorio';
const TIPOS_NOTA: TipoNota[] = ['Combustível', 'Hospedagem', 'Alimentação', 'Pedágio', 'Outros'];

export default function ReembolsoScreen() {
  const [tela, setTela] = useState<Tela>('lista');
  const [relatorios, setRelatorios] = useState<RelatorioReembolso[]>([]);
  const [relatorioAtual, setRelatorioAtual] = useState<RelatorioReembolso | null>(null);

  // Campos novo relatório
  const [clientes, setClientes] = useState('');
  const [acompanhantes, setAcompanhantes] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [observacoes, setObservacoes] = useState('');

  // Campos nova nota
  const [tipo, setTipo] = useState<TipoNota>('Combustível');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string>('');
  const [extraviada, setExtraviada] = useState(false);
  const [dataNotaDate, setDataNotaDate] = useState<Date>(new Date());
  const [notaEditandoId, setNotaEditandoId] = useState<string | null>(null);

  useEffect(() => { if (tela === 'lista') carregarRelatorios(); }, [tela]);

  async function carregarRelatorios() {
    const usuario = getUsuarioLogado();
    if (usuario) setRelatorios(await getRelatorios(usuario.id));
  }

  function formatarPeriodo(ini: Date | null, fim: Date | null): string {
    if (!ini) return '';
    const f = (d: Date) => d.toLocaleDateString('pt-BR');
    return fim ? `${f(ini)} a ${f(fim)}` : f(ini);
  }

  async function criarRelatorio() {
    if (!clientes || !dataInicio || !dataFim) {
      showAlert('Atenção', 'Preencha o cliente, a data de início e a data de fim.');
      return;
    }
    const usuario = getUsuarioLogado();
    if (!usuario) return;
    const novo: RelatorioReembolso = {
      id: gerarId(),
      tecnico: usuario.nome,
      clientes,
      acompanhantes,
      periodo: formatarPeriodo(dataInicio, dataFim),
      observacoes,
      notas: [],
      dataCriacao: new Date().toLocaleString('pt-BR'),
      gerado: false,
      usuarioId: usuario.id,
    };
    const erro = await salvarRelatorio(novo);
    if (erro) {
      showAlert('Erro ao salvar', erro);
      return;
    }
    setRelatorioAtual(novo);
    limparCamposRelatorio();
    setTela('verRelatorio');
  }

  function limparCamposRelatorio() {
    setClientes(''); setAcompanhantes('');
    setDataInicio(null); setDataFim(null); setObservacoes('');
  }

  function limparCamposNota() {
    setTipo('Combustível'); setValor(''); setDescricao('');
    setFotoUri(null); setFotoBase64(''); setExtraviada(false); setDataNotaDate(new Date());
    setNotaEditandoId(null);
  }

  function iniciarEditarNota(n: NotaReembolso) {
    setNotaEditandoId(n.id);
    setTipo(n.tipo);
    setValor(n.valor);
    setDescricao(n.descricao);
    setFotoUri(n.fotoUri || null);
    setFotoBase64(n.fotoBase64 || '');
    setExtraviada(n.extraviada);
    // n.dataHora vem como "dd/mm/yyyy"; se falhar, usa hoje
    const m = n.dataHora?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    setDataNotaDate(m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date());
    setTela('adicionarNota');
  }

  function confirmarExcluirNota(n: NotaReembolso) {
    const titulo = 'Excluir despesa';
    const msg = `Remover ${n.tipo} de R$ ${parseFloat(n.valor.replace(',', '.')).toFixed(2)}?`;
    const executar = () => excluirNota(n.id);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${titulo}\n\n${msg}`)) executar();
    } else {
      Alert.alert(titulo, msg, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: executar },
      ]);
    }
  }

  async function excluirNota(id: string) {
    if (!relatorioAtual) return;
    const atualizado = { ...relatorioAtual, notas: relatorioAtual.notas.filter(n => n.id !== id) };
    const erro = await salvarRelatorio(atualizado);
    if (erro) { showAlert('Erro ao excluir', erro); return; }
    setRelatorioAtual(atualizado);
  }

  async function tirarFoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showAlert('Permissão necessária', 'Precisamos da câmera.'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
    if (!res.canceled) {
      setFotoUri(res.assets[0].uri);
      setFotoBase64(res.assets[0].base64 ? `data:image/jpeg;base64,${res.assets[0].base64}` : '');
    }
  }

  async function escolherDaGaleria() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showAlert('Permissão necessária', 'Precisamos acessar a galeria.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled) {
      const asset = res.assets[0];
      setFotoUri(asset.uri);
      if (asset.base64) {
        setFotoBase64(`data:image/jpeg;base64,${asset.base64}`);
      } else if (asset.uri.startsWith('data:')) {
        setFotoBase64(asset.uri);
      } else {
        setFotoBase64('');
      }
    }
  }

  function removerFoto() {
    setFotoUri(null);
    setFotoBase64('');
  }

  async function salvarNota() {
    if (!valor) { showAlert('Atenção', 'Informe o valor.'); return; }
    if (!extraviada && !fotoUri) { showAlert('Atenção', 'Tire a foto ou marque como extraviada.'); return; }
    if (!relatorioAtual) return;

    const dadosNota = {
      tipo, valor, descricao,
      fotoUri: fotoUri || '',
      fotoBase64: fotoBase64 || '',
      extraviada,
      dataHora: dataNotaDate.toLocaleDateString('pt-BR'),
    };

    let atualizado: RelatorioReembolso;
    if (notaEditandoId) {
      atualizado = {
        ...relatorioAtual,
        notas: relatorioAtual.notas.map(n =>
          n.id === notaEditandoId ? { ...n, ...dadosNota } : n
        ),
      };
    } else {
      const nova: NotaReembolso = { id: gerarId(), ...dadosNota };
      atualizado = { ...relatorioAtual, notas: [...relatorioAtual.notas, nova] };
    }

    const erro = await salvarRelatorio(atualizado);
    if (erro) {
      showAlert('Erro ao salvar despesa', erro);
      return;
    }
    setRelatorioAtual(atualizado);
    limparCamposNota();
    setTela('verRelatorio');
  }

  async function gerarPDF(rel?: RelatorioReembolso) {
    const alvo = rel ?? relatorioAtual;
    if (!alvo) return;

    await gerarPDFReembolso(alvo);

    if (!alvo.gerado) {
      const atualizado = { ...alvo, gerado: true };
      const erro = await salvarRelatorio(atualizado);
      if (!erro) {
        if (!rel) setRelatorioAtual(atualizado);
        setRelatorios(prev => prev.map(r => r.id === atualizado.id ? atualizado : r));
      }
    }
  }

  // ─── Tela: Novo Relatório ──────────────────────────────────────────────────

  if (tela === 'novoRelatorio') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <Text style={styles.tituloPagina}>NOVO RELATÓRIO</Text>

        <Text style={styles.label}>Cliente(s) visitado(s) *</Text>
        <TextInput style={styles.input} placeholder="Nome do cliente" placeholderTextColor={Colors.textSecondary} value={clientes} onChangeText={setClientes} />

        <Text style={styles.label}>Acompanhantes da viagem</Text>
        <TextInput style={styles.input} placeholder="Nomes dos acompanhantes" placeholderTextColor={Colors.textSecondary} value={acompanhantes} onChangeText={setAcompanhantes} />

        <DatePicker label="Data de Início *" value={dataInicio} onChange={setDataInicio} />
        <DatePicker label="Data de Fim *" value={dataFim} onChange={setDataFim} />

        <Text style={styles.label}>Observações gerais</Text>
        <TextInput style={[styles.input, styles.inputMulti]} placeholder="Informações adicionais..." placeholderTextColor={Colors.textSecondary} value={observacoes} onChangeText={setObservacoes} multiline numberOfLines={3} />

        <TouchableOpacity style={styles.botao} onPress={criarRelatorio}>
          <Text style={styles.botaoTexto}>CRIAR RELATÓRIO</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botaoSecundario} onPress={() => { limparCamposRelatorio(); setTela('lista'); }}>
          <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Tela: Adicionar Nota ──────────────────────────────────────────────────

  if (tela === 'adicionarNota') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <Text style={styles.tituloPagina}>{notaEditandoId ? 'EDITAR DESPESA' : 'ADICIONAR DESPESA'}</Text>

        <Text style={styles.label}>Tipo de nota</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          {TIPOS_NOTA.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, tipo === t && styles.chipAtivo]} onPress={() => setTipo(t)}>
              <Text style={[styles.chipTexto, tipo === t && styles.chipTextoAtivo]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <DatePicker label="Data da despesa" value={dataNotaDate} onChange={setDataNotaDate} />

        <Text style={styles.label}>Valor (R$) *</Text>
        <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={Colors.textSecondary} value={valor} onChangeText={setValor} keyboardType="numeric" />

        <Text style={styles.label}>Descrição</Text>
        <TextInput style={styles.input} placeholder="Ex: Abastecimento posto BR..." placeholderTextColor={Colors.textSecondary} value={descricao} onChangeText={setDescricao} />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Nota extraviada</Text>
            <Text style={styles.switchSub}>Sem foto — só registro do valor</Text>
          </View>
          <Switch value={extraviada} onValueChange={v => { setExtraviada(v); if (v) removerFoto(); }} trackColor={{ true: Colors.primary }} thumbColor={Colors.text} />
        </View>

        {!extraviada && (
          <>
            {!fotoUri && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                <TouchableOpacity style={[styles.botaoFoto, { flex: 1 }]} onPress={tirarFoto}>
                  <Text style={styles.botaoFotoTexto}>📷 Câmera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botaoFoto, { flex: 1 }]} onPress={escolherDaGaleria}>
                  <Text style={styles.botaoFotoTexto}>🖼 Galeria</Text>
                </TouchableOpacity>
              </View>
            )}
            {fotoUri && (
              <View style={styles.fotoPreviewContainer}>
                <Image source={{ uri: fotoUri }} style={styles.fotoPreview} />
                <View style={styles.fotoAcoesRow}>
                  <TouchableOpacity style={styles.fotoAcaoBtn} onPress={tirarFoto}>
                    <Text style={styles.fotoAcaoTexto}>📷 Refazer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fotoAcaoBtn} onPress={escolherDaGaleria}>
                    <Text style={styles.fotoAcaoTexto}>🖼 Trocar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.fotoAcaoBtn, styles.fotoAcaoExcluir]} onPress={removerFoto}>
                    <Text style={[styles.fotoAcaoTexto, styles.fotoAcaoTextoExcluir]}>🗑 Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {extraviada && (
          <View style={styles.alertaCard}>
            <Text style={styles.alertaTexto}>⚠ Nota extraviada — sem foto anexada</Text>
          </View>
        )}

        <TouchableOpacity style={styles.botao} onPress={salvarNota}>
          <Text style={styles.botaoTexto}>{notaEditandoId ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR AO RELATÓRIO'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botaoSecundario} onPress={() => { limparCamposNota(); setTela('verRelatorio'); }}>
          <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Tela: Ver Relatório ───────────────────────────────────────────────────

  if (tela === 'verRelatorio' && relatorioAtual) {
    const total = calcularTotalNotas(relatorioAtual.notas);
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.tituloPagina}>RELATÓRIO</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>{relatorioAtual.clientes}</Text>
            <Text style={styles.cardSub}>{relatorioAtual.periodo}</Text>
            {relatorioAtual.acompanhantes ? <Text style={styles.cardSub}>Acomp.: {relatorioAtual.acompanhantes}</Text> : null}
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.secaoTitulo}>DESPESAS ({relatorioAtual.notas.length})</Text>
            <TouchableOpacity onPress={() => setTela('adicionarNota')}>
              <Text style={styles.linkPrimario}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>

          {relatorioAtual.notas.length === 0 && (
            <Text style={styles.textoVazio}>Nenhuma despesa adicionada ainda.</Text>
          )}

          {relatorioAtual.notas.map(n => (
            <View key={n.id} style={styles.notaCard}>
              <View style={styles.rowBetween}>
                <View style={styles.notaTipoBadge}>
                  <Text style={styles.notaTipoTexto}>{n.tipo}</Text>
                </View>
                <Text style={styles.notaValor}>R$ {parseFloat(n.valor.replace(',', '.')).toFixed(2)}</Text>
              </View>
              <Text style={styles.notaData}>{n.dataHora}</Text>
              {n.descricao ? <Text style={styles.notaDesc}>{n.descricao}</Text> : null}
              {n.extraviada && (
                <View style={styles.extraviadaBadge}>
                  <Text style={styles.extraviadaTexto}>Nota extraviada</Text>
                </View>
              )}
              {n.fotoUri ? (
                <Image source={{ uri: n.fotoUri }} style={styles.fotoNota} resizeMode="cover" />
              ) : null}
              <View style={styles.notaAcoesRow}>
                <TouchableOpacity style={styles.notaAcaoBtn} onPress={() => iniciarEditarNota(n)}>
                  <Text style={styles.notaAcaoTexto}>✏ Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.notaAcaoBtn, styles.notaAcaoExcluir]} onPress={() => confirmarExcluirNota(n)}>
                  <Text style={[styles.notaAcaoTexto, styles.notaAcaoTextoExcluir]}>🗑 Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {relatorioAtual.notas.length > 0 && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Geral</Text>
              <Text style={styles.totalValor}>R$ {total.toFixed(2)}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.rodape}>
          <TouchableOpacity style={styles.botao} onPress={() => gerarPDF()}>
            <Text style={styles.botaoTexto}>GERAR PDF E EXPORTAR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoSecundario} onPress={() => setTela('lista')}>
            <Text style={styles.botaoSecundarioTexto}>Voltar à lista</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Tela: Lista ──────────────────────────────────────────────────────────

  const perfilAtual = getUsuarioLogado()?.perfil;
  const soRegistro = perfilAtual === 'gestor';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.botaoNovo} onPress={() => setTela('novoRelatorio')}>
        <Text style={styles.botaoTexto}>+ NOVO RELATÓRIO</Text>
      </TouchableOpacity>
      {soRegistro ? (
        <View style={styles.vazio}>
          <Text style={styles.textoVazio}>
            Para consultar relatórios, acesse a aba{'\n'}
            <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>📊 Painel</Text>.
          </Text>
        </View>
      ) : relatorios.length === 0 ? (
        <View style={styles.vazio}>
          <Text style={styles.textoVazio}>Nenhum relatório criado ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={relatorios}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.relatorioRow}>
              <TouchableOpacity
                style={styles.relatorioCardFlex}
                onPress={() => { setRelatorioAtual(item); setTela('verRelatorio'); }}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.relatorioCliente}>{item.clientes}</Text>
                  <View style={[styles.badge, item.gerado ? styles.badgeVerde : styles.badgeAmarelo]}>
                    <Text style={styles.badgeTexto}>{item.gerado ? 'Gerado' : 'Rascunho'}</Text>
                  </View>
                </View>
                <Text style={styles.relatorioPeriodo}>{item.periodo}</Text>
                <Text style={styles.relatorioSub}>{item.notas.length} despesa(s) · R$ {calcularTotalNotas(item.notas).toFixed(2)}</Text>
              </TouchableOpacity>
              {item.gerado && (
                <TouchableOpacity style={styles.pdfSideBtn} onPress={() => gerarPDF(item)}>
                  <Text style={styles.pdfSideTexto}>📄{'\n'}PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  tituloPagina: { fontSize: 18, fontWeight: '900', color: Colors.primary, letterSpacing: 3, marginBottom: 20 },
  label: { color: Colors.textSecondary, fontSize: 12, letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: Colors.card, borderRadius: 8, padding: 14, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  botao: { backgroundColor: Colors.primary, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16 },
  botaoTexto: { color: Colors.textDark, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  botaoSecundario: { padding: 14, alignItems: 'center' },
  botaoSecundarioTexto: { color: Colors.textSecondary, fontSize: 14 },
  botaoNovo: { backgroundColor: Colors.primary, margin: 16, borderRadius: 8, padding: 14, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.card, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  chipAtivo: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTexto: { color: Colors.textSecondary, fontSize: 13 },
  chipTextoAtivo: { color: Colors.textDark, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.card, padding: 14, borderRadius: 8, marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  switchLabel: { color: Colors.text, fontSize: 14, fontWeight: 'bold' },
  switchSub: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  botaoFoto: { backgroundColor: Colors.card, borderRadius: 8, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', marginTop: 16 },
  botaoFotoTexto: { color: Colors.primary, fontSize: 14 },
  fotoPreviewContainer: { marginTop: 12, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  fotoPreview: { width: '100%', height: 200 },
  fotoAcoesRow: { flexDirection: 'row', backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border },
  fotoAcaoBtn: { flex: 1, padding: 12, alignItems: 'center', borderRightWidth: 1, borderRightColor: Colors.border },
  fotoAcaoTexto: { color: Colors.primary, fontSize: 13, fontWeight: 'bold' },
  fotoAcaoExcluir: { borderRightWidth: 0 },
  fotoAcaoTextoExcluir: { color: Colors.error },
  alertaCard: { backgroundColor: '#3A1A1A', borderRadius: 8, padding: 12, marginTop: 12, borderWidth: 1, borderColor: Colors.error },
  alertaTexto: { color: Colors.error, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: Colors.card, borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardTitulo: { color: Colors.text, fontWeight: 'bold', fontSize: 16 },
  cardSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  secaoTitulo: { color: Colors.textSecondary, fontSize: 12, letterSpacing: 1, fontWeight: 'bold' },
  linkPrimario: { color: Colors.primary, fontSize: 14, fontWeight: 'bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  textoVazio: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 16 },
  notaCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  notaTipoBadge: { backgroundColor: '#2A1E00', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.primary },
  notaTipoTexto: { color: Colors.primary, fontWeight: 'bold', fontSize: 12 },
  notaValor: { color: Colors.text, fontWeight: '900', fontSize: 18 },
  notaData: { color: Colors.textSecondary, fontSize: 11, marginTop: 6 },
  notaDesc: { color: Colors.text, fontSize: 13, marginTop: 4 },
  extraviadaBadge: { backgroundColor: '#3A1A1A', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8, alignSelf: 'flex-start' },
  extraviadaTexto: { color: Colors.error, fontSize: 11 },
  fotoNota: { width: '100%', height: 160, borderRadius: 8, marginTop: 10 },
  notaAcoesRow: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  notaAcaoBtn: { flex: 1, padding: 10, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  notaAcaoTexto: { color: Colors.primary, fontSize: 13, fontWeight: 'bold' },
  notaAcaoExcluir: { borderColor: Colors.error },
  notaAcaoTextoExcluir: { color: Colors.error },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A1E00', borderRadius: 10, padding: 16, marginTop: 8, borderWidth: 1, borderColor: Colors.primary },
  totalLabel: { color: Colors.textSecondary, fontSize: 14 },
  totalValor: { color: Colors.primary, fontWeight: '900', fontSize: 22 },
  rodape: { padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  vazio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  relatorioCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  relatorioCliente: { color: Colors.text, fontWeight: 'bold', fontSize: 15 },
  relatorioPeriodo: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  relatorioSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeVerde: { backgroundColor: '#1A3A1A' },
  badgeAmarelo: { backgroundColor: '#3A2A00' },
  badgeTexto: { fontSize: 11, fontWeight: 'bold', color: Colors.text },
  relatorioRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  relatorioCardFlex: { flex: 1, backgroundColor: Colors.card, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: Colors.border },
  pdfSideBtn: { width: 70, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A1E00' },
  pdfSideTexto: { color: Colors.primary, fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
});
