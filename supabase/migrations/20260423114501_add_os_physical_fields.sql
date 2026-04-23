-- Adiciona campos da OS fisica em ordens_servico.
-- Todos TEXT para manter flexibilidade (valores monetarios com virgula, codigos etc).

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS codigo            TEXT,
  ADD COLUMN IF NOT EXISTS uf                TEXT,
  ADD COLUMN IF NOT EXISTS pais              TEXT,
  ADD COLUMN IF NOT EXISTS km_viagem         TEXT,
  ADD COLUMN IF NOT EXISTS km_cliente        TEXT,
  ADD COLUMN IF NOT EXISTS km_selgron        TEXT,
  ADD COLUMN IF NOT EXISTS km_trabalho       TEXT,
  ADD COLUMN IF NOT EXISTS km_valor_unitario TEXT,
  ADD COLUMN IF NOT EXISTS horas_acompanhamento_qtd      TEXT,
  ADD COLUMN IF NOT EXISTS horas_acompanhamento_valor    TEXT,
  ADD COLUMN IF NOT EXISTS horas_acompanhamento_cliente  TEXT,
  ADD COLUMN IF NOT EXISTS horas_acompanhamento_selgron  TEXT,
  ADD COLUMN IF NOT EXISTS diarias_qtd      TEXT,
  ADD COLUMN IF NOT EXISTS diarias_valor    TEXT,
  ADD COLUMN IF NOT EXISTS diarias_cliente  TEXT,
  ADD COLUMN IF NOT EXISTS diarias_selgron  TEXT,
  ADD COLUMN IF NOT EXISTS km_outros_qtd      TEXT,
  ADD COLUMN IF NOT EXISTS km_outros_valor    TEXT,
  ADD COLUMN IF NOT EXISTS km_outros_cliente  TEXT,
  ADD COLUMN IF NOT EXISTS km_outros_selgron  TEXT,
  ADD COLUMN IF NOT EXISTS horas_trabalhadas_qtd      TEXT,
  ADD COLUMN IF NOT EXISTS horas_trabalhadas_valor    TEXT,
  ADD COLUMN IF NOT EXISTS horas_trabalhadas_cliente  TEXT,
  ADD COLUMN IF NOT EXISTS horas_trabalhadas_selgron  TEXT,
  ADD COLUMN IF NOT EXISTS valor_a_pagar_tecnico TEXT,
  ADD COLUMN IF NOT EXISTS nota_fiscal_proforma  TEXT,
  ADD COLUMN IF NOT EXISTS data_emissao         TEXT;

-- km_rodados era usado antes; mantemos a coluna por compatibilidade mas nao mais usada
-- (nao dropamos para nao quebrar eventuais consultas externas)
