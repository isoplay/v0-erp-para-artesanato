-- ============================================
-- Fase 1: Composição, Status, Estoque Mínimo
-- ============================================

-- 1. Estoque mínimo obrigatório em materiais
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materiais' AND column_name = 'quantidade_minima'
  ) THEN
    ALTER TABLE materiais ADD COLUMN quantidade_minima DECIMAL(10,2) NOT NULL DEFAULT 30;
  ELSE
    UPDATE materiais SET quantidade_minima = 30 WHERE quantidade_minima IS NULL;
    ALTER TABLE materiais ALTER COLUMN quantidade_minima SET DEFAULT 30;
    ALTER TABLE materiais ALTER COLUMN quantidade_minima SET NOT NULL;
  END IF;
END $$;

-- 2. Mão de obra por produto (para cálculo de custo real)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos' AND column_name = 'valor_maodeobra'
  ) THEN
    ALTER TABLE produtos ADD COLUMN valor_maodeobra DECIMAL(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 3. Flag para evitar baixa duplicada de estoque
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'estoque_baixado'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN estoque_baixado BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 4. Migrar status antigos para o novo enum de negócio
UPDATE pedidos SET status = 'orcamento'
WHERE status IN ('em_orcamento', 'aguardando_material', 'pendente');

UPDATE pedidos SET status = 'entregue'
WHERE status = 'finalizado';

UPDATE pedidos SET estoque_baixado = true
WHERE status = 'entregue';

-- 5. Atualizar constraint de status
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;

ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check
  CHECK (status IN ('orcamento', 'confirmado', 'em_producao', 'pronto', 'entregue', 'cancelado'));

ALTER TABLE pedidos ALTER COLUMN status SET DEFAULT 'orcamento';

-- 6. Função de baixa de estoque (dispara ao marcar como PRONTO/ENTREGUE)
CREATE OR REPLACE FUNCTION descontar_estoque_pedido()
RETURNS TRIGGER AS $$
DECLARE
  shortages_msg TEXT;
BEGIN
  IF NEW.status IN ('pronto', 'entregue')
     AND (OLD.status IS NULL OR OLD.status != NEW.status)
     AND NOT COALESCE(NEW.estoque_baixado, false) THEN

    -- 6.1 Validação: impede estoque negativo
    WITH usage AS (
      SELECT
        COALESCE(pim.material_id, pm.material_id) AS material_id,
        SUM(COALESCE(pim.quantidade, pm.quantidade_usada * pi.quantidade)) AS total_usado
      FROM pedido_itens pi
      LEFT JOIN pedido_itens_materiais pim ON pim.pedido_item_id = pi.id
      LEFT JOIN produto_materiais pm ON pm.produto_id = pi.produto_id AND pim.material_id IS NULL
      WHERE pi.pedido_id = NEW.id
        AND (pim.material_id IS NOT NULL OR pm.material_id IS NOT NULL)
      GROUP BY COALESCE(pim.material_id, pm.material_id)
    ), shortages AS (
      SELECT
        m.nome,
        (u.total_usado - COALESCE(m.quantidade_atual, m.quantidade)) AS faltando
      FROM usage u
      JOIN materiais m ON m.id = u.material_id
      WHERE COALESCE(m.quantidade_atual, m.quantidade) < u.total_usado
    )
    SELECT string_agg(format('%s (faltam %s)', nome, faltando::text), ', ')
    INTO shortages_msg
    FROM shortages;

    IF shortages_msg IS NOT NULL AND shortages_msg <> '' THEN
      RAISE EXCEPTION 'Estoque insuficiente ao baixar materiais: %', shortages_msg;
    END IF;

    -- 6.2 Registra movimentacoes e baixa estoque
    WITH usage AS (
      SELECT
        COALESCE(pim.material_id, pm.material_id) AS material_id,
        SUM(COALESCE(pim.quantidade, pm.quantidade_usada * pi.quantidade)) AS total_usado
      FROM pedido_itens pi
      LEFT JOIN pedido_itens_materiais pim ON pim.pedido_item_id = pi.id
      LEFT JOIN produto_materiais pm ON pm.produto_id = pi.produto_id AND pim.material_id IS NULL
      WHERE pi.pedido_id = NEW.id
        AND (pim.material_id IS NOT NULL OR pm.material_id IS NOT NULL)
      GROUP BY COALESCE(pim.material_id, pm.material_id)
    )
    INSERT INTO movimentacoes_estoque (material_id, tipo, quantidade, motivo, pedido_id)
    SELECT
      u.material_id,
      'saida',
      u.total_usado,
      CASE
        WHEN NEW.status = 'pronto' THEN 'Pedido pronto: ' || NEW.cliente_nome
        ELSE 'Pedido entregue: ' || NEW.cliente_nome
      END,
      NEW.id
    FROM usage u;

    WITH usage AS (
      SELECT
        COALESCE(pim.material_id, pm.material_id) AS material_id,
        SUM(COALESCE(pim.quantidade, pm.quantidade_usada * pi.quantidade)) AS total_usado
      FROM pedido_itens pi
      LEFT JOIN pedido_itens_materiais pim ON pim.pedido_item_id = pi.id
      LEFT JOIN produto_materiais pm ON pm.produto_id = pi.produto_id AND pim.material_id IS NULL
      WHERE pi.pedido_id = NEW.id
        AND (pim.material_id IS NOT NULL OR pm.material_id IS NOT NULL)
      GROUP BY COALESCE(pim.material_id, pm.material_id)
    )
    UPDATE materiais m
    SET
      quantidade = m.quantidade - u.total_usado,
      quantidade_atual = COALESCE(m.quantidade_atual, m.quantidade) - u.total_usado
    FROM usage u
    WHERE m.id = u.material_id;

    NEW.estoque_baixado := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_descontar_estoque ON pedidos;
CREATE TRIGGER trigger_descontar_estoque
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION descontar_estoque_pedido();

-- 7. View atualizada de produtos com custo
CREATE OR REPLACE VIEW produtos_com_custo AS
SELECT
  p.*,
  calcular_custo_producao(p.id) AS custo_materiais,
  COALESCE(p.valor_maodeobra, 0) AS maodeobra,
  calcular_custo_producao(p.id) + COALESCE(p.valor_maodeobra, 0) AS custo_producao,
  p.preco_venda - (calcular_custo_producao(p.id) + COALESCE(p.valor_maodeobra, 0)) AS lucro_unitario
FROM produtos p;
