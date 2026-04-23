/**
 * Gerador de Token Selgron
 * Algoritmo: ((dia×13) + (mês×7) + (hora×17) + (minuto×31)) × 1337 mod 1000000
 * Token válido por 1 minuto — mesmo algoritmo implementado no CLP.
 */
export function gerarToken(data?: Date): string {
  const agora = data || new Date();
  const dia = agora.getDate();
  const mes = agora.getMonth() + 1;
  const hora = agora.getHours();
  const minuto = agora.getMinutes();

  const token = ((dia * 13) + (mes * 7) + (hora * 17) + (minuto * 31)) * 1337 % 1000000;

  return token.toString().padStart(6, '0');
}

export function segundosRestantes(): number {
  const agora = new Date();
  return 60 - agora.getSeconds();
}
