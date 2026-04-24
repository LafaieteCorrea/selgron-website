import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { showAlert } from './alert';
import {
  OrdemServico, RelatorioReembolso,
  calcularTotalNotas, calcularTotalPecas,
} from './storage';

// ─── Reembolso ───────────────────────────────────────────────────────────────

export function construirHTMLReembolso(r: RelatorioReembolso): string {
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

// Preserva o user-gesture: no web, abre o popup SINCRONAMENTE e só depois faz awaits.
export async function gerarPDFReembolso(r: RelatorioReembolso): Promise<void> {
  if (r.notas.length === 0) {
    showAlert('Atenção', 'Adicione pelo menos uma despesa.');
    return;
  }

  let winWeb: Window | null = null;
  if (Platform.OS === 'web') {
    winWeb = window.open('', '_blank');
    if (!winWeb) {
      showAlert('Popup bloqueado', 'Libere popups para este site e tente novamente.');
      return;
    }
  }

  const html = construirHTMLReembolso(r);

  if (Platform.OS === 'web' && winWeb) {
    winWeb.document.write(html);
    winWeb.document.close();
    setTimeout(() => winWeb!.print(), 500);
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Relatório' });
  }
}

// ─── Ordem de Serviço ────────────────────────────────────────────────────────

export function construirHTMLOS(dados: OrdemServico): string {
  const totalPecas = calcularTotalPecas(dados.pecas);
  const parseNum = (s: string) => parseFloat(String(s || '').replace(',', '.')) || 0;

  const linhasDias = dados.diasHoras.map(d => `
    <tr>
      <td>${d.data}</td>
      <td>${d.horaInicioViagem}</td><td>${d.horaFimViagem}</td>
      <td>${d.horaInicioManha}</td><td>${d.horaFimManha}</td>
      <td>${d.horaInicioTarde}</td><td>${d.horaFimTarde}</td>
    </tr>`).join('');

  const linhasPecas = dados.pecas.map(p => {
    const total = parseNum(p.quantidade) * parseNum(p.valorUnitario);
    return `<tr><td>${p.quantidade}</td><td>${p.codigo}</td><td>${p.descricao}</td><td>R$ ${parseNum(p.valorUnitario).toFixed(2)}</td><td>${p.ipi || '-'}</td><td>R$ ${total.toFixed(2)}</td></tr>`;
  }).join('');

  const linhaFin = (label: string, qtd: string, vu: string, cli: string, sel: string) => `
    <tr>
      <td>${label}</td>
      <td>${qtd || '-'}</td>
      <td>${vu ? 'R$ ' + parseNum(vu).toFixed(2) : '-'}</td>
      <td>${cli ? 'R$ ' + parseNum(cli).toFixed(2) : '-'}</td>
      <td>${sel ? 'R$ ' + parseNum(sel).toFixed(2) : '-'}</td>
    </tr>`;

  const totalCliente = parseNum(dados.horasTrabalhadasCliente) + parseNum(dados.horasAcompanhamentoCliente) + parseNum(dados.diariasCliente) + parseNum(dados.kmOutrosCliente) + totalPecas;
  const totalSelgron = parseNum(dados.horasTrabalhadasSelgron) + parseNum(dados.horasAcompanhamentoSelgron) + parseNum(dados.diariasSelgron) + parseNum(dados.kmOutrosSelgron);

  return `
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
    .total-row td{font-weight:bold;background:#fff8e6}
  </style></head><body>
  <h1>SELGRON — Ordem de Serviço</h1>
  <h2>N° ${dados.numeroOS} | Aberta em ${dados.dataAbertura}</h2>

  <div class="sec">IDENTIFICAÇÃO</div>
  <div class="grid">
    <div class="col"><div class="lb">CÓDIGO</div><div class="vl">${dados.codigo || '-'}</div></div>
    <div class="col"><div class="lb">CLIENTE</div><div class="vl">${dados.cliente}</div></div>
    <div class="col"><div class="lb">CONTATO</div><div class="vl">${dados.contato || '-'}</div></div>
  </div>
  <div class="grid">
    <div class="col"><div class="lb">CIDADE</div><div class="vl">${dados.cidade}</div></div>
    <div class="col"><div class="lb">UF</div><div class="vl">${dados.uf || '-'}</div></div>
    <div class="col"><div class="lb">PAÍS</div><div class="vl">${dados.pais || '-'}</div></div>
    <div class="col"><div class="lb">TÉCNICO</div><div class="vl">${dados.tecnico}</div></div>
  </div>

  <div class="sec">EQUIPAMENTO</div>
  <div class="grid">
    <div class="col"><div class="lb">MODELO</div><div class="vl">${dados.modelo}</div></div>
    <div class="col"><div class="lb">CHASSI</div><div class="vl">${dados.chassi}</div></div>
  </div>
  <div class="grid">
    <div class="col"><div class="lb">GARANTIA</div><div class="vl"><span class="garantia ${dados.emGarantia ? 'g-sim' : 'g-nao'}">${dados.emGarantia ? `Em garantia até ${dados.fimGarantia}` : 'Fora de garantia'}</span></div></div>
    <div class="col"><div class="lb">MOTIVO INTERVENÇÃO</div><div class="vl">${dados.motivoVisita}</div></div>
  </div>

  <div class="sec">KM DA VIAGEM</div>
  <table>
    <tr><th>KM Viagem</th><th>KM até Cliente</th><th>KM até Selgron</th><th>KM Trabalho</th><th>Valor Unitário</th></tr>
    <tr>
      <td>${dados.kmViagem || '-'}</td>
      <td>${dados.kmCliente || '-'}</td>
      <td>${dados.kmSelgron || '-'}</td>
      <td>${dados.kmTrabalho || '-'}</td>
      <td>${dados.kmValorUnitario ? 'R$ ' + parseNum(dados.kmValorUnitario).toFixed(2) : '-'}</td>
    </tr>
  </table>

  <div class="sec">HORAS DE VIAGEM E TRABALHADAS</div>
  <table>
    <tr>
      <th rowspan="2">Data</th>
      <th colspan="2" style="text-align:center">Viagem</th>
      <th colspan="2" style="text-align:center">Manhã</th>
      <th colspan="2" style="text-align:center">Tarde</th>
    </tr>
    <tr>
      <th>Início</th><th>Fim</th>
      <th>Início</th><th>Fim</th>
      <th>Início</th><th>Fim</th>
    </tr>
    ${linhasDias}
  </table>

  <div class="sec">DESCRIÇÃO DO SERVIÇO / PROVIDÊNCIAS</div>
  <div class="vl" style="white-space:pre-wrap">${dados.descricaoServico}</div>

  ${dados.pecas.length > 0 ? `
  <div class="sec">PEÇAS / MATERIAIS</div>
  <table>
    <tr><th>Quant.</th><th>Código</th><th>Descrição</th><th>Valor Unit.</th><th>IPI %</th><th>Total</th></tr>
    ${linhasPecas}
  </table>
  <div style="text-align:right;font-weight:bold;font-size:13px">Valor Total das Peças: R$ ${totalPecas.toFixed(2)}</div>
  ` : ''}

  <div class="sec">TOTAIS FINANCEIROS</div>
  <table>
    <tr><th>Categoria</th><th>Quant.</th><th>Valor Unit.</th><th>Cliente</th><th>SELGRON</th></tr>
    ${linhaFin('Horas Trabalhadas', dados.horasTrabalhadasQtd, dados.horasTrabalhadasValor, dados.horasTrabalhadasCliente, dados.horasTrabalhadasSelgron)}
    ${linhaFin('Horas Acompanhamento', dados.horasAcompanhamentoQtd, dados.horasAcompanhamentoValor, dados.horasAcompanhamentoCliente, dados.horasAcompanhamentoSelgron)}
    ${linhaFin('Diárias', dados.diariasQtd, dados.diariasValor, dados.diariasCliente, dados.diariasSelgron)}
    ${linhaFin('Km / Outros', dados.kmOutrosQtd, dados.kmOutrosValor, dados.kmOutrosCliente, dados.kmOutrosSelgron)}
    <tr class="total-row">
      <td colspan="3">TOTAL</td>
      <td>R$ ${totalCliente.toFixed(2)}</td>
      <td>R$ ${totalSelgron.toFixed(2)}</td>
    </tr>
  </table>

  <div class="grid" style="margin-top:12px">
    <div class="col"><div class="lb">VALOR A SER PAGO AO ASSISTENTE TÉCNICO</div><div class="vl">${dados.valorAPagarTecnico ? 'R$ ' + parseNum(dados.valorAPagarTecnico).toFixed(2) : '-'}</div></div>
  </div>
  <div class="grid">
    <div class="col"><div class="lb">NOTA FISCAL / PROFORMA Nº</div><div class="vl">${dados.notaFiscalProforma || '-'}</div></div>
    <div class="col"><div class="lb">DATA DE EMISSÃO</div><div class="vl">${dados.dataEmissao || '-'}</div></div>
  </div>

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
      <div class="sig-lb">Carimbo / Assinatura Cliente: ${dados.cliente}</div>
      <div class="sig-lb">${dados.dataAssinatura}</div>
    </div>
  </div>

  <div class="rodape">Selgron Field Tech App — VERSÃO DEMONSTRAÇÃO</div>
  </body></html>`;
}

export async function gerarPDFOS(dados: OrdemServico): Promise<void> {
  let winWeb: Window | null = null;
  if (Platform.OS === 'web') {
    winWeb = window.open('', '_blank');
    if (!winWeb) {
      showAlert('Popup bloqueado', 'Libere popups para este site e tente novamente.');
      return;
    }
  }

  const html = construirHTMLOS(dados);

  if (Platform.OS === 'web' && winWeb) {
    winWeb.document.write(html);
    winWeb.document.close();
    setTimeout(() => winWeb!.print(), 500);
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Ordem de Serviço' });
  }
}
