import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Colors } from '../theme/colors';
import { getUsuarioLogado } from '../utils/storage';

const CARDS = [
  { icon: '🏭', titulo: 'Fundação', valor: '1991', sub: 'Mais de 30 anos de mercado' },
  { icon: '📍', titulo: 'Sede', valor: 'Blumenau, SC', sub: 'Santa Catarina, Brasil' },
  { icon: '🌍', titulo: 'Exportação', valor: '+35 países', sub: 'Presença global' },
  { icon: '⚙️', titulo: 'Segmento', valor: 'Agronegócio', sub: 'Máquinas e equipamentos' },
];

function horasBrasilia(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function dataBrasilia(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function HomeScreen() {
  const usuario = getUsuarioLogado();
  const [hora, setHora] = useState(horasBrasilia());

  useEffect(() => {
    const timer = setInterval(() => setHora(horasBrasilia()), 1000);
    return () => clearInterval(timer);
  }, []);

  const saudacao = () => {
    const h = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false });
    const n = parseInt(h);
    if (n < 12) return 'Bom dia';
    if (n < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Saudação */}
      <View style={styles.saudacaoBox}>
        <Text style={styles.saudacao}>{saudacao()}, {usuario?.nome?.split(' ')[0] ?? 'Usuário'}</Text>
        <View style={styles.relogio}>
          <Text style={styles.horaTexto}>{hora}</Text>
          <Text style={styles.dataTexto}>{dataBrasilia()}</Text>
        </View>
      </View>

      {/* Cards info Selgron */}
      <Text style={styles.secao}>Sobre a Selgron</Text>
      <View style={styles.grid}>
        {CARDS.map(c => (
          <View key={c.titulo} style={styles.card}>
            <Text style={styles.cardIcon}>{c.icon}</Text>
            <Text style={styles.cardValor}>{c.valor}</Text>
            <Text style={styles.cardTitulo}>{c.titulo}</Text>
            <Text style={styles.cardSub}>{c.sub}</Text>
          </View>
        ))}
      </View>

      {/* Descrição */}
      <View style={styles.descCard}>
        <Image
          source={require('../../assets/selgron-logo.png')}
          style={styles.descLogo}
          resizeMode="contain"
        />
        <Text style={styles.descTexto}>
          Líder em soluções tecnológicas para o agronegócio, a Selgron desenvolve classificadores, selecionadores ópticos, dosadores, máquinas de embalagem, detectores de metais e sistemas de paletização robótica — exportando para mais de 35 países.
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },

  saudacaoBox: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  saudacao: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  relogio: { alignItems: 'center' },
  horaTexto: {
    color: Colors.primary,
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'] as any,
  },
  dataTexto: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textTransform: 'capitalize',
  },

  secao: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    width: '48%' as any,
    minWidth: 140,
    flex: 1,
  },
  cardIcon: { fontSize: 24, marginBottom: 8 },
  cardValor: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  cardTitulo: { color: Colors.primary, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  cardSub: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },

  descCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
  },
  descLogo: { width: '70%', height: 60, marginBottom: 16 },
  descTexto: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
