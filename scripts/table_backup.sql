-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.categorias_produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categorias_produtos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.componentes_estoque (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL,
  material_id uuid NOT NULL,
  margem_lucro numeric DEFAULT 30,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT componentes_estoque_pkey PRIMARY KEY (id),
  CONSTRAINT componentes_estoque_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos_componentes(id),
  CONSTRAINT componentes_estoque_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materiais(id)
);
CREATE TABLE public.configuracao_maodeobra (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL UNIQUE,
  valor_maodeobra numeric NOT NULL DEFAULT 0,
  descricao text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT configuracao_maodeobra_pkey PRIMARY KEY (id),
  CONSTRAINT configuracao_maodeobra_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_produtos(id)
);
CREATE TABLE public.despesas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  categoria text DEFAULT 'outros'::text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  data_despesa date DEFAULT CURRENT_DATE,
  CONSTRAINT despesas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.grupos_componentes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  obrigatorio boolean DEFAULT true,
  permite_multipla_selecao boolean DEFAULT false,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT grupos_componentes_pkey PRIMARY KEY (id),
  CONSTRAINT grupos_componentes_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_produtos(id)
);
CREATE TABLE public.materiais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL,
  preco_compra numeric NOT NULL DEFAULT 0,
  quantidade numeric NOT NULL DEFAULT 0,
  unidade text NOT NULL DEFAULT 'unidade'::text,
  custo_unitario numeric DEFAULT 
CASE
    WHEN (quantidade > (0)::numeric) THEN (preco_compra / quantidade)
    ELSE (0)::numeric
END,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  descricao text,
  fornecedor text,
  quantidade_atual numeric DEFAULT 0,
  quantidade_minima numeric DEFAULT 0,
  CONSTRAINT materiais_pkey PRIMARY KEY (id)
);
CREATE TABLE public.movimentacoes_estoque (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['entrada'::text, 'saida'::text])),
  quantidade numeric NOT NULL,
  motivo text,
  pedido_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT movimentacoes_estoque_pkey PRIMARY KEY (id),
  CONSTRAINT movimentacoes_estoque_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materiais(id),
  CONSTRAINT movimentacoes_estoque_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);
CREATE TABLE public.pedido_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL,
  valor_total numeric DEFAULT ((quantidade)::numeric * valor_unitario),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pedido_itens_pkey PRIMARY KEY (id),
  CONSTRAINT pedido_itens_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT pedido_itens_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id)
);
CREATE TABLE public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_nome text NOT NULL,
  cliente_contato text,
  prazo_entrega date,
  status text NOT NULL DEFAULT 'pendente'::text CHECK (status = ANY (ARRAY['em_orcamento'::text, 'aguardando_material'::text, 'em_producao'::text, 'finalizado'::text, 'cancelado'::text])),
  prioridade integer DEFAULT 1,
  observacoes text,
  valor_total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tipo_produto_id uuid,
  variacao_id uuid,
  data_pedido timestamp with time zone DEFAULT now(),
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_tipo_produto_id_fkey FOREIGN KEY (tipo_produto_id) REFERENCES public.categorias_produtos(id),
  CONSTRAINT pedidos_variacao_id_fkey FOREIGN KEY (variacao_id) REFERENCES public.variacoes_tipo(id)
);
CREATE TABLE public.produto_materiais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL,
  material_id uuid NOT NULL,
  quantidade_usada numeric NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  quantidade numeric DEFAULT 1,
  CONSTRAINT produto_materiais_pkey PRIMARY KEY (id),
  CONSTRAINT produto_materiais_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id),
  CONSTRAINT produto_materiais_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materiais(id)
);
CREATE TABLE public.produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['terco'::text, 'pulseira'::text, 'chaveiro'::text, 'outro'::text])),
  preco_venda numeric NOT NULL DEFAULT 0,
  margem_lucro numeric DEFAULT 30,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT produtos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.variacoes_tipo (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT variacoes_tipo_pkey PRIMARY KEY (id),
  CONSTRAINT variacoes_tipo_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_produtos(id)
);