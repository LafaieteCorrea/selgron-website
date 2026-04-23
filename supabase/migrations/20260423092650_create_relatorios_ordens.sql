-- Tabelas de negocio: relatorios de reembolso e ordens de servico.
-- IDs sao TEXT pois o app gera ids client-side via Date.now + random.

-- ─── Helper: admin ou gestor podem ver tudo ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_view_all()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND perfil IN ('admin', 'gestor') AND ativo = TRUE
  );
$$;

-- ─── relatorios_reembolso ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relatorios_reembolso (
  id            TEXT PRIMARY KEY,
  usuario_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tecnico       TEXT,
  clientes      TEXT,
  acompanhantes TEXT,
  periodo       TEXT,
  observacoes   TEXT,
  notas         JSONB NOT NULL DEFAULT '[]'::jsonb,
  gerado        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS relatorios_reembolso_usuario_idx
  ON public.relatorios_reembolso (usuario_id);

ALTER TABLE public.relatorios_reembolso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS relatorios_select ON public.relatorios_reembolso;
CREATE POLICY relatorios_select ON public.relatorios_reembolso
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.can_view_all());

DROP POLICY IF EXISTS relatorios_insert ON public.relatorios_reembolso;
CREATE POLICY relatorios_insert ON public.relatorios_reembolso
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS relatorios_update ON public.relatorios_reembolso;
CREATE POLICY relatorios_update ON public.relatorios_reembolso
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.is_admin())
  WITH CHECK (usuario_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS relatorios_delete ON public.relatorios_reembolso;
CREATE POLICY relatorios_delete ON public.relatorios_reembolso
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP TRIGGER IF EXISTS relatorios_set_updated_at ON public.relatorios_reembolso;
CREATE TRIGGER relatorios_set_updated_at
  BEFORE UPDATE ON public.relatorios_reembolso
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── ordens_servico ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id                 TEXT PRIMARY KEY,
  numero_os          TEXT,
  data_abertura      TEXT,
  usuario_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tecnico            TEXT,
  cliente            TEXT,
  cidade             TEXT,
  contato            TEXT,
  chassi             TEXT,
  modelo             TEXT,
  em_garantia        BOOLEAN NOT NULL DEFAULT FALSE,
  fim_garantia       TEXT,
  motivo_visita      TEXT,
  km_rodados         TEXT,
  descricao_servico  TEXT,
  dias_horas         JSONB NOT NULL DEFAULT '[]'::jsonb,
  fotos_atendimento  JSONB NOT NULL DEFAULT '[]'::jsonb,
  pecas              JSONB NOT NULL DEFAULT '[]'::jsonb,
  assinatura_tecnico TEXT,
  assinatura_cliente TEXT,
  data_assinatura    TEXT,
  gerada             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ordens_servico_usuario_idx
  ON public.ordens_servico (usuario_id);
CREATE INDEX IF NOT EXISTS ordens_servico_numero_idx
  ON public.ordens_servico (numero_os);

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ordens_select ON public.ordens_servico;
CREATE POLICY ordens_select ON public.ordens_servico
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.can_view_all());

DROP POLICY IF EXISTS ordens_insert ON public.ordens_servico;
CREATE POLICY ordens_insert ON public.ordens_servico
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS ordens_update ON public.ordens_servico;
CREATE POLICY ordens_update ON public.ordens_servico
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.is_admin())
  WITH CHECK (usuario_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS ordens_delete ON public.ordens_servico;
CREATE POLICY ordens_delete ON public.ordens_servico
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP TRIGGER IF EXISTS ordens_set_updated_at ON public.ordens_servico;
CREATE TRIGGER ordens_set_updated_at
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
