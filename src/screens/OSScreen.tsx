import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, FlatList, Switch, Modal, Platform,
} from 'react-native';
import { showAlert } from '../utils/alert';
import SignaturePad, { SignaturePadRef } from '../components/SignaturePad';
import * as ImagePicker from 'expo-image-picker';
import DatePicker from '../components/DatePicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Image } from 'react-native';
import { Colors } from '../theme/colors';
import {
  OrdemServico, DiaHoras, PecaOS, MotivoVisita,
  salvarOS, getOrdens, getUsuarioLogado,
  gerarId, gerarNumeroOS, calcularTotalPecas,
} from '../utils/storage';

type Tela = 'lista' | 'novaOS' | 'assinatura' | 'verOS';
type EtapaOS = 'identificacao' | 'maquina' | 'horas' | 'servico' | 'pecas';

const MOTIVOS: MotivoVisita[] = ['Assistência Técnica', 'Manutenção', 'Instalação', 'Demonstração', 'Treinamento'];

function osVazia(tecnico: string, usuarioId: string): OrdemServico {
  return {
    id: gerarId(),
    numeroOS: gerarNumeroOS(),
    dataAbertura: new Date().toLocaleDateString('pt-BR'),
    cidade: '', cliente: '', contato: '',
    chassi: '', modelo: '', emGarantia: false, fimGarantia: '',
    motivoVisita: 'Assistência Técnica',
    kmRodados: '',
    diasHoras: [],
    descricaoServico: '',
    fotosAtendimento: [],
    pecas: [],
    assinaturaTecnico: '', assinaturaCliente: '', dataAssinatura: '',
    tecnico, usuarioId, gerada: false,
  };
}

export default function OSScreen() {
  const [tela, setTela] = useState<Tela>('lista');
  const [etapa, setEtapa] = useState<EtapaOS>('identificacao');
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [os, setOS] = useState<OrdemServico | null>(null);
  const [assinandoTecnico, setAssinandoTecnico] = useState(true);
  const [camposInvalidos, setCamposInvalidos] = useState<Set<string>>(new Set());
  const [salvandoOS, setSalvandoOS] = useState(false);
  const sigRef = useRef<SignaturePadRef>(null);

  function limparInvalido(campo: string) {
    setCamposInvalidos(prev => { const s = new Set(prev); s.delete(campo); return s; });
  }

  function validarEtapa(): boolean {
    if (!os) return false;
    const invalidos: string[] = [];
    if (etapa === 'identificacao') {
      if (!os.cliente.trim()) invalidos.push('cliente');
      if (!os.cidade.trim()) invalidos.push('cidade');
    }
    if (etapa === 'maquina') {
      if (!os.modelo.trim()) invalidos.push('modelo');
      if (!os.chassi.trim()) invalidos.push('chassi');
    }
    if (etapa === 'servico') {
      if (!os.descricaoServico.trim()) invalidos.push('descricaoServico');
    }
    if (invalidos.length > 0) { setCamposInvalidos(new Set(invalidos)); return false; }
    setCamposInvalidos(new Set());
    return true;
  }

  useEffect(() => { if (tela === 'lista') carregarOrdens(); }, [tela]);

  async function carregarOrdens() {
    const u = getUsuarioLogado();
    if (u) setOrdens(await getOrdens(u.id));
  }

  function iniciarNovaOS() {
    const u = getUsuarioLogado();
    if (!u) return;
    setOS(osVazia(u.nome, u.id));
    setEtapa('identificacao');
    setTela('novaOS');
  }

  function atualizar(campo: Partial<OrdemServico>) {
    setOS(prev => prev ? { ...prev, ...campo } : prev);
  }

  // ─── Dias/Horas ─────────────────────────────────────────────────────────────

  function adicionarDia() {
    if (!os) return;
    const novo: DiaHoras = {
      id: gerarId(), data: '',
      horaInicioDeslocamento: '', horaFimDeslocamento: '',
      horaInicioAtendimento: '', horaFimAtendimento: '',
    };
    atualizar({ diasHoras: [...os.diasHoras, novo] });
  }

  function atualizarDia(id: string, campo: Partial<DiaHoras>) {
    if (!os) return;
    atualizar({ diasHoras: os.diasHoras.map(d => d.id === id ? { ...d, ...campo } : d) });
  }

  function removerDia(id: string) {
    if (!os) return;
    atualizar({ diasHoras: os.diasHoras.filter(d => d.id !== id) });
  }

  // ─── Peças ───────────────────────────────────────────────────────────────────

  function adicionarPeca() {
    if (!os) return;
    const nova: PecaOS = { id: gerarId(), descricao: '', codigo: '', quantidade: '1', valorUnitario: '' };
    atualizar({ pecas: [...os.pecas, nova] });
  }

  function atualizarPeca(id: string, campo: Partial<PecaOS>) {
    if (!os) return;
    atualizar({ pecas: os.pecas.map(p => p.id === id ? { ...p, ...campo } : p) });
  }

  function removerPeca(id: string) {
    if (!os) return;
    atualizar({ pecas: os.pecas.filter(p => p.id !== id) });
  }

  // ─── Fotos do Atendimento ────────────────────────────────────────────────────

  async function tirarFotoAtendimento() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showAlert('Permissão necessária', 'Precisamos da câmera.'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true });
    if (!res.canceled && os) {
      const foto = { id: gerarId(), uri: res.assets[0].uri, base64: res.assets[0].base64 ? `data:image/jpeg;base64,${res.assets[0].base64}` : '' };
      atualizar({ fotosAtendimento: [...os.fotosAtendimento, foto] });
    }
  }

  async function escolherFotoGaleria() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showAlert('Permissão necessária', 'Precisamos acessar a galeria.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.5, base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
    });
    if (!res.canceled && os) {
      const novas = res.assets.map(asset => {
        let b64 = '';
        if (asset.base64) b64 = `data:image/jpeg;base64,${asset.base64}`;
        else if (asset.uri.startsWith('data:')) b64 = asset.uri;
        return { id: gerarId(), uri: asset.uri, base64: b64 };
      });
      atualizar({ fotosAtendimento: [...os.fotosAtendimento, ...novas] });
    }
  }

  function removerFoto(id: string) {
    if (!os) return;
    atualizar({ fotosAtendimento: os.fotosAtendimento.filter(f => f.id !== id) });
  }

  // ─── Assinatura ──────────────────────────────────────────────────────────────

  function abrirAssinatura() {
    if (!os) return;
    setAssinandoTecnico(true);
    setTela('assinatura');
  }

  async function handleAssinatura(sig: string) {
    if (!os) return;
    if (assinandoTecnico) {
      const osAtualizada = { ...os, assinaturaTecnico: sig };
      setOS(osAtualizada);
      if (Platform.OS === 'web') {
        setAssinandoTecnico(false);
        sigRef.current?.clearSignature();
      } else {
        Alert.alert('Técnico', 'Assinatura registrada!\nAgora passe o celular para o cliente assinar.', [
          { text: 'OK', onPress: () => { setAssinandoTecnico(false); sigRef.current?.clearSignature(); } },
        ]);
      }
    } else {
      const dataAssinatura = new Date().toLocaleString('pt-BR');
      const osAtualizada = { ...os, assinaturaCliente: sig, dataAssinatura, gerada: true };
      setOS(osAtualizada);
      setSalvandoOS(true);
      const erro = await salvarOS(osAtualizada);
      setSalvandoOS(false);
      if (erro) {
        showAlert('Erro ao salvar OS', erro);
        return;
      }
      setTela('verOS');
      gerarPDF(osAtualizada);
    }
  }

  // ─── PDF ─────────────────────────────────────────────────────────────────────

  async function gerarPDF(osFinal?: OrdemServico) {
    const dados = osFinal || os;
    if (!dados) return;
    const totalPecas = calcularTotalPecas(dados.pecas);

    const linhasDias = dados.diasHoras.map(d => `
      <tr>
        <td>${d.data}</td>
        <td>${d.horaInicioDeslocamento}</td><td>${d.horaFimDeslocamento}</td>
        <td>${d.horaInicioAtendimento}</td><td>${d.horaFimAtendimento}</td>
      </tr>`).join('');

    const linhasPecas = dados.pecas.map(p => {
      const total = (parseFloat(p.quantidade) || 0) * (parseFloat(p.valorUnitario.replace(',', '.')) || 0);
      return `<tr><td>${p.descricao}</td><td>${p.codigo}</td><td>${p.quantidade}</td><td>R$ ${parseFloat(p.valorUnitario.replace(',', '.')).toFixed(2)}</td><td>R$ ${total.toFixed(2)}</td></tr>`;
    }).join('');

    const html = `
    <html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial;padding:20px;color:#1A1A1A;font-size:12px}
      h1{color:#F5A200;font-size:18px;margin:0}
      h2{font-size:11px;color:#888;margin:2px 0 16px}
      .grid{display:flex;gap:12px;margin-bottom:10px}
      .col{flex:1}
      .lb{font-size:9px;color:#999;letter-spacing:1px;margin-bottom:2px}
      .vl{background:#f5f5f5;padding:5px 8px;border-radius:3px;font-size:12px}
      .sec{font-size:10px;font-weight:bold;color:#F5A200;margin:14px 0 6px;letter-spacing:1px;border-bottom:1px solid #F5A200;padding-bottom:3px}
      table{width:100%;border-collapse:collapse;margin-bottom:10px}
      th{background:#F5A200;color:#1A1A1A;padding:6px;font-size:10px;text-align:left}
      td{padding:5px 6px;border-bottom:1px solid #eee;font-size:11px}
      .sig-area{display:flex;gap:16px;margin-top:20px}
      .sig-box{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px;text-align:center}
      .sig-img{max-width:100%;max-height:60px}
      .sig-lb{font-size:10px;color:#999;margin-top:6px}
      .rodape{margin-top:24px;font-size:9px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px}
      .garantia{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold}
      .g-sim{background:#fff3cd;color:#856404}
      .g-nao{background:#f5f5f5;color:#666}
    </style></head><body>
    <h1>SELGRON — Ordem de Serviço</h1>
    <h2>N° ${dados.numeroOS} | Aberta em ${dados.dataAbertura}</h2>

    <div class="sec">IDENTIFICAÇÃO</div>
    <div class="grid">
      <div class="col"><div class="lb">CLIENTE</div><div class="vl">${dados.cliente}</div></div>
      <div class="col"><div class="lb">CONTATO</div><div class="vl">${dados.contato || '-'}</div></div>
    </div>
    <div class="grid">
      <div class="col"><div class="lb">CIDADE</div><div class="vl">${dados.cidade}</div></div>
      <div class="col"><div class="lb">TÉCNICO</div><div class="vl">${dados.tecnico}</div></div>
    </div>

    <div class="sec">MÁQUINA</div>
    <div class="grid">
      <div class="col"><div class="lb">MODELO</div><div class="vl">${dados.modelo}</div></div>
      <div class="col"><div class="lb">CHASSI</div><div class="vl">${dados.chassi}</div></div>
    </div>
    <div class="grid">
      <div class="col"><div class="lb">GARANTIA</div><div class="vl"><span class="garantia ${dados.emGarantia ? 'g-sim' : 'g-nao'}">${dados.emGarantia ? `Em garantia até ${dados.fimGarantia}` : 'Fora de garantia'}</span></div></div>
      <div class="col"><div class="lb">MOTIVO</div><div class="vl">${dados.motivoVisita}</div></div>
    </div>
    ${dados.kmRodados ? `<div class="lb">KM RODADOS</div><div class="vl">${dados.kmRodados} km</div>` : ''}

    <div class="sec">HORAS TRABALHADAS</div>
    <table>
      <tr><th>Data</th><th>Início Desl.</th><th>Fim Desl.</th><th>Início Atend.</th><th>Fim Atend.</th></tr>
      ${linhasDias}
    </table>

    <div class="sec">DESCRIÇÃO DO SERVIÇO</div>
    <div class="vl" style="white-space:pre-wrap">${dados.descricaoServico}</div>

    ${dados.pecas.length > 0 ? `
    <div class="sec">PEÇAS / MATERIAIS</div>
    <table>
      <tr><th>Descrição</th><th>Código</th><th>Qtd</th><th>Vr Un</th><th>Total</th></tr>
      ${linhasPecas}
    </table>
    <div style="text-align:right;font-weight:bold;font-size:13px">Total Peças: R$ ${totalPecas.toFixed(2)}</div>
    ` : ''}

    ${dados.fotosAtendimento.length > 0 ? `
    <div class="sec">FOTOS DO ATENDIMENTO</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px">
      ${dados.fotosAtendimento.map((f, i) => `
        <div style="text-align:center">
          <img src="${f.base64}" style="width:220px;height:165px;object-fit:cover;border-radius:6px;border:1px solid #ddd"/>
          <div style="font-size:10px;color:#999;margin-top:4px">Foto ${i + 1}</div>
        </div>
      `).join('')}
    </div>` : ''}

    <div class="sig-area">
      <div class="sig-box">
        ${dados.assinaturaTecnico ? `<img class="sig-img" src="${dados.assinaturaTecnico}"/>` : '<div style="height:60px"></div>'}
        <div class="sig-lb">Técnico: ${dados.tecnico}</div>
        <div class="sig-lb">${dados.dataAssinatura}</div>
      </div>
      <div class="sig-box">
        ${dados.assinaturaCliente ? `<img class="sig-img" src="${dados.assinaturaCliente}"/>` : '<div style="height:60px"></div>'}
        <div class="sig-lb">Cliente: ${dados.cliente}</div>
        <div class="sig-lb">${dados.dataAssinatura}</div>
      </div>
    </div>

    <div class="rodape">Selgron Field Tech App — VERSÃO DEMONSTRAÇÃO</div>
    </body></html>`;

    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Ordem de Serviço' });
    }
  }

  // ─── Tela Assinatura ──────────────────────────────────────────────────────────

  if (tela === 'assinatura') {
    return (
      <View style={styles.container}>
        <View style={styles.assinaturaHeader}>
          <View style={styles.assinaturaPassos}>
            <View style={[styles.passoDot, assinandoTecnico && styles.passoDotAtivo]}>
              <Text style={styles.passoNum}>1</Text>
            </View>
            <View style={styles.passoLinha} />
            <View style={[styles.passoDot, !assinandoTecnico && styles.passoDotAtivo]}>
              <Text style={styles.passoNum}>2</Text>
            </View>
          </View>
          <Text style={styles.assinaturaTitulo}>
            {assinandoTecnico ? 'ASSINATURA DO TÉCNICO' : 'ASSINATURA DO CLIENTE'}
          </Text>
          <Text style={styles.assinaturaInstrucao}>
            {assinandoTecnico
              ? 'Assine no campo abaixo para confirmar o serviço realizado'
              : 'Passe o celular ao cliente para assinar abaixo'}
          </Text>
        </View>

        <View style={styles.assinaturaArea}>
          <SignaturePad
            ref={sigRef}
            onOK={handleAssinatura}
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { display: none; }
            `}
          />
        </View>

        <View style={styles.assinaturaBotoes}>
          <TouchableOpacity
            style={styles.botaoLimpar}
            onPress={() => sigRef.current?.clearSignature()}
          >
            <Text style={styles.botaoLimparTexto}>Limpar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botaoConfirmar}
            onPress={() => sigRef.current?.readSignature()}
          >
            <Text style={styles.botaoConfirmarTexto}>
              {assinandoTecnico ? 'Confirmar → Próxima' : 'Confirmar e Finalizar'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.botaoSecundario} onPress={() => setTela('novaOS')}>
          <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Tela Lista ───────────────────────────────────────────────────────────────

  if (tela === 'lista') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.botaoNovo} onPress={iniciarNovaOS}>
          <Text style={styles.botaoTexto}>+ NOVA ORDEM DE SERVIÇO</Text>
        </TouchableOpacity>
        {ordens.length === 0 ? (
          <View style={styles.vazio}><Text style={styles.textoVazio}>Nenhuma OS registrada ainda.</Text></View>
        ) : (
          <FlatList
            data={ordens}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={styles.osRow}>
                <TouchableOpacity
                  style={styles.osCardFlex}
                  onPress={() => { setOS(item); setTela('verOS'); }}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.osNumero}>OS #{item.numeroOS}</Text>
                    <View style={[styles.badge, item.gerada ? styles.badgeVerde : styles.badgeAmarelo]}>
                      <Text style={styles.badgeTexto}>{item.gerada ? 'Concluída' : 'Rascunho'}</Text>
                    </View>
                  </View>
                  <Text style={styles.osCliente}>{item.cliente}</Text>
                  <Text style={styles.osDetalhe}>{item.modelo} {item.chassi ? `· Chassi ${item.chassi}` : ''}</Text>
                  <Text style={styles.osDetalhe}>{item.motivoVisita} · {item.dataAbertura}</Text>
                </TouchableOpacity>
                {item.gerada && (
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

  // ─── Tela Ver OS ──────────────────────────────────────────────────────────────

  if (tela === 'verOS' && os) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.tituloPagina}>OS #{os.numeroOS}</Text>
          <InfoRow label="Cliente" value={os.cliente} />
          <InfoRow label="Cidade" value={os.cidade} />
          <InfoRow label="Equipamento" value={`${os.modelo} — Chassi ${os.chassi}`} />
          <InfoRow label="Garantia" value={os.emGarantia ? `Sim — até ${os.fimGarantia}` : 'Não'} />
          <InfoRow label="Motivo" value={os.motivoVisita} />
          <InfoRow label="Serviço" value={os.descricaoServico} />
          {os.kmRodados ? <InfoRow label="KM rodados" value={`${os.kmRodados} km`} /> : null}
        </ScrollView>
        <View style={styles.rodape}>
          <TouchableOpacity style={styles.botao} onPress={() => gerarPDF()}>
            <Text style={styles.botaoTexto}>EXPORTAR PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoSecundario} onPress={() => setTela('lista')}>
            <Text style={styles.botaoSecundarioTexto}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Tela Nova OS (formulário por etapas) ─────────────────────────────────────

  if (!os) return null;

  return (
    <View style={styles.container}>
      {/* Indicador de etapa */}
      <View style={styles.etapasRow}>
        {(['identificacao', 'maquina', 'horas', 'servico', 'pecas'] as EtapaOS[]).map((e, i) => (
          <View key={e} style={[styles.etapaDot, etapa === e && styles.etapaDotAtivo]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {etapa === 'identificacao' && (
          <>
            <Text style={styles.tituloPagina}>IDENTIFICAÇÃO</Text>
            <Text style={styles.label}>Cliente *</Text>
            <TextInput style={[styles.input, camposInvalidos.has('cliente') && styles.inputError]} placeholder="Nome do cliente" placeholderTextColor={Colors.textSecondary} value={os.cliente} onChangeText={v => { atualizar({ cliente: v }); limparInvalido('cliente'); }} />
            {camposInvalidos.has('cliente') && <Text style={styles.erroTexto}>Campo obrigatório</Text>}
            <Text style={styles.label}>Contato</Text>
            <TextInput style={styles.input} placeholder="Nome do contato no cliente" placeholderTextColor={Colors.textSecondary} value={os.contato} onChangeText={v => atualizar({ contato: v })} />
            <Text style={styles.label}>Cidade / Local *</Text>
            <TextInput style={[styles.input, camposInvalidos.has('cidade') && styles.inputError]} placeholder="Cidade de atendimento" placeholderTextColor={Colors.textSecondary} value={os.cidade} onChangeText={v => { atualizar({ cidade: v }); limparInvalido('cidade'); }} />
            {camposInvalidos.has('cidade') && <Text style={styles.erroTexto}>Campo obrigatório</Text>}
            <Text style={styles.label}>KM Rodados</Text>
            <TextInput style={styles.input} placeholder="Ex: 350" placeholderTextColor={Colors.textSecondary} value={os.kmRodados} onChangeText={v => atualizar({ kmRodados: v })} keyboardType="numeric" />
          </>
        )}

        {etapa === 'maquina' && (
          <>
            <Text style={styles.tituloPagina}>MÁQUINA</Text>
            <Text style={styles.label}>Modelo do Equipamento *</Text>
            <TextInput style={[styles.input, camposInvalidos.has('modelo') && styles.inputError]} placeholder="Ex: Selecionadora Óptica SO-50" placeholderTextColor={Colors.textSecondary} value={os.modelo} onChangeText={v => { atualizar({ modelo: v }); limparInvalido('modelo'); }} />
            {camposInvalidos.has('modelo') && <Text style={styles.erroTexto}>Campo obrigatório</Text>}
            <Text style={styles.label}>Chassi / N° da Máquina *</Text>
            <TextInput style={[styles.input, camposInvalidos.has('chassi') && styles.inputError]} placeholder="Ex: SEL-2024-00123" placeholderTextColor={Colors.textSecondary} value={os.chassi} onChangeText={v => { atualizar({ chassi: v }); limparInvalido('chassi'); }} />
            {camposInvalidos.has('chassi') && <Text style={styles.erroTexto}>Campo obrigatório</Text>}
            <Text style={styles.label}>Motivo da Visita *</Text>
            {MOTIVOS.map(m => (
              <TouchableOpacity key={m} style={[styles.opcao, os.motivoVisita === m && styles.opcaoAtiva]} onPress={() => atualizar({ motivoVisita: m })}>
                <Text style={[styles.opcaoTexto, os.motivoVisita === m && styles.opcaoTextoAtivo]}>{m}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.label}>Em Garantia?</Text>
              </View>
              <Switch value={os.emGarantia} onValueChange={v => atualizar({ emGarantia: v })} trackColor={{ true: Colors.primary }} thumbColor={Colors.text} />
            </View>
            {os.emGarantia && (
              <>
                <Text style={styles.label}>Data Fim de Garantia</Text>
                <TextInput style={styles.input} placeholder="Ex: 30/06/2026" placeholderTextColor={Colors.textSecondary} value={os.fimGarantia} onChangeText={v => atualizar({ fimGarantia: v })} />
              </>
            )}
          </>
        )}

        {etapa === 'horas' && (
          <>
            <Text style={styles.tituloPagina}>HORAS TRABALHADAS</Text>
            {os.diasHoras.map((d, i) => (
              <View key={d.id} style={styles.diaCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.diaTitulo}>Dia {i + 1}</Text>
                  <TouchableOpacity onPress={() => removerDia(d.id)}>
                    <Text style={{ color: Colors.error, fontSize: 13 }}>Remover</Text>
                  </TouchableOpacity>
                </View>
                <DatePicker
                  label="Data"
                  value={d.data ? new Date(d.data.split('/').reverse().join('-')) : null}
                  onChange={date => atualizarDia(d.id, { data: date.toLocaleDateString('pt-BR') })}
                />
                <View style={styles.row2col}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Início Deslocamento</Text>
                    <TextInput style={styles.input} placeholder="08:00" placeholderTextColor={Colors.textSecondary} value={d.horaInicioDeslocamento} onChangeText={v => atualizarDia(d.id, { horaInicioDeslocamento: v })} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Fim Deslocamento</Text>
                    <TextInput style={styles.input} placeholder="10:00" placeholderTextColor={Colors.textSecondary} value={d.horaFimDeslocamento} onChangeText={v => atualizarDia(d.id, { horaFimDeslocamento: v })} />
                  </View>
                </View>
                <View style={styles.row2col}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Início Atendimento</Text>
                    <TextInput style={styles.input} placeholder="10:00" placeholderTextColor={Colors.textSecondary} value={d.horaInicioAtendimento} onChangeText={v => atualizarDia(d.id, { horaInicioAtendimento: v })} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Fim Atendimento</Text>
                    <TextInput style={styles.input} placeholder="17:00" placeholderTextColor={Colors.textSecondary} value={d.horaFimAtendimento} onChangeText={v => atualizarDia(d.id, { horaFimAtendimento: v })} />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.botaoAdicionar} onPress={adicionarDia}>
              <Text style={styles.botaoAdicionarTexto}>+ Adicionar Dia</Text>
            </TouchableOpacity>
          </>
        )}

        {etapa === 'servico' && (
          <>
            <Text style={styles.tituloPagina}>SERVIÇO</Text>
            <Text style={styles.label}>Serviço realizado / Providências *</Text>
            <TextInput
              style={[styles.input, styles.inputGrande, camposInvalidos.has('descricaoServico') && styles.inputError]}
              placeholder="Descreva detalhadamente o serviço executado..."
              placeholderTextColor={Colors.textSecondary}
              value={os.descricaoServico}
              onChangeText={v => { atualizar({ descricaoServico: v }); limparInvalido('descricaoServico'); }}
              multiline
              numberOfLines={8}
            />
            {camposInvalidos.has('descricaoServico') && <Text style={styles.erroTexto}>Campo obrigatório</Text>}

            <Text style={[styles.label, { marginTop: 24, marginBottom: 8 }]}>FOTOS DO ATENDIMENTO</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TouchableOpacity style={[styles.botaoFotoAtend, { flex: 1, marginTop: 0 }]} onPress={tirarFotoAtendimento}>
                <Text style={styles.botaoFotoAtendTexto}>📷 Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoFotoAtend, { flex: 1, marginTop: 0 }]} onPress={escolherFotoGaleria}>
                <Text style={styles.botaoFotoAtendTexto}>🖼 Galeria</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fotosGrid}>
              {os.fotosAtendimento.map((f, i) => (
                <View key={f.id} style={styles.fotoThumbContainer}>
                  <Image source={{ uri: f.uri }} style={styles.fotoThumb} />
                  <TouchableOpacity style={styles.fotoRemover} onPress={() => removerFoto(f.id)}>
                    <Text style={styles.fotoRemoverTexto}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.fotoNumero}>Foto {i + 1}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {etapa === 'pecas' && (
          <>
            <Text style={styles.tituloPagina}>PEÇAS / MATERIAIS</Text>
            <Text style={styles.textoVazio}>Adicione as peças utilizadas (opcional)</Text>
            {os.pecas.map((p, i) => (
              <View key={p.id} style={styles.pecaCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.diaTitulo}>Peça {i + 1}</Text>
                  <TouchableOpacity onPress={() => removerPeca(p.id)}>
                    <Text style={{ color: Colors.error, fontSize: 13 }}>Remover</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Descrição" placeholderTextColor={Colors.textSecondary} value={p.descricao} onChangeText={v => atualizarPeca(p.id, { descricao: v })} />
                <View style={styles.row2col}>
                  <View style={styles.col}>
                    <TextInput style={styles.input} placeholder="Código" placeholderTextColor={Colors.textSecondary} value={p.codigo} onChangeText={v => atualizarPeca(p.id, { codigo: v })} />
                  </View>
                  <View style={styles.col}>
                    <TextInput style={styles.input} placeholder="Qtd" placeholderTextColor={Colors.textSecondary} value={p.quantidade} onChangeText={v => atualizarPeca(p.id, { quantidade: v })} keyboardType="numeric" />
                  </View>
                </View>
                <TextInput style={styles.input} placeholder="Valor unitário (R$)" placeholderTextColor={Colors.textSecondary} value={p.valorUnitario} onChangeText={v => atualizarPeca(p.id, { valorUnitario: v })} keyboardType="numeric" />
              </View>
            ))}
            <TouchableOpacity style={styles.botaoAdicionar} onPress={adicionarPeca}>
              <Text style={styles.botaoAdicionarTexto}>+ Adicionar Peça</Text>
            </TouchableOpacity>
            {os.pecas.length > 0 && (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Peças</Text>
                <Text style={styles.totalValor}>R$ {calcularTotalPecas(os.pecas).toFixed(2)}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Botões de navegação entre etapas */}
      <View style={styles.rodape}>
        {etapa !== 'pecas' ? (
          <TouchableOpacity style={styles.botao} onPress={() => {
            if (!validarEtapa()) return;
            const ordem: EtapaOS[] = ['identificacao', 'maquina', 'horas', 'servico', 'pecas'];
            setEtapa(ordem[ordem.indexOf(etapa) + 1]);
          }}>
            <Text style={styles.botaoTexto}>PRÓXIMO →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.botao, salvandoOS && { opacity: 0.6 }]}
            disabled={salvandoOS}
            onPress={async () => {
              setSalvandoOS(true);
              const erro = await salvarOS(os);
              setSalvandoOS(false);
              if (erro) {
                showAlert('Erro ao salvar OS', erro);
                return;
              }
              abrirAssinatura();
            }}>
            <Text style={styles.botaoTexto}>{salvandoOS ? 'SALVANDO...' : 'IR PARA ASSINATURAS ✍'}</Text>
          </TouchableOpacity>
        )}
        {etapa !== 'identificacao' && (
          <TouchableOpacity style={styles.botaoSecundario} onPress={() => {
            const ordem: EtapaOS[] = ['identificacao', 'maquina', 'horas', 'servico', 'pecas'];
            setEtapa(ordem[ordem.indexOf(etapa) - 1]);
          }}>
            <Text style={styles.botaoSecundarioTexto}>← Voltar</Text>
          </TouchableOpacity>
        )}
        {etapa === 'identificacao' && (
          <TouchableOpacity style={styles.botaoSecundario} onPress={() => setTela('lista')}>
            <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: Colors.textSecondary, fontSize: 11, letterSpacing: 1 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: Colors.text, fontSize: 14, marginTop: 2 }}>{value || '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  tituloPagina: { fontSize: 18, fontWeight: '900', color: Colors.primary, letterSpacing: 3, marginBottom: 20 },
  label: { color: Colors.textSecondary, fontSize: 12, letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.card, borderRadius: 8, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  inputError: { borderColor: Colors.error, borderWidth: 2 },
  erroTexto: { color: Colors.error, fontSize: 11, marginTop: 2, marginBottom: 4 },
  inputGrande: { height: 160, textAlignVertical: 'top' },
  botao: { backgroundColor: Colors.primary, borderRadius: 8, padding: 16, alignItems: 'center' },
  botaoTexto: { color: Colors.textDark, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  botaoSecundario: { padding: 14, alignItems: 'center' },
  botaoSecundarioTexto: { color: Colors.textSecondary, fontSize: 14 },
  botaoNovo: { backgroundColor: Colors.primary, margin: 16, borderRadius: 8, padding: 14, alignItems: 'center' },
  botaoAdicionar: { borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  botaoAdicionarTexto: { color: Colors.primary, fontWeight: 'bold' },
  etapasRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: Colors.card },
  etapaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  etapaDotAtivo: { backgroundColor: Colors.primary, width: 24 },
  opcao: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, marginBottom: 6 },
  opcaoAtiva: { borderColor: Colors.primary, backgroundColor: '#2A1E00' },
  opcaoTexto: { color: Colors.textSecondary, fontSize: 14 },
  opcaoTextoAtivo: { color: Colors.primary, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.card, padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: Colors.border },
  diaCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  diaTitulo: { color: Colors.primary, fontWeight: 'bold', fontSize: 13 },
  pecaCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  row2col: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#2A1E00', borderRadius: 10, padding: 16, marginTop: 12, borderWidth: 1, borderColor: Colors.primary },
  totalLabel: { color: Colors.textSecondary, fontSize: 14 },
  totalValor: { color: Colors.primary, fontWeight: '900', fontSize: 18 },
  rodape: { padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  vazio: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoVazio: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  osCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  osRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  osCardFlex: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  pdfSideBtn: { width: 70, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A1E00' },
  pdfSideTexto: { color: Colors.primary, fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  osNumero: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },
  osCliente: { color: Colors.text, fontWeight: 'bold', fontSize: 15, marginTop: 4 },
  osDetalhe: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeVerde: { backgroundColor: '#1A3A1A' },
  badgeAmarelo: { backgroundColor: '#3A2A00' },
  badgeTexto: { fontSize: 11, fontWeight: 'bold', color: Colors.text },
  assinaturaHeader: { padding: 20, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  assinaturaPassos: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  passoDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  passoDotAtivo: { backgroundColor: Colors.primary },
  passoNum: { color: Colors.textDark, fontWeight: 'bold', fontSize: 13 },
  passoLinha: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 8 },
  assinaturaTitulo: { fontSize: 16, fontWeight: '900', color: Colors.primary, letterSpacing: 2 },
  assinaturaInstrucao: { color: Colors.textSecondary, fontSize: 13, marginTop: 6 },
  assinaturaArea: { flex: 1, backgroundColor: 'white' },
  assinaturaBotoes: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  botaoLimpar: { flex: 1, backgroundColor: Colors.surface, borderRadius: 8, padding: 14, alignItems: 'center' },
  botaoLimparTexto: { color: Colors.text, fontWeight: 'bold', fontSize: 14 },
  botaoConfirmar: { flex: 2, backgroundColor: Colors.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  botaoConfirmarTexto: { color: Colors.textDark, fontWeight: '900', fontSize: 14 },
  botaoFotoAtend: { borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  botaoFotoAtendTexto: { color: Colors.primary, fontSize: 14 },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  fotoThumbContainer: { position: 'relative', width: 100 },
  fotoThumb: { width: 100, height: 100, borderRadius: 8 },
  fotoRemover: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  fotoRemoverTexto: { color: Colors.text, fontSize: 10, fontWeight: 'bold' },
  fotoNumero: { color: Colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 4 },
  linkPrimario: { color: Colors.primary, fontSize: 14, fontWeight: 'bold' },
});
