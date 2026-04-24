import { supabase } from './supabase';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: 'tecnico' | 'gestor' | 'admin';
}

export type TipoNota = 'Combustível' | 'Hospedagem' | 'Alimentação' | 'Pedágio' | 'Outros';

export interface NotaReembolso {
  id: string;
  tipo: TipoNota;
  valor: string;
  descricao: string;
  fotoUri: string;
  fotoBase64: string;
  extraviada: boolean;
  dataHora: string;
}

export interface RelatorioReembolso {
  id: string;
  tecnico: string;
  clientes: string;
  acompanhantes: string;
  periodo: string;
  observacoes: string;
  notas: NotaReembolso[];
  dataCriacao: string;
  gerado: boolean;
  usuarioId: string;
}

export type MotivoVisita =
  | 'Assistência Técnica'
  | 'Manutenção'
  | 'Instalação'
  | 'Demonstração'
  | 'Treinamento';

export interface DiaHoras {
  id: string;
  data: string;
  // Horas de viagem
  horaInicioViagem: string;
  horaFimViagem: string;
  // Horas trabalhadas — manhã
  horaInicioManha: string;
  horaFimManha: string;
  // Horas trabalhadas — tarde
  horaInicioTarde: string;
  horaFimTarde: string;
}

export interface PecaOS {
  id: string;
  descricao: string;
  codigo: string;
  quantidade: string;
  valorUnitario: string;
  ipi: string;
}

export interface OrdemServico {
  id: string;
  numeroOS: string;
  dataAbertura: string;
  // Identificação
  codigo: string;
  cliente: string;
  contato: string;
  cidade: string;
  uf: string;
  pais: string;
  // Equipamento
  chassi: string;
  modelo: string;
  emGarantia: boolean;
  fimGarantia: string;
  motivoVisita: MotivoVisita;
  // KMs (sumário da viagem)
  kmViagem: string;
  kmCliente: string;
  kmSelgron: string;
  kmTrabalho: string;
  kmValorUnitario: string;
  diasHoras: DiaHoras[];
  // Serviço
  descricaoServico: string;
  fotosAtendimento: { id: string; uri: string; base64: string }[];
  // Peças
  pecas: PecaOS[];
  // Totais financeiros (categoria: quantidade + valor unitário + valor cliente + valor selgron)
  horasAcompanhamentoQtd: string;
  horasAcompanhamentoValor: string;
  horasAcompanhamentoCliente: string;
  horasAcompanhamentoSelgron: string;
  diariasQtd: string;
  diariasValor: string;
  diariasCliente: string;
  diariasSelgron: string;
  kmOutrosQtd: string;
  kmOutrosValor: string;
  kmOutrosCliente: string;
  kmOutrosSelgron: string;
  horasTrabalhadasQtd: string;
  horasTrabalhadasValor: string;
  horasTrabalhadasCliente: string;
  horasTrabalhadasSelgron: string;
  valorAPagarTecnico: string;
  // Nota fiscal
  notaFiscalProforma: string;
  dataEmissao: string;
  // Assinatura e meta
  assinaturaTecnico: string;
  assinaturaCliente: string;
  dataAssinatura: string;
  tecnico: string;
  usuarioId: string;
  gerada: boolean;
}

// ─── Estado do usuário logado (sincronizado pelo App.tsx) ─────────────────────

let usuarioAtual: Usuario | null = null;

export function setUsuarioAtual(u: Usuario | null) {
  usuarioAtual = u;
}

export function getUsuarioLogado(): Usuario | null {
  return usuarioAtual;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, senha: string): Promise<{ usuario: Usuario | null; erro?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) return { usuario: null, erro: 'Email ou senha incorretos.' };

  const { data: perfil } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (!perfil) return { usuario: null, erro: 'Perfil não encontrado.' };

  if (perfil.ativo === false) {
    await supabase.auth.signOut();
    return { usuario: null, erro: 'Conta aguardando ativação pelo administrador.' };
  }

  const usuario: Usuario = {
    id: data.user.id,
    nome: perfil.nome,
    email: data.user.email!,
    perfil: perfil.perfil,
  };
  setUsuarioAtual(usuario);
  return { usuario };
}

export const DOMINIO_EMAIL_PERMITIDO = 'selgron.com.br';

export async function cadastrarUsuario(nome: string, email: string, senha: string): Promise<string | null> {
  if (!nome || !email || !senha) return 'Preencha todos os campos.';
  if (senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';

  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm.endsWith(`@${DOMINIO_EMAIL_PERMITIDO}`)) {
    return `Apenas emails @${DOMINIO_EMAIL_PERMITIDO} são permitidos.`;
  }

  const { error } = await supabase.auth.signUp({
    email: emailNorm,
    password: senha,
    options: { data: { nome, perfil: 'tecnico' } },
  });
  if (error) return error.message;

  await supabase.auth.signOut();
  return null;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  setUsuarioAtual(null);
}

export async function pedirRecuperacaoSenha(email: string): Promise<string | null> {
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return error ? error.message : null;
}

export async function redefinirSenha(novaSenha: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  return error ? error.message : null;
}

// ─── Reembolso ────────────────────────────────────────────────────────────────

export async function salvarRelatorio(r: RelatorioReembolso): Promise<string | null> {
  const { error } = await supabase.from('relatorios_reembolso').upsert({
    id: r.id,
    usuario_id: r.usuarioId,
    tecnico: r.tecnico,
    clientes: r.clientes,
    acompanhantes: r.acompanhantes,
    periodo: r.periodo,
    observacoes: r.observacoes,
    notas: r.notas,
    gerado: r.gerado,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[salvarRelatorio] erro:', error);
    return error.message;
  }
  return null;
}

export async function getRelatorios(usuarioId: string): Promise<RelatorioReembolso[]> {
  const u = getUsuarioLogado();
  let query = supabase.from('relatorios_reembolso').select('*').order('created_at', { ascending: false });

  if (u?.perfil === 'tecnico') query = query.eq('usuario_id', usuarioId);

  const { data } = await query;
  return (data || []).map(dbToRelatorio);
}

export async function getRelatorioById(id: string): Promise<RelatorioReembolso | null> {
  const { data } = await supabase.from('relatorios_reembolso').select('*').eq('id', id).single();
  return data ? dbToRelatorio(data) : null;
}

export async function getTodosRelatorios(): Promise<RelatorioReembolso[]> {
  const { data } = await supabase
    .from('relatorios_reembolso')
    .select('*')
    .order('created_at', { ascending: false });
  return (data || []).map(dbToRelatorio);
}

function dbToRelatorio(d: any): RelatorioReembolso {
  return {
    id: d.id,
    usuarioId: d.usuario_id,
    tecnico: d.tecnico,
    clientes: d.clientes,
    acompanhantes: d.acompanhantes,
    periodo: d.periodo,
    observacoes: d.observacoes,
    notas: d.notas || [],
    dataCriacao: d.created_at,
    gerado: d.gerado,
  };
}

// ─── OS ───────────────────────────────────────────────────────────────────────

export async function salvarOS(os: OrdemServico): Promise<string | null> {
  const { error } = await supabase.from('ordens_servico').upsert({
    id: os.id,
    numero_os: os.numeroOS,
    data_abertura: os.dataAbertura,
    usuario_id: os.usuarioId,
    tecnico: os.tecnico,
    codigo: os.codigo,
    cliente: os.cliente,
    contato: os.contato,
    cidade: os.cidade,
    uf: os.uf,
    pais: os.pais,
    chassi: os.chassi,
    modelo: os.modelo,
    em_garantia: os.emGarantia,
    fim_garantia: os.fimGarantia,
    motivo_visita: os.motivoVisita,
    km_viagem: os.kmViagem,
    km_cliente: os.kmCliente,
    km_selgron: os.kmSelgron,
    km_trabalho: os.kmTrabalho,
    km_valor_unitario: os.kmValorUnitario,
    descricao_servico: os.descricaoServico,
    dias_horas: os.diasHoras,
    fotos_atendimento: os.fotosAtendimento,
    pecas: os.pecas,
    horas_acompanhamento_qtd: os.horasAcompanhamentoQtd,
    horas_acompanhamento_valor: os.horasAcompanhamentoValor,
    horas_acompanhamento_cliente: os.horasAcompanhamentoCliente,
    horas_acompanhamento_selgron: os.horasAcompanhamentoSelgron,
    diarias_qtd: os.diariasQtd,
    diarias_valor: os.diariasValor,
    diarias_cliente: os.diariasCliente,
    diarias_selgron: os.diariasSelgron,
    km_outros_qtd: os.kmOutrosQtd,
    km_outros_valor: os.kmOutrosValor,
    km_outros_cliente: os.kmOutrosCliente,
    km_outros_selgron: os.kmOutrosSelgron,
    horas_trabalhadas_qtd: os.horasTrabalhadasQtd,
    horas_trabalhadas_valor: os.horasTrabalhadasValor,
    horas_trabalhadas_cliente: os.horasTrabalhadasCliente,
    horas_trabalhadas_selgron: os.horasTrabalhadasSelgron,
    valor_a_pagar_tecnico: os.valorAPagarTecnico,
    nota_fiscal_proforma: os.notaFiscalProforma,
    data_emissao: os.dataEmissao,
    assinatura_tecnico: os.assinaturaTecnico,
    assinatura_cliente: os.assinaturaCliente,
    data_assinatura: os.dataAssinatura,
    gerada: os.gerada,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[salvarOS] erro:', error);
    return error.message;
  }
  return null;
}

export async function getOrdens(usuarioId: string): Promise<OrdemServico[]> {
  const u = getUsuarioLogado();
  let query = supabase.from('ordens_servico').select('*').order('created_at', { ascending: false });

  if (u?.perfil === 'tecnico') query = query.eq('usuario_id', usuarioId);

  const { data } = await query;
  return (data || []).map(dbToOS);
}

export async function getOSById(id: string): Promise<OrdemServico | null> {
  const { data } = await supabase.from('ordens_servico').select('*').eq('id', id).single();
  return data ? dbToOS(data) : null;
}

export async function getTodasOS(): Promise<OrdemServico[]> {
  const { data } = await supabase
    .from('ordens_servico')
    .select('*')
    .order('created_at', { ascending: false });
  return (data || []).map(dbToOS);
}

function dbToOS(d: any): OrdemServico {
  return {
    id: d.id,
    numeroOS: d.numero_os,
    dataAbertura: d.data_abertura,
    usuarioId: d.usuario_id,
    tecnico: d.tecnico,
    codigo: d.codigo || '',
    cliente: d.cliente || '',
    contato: d.contato || '',
    cidade: d.cidade || '',
    uf: d.uf || '',
    pais: d.pais || '',
    chassi: d.chassi || '',
    modelo: d.modelo || '',
    emGarantia: !!d.em_garantia,
    fimGarantia: d.fim_garantia || '',
    motivoVisita: d.motivo_visita,
    kmViagem: d.km_viagem || '',
    kmCliente: d.km_cliente || '',
    kmSelgron: d.km_selgron || '',
    kmTrabalho: d.km_trabalho || '',
    kmValorUnitario: d.km_valor_unitario || '',
    descricaoServico: d.descricao_servico || '',
    diasHoras: d.dias_horas || [],
    fotosAtendimento: d.fotos_atendimento || [],
    pecas: d.pecas || [],
    horasAcompanhamentoQtd: d.horas_acompanhamento_qtd || '',
    horasAcompanhamentoValor: d.horas_acompanhamento_valor || '',
    horasAcompanhamentoCliente: d.horas_acompanhamento_cliente || '',
    horasAcompanhamentoSelgron: d.horas_acompanhamento_selgron || '',
    diariasQtd: d.diarias_qtd || '',
    diariasValor: d.diarias_valor || '',
    diariasCliente: d.diarias_cliente || '',
    diariasSelgron: d.diarias_selgron || '',
    kmOutrosQtd: d.km_outros_qtd || '',
    kmOutrosValor: d.km_outros_valor || '',
    kmOutrosCliente: d.km_outros_cliente || '',
    kmOutrosSelgron: d.km_outros_selgron || '',
    horasTrabalhadasQtd: d.horas_trabalhadas_qtd || '',
    horasTrabalhadasValor: d.horas_trabalhadas_valor || '',
    horasTrabalhadasCliente: d.horas_trabalhadas_cliente || '',
    horasTrabalhadasSelgron: d.horas_trabalhadas_selgron || '',
    valorAPagarTecnico: d.valor_a_pagar_tecnico || '',
    notaFiscalProforma: d.nota_fiscal_proforma || '',
    dataEmissao: d.data_emissao || '',
    assinaturaTecnico: d.assinatura_tecnico || '',
    assinaturaCliente: d.assinatura_cliente || '',
    dataAssinatura: d.data_assinatura || '',
    gerada: !!d.gerada,
  };
}

// ─── Admin: Usuários ──────────────────────────────────────────────────────────

export async function getUsuarios(): Promise<(Usuario & { ativo: boolean })[]> {
  const { data } = await supabase.from('profiles').select('*').order('nome');
  return (data || []).map(d => ({
    id: d.id, nome: d.nome, email: '', perfil: d.perfil, ativo: d.ativo,
  }));
}

export async function criarUsuario(nome: string, email: string, senha: string, perfil: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 'Sessão expirada. Faça login novamente.';
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-create-user`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ nome, email, senha, perfil }),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* não-JSON */ }

    if (!res.ok) {
      return json?.error ?? json?.message ?? json?.msg ?? `Erro ${res.status}: ${text.slice(0, 200) || 'Edge Function não respondeu. Faça deploy com: supabase functions deploy admin-create-user'}`;
    }
    if (json?.error) return json.error;
    // Resposta 2xx precisa confirmar que user foi criado
    if (!json?.userId) return 'Resposta inesperada do servidor. A Edge Function pode não estar deployada.';
    return null;
  } catch (e: any) {
    return `Erro de conexão: ${e?.message ?? String(e)}`;
  }
}

export async function atualizarPerfil(id: string, campos: { nome?: string; perfil?: string; ativo?: boolean }): Promise<void> {
  await supabase.from('profiles').update(campos).eq('id', id);
}

export async function deletarUsuario(id: string): Promise<string | null> {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  return error ? error.message : null;
}

export async function alterarSenhaPropria(senhaAntiga: string, novaSenha: string): Promise<string | null> {
  const u = getUsuarioLogado();
  if (!u) return 'Não autenticado.';
  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: u.email,
    password: senhaAntiga,
  });
  if (reAuthError) return 'Senha atual incorreta.';
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  return error ? error.message : null;
}

export async function adminAlterarSenha(userId: string, novaSenha: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 'Sessão expirada. Faça login novamente.';
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-reset-password`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, novaSenha }),
    });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json.error ?? null;
    } catch {
      return res.ok ? null : `Erro ${res.status}: Edge Function não encontrada. Deploy a função no Supabase.`;
    }
  } catch (e: any) {
    return `Erro de conexão: ${e?.message ?? String(e)}`;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function gerarId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 7);
}

export function gerarNumeroOS(): string {
  return Math.floor(30000 + Math.random() * 10000).toString();
}

export function calcularTotalPecas(pecas: PecaOS[]): number {
  return pecas.reduce((acc, p) => {
    const qty = parseFloat(p.quantidade.replace(',', '.')) || 0;
    const vl  = parseFloat(p.valorUnitario.replace(',', '.')) || 0;
    return acc + qty * vl;
  }, 0);
}

export function calcularTotalNotas(notas: NotaReembolso[]): number {
  return notas.reduce((acc, n) => acc + (parseFloat(n.valor.replace(',', '.')) || 0), 0);
}
