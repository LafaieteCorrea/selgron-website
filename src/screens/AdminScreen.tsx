import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { OrdemServico, RelatorioReembolso, getTodasOS, getTodosRelatorios } from '../utils/storage';
import { gerarPDFOS, gerarPDFReembolso } from '../utils/pdf';

type Aba = 'os' | 'reembolso';

export default function AdminScreen() {
  const [aba, setAba] = useState<Aba>('os');
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [relatorios, setRelatorios] = useState<RelatorioReembolso[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => { carregar(); }, [aba]);

  async function carregar() {
    setCarregando(true);
    if (aba === 'os') {
      setOrdens(await getTodasOS());
    } else {
      setRelatorios(await getTodosRelatorios());
    }
    setCarregando(false);
  }

  const ordensFiltradas = ordens.filter(o =>
    !filtro ||
    o.tecnico?.toLowerCase().includes(filtro.toLowerCase()) ||
    o.cliente?.toLowerCase().includes(filtro.toLowerCase()) ||
    o.numeroOS?.includes(filtro)
  );

  const relatoriosFiltrados = relatorios.filter(r =>
    !filtro ||
    r.tecnico?.toLowerCase().includes(filtro.toLowerCase()) ||
    r.clientes?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Painel Administrativo</Text>
      </View>

      <View style={styles.abas}>
        <TouchableOpacity
          style={[styles.aba, aba === 'os' && styles.abaAtiva]}
          onPress={() => { setAba('os'); setFiltro(''); }}
        >
          <Text style={[styles.abaTexto, aba === 'os' && styles.abaTextoAtivo]}>
            📋 Ordens de Serviço
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.aba, aba === 'reembolso' && styles.abaAtiva]}
          onPress={() => { setAba('reembolso'); setFiltro(''); }}
        >
          <Text style={[styles.abaTexto, aba === 'reembolso' && styles.abaTextoAtivo]}>
            🧾 Reembolsos
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.busca}
        placeholder="Buscar por técnico, cliente..."
        placeholderTextColor={Colors.textSecondary}
        value={filtro}
        onChangeText={setFiltro}
      />

      {carregando ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {aba === 'os' ? (
            ordensFiltradas.length === 0 ? (
              <Text style={styles.vazio}>Nenhuma OS encontrada.</Text>
            ) : (
              ordensFiltradas.map(o => (
                <View key={o.id} style={styles.row}>
                  <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardNumero}>OS #{o.numeroOS}</Text>
                      <View style={[styles.badge, o.gerada ? styles.badgeOk : styles.badgePend]}>
                        <Text style={styles.badgeTexto}>{o.gerada ? 'Gerada' : 'Em andamento'}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardCliente}>{o.cliente} — {o.cidade}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardMetaTexto}>👤 {o.tecnico || '—'}</Text>
                      <Text style={styles.cardMetaTexto}>📅 {o.dataAbertura}</Text>
                    </View>
                  </View>
                  {o.gerada && (
                    <TouchableOpacity style={styles.pdfSideBtn} onPress={() => gerarPDFOS(o)}>
                      <Text style={styles.pdfSideTexto}>📄{'\n'}PDF</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )
          ) : (
            relatoriosFiltrados.length === 0 ? (
              <Text style={styles.vazio}>Nenhum relatório encontrado.</Text>
            ) : (
              relatoriosFiltrados.map(r => (
                <View key={r.id} style={styles.row}>
                  <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardNumero}>Reembolso</Text>
                      <View style={[styles.badge, r.gerado ? styles.badgeOk : styles.badgePend]}>
                        <Text style={styles.badgeTexto}>{r.gerado ? 'Gerado' : 'Em andamento'}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardCliente}>{r.clientes}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardMetaTexto}>👤 {r.tecnico || '—'}</Text>
                      <Text style={styles.cardMetaTexto}>📅 {r.periodo || r.dataCriacao}</Text>
                      <Text style={styles.cardMetaTexto}>🧾 {r.notas.length} nota(s)</Text>
                    </View>
                  </View>
                  {r.gerado && (
                    <TouchableOpacity style={styles.pdfSideBtn} onPress={() => gerarPDFReembolso(r)}>
                      <Text style={styles.pdfSideTexto}>📄{'\n'}PDF</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 8 },
  titulo: { color: Colors.text, fontSize: 20, fontWeight: 'bold' },

  abas: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  aba: {
    flex: 1, padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  abaAtiva: { backgroundColor: '#2A1E00', borderColor: Colors.primary },
  abaTexto: { color: Colors.textSecondary, fontWeight: 'bold', fontSize: 13 },
  abaTextoAtivo: { color: Colors.primary },

  busca: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, color: Colors.text, fontSize: 14,
  },

  lista: { padding: 16, paddingTop: 4, gap: 10 },
  vazio: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },

  row: { flexDirection: 'row', gap: 8 },
  pdfSideBtn: {
    width: 70, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A1E00',
  },
  pdfSideTexto: { color: Colors.primary, fontWeight: 'bold', fontSize: 12, textAlign: 'center' },

  card: {
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, padding: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardNumero: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },
  cardCliente: { color: Colors.text, fontSize: 15, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  cardMetaTexto: { color: Colors.textSecondary, fontSize: 12 },

  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOk: { backgroundColor: '#1A3A1A' },
  badgePend: { backgroundColor: '#2A2A00' },
  badgeTexto: { color: Colors.text, fontSize: 11, fontWeight: 'bold' },
});
