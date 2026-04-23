import { Alert, Platform } from 'react-native';

export function showAlert(titulo: string, mensagem?: string): void {
  const texto = mensagem ? `${titulo}\n\n${mensagem}` : titulo;
  if (Platform.OS === 'web') {
    window.alert(texto);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

export async function showConfirm(titulo: string, mensagem?: string): Promise<boolean> {
  const texto = mensagem ? `${titulo}\n\n${mensagem}` : titulo;
  if (Platform.OS === 'web') {
    return window.confirm(texto);
  }
  return new Promise<boolean>(resolve => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirmar', onPress: () => resolve(true) },
    ]);
  });
}
