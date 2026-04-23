import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  FlatList, Pressable,
} from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function DatePicker({ label, value, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const hoje = new Date();
  const [mes, setMes] = useState(value ? value.getMonth() : hoje.getMonth());
  const [ano, setAno] = useState(value ? value.getFullYear() : hoje.getFullYear());

  const formatarData = (d: Date | null) =>
    d ? d.toLocaleDateString('pt-BR') : 'Selecionar data';

  function diasDoMes(m: number, a: number): number {
    return new Date(a, m + 1, 0).getDate();
  }

  function primeiroDiaSemana(m: number, a: number): number {
    return new Date(a, m, 1).getDay();
  }

  function selecionar(dia: number) {
    const d = new Date(ano, mes, dia);
    onChange(d);
    setAberto(false);
  }

  function renderCalendario() {
    const total = diasDoMes(mes, ano);
    const inicio = primeiroDiaSemana(mes, ano);
    const celulas: (number | null)[] = Array(inicio).fill(null);
    for (let i = 1; i <= total; i++) celulas.push(i);
    while (celulas.length % 7 !== 0) celulas.push(null);

    const hoje2 = new Date();
    const diaAtual = value && value.getMonth() === mes && value.getFullYear() === ano
      ? value.getDate() : null;

    const semanas = [];
    for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));

    return (
      <View>
        {/* Cabeçalho mês/ano */}
        <View style={s.cabecalho}>
          <TouchableOpacity onPress={() => { if (mes === 0) { setMes(11); setAno(a => a - 1); } else setMes(m => m - 1); }}>
            <Text style={s.nav}>‹</Text>
          </TouchableOpacity>
          <Text style={s.mesAno}>{MESES[mes]} {ano}</Text>
          <TouchableOpacity onPress={() => { if (mes === 11) { setMes(0); setAno(a => a + 1); } else setMes(m => m + 1); }}>
            <Text style={s.nav}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Dias da semana */}
        <View style={s.semanaHeader}>
          {['D','S','T','Q','Q','S','S'].map((d, i) => (
            <Text key={i} style={s.diaSemana}>{d}</Text>
          ))}
        </View>

        {/* Dias */}
        {semanas.map((semana, si) => (
          <View key={si} style={s.semana}>
            {semana.map((dia, di) => (
              <TouchableOpacity
                key={di}
                style={[s.diaCell, dia === diaAtual && s.diaSelecionado]}
                onPress={() => dia && selecionar(dia)}
                disabled={!dia}
              >
                <Text style={[s.diaTexto, !dia && s.diaVazio, dia === diaAtual && s.diaTextoSelecionado]}>
                  {dia || ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.botao} onPress={() => setAberto(true)}>
        <Text style={[s.texto, !value && s.placeholder]}>
          📅  {formatarData(value)}
        </Text>
      </TouchableOpacity>

      <Modal visible={aberto} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setAberto(false)}>
          <Pressable style={s.modal} onPress={e => e.stopPropagation()}>
            {renderCalendario()}
            <TouchableOpacity style={s.cancelar} onPress={() => setAberto(false)}>
              <Text style={s.cancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: Colors.textSecondary, fontSize: 12, letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  botao: { backgroundColor: Colors.card, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: Colors.border },
  texto: { color: Colors.text, fontSize: 14 },
  placeholder: { color: Colors.textSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, width: 320, borderWidth: 1, borderColor: Colors.border },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mesAno: { color: Colors.primary, fontWeight: 'bold', fontSize: 16 },
  nav: { color: Colors.primary, fontSize: 28, paddingHorizontal: 8 },
  semanaHeader: { flexDirection: 'row', marginBottom: 8 },
  diaSemana: { flex: 1, textAlign: 'center', color: Colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  semana: { flexDirection: 'row', marginBottom: 4 },
  diaCell: { flex: 1, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  diaSelecionado: { backgroundColor: Colors.primary },
  diaTexto: { color: Colors.text, fontSize: 14 },
  diaTextoSelecionado: { color: Colors.textDark, fontWeight: 'bold' },
  diaVazio: { color: 'transparent' },
  cancelar: { marginTop: 16, padding: 12, alignItems: 'center' },
  cancelarTexto: { color: Colors.textSecondary, fontSize: 14 },
});
