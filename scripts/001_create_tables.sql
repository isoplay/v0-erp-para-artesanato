-- ============================================
-- ERP Artesanato Religioso - Schema do Banco
-- ============================================

-- Tabela: Materiais (Estoque)
CREATE TABLE IF NOT EXISTS materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  preco_compra DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'unidade',
  custo_unitario DECIMAL(10,4) GENERATED ALWAYS AS (
    CASE WHEN quantidade > 0 THEN preco_compra / quantidade ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('terco', 'pulseira', 'chaveiro', 'outro')),
  preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0,
  margem_lucro DECIMAL(5,2) DEFAULT 30,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Composição do Produto (Receita)
CREATE TABLE IF NOT EXISTS produto_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiais(id) ON DELETE RESTRICT,
  quantidade_usada DECIMAL(10,4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, material_id)
);

-- Tabela: Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome TEXT NOT NULL,
  cliente_contato TEXT,
  prazo_entrega DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_producao', 'finalizado', 'cancelado')),
  prioridade INTEGER DEFAULT 1,
  observacoes TEXT,
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Itens do Pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Despesas Extras
CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  categoria TEXT DEFAULT 'outros',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Movimentações de Estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade DECIMAL(10,2) NOT NULL,
  motivo TEXT,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_prazo ON pedidos(prazo_entrega);
CREATE INDEX IF NOT EXISTS idx_pedidos_created ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_materiais_tipo ON materiais(tipo);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON produtos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_material ON movimentacoes_estoque(material_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_materiais_updated_at ON materiais;
CREATE TRIGGER update_materiais_updated_at
  BEFORE UPDATE ON materiais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_produtos_updated_at ON produtos;
CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pedidos_updated_at ON pedidos;
CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular custo de produção do produto
CREATE OR REPLACE FUNCTION calcular_custo_producao(p_produto_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  custo DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(m.custo_unitario * pm.quantidade_usada), 0)
  INTO custo
  FROM produto_materiais pm
  JOIN materiais m ON m.id = pm.material_id
  WHERE pm.produto_id = p_produto_id;
  
  RETURN custo;
END;
$$ LANGUAGE plpgsql;

-- Função para descontar estoque ao finalizar pedido
CREATE OR REPLACE FUNCTION descontar_estoque_pedido()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executa quando status muda para 'finalizado'
  IF NEW.status = 'finalizado' AND (OLD.status IS NULL OR OLD.status != 'finalizado') THEN
    -- Desconta materiais de cada item do pedido
    INSERT INTO movimentacoes_estoque (material_id, tipo, quantidade, motivo, pedido_id)
    SELECT 
      pm.material_id,
      'saida',
      pm.quantidade_usada * pi.quantidade,
      'Pedido finalizado: ' || NEW.cliente_nome,
      NEW.id
    FROM pedido_itens pi
    JOIN produto_materiais pm ON pm.produto_id = pi.produto_id
    WHERE pi.pedido_id = NEW.id;

    -- Atualiza quantidade nos materiais
    UPDATE materiais m
    SET quantidade = m.quantidade - subq.total_usado
    FROM (
      SELECT 
        pm.material_id,
        SUM(pm.quantidade_usada * pi.quantidade) as total_usado
      FROM pedido_itens pi
      JOIN produto_materiais pm ON pm.produto_id = pi.produto_id
      WHERE pi.pedido_id = NEW.id
      GROUP BY pm.material_id
    ) subq
    WHERE m.id = subq.material_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_descontar_estoque ON pedidos;
CREATE TRIGGER trigger_descontar_estoque
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION descontar_estoque_pedido();

-- Função para atualizar valor total do pedido
CREATE OR REPLACE FUNCTION atualizar_valor_pedido()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pedidos
  SET valor_total = (
    SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
    FROM pedido_itens
    WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
  )
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_valor_pedido_insert ON pedido_itens;
CREATE TRIGGER trigger_atualizar_valor_pedido_insert
  AFTER INSERT ON pedido_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_pedido();

DROP TRIGGER IF EXISTS trigger_atualizar_valor_pedido_update ON pedido_itens;
CREATE TRIGGER trigger_atualizar_valor_pedido_update
  AFTER UPDATE ON pedido_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_pedido();

DROP TRIGGER IF EXISTS trigger_atualizar_valor_pedido_delete ON pedido_itens;
CREATE TRIGGER trigger_atualizar_valor_pedido_delete
  AFTER DELETE ON pedido_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_pedido();

-- View para produtos com custo calculado
CREATE OR REPLACE VIEW produtos_com_custo AS
SELECT 
  p.*,
  calcular_custo_producao(p.id) as custo_producao,
  p.preco_venda - calcular_custo_producao(p.id) as lucro_unitario
FROM produtos p;

-- View para pedidos com prioridade inteligente
CREATE OR REPLACE VIEW pedidos_priorizados AS
SELECT 
  p.*,
  CASE 
    WHEN p.status = 'pendente' THEN 1
    WHEN p.status = 'em_producao' THEN 2
    ELSE 3
  END as ordem_status,
  COALESCE(p.prazo_entrega, '2099-12-31'::date) as prazo_ordenacao
FROM pedidos p
WHERE p.status != 'cancelado'
ORDER BY 
  ordem_status ASC,
  prazo_ordenacao ASC,
  p.valor_total DESC;
