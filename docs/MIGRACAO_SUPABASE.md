# Migração para Supabase — Plataforma Interna Selgron

## Escopo

1. **Banco de dados persistente** — OS e Reembolsos salvos mesmo após logout
2. **Autenticação real** — login/senha gerenciado pelo Supabase Auth
3. **Perfis de usuário** — tecnico / gestor / admin com permissões diferentes
4. **Painel admin/gestor** — histórico completo de OS e Reembolsos com filtros
5. **Gestão de usuários** — admin cria, edita e desativa usuários

---

## Perfis e permissões

| Perfil | Token | Reembolso | OS | Painel | Usuários |
|--------|-------|-----------|-----|--------|----------|
| tecnico | ✓ | Próprios | Próprias | ✗ | ✗ |
| gestor | ✓ | Todos (leitura) | Todas (leitura) | ✓ | ✗ |
| admin | ✓ | Todos | Todas | ✓ | ✓ |

---

## Schema do banco de dados

### Tabela: `profiles`
Estende o `auth.users` do Supabase.

```sql
create table profiles (
  id uuid references auth.users primary key,
  nome text not null,
  perfil text not null check (perfil in ('tecnico', 'gestor', 'admin')),
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Cria perfil automaticamente ao registrar usuário
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nome, perfil)
  values (new.id, new.raw_user_meta_data->>'nome', coalesce(new.raw_user_meta_data->>'perfil', 'tecnico'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### Tabela: `ordens_servico`

```sql
create table ordens_servico (
  id text primary key,
  numero_os text,
  data_abertura text,
  usuario_id uuid references profiles(id),
  tecnico text,
  cliente text not null,
  cidade text not null,
  contato text,
  chassi text,
  modelo text,
  em_garantia boolean default false,
  fim_garantia text,
  motivo_visita text,
  km_rodados text,
  descricao_servico text,
  dias_horas jsonb default '[]',
  fotos_atendimento jsonb default '[]',
  pecas jsonb default '[]',
  assinatura_tecnico text,
  assinatura_cliente text,
  data_assinatura text,
  gerada boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Tabela: `relatorios_reembolso`

```sql
create table relatorios_reembolso (
  id text primary key,
  usuario_id uuid references profiles(id),
  tecnico text,
  clientes text,
  acompanhantes text,
  periodo text,
  observacoes text,
  notas jsonb default '[]',
  gerado boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## Row Level Security (RLS)

```sql
-- Habilitar RLS
alter table profiles enable row level security;
alter table ordens_servico enable row level security;
alter table relatorios_reembolso enable row level security;

-- Helper: pega o perfil do usuário logado
create or replace function get_perfil()
returns text as $$
  select perfil from profiles where id = auth.uid();
$$ language sql security definer;

-- profiles: cada um vê o próprio, admin vê todos
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or get_perfil() = 'admin');

create policy "profiles_update" on profiles for update
  using (get_perfil() = 'admin');

-- OS: tecnico vê as próprias, gestor/admin veem todas
create policy "os_select" on ordens_servico for select
  using (usuario_id = auth.uid() or get_perfil() in ('gestor', 'admin'));

create policy "os_insert" on ordens_servico for insert
  with check (usuario_id = auth.uid());

create policy "os_update" on ordens_servico for update
  using (usuario_id = auth.uid() or get_perfil() = 'admin');

-- Reembolso: mesma lógica
create policy "reembolso_select" on relatorios_reembolso for select
  using (usuario_id = auth.uid() or get_perfil() in ('gestor', 'admin'));

create policy "reembolso_insert" on relatorios_reembolso for insert
  with check (usuario_id = auth.uid());

create policy "reembolso_update" on relatorios_reembolso for update
  using (usuario_id = auth.uid() or get_perfil() = 'admin');
```

---

## Variáveis de ambiente

Criar arquivo `.env` na raiz do projeto (não commitar):

```
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

No Netlify: **Site Settings → Environment Variables** → adicionar as mesmas duas variáveis.

---

## Arquivos modificados

| Arquivo | O que muda |
|---------|-----------|
| `src/utils/supabase.ts` | **NOVO** — cliente Supabase |
| `src/utils/storage.ts` | Reescrito — funções viram async com chamadas Supabase |
| `App.tsx` | Auth via Supabase Session (onAuthStateChange) |
| `src/screens/LoginScreen.tsx` | usa `supabase.auth.signInWithPassword` |
| `src/screens/AdminScreen.tsx` | **NOVO** — painel admin/gestor |
| `src/screens/UserManagementScreen.tsx` | **NOVO** — gestão de usuários (admin) |
| `src/navigation/AppNavigator.tsx` | Sidebar mostra painel conforme perfil |

---

## SQL adicional (rodar após os scripts principais)

```sql
-- Permite admin excluir perfis de usuário
create policy "profiles_delete" on profiles for delete
  using (get_perfil() = 'admin');
```

---

## Passos manuais (Supabase) — já executados

1. ✅ Criar conta em **supabase.com**
2. ✅ Criar projeto (região: South America)
3. ✅ Rodar scripts SQL no SQL Editor
4. ✅ Criar usuários admin via Authentication → Users
5. ✅ Credenciais no `.env` local e no Vercel

### Problema encontrado na criação de usuários via Dashboard
O trigger `handle_new_user` falhava porque o Dashboard não passa metadados (`nome` ficava NULL violando NOT NULL).

**Fixes aplicados:**
```sql
-- 1. DEFAULT no campo nome
ALTER TABLE profiles ALTER COLUMN nome SET DEFAULT 'Usuário';

-- 2. Trigger com COALESCE e EXCEPTION handler
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, nome, perfil)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1), 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'perfil', 'tecnico')
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Inserir perfis manualmente (usuários criados via Dashboard)
```sql
INSERT INTO profiles (id, nome, perfil)
SELECT id, split_part(email, '@', 1), 'tecnico'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);

-- Promover admin
UPDATE profiles SET perfil = 'admin', nome = 'Rafael Duwe'
WHERE id = (SELECT id FROM auth.users WHERE email = 'rafael.duwe@selgron.com.br');
```

---

## Arquivos modificados (estado final)

| Arquivo | O que mudou |
|---------|-------------|
| `src/utils/supabase.ts` | **NOVO** — cliente Supabase |
| `src/utils/storage.ts` | Reescrito async + `deletarUsuario` |
| `App.tsx` | Auth via `onAuthStateChange` |
| `src/screens/LoginScreen.tsx` | Login async + erro inline |
| `src/screens/HomeScreen.tsx` | **NOVO** — relógio + dados Selgron |
| `src/screens/OSScreen.tsx` | Calls async + `handleAssinatura` async |
| `src/screens/ReembolsoScreen.tsx` | Calls async |
| `src/screens/AdminScreen.tsx` | **NOVO** — painel gestor/admin |
| `src/screens/UserManagementScreen.tsx` | **NOVO** — gestão + exclusão de usuários |
| `src/navigation/AppNavigator.tsx` | Sidebar cobre topbar, overlay, botão ✕ |

---

## Testes realizados

- [x] Login com usuário existente
- [x] Login com usuário inválido — erro inline em vermelho
- [x] Sidebar cobre topbar ao abrir
- [x] Overlay escurecido ao abrir sidebar
- [x] Admin vê painel e gestão de usuários
- [x] Admin consegue excluir usuário (com confirmação)
- [x] HomeScreen mostra relógio em tempo real (fuso Brasília)
- [ ] Criar OS, deslogar, logar — OS persiste (a validar)
- [ ] Usuário tecnico não vê OS de outro tecnico (a validar)

---

## O que NÃO muda

- Fluxo de preenchimento de OS (5 etapas)
- Fluxo de reembolso
- Geração de PDF
- Assinatura digital
- Gerador de token (offline, sem banco)
- Identidade visual
