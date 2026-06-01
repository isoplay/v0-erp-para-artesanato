BEGIN;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE USAGE, SELECT, UPDATE ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;

GRANT USAGE ON SCHEMA public TO authenticated;

DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'categorias_produtos',
    'componentes_estoque',
    'configuracao_maodeobra',
    'despesas',
    'grupos_componentes',
    'materiais',
    'movimentacoes_estoque',
    'pedido_itens',
    'pedido_itens_materiais',
    'pedidos',
    'produto_materiais',
    'produtos',
    'variacoes_tipo'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_full_access ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY authenticated_full_access ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
  END LOOP;
END $$;

ALTER VIEW public.pedidos_priorizados SET (security_invoker = true);
ALTER VIEW public.produtos_com_custo SET (security_invoker = true);
ALTER VIEW public.vw_categorias_completas SET (security_invoker = true);
ALTER VIEW public.vw_componentes_disponiveis SET (security_invoker = true);

GRANT SELECT ON
  public.pedidos_priorizados,
  public.produtos_com_custo,
  public.vw_categorias_completas,
  public.vw_componentes_disponiveis
TO authenticated;

GRANT EXECUTE ON FUNCTION public.calcular_custo_producao(uuid) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagens-estoque',
  'imagens-estoque',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
