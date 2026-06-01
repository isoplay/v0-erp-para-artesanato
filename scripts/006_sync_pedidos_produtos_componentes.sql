-- Corrige o fluxo atual de pedidos/produtos/componentes.
-- - O app usa "separando_materiais" como status inicial de pedidos.
-- - Produtos ativos devem aparecer como tipos de produto no pedido.
-- - Tipos de componente ficam em grupos_componentes e sao vinculados aos materiais por materiais.tipo.

ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;

ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check
  CHECK (
    status IN (
      'orcamento',
      'confirmado',
      'separando_materiais',
      'em_producao',
      'pronto',
      'entregue',
      'cancelado'
    )
  );

ALTER TABLE pedidos ALTER COLUMN status SET DEFAULT 'orcamento';

DO $$
DECLARE
  produto_record RECORD;
  v_categoria_id UUID;
  next_ordem INTEGER;
  tipo_nome TEXT;
  tipo_ordem INTEGER;
BEGIN
  FOR produto_record IN
    SELECT id, nome, valor_maodeobra, ativo
    FROM produtos
  LOOP
    SELECT id INTO v_categoria_id
    FROM categorias_produtos
    WHERE lower(nome) = lower(produto_record.nome)
    LIMIT 1;

    IF v_categoria_id IS NULL THEN
      SELECT COALESCE(MAX(ordem), 0) + 1 INTO next_ordem FROM categorias_produtos;

      INSERT INTO categorias_produtos (nome, descricao, ativo, ordem)
      VALUES (
        produto_record.nome,
        'Produto ' || produto_record.nome,
        COALESCE(produto_record.ativo, true),
        next_ordem
      )
      RETURNING id INTO v_categoria_id;
    ELSE
      UPDATE categorias_produtos
      SET
        nome = produto_record.nome,
        descricao = COALESCE(descricao, 'Produto ' || produto_record.nome),
        ativo = COALESCE(produto_record.ativo, true)
      WHERE id = v_categoria_id;
    END IF;

    INSERT INTO configuracao_maodeobra (categoria_id, valor_maodeobra, descricao)
    VALUES (
      v_categoria_id,
      COALESCE(produto_record.valor_maodeobra, 0),
      'Valor definido no cadastro de produtos'
    )
    ON CONFLICT (categoria_id)
    DO UPDATE SET
      valor_maodeobra = EXCLUDED.valor_maodeobra,
      descricao = EXCLUDED.descricao,
      updated_at = NOW();

    tipo_ordem := 0;
    FOREACH tipo_nome IN ARRAY ARRAY['Contas', 'Entremeio', 'Cruz', 'Letras']
    LOOP
      tipo_ordem := tipo_ordem + 1;

      INSERT INTO grupos_componentes (
        categoria_id,
        nome,
        descricao,
        obrigatorio,
        permite_multipla_selecao,
        ordem,
        ativo
      )
      SELECT
        v_categoria_id,
        tipo_nome,
        NULL,
        false,
        false,
        tipo_ordem,
        true
      WHERE NOT EXISTS (
        SELECT 1
        FROM grupos_componentes
        WHERE categoria_id = v_categoria_id
          AND lower(nome) = lower(tipo_nome)
      );
    END LOOP;
  END LOOP;

  UPDATE categorias_produtos cp
  SET ativo = false
  WHERE NOT EXISTS (
    SELECT 1
    FROM produtos p
    WHERE p.ativo = true
      AND lower(p.nome) = lower(cp.nome)
  );
END $$;
