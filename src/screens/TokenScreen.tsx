import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { gerarToken, segundosRestantes } from '../utils/token';

export default function TokenScreen() {
  const [token, setToken] = useState('');
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    function atualizar() {
      setToken(gerarToken());
      setSegundos(segundosRestantes());
    }

    atualizar();
    const intervalo = setInterval(atualizar, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const progresso = segundos / 60;
  const corProgresso = segundos > 15 ? Colors.primary : Colors.error;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>TOKEN DE ACESSO</Text>
      <Text style={styles.subtitulo}>Manutenção de Máquina</Text>

      <View style={styles.tokenCard}>
        <Text style={styles.tokenLabel}>CÓDIGO ATUAL</Text>
        <Text style={styles.tokenValor}>{token}</Text>

        <View style={styles.barraContainer}>
          <View
            style={[
              styles.barraProgresso,
              { width: `${progresso * 100}%`, backgroundColor: corProgresso },
            ]}
          />
        </View>

        <Text style={[styles.timer, { color: corProgresso }]}>
          {segundos}s até renovar
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitulo}>Como usar</Text>
        <Text style={styles.infoTexto}>
          1. Acesse o painel de manutenção da máquina Selgron
        </Text>
        <Text style={styles.infoTexto}>
          2. Selecione "Modo Manutenção" ou "Acesso Técnico"
        </Text>
        <Text style={styles.infoTexto}>
          3. Digite o código de 6 dígitos exibido acima
        </Text>
        <Text style={styles.infoTexto}>
          4. O token muda a cada minuto — use rapidamente
        </Text>
      </View>

      <View style={styles.alertaCard}>
        <Text style={styles.alertaTexto}>
          ⚠ Token válido apenas durante o minuto atual
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    alignItems: 'center',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 3,
    marginTop: 20,
  },
  subtitulo: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 32,
  },
  tokenCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 24,
  },
  tokenLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 3,
    marginBottom: 16,
  },
  tokenValor: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 10,
    marginBottom: 24,
  },
  barraContainer: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barraProgresso: {
    height: '100%',
    borderRadius: 3,
  },
  timer: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitulo: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 12,
  },
  infoTexto: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 20,
  },
  alertaCard: {
    backgroundColor: '#3A2A00',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  alertaTexto: {
    color: Colors.primary,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
