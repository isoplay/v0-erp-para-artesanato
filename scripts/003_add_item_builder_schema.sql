-- ============================================
-- Item Builder Schema - Montador de Itens
-- ============================================
-- This migration adds support for a flexible item builder system
-- allowing customers to compose products dynamically from components.

-- ==============================================
-- 1. Tabela: Categorias de Produtos
-- ==============================================
-- Stores product categories (Terço, Pulseira, Chaveiro, etc.)
-- Allows extensibility for future categories
CREATE TABLE IF NOT EXISTS categorias_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  data_pedido TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 2. Tabela: Variações por Categoria
-- ==============================================
-- Stores variations of products within a category
-- Example: Terço → Básico, Resinado, Com Nome
CREATE TABLE IF NOT EXISTS variacoes_tipo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias_produtos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  data_pedido TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria_id, nome)
);

-- ==============================================
-- 3. Tabela: Grupos de Componentes
-- ==============================================
-- Stores component groups for each category
-- Example: For Terço → Contas, Entremeio, Cruz, Letras
-- These are the "selectable fields" in the item builder UI
CREATE TABLE IF NOT EXISTS grupos_componentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias_produtos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  obrigatorio BOOLEAN DEFAULT true,
  permite_multipla_selecao BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  data_pedido TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria_id, nome)
);

-- ==============================================
-- 4. Tabela: Componentes Estoque (Material Grouping)
-- ==============================================
-- Links materiais from estoque table to component groups
-- Maps available materials to selection fields
CREATE TABLE IF NOT EXISTS componentes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupos_componentes(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
  margem_lucro DECIMAL(5,2) DEFAULT 30,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  data_pedido TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grupo_id, material_id)
);

-- ==============================================
-- 5. Tabela: Configuração de Mão de Obra
-- ==============================================
-- Stores labor costs for each product category
-- Allows customer to configure and update labor rates
CREATE TABLE IF NOT EXISTS configuracao_maodeobra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias_produtos(id) ON DELETE CASCADE,
  valor_maodeobra DECIMAL(10,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria_id)
);

-- ==============================================
-- 6. Alter pedidos table to support item builder
-- ==============================================
-- Add foreign keys to track which category and variation was selected
DO $$
BEGIN
  -- Add tipo_produto_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'tipo_produto_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN tipo_produto_id UUID REFERENCES categorias_produtos(id) ON DELETE SET NULL;
  END IF;

  -- Add variacao_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'variacao_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN variacao_id UUID REFERENCES variacoes_tipo(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================
-- 7. Update pedidos status enum
-- ==============================================
-- Migration function to update status values
-- Old: 'pendente' | 'em_producao' | 'finalizado' | 'cancelado'
-- New: 'em_orcamento' | 'aguardando_material' | 'em_producao' | 'finalizado' | 'cancelado'

-- First, drop the constraint on the existing table
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;

-- Add new CHECK constraint with updated status values
ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check 
  CHECK (status IN ('em_orcamento', 'aguardando_material', 'em_producao', 'finalizado', 'cancelado'));

-- ==============================================
-- 8. Seed Initial Data
-- ==============================================
-- Insert default categories
INSERT INTO categorias_produtos (nome, descricao, ativo, ordem)
VALUES 
  ('Terço', 'Produtos tipo terço', true, 1),
  ('Pulseira', 'Produtos tipo pulseira', true, 2),
  ('Chaveiro', 'Produtos tipo chaveiro', true, 3)
ON CONFLICT (nome) DO NOTHING;

-- Get IDs for subsequent inserts
DO $$
DECLARE
  terco_id UUID;
  pulseira_id UUID;
  chaveiro_id UUID;
BEGIN
  SELECT id INTO terco_id FROM categorias_produtos WHERE nome = 'Terço';
  SELECT id INTO pulseira_id FROM categorias_produtos WHERE nome = 'Pulseira';
  SELECT id INTO chaveiro_id FROM categorias_produtos WHERE nome = 'Chaveiro';

  -- Insert variations for Terço
  INSERT INTO variacoes_tipo (categoria_id, nome, descricao, ativo, ordem)
  VALUES 
    (terco_id, 'Básico', 'Terço simples', true, 1),
    (terco_id, 'Resinado', 'Terço com resina', true, 2),
    (terco_id, 'Com Nome', 'Terço com letras personalizadas', true, 3)
  ON CONFLICT (categoria_id, nome) DO NOTHING;

  -- Insert variations for Pulseira
  INSERT INTO variacoes_tipo (categoria_id, nome, descricao, ativo, ordem)
  VALUES 
    (pulseira_id, 'Básico', 'Pulseira simples', true, 1),
    (pulseira_id, 'Com Fecho', 'Pulseira com fecho ajustável', true, 2)
  ON CONFLICT (categoria_id, nome) DO NOTHING;

  -- Insert variations for Chaveiro
  INSERT INTO variacoes_tipo (categoria_id, nome, descricao, ativo, ordem)
  VALUES 
    (chaveiro_id, 'Básico', 'Chaveiro simples', true, 1)
  ON CONFLICT (categoria_id, nome) DO NOTHING;

  -- Insert component groups for Terço
  INSERT INTO grupos_componentes (categoria_id, nome, descricao, obrigatorio, permite_multipla_selecao, ordem, ativo)
  VALUES 
    (terco_id, 'Contas', 'Tipo de contas/miçangas', true, false, 1, true),
    (terco_id, 'Entremeio', 'Peça separadora', true, false, 2, true),
    (terco_id, 'Cruz', 'Crucifixo ou cruz', true, false, 3, true),
    (terco_id, 'Letras', 'Letras personalizadas (opcional)', false, false, 4, true)
  ON CONFLICT (categoria_id, nome) DO NOTHING;

  -- Insert component groups for Pulseira
  INSERT INTO grupos_componentes (categoria_id, nome, descricao, obrigatorio, permite_multipla_selecao, ordem, ativo)
  VALUES 
    (pulseira_id, 'Contas', 'Tipo de contas/miçangas', true, false, 1, true),
    (pulseira_id, 'Fecho', 'Tipo de fecho (se aplicável)', false, false, 2, true)
  ON CONFLICT (categoria_id, nome) DO NOTHING;

  -- Insert component groups for Chaveiro
  INSERT INTO grupos_componentes (categoria_id, nome, descricao, obrigatorio, permite_multipla_selecao, ordem, ativo)
  VALUES 
    (chaveiro_id, 'Contas', 'Tipo de contas/miçangas', true, false, 1, true),
    (chaveiro_id, 'Pingente', 'Pingente decorativo (opcional)', false, false, 2, true)
  ON CONFLICT (categoria_id, nome) DO NOTHING;

  -- Insert default labor costs
  INSERT INTO configuracao_maodeobra (categoria_id, valor_maodeobra, descricao)
  VALUES 
    (terco_id, 5.00, 'Mão de obra padrão para terço'),
    (pulseira_id, 3.00, 'Mão de obra padrão para pulseira'),
    (chaveiro_id, 2.00, 'Mão de obra padrão para chaveiro')
  ON CONFLICT (categoria_id) DO NOTHING;

END $$;

-- ==============================================
-- 9. Update descontar_estoque_pedido trigger
-- ==============================================
-- Modified to handle both old-style produto_materiais and new custom pedido_itens_materiais
CREATE OR REPLACE FUNCTION descontar_estoque_pedido()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executa quando status muda para 'finalizado'
  IF NEW.status = 'finalizado' AND (OLD.status IS NULL OR OLD.status != 'finalizado') THEN
    -- Desconta materiais usando pedido_itens_materiais (custom composition)
    -- Se não houver custom composition, usa produto_materiais como fallback
    INSERT INTO movimentacoes_estoque (material_id, tipo, quantidade, motivo, pedido_id)
    SELECT 
      COALESCE(pim.material_id, pm.material_id) as material_id,
      'saida',
      COALESCE(pim.quantidade, pm.quantidade_usada * pi.quantidade) as total_usado,
      'Pedido finalizado: ' || NEW.cliente_nome,
      NEW.id
    FROM pedido_itens pi
    LEFT JOIN pedido_itens_materiais pim ON pim.pedido_item_id = pi.id
    LEFT JOIN produto_materiais pm ON pm.produto_id = pi.produto_id
    WHERE pi.pedido_id = NEW.id
      AND (pim.material_id IS NOT NULL OR pm.material_id IS NOT NULL)
    GROUP BY COALESCE(pim.material_id, pm.material_id);

    -- Atualiza quantidade nos materiais (usando custom composition se disponível)
    UPDATE materiais m
    SET quantidade = m.quantidade - subq.total_usado
    FROM (
      SELECT 
        COALESCE(pim.material_id, pm.material_id) as material_id,
        SUM(COALESCE(pim.quantidade, pm.quantidade_usada * pi.quantidade)) as total_usado
      FROM pedido_itens pi
      LEFT JOIN pedido_itens_materiais pim ON pim.pedido_item_id = pi.id
      LEFT JOIN produto_materiais pm ON pm.produto_id = pi.produto_id
      WHERE pi.pedido_id = NEW.id
        AND (pim.material_id IS NOT NULL OR pm.material_id IS NOT NULL)
      GROUP BY COALESCE(pim.material_id, pm.material_id)
    ) subq
    WHERE m.id = subq.material_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 10. Create Indexes
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_categorias_ativo ON categorias_produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_variacoes_categoria ON variacoes_tipo(categoria_id);
CREATE INDEX IF NOT EXISTS idx_grupos_categoria ON grupos_componentes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_componentes_grupo ON componentes_estoque(grupo_id);
CREATE INDEX IF NOT EXISTS idx_componentes_material ON componentes_estoque(material_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo_produto ON pedidos(tipo_produto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_variacao ON pedidos(variacao_id);

-- ==============================================
-- 11. Triggers for updated_at columns
-- ==============================================
DROP TRIGGER IF EXISTS update_categorias_updated_at ON categorias_produtos;
CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON categorias_produtos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_variacoes_updated_at ON variacoes_tipo;
CREATE TRIGGER update_variacoes_updated_at
  BEFORE UPDATE ON variacoes_tipo
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grupos_updated_at ON grupos_componentes;
CREATE TRIGGER update_grupos_updated_at
  BEFORE UPDATE ON grupos_componentes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_componentes_updated_at ON componentes_estoque;
CREATE TRIGGER update_componentes_updated_at
  BEFORE UPDATE ON componentes_estoque
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 12. Views for Item Builder
-- ==============================================
-- View: Get all categories with their variations and component groups
CREATE OR REPLACE VIEW vw_categorias_completas AS
SELECT 
  cp.id as categoria_id,
  cp.nome as categoria_nome,
  cp.descricao as categoria_descricao,
  cp.ativo as categoria_ativo,
  vt.id as variacao_id,
  vt.nome as variacao_nome,
  vt.descricao as variacao_descricao,
  vt.ativo as variacao_ativa,
  gc.id as grupo_id,
  gc.nome as grupo_nome,
  gc.descricao as grupo_descricao,
  gc.obrigatorio as grupo_obrigatorio,
  gc.permite_multipla_selecao,
  m.id as material_id,
  m.nome as material_nome,
  m.preco_compra,
  m.custo_unitario,
  ce.margem_lucro,
  (m.custo_unitario * (1 + ce.margem_lucro / 100)) as preco_sugerido,
  m.quantidade as estoque_quantidade,
  cm.valor_maodeobra
FROM categorias_produtos cp
LEFT JOIN variacoes_tipo vt ON vt.categoria_id = cp.id AND vt.ativo = true
LEFT JOIN grupos_componentes gc ON gc.categoria_id = cp.id AND gc.ativo = true
LEFT JOIN componentes_estoque ce ON ce.grupo_id = gc.id AND ce.ativo = true
LEFT JOIN materiais m ON m.id = ce.material_id
LEFT JOIN configuracao_maodeobra cm ON cm.categoria_id = cp.id
WHERE cp.ativo = true;

-- View: Get all available components for the item builder UI
CREATE OR REPLACE VIEW vw_componentes_disponiveis AS
SELECT 
  gc.id as grupo_id,
  gc.nome as grupo_nome,
  gc.categoria_id,
  m.id as material_id,
  m.nome as material_nome,
  m.custo_unitario,
  ce.margem_lucro,
  (m.custo_unitario * (1 + ce.margem_lucro / 100)) as preco_venda,
  m.quantidade as estoque_atual,
  m.imagem_url
FROM componentes_estoque ce
JOIN grupos_componentes gc ON gc.id = ce.grupo_id AND gc.ativo = true
JOIN materiais m ON m.id = ce.material_id
WHERE ce.ativo = true
  AND gc.ativo = true
ORDER BY gc.ordem, m.nome;
