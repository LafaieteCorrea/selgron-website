import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Image, FlatList, Switch, Platform,
} from 'react-native';
import { showAlert } from '../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';
import DatePicker from '../components/DatePicker';
import {
  RelatorioReembolso, NotaReembolso, TipoNota,
  salvarRelatorio, getRelatorios,
  getUsuarioLogado, gerarId, calcularTotalNotas,
} from '../utils/storage';

type Tela = 'lista' | 'novoRelatorio' | 'adicionarNota' | 'verRelatorio';
const TIPOS_NOTA: TipoNota[] = ['Combustível', 'Hospedagem', 'Alimentação', 'Pedágio', 'Outros'];

function construirHTMLRelatorio(r: RelatorioReembolso): string {
  const total = calcularTotalNotas(r.notas);

  const linhasTabela = r.notas.map((n, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${n.dataHora}</td>
      <td>${n.tipo}</td>
      <td>${n.descricao || '-'}</td>
      <td style="text-align:right;font-weight:bold">R$ ${parseFloat(n.valor.replace(',', '.')).toFixed(2)}</td>
      <td style="text-align:center">${n.extraviada ? '<span style="color:#cc4400">Extraviada</span>' : '✓'}</td>
    </tr>
  `).join('');

  const paginasFotos = r.notas
    .filter(n => n.fotoBase64 && !n.extraviada)
    .map((n, i) => `
      <div style="page-break-before:always;padding:24px">
        <div style="color:#F5A200;font-size:14px;font-weight:bold;letter-spacing:2px;margin-bottom:4px">COMPROVANTE ${i + 1}</div>
        <div style="font-size:11px;color:#888;margin-bottom:20px">Relatório: ${r.clientes} — ${r.periodo}</div>
        <div style="display:flex;gap:16px;margin-bottom:20px">
          <div style="flex:1">
            <div style="font-size:9px;color:#999;letter-spacing:1px;margin-bottom:3px">TIPO</div>
            <div style="background:#f5f5f5;padding:7px 10px;border-radius:4px;font-size:13px">${n.tipo}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:9px;color:#999;letter-spacing:1px;margin-bottom:3px">DATA</div>
            <div style="background:#f5f5f5;padding:7px 10px;border-radius:4px;font-size:13px">${n.dataHora}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:9px;color:#999;letter-spacing:1px;margin-bottom:3px">VALOR</div>
            <div style="background:#fff8e6;padding:7px 10px;border-radius:4px;font-size:15px;font-weight:bold;color:#F5A200">R$ ${parseFloat(n.valor.replace(',', '.')).toFixed(2)}</div>
          </div>
        </div>
        ${n.descricao ? `
        <div style="font-size:9px;color:#999;letter-spacing:1px;margin-bottom:3px">DESCRIÇÃO</div>
        <div style="background:#f5f5f5;padding:7px 10px;border-radius:4px;font-size:13px;margin-bottom:20px">${n.descricao}</div>
        ` : ''}
        <div style="text-align:center">
          <img src="${n.fotoBase64}" style="width:480px;max-height:360px;object-fit:contain;border-radius:8px;border:1px solid #ddd"/>
          <div style="font-size:10px;color:#999;margin-top:8px">${n.tipo} — ${n.dataHora}</div>
        </div>
      </div>
    `).join('');

  return `
    <html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial;padding:24px;color:#1A1A1A;font-size:13px}
      h1{color:#F5A200;font-size:20px;margin:0}
      .sub{color:#888;font-size:11px;margin:4px 0 20px}
      .grid{display:flex;gap:16px;margin-bottom:10px}
      .col{flex:1}
      .lb{font-size:9px;color:#999;letter-spacing:1px;margin-bottom:3px}
      .vl{background:#f5f5f5;padding:7px 10px;border-radius:4px;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th{background:#F5A200;color:#1A1A1A;padding:8px;font-size:11px;text-align:left}
      td{padding:7px 8px;border-bottom:1px solid #eee;vertical-align:top;font-size:12px}
      .total-box{text-align:right;margin-top:16px;padding:14px;background:#fff8e6;border-radius:8px;border:1px solid #F5A200}
      .total-val{font-size:20px;font-weight:bold;color:#F5A200}
      .rodape{margin-top:32px;font-size:10px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:12px}
    </style></head><body>
    <h1>SELGRON — Relatório de Reembolso</h1>
    <div class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
    <div class="grid">
      <div class="col"><div class="lb">TÉCNICO</div><div class="vl">${r.tecnico}</div></div>
      <div class="col"><div class="lb">PERÍODO</div><div class="vl">${r.periodo}</div></div>
    </div>
    <div class="grid">
      <div class="col"><div class="lb">CLIENTE(S)</div><div class="vl">${r.clientes}</div></div>
      <div class="col"><div class="lb">ACOMPANHANTES</div><div class="vl">${r.acompanhantes || '-'}</div></div>
    </div>
    ${r.observacoes ? `<div class="lb">OBSERVAÇÕES</div><div class="vl">${r.observacoes}</div>` : ''}
    <table>
      <tr><th>#</th><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Nota</th></tr>
      ${linhasTabela}
    </table>
    <div class="total-box">
      <div style="font-size:11px;color:#999;margin-bottom:4px">TOTAL GERAL</div>
      <div class="total-val">R$ ${total.toFixed(2)}</div>
    </div>
    <div class="rodape">Selgron Field Tech App — VERSÃO DEMONSTRAÇÃO</div>
    ${paginasFotos}
    </body></html>
  `;
}

async function abrirPDF(r: RelatorioReembolso): Promise<void> {
  const html = construirHTMLRelatorio(r);

  if (Platform.OS === 'web') {
    // Abre o popup SINCRONAMENTE pra não perder o user-gesture context.
    const w = window.open('', '_blank');
    if (!w) {
      showAlert('Popup bloqueado', 'Libere popups para este site e tente novamente.');
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Relatório' });
  }
}

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

  async function adicionarNota() {
    if (!valor) { showAlert('Atenção', 'Informe o valor.'); return; }
    if (!extraviada && !fotoUri) { showAlert('Atenção', 'Tire a foto ou marque como extraviada.'); return; }
    if (!relatorioAtual) return;

    const nota: NotaReembolso = {
      id: gerarId(), tipo, valor, descricao,
      fotoUri: fotoUri || '',
      fotoBase64: fotoBase64 || '',
      extraviada,
      dataHora: dataNotaDate.toLocaleDateString('pt-BR'),
    };

    const atualizado = { ...relatorioAtual, notas: [...relatorioAtual.notas, nota] };
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
    if (!alvo || alvo.notas.length === 0) {
      showAlert('Atenção', 'Adicione pelo menos uma despesa.');
      return;
    }

    // Abre o popup ANTES de qualquer await — preserva o user-gesture no navegador.
    let winWeb: Window | null = null;
    if (Platform.OS === 'web') {
      winWeb = window.open('', '_blank');
      if (!winWeb) {
        showAlert('Popup bloqueado', 'Libere popups para este site e tente novamente.');
        return;
      }
    }

    const html = construirHTMLRelatorio(alvo);

    // Marca como gerado em paralelo — se ainda não estiver
    if (!alvo.gerado) {
      const atualizado = { ...alvo, gerado: true };
      const erro = await salvarRelatorio(atualizado);
      if (!erro) {
        if (!rel) setRelatorioAtual(atualizado);
        setRelatorios(prev => prev.map(r => r.id === atualizado.id ? atualizado : r));
      }
    }

    if (Platform.OS === 'web' && winWeb) {
      winWeb.document.write(html);
      winWeb.document.close();
      setTimeout(() => winWeb!.print(), 500);
    } else if (Platform.OS !== 'web') {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Relatório' });
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
        <Text style={styles.tituloPagina}>ADICIONAR DESPESA</Text>

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

        <TouchableOpacity style={styles.botao} onPress={adicionarNota}>
          <Text style={styles.botaoTexto}>ADICIONAR AO RELATÓRIO</Text>
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

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.botaoNovo} onPress={() => setTela('novoRelatorio')}>
        <Text style={styles.botaoTexto}>+ NOVO RELATÓRIO</Text>
      </TouchableOpacity>
      {relatorios.length === 0 ? (
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
