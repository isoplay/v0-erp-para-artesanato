-- Adicionar coluna de imagem na tabela materiais
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'materiais' AND column_name = 'imagem_url'
  ) THEN
    ALTER TABLE materiais ADD COLUMN imagem_url TEXT;
  END IF;
END $$;

-- Adicionar coluna de materiais em pedido_itens (para composição customizada por pedido)
-- Esto permite que cada pedido tenha sua própria composição de materiais
CREATE TABLE IF NOT EXISTS pedido_itens_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id UUID NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiais(id) ON DELETE RESTRICT,
  quantidade DECIMAL(10,4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pedido_item_id, material_id)
);
