'use client'

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react'
import { ChevronRight, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  getCategorias,
  getComponentesPorCategoria,
  calcularPrecoItemMontado,
  criarPedidoComMontagem,
  validarEstoqueComponentes,
} from '@/app/dashboard/pedidos/builder-actions'
import type {
  CategoriaProduto,
  VariacaoTipo,
  ComponenteDisponivel,
} from '@/lib/types/database'

interface ItemBuilderProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface PrecificacaoState {
  total_componentes: number
  maodeobra: number
  total: number
  detalhes: Array<{
    material_nome: string
    valor_unitario: number
    quantidade: number
    subtotal: number
  }>
}

interface ClienteData {
  nome: string
  telefone: string
  endereco: string
  data_entrega: string
}

export default function ItemBuilder({ isOpen, onClose, onSuccess }: ItemBuilderProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<'categoria' | 'variacao' | 'componentes' | 'resumo'>(
    'categoria'
  )
  const [isPending, startTransition] = useTransition()

  // Data loading
  const [categorias, setCategorias] = useState<(CategoriaProduto & {
    variacoes_tipo: VariacaoTipo[]
    grupos_componentes: any[]
  })[]>([])
  const [componentes, setComponentes] = useState<ComponenteDisponivel[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Selection state
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null)
  const [selectedVariacao, setSelectedVariacao] = useState<string | null>(null)
  const [selectedComponentes, setSelectedComponentes] = useState<Record<string, string>>(
    {}
  )
  const [quantidadeItens, setQuantidadeItens] = useState(1)

  // Pricing
  const [precificacao, setPrecificacao] = useState<PrecificacaoState | null>(null)

  // Cliente data
  const [clienteData, setClienteData] = useState<ClienteData>({
    nome: '',
    telefone: '',
    endereco: '',
    data_entrega: '',
  })

  const resetBuilder = useCallback(() => {
    setCurrentStep('categoria')
    setSelectedCategoria(null)
    setSelectedVariacao(null)
    setSelectedComponentes({})
    setQuantidadeItens(1)
    setPrecificacao(null)
    setComponentes([])
    setClienteData({ nome: '', telefone: '', endereco: '', data_entrega: '' })
  }, [])

  useEffect(() => {
    if (!isOpen) {
      resetBuilder()
      return
    }

    let cancelled = false
    setIsLoadingData(true)

    getCategorias()
      .then((data) => {
        if (!cancelled) setCategorias(data)
      })
      .catch((error) => {
        console.error('Error loading categories:', error)
        if (!cancelled) toast.error('Erro ao carregar categorias')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, resetBuilder])

  const loadComponentes = async (categoria_id: string) => {
    setIsLoadingData(true)
    try {
      const data = await getComponentesPorCategoria(categoria_id)
      setComponentes(data)
    } catch (error) {
      console.error('Error loading components:', error)
      toast.error('Erro ao carregar componentes')
    } finally {
      setIsLoadingData(false)
    }
  }

  // Calculate price when components change
  const calcularPreco = async () => {
    if (!selectedCategoria) return

    const componentes_list = Object.entries(selectedComponentes)
      .filter(([_, value]) => value)
      .map(([material_id]) => ({
        material_id,
        quantidade: 1,
      }))

    if (componentes_list.length === 0) {
      setPrecificacao(null)
      return
    }

    try {
      const preco = await calcularPrecoItemMontado(selectedCategoria, componentes_list)
      setPrecificacao(preco)
    } catch (error) {
      console.error('Error calculating price:', error)
      toast.error('Erro ao calcular preço')
    }
  }

  // Handle categoria selection
  const handleSelectCategoria = (categoria_id: string) => {
    setSelectedCategoria(categoria_id)
    setSelectedVariacao(null)
    setSelectedComponentes({})
    setPrecificacao(null)
    loadComponentes(categoria_id)
  }

  // Handle componente selection
  const handleSelectComponente = async (material_id: string, isChecked: boolean) => {
    const newSelection = { ...selectedComponentes }
    if (isChecked) {
      newSelection[material_id] = material_id
    } else {
      delete newSelection[material_id]
    }
    setSelectedComponentes(newSelection)

    // Auto-calculate price after selection changes
    if (Object.keys(newSelection).length > 0) {
      const componentes_list = Object.entries(newSelection)
        .filter(([_, value]) => value)
        .map(([material_id]) => ({
          material_id,
          quantidade: 1,
        }))

      try {
        const preco = await calcularPrecoItemMontado(selectedCategoria!, componentes_list)
        setPrecificacao(preco)
      } catch (error) {
        console.error('Error calculating price:', error)
      }
    } else {
      setPrecificacao(null)
    }
  }

  // Navigate steps
  const canProceedToVariacao = selectedCategoria !== null
  const canProceedToComponentes = selectedCategoria !== null
  const canProceedToResumo =
    selectedCategoria !== null && Object.keys(selectedComponentes).length > 0

  const currentCategoria = categorias.find(c => c.id === selectedCategoria)
  const grupos = useMemo(() => {
    if (!componentes) return []
    const grouped: Record<string, ComponenteDisponivel[]> = {}
    componentes.forEach(c => {
      if (!grouped[c.grupo_nome]) {
        grouped[c.grupo_nome] = []
      }
      grouped[c.grupo_nome].push(c)
    })
    return Object.entries(grouped).map(([nome, items]) => ({
      nome,
      items,
    }))
  }, [componentes])

  const handleCriarPedido = async () => {
    if (
      !selectedCategoria ||
      !clienteData.nome ||
      Object.keys(selectedComponentes).length === 0
    ) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const componentes_list = Object.keys(selectedComponentes).map(material_id => ({
      material_id,
      quantidade: 1,
    }))

    startTransition(async () => {
      try {
        const result = await criarPedidoComMontagem(
          clienteData.nome,
          clienteData.telefone || null,
          clienteData.endereco || null,
          clienteData.data_entrega || null,
          selectedCategoria,
          selectedVariacao || null,
          componentes_list,
          quantidadeItens,
          null
        )

        if (result.success) {
          toast.success('Pedido criado com sucesso!')
          onClose()
          onSuccess?.()
        } else if (result.deve_aguardar_material) {
          toast.warning(result.error || 'Material indisponível')
          // TODO: Open dialog to confirm creating in "aguardando_material" status
        } else {
          toast.error(result.error || 'Erro ao criar pedido')
        }
      } catch (error) {
        console.error('Error creating order:', error)
        toast.error('Erro ao criar pedido')
      }
    })
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Montar Novo Item</DialogTitle>
          <DialogDescription>
            Selecione a categoria, variação e componentes para montar seu produto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex gap-2 items-center text-sm">
            <div
              className={`px-3 py-1 rounded-full font-medium ${
                ['categoria', 'variacao', 'componentes', 'resumo'].includes(currentStep)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              1. Categoria
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div
              className={`px-3 py-1 rounded-full font-medium ${
                ['variacao', 'componentes', 'resumo'].includes(currentStep)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              2. Variação
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div
              className={`px-3 py-1 rounded-full font-medium ${
                ['componentes', 'resumo'].includes(currentStep)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              3. Componentes
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <div
              className={`px-3 py-1 rounded-full font-medium ${
                currentStep === 'resumo' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              4. Resumo
            </div>
          </div>

          <Separator />

          {/* Step 1: Categoria */}
          {currentStep === 'categoria' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Selecione a categoria</h3>
                <RadioGroup value={selectedCategoria || ''} onValueChange={handleSelectCategoria}>
                  <div className="grid grid-cols-3 gap-4">
                    {categorias.map(cat => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={cat.id} id={`cat-${cat.id}`} />
                        <Label
                          htmlFor={`cat-${cat.id}`}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          {cat.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Variação */}
          {currentStep === 'variacao' && currentCategoria && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Selecione a variação</h3>
                {currentCategoria.variacoes_tipo.length > 0 ? (
                  <RadioGroup
                    value={selectedVariacao || ''}
                    onValueChange={setSelectedVariacao}
                  >
                    <div className="space-y-2">
                      {currentCategoria.variacoes_tipo.map(var_tipo => (
                        <div key={var_tipo.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={var_tipo.id} id={`var-${var_tipo.id}`} />
                          <Label
                            htmlFor={`var-${var_tipo.id}`}
                            className="flex-1 cursor-pointer font-normal"
                          >
                            <span className="font-medium">{var_tipo.nome}</span>
                            {var_tipo.descricao && (
                              <span className="text-sm text-muted-foreground block">
                                {var_tipo.descricao}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                ) : (
                  <p className="text-muted-foreground">Nenhuma variação disponível</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Componentes */}
          {currentStep === 'componentes' && currentCategoria && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-4">Selecione os componentes</h3>
                <div className="space-y-6">
                  {isLoadingData && (
                    <p className="text-sm text-muted-foreground">Carregando componentes...</p>
                  )}
                  {!isLoadingData && grupos.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum componente cadastrado para esta categoria. Configure em Configuracoes
                      ou cadastre materiais no estoque e vincule em componentes_estoque.
                    </p>
                  )}
                  {grupos.map(grupo => (
                    <div key={grupo.nome} className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">{grupo.nome}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {grupo.items.map(item => (
                          <div
                            key={item.material_id}
                            className="flex items-start space-x-2 p-2 rounded-lg hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`comp-${item.material_id}`}
                              checked={selectedComponentes[item.material_id] ? true : false}
                              onCheckedChange={checked =>
                                handleSelectComponente(item.material_id, checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={`comp-${item.material_id}`}
                              className="flex-1 cursor-pointer font-normal"
                            >
                              <div className="font-medium text-sm">{item.material_nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(item.preco_venda)}
                              </div>
                              {item.estoque_atual < 5 && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {item.estoque_atual} em estoque
                                </Badge>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price summary */}
              {precificacao && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Componentes:</span>
                        <span className="font-mono">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(precificacao.total_componentes)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Mão de obra:</span>
                        <span className="font-mono">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(precificacao.maodeobra)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total (por unidade):</span>
                        <span className="font-mono">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(precificacao.total)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Resumo e Cliente */}
          {currentStep === 'resumo' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold">Dados do Cliente</h3>
                <div>
                  <Label htmlFor="cliente-nome" className="text-sm">
                    Nome *
                  </Label>
                  <Input
                    id="cliente-nome"
                    value={clienteData.nome}
                    onChange={e => setClienteData({ ...clienteData, nome: e.target.value })}
                    placeholder="Nome do cliente"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <Label htmlFor="cliente-telefone" className="text-sm">
                    Telefone
                  </Label>
                  <Input
                    id="cliente-telefone"
                    value={clienteData.telefone}
                    onChange={e =>
                      setClienteData({ ...clienteData, telefone: e.target.value })
                    }
                    placeholder="(00) 0000-0000"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <Label htmlFor="cliente-endereco" className="text-sm">
                    Endereço
                  </Label>
                  <Input
                    id="cliente-endereco"
                    value={clienteData.endereco}
                    onChange={e =>
                      setClienteData({ ...clienteData, endereco: e.target.value })
                    }
                    placeholder="Rua, número, complemento"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <Label htmlFor="cliente-data" className="text-sm">
                    Data de Entrega
                  </Label>
                  <Input
                    id="cliente-data"
                    type="date"
                    value={clienteData.data_entrega}
                    onChange={e =>
                      setClienteData({ ...clienteData, data_entrega: e.target.value })
                    }
                    disabled={isPending}
                  />
                </div>
                <div>
                  <Label htmlFor="quantidade" className="text-sm">
                    Quantidade
                  </Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={quantidadeItens}
                    onChange={e => setQuantidadeItens(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={isPending}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                <div className="text-sm font-medium">Resumo do Pedido</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Categoria: {currentCategoria?.nome}</div>
                  {selectedVariacao && (
                    <div>
                      Variação:{' '}
                      {currentCategoria?.variacoes_tipo.find(v => v.id === selectedVariacao)?.nome}
                    </div>
                  )}
                  <div>
                    Componentes: {Object.keys(selectedComponentes).length} selecionados
                  </div>
                  <div>Quantidade: {quantidadeItens}</div>
                </div>
                {precificacao && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold text-sm">
                      <span>Valor total:</span>
                      <span>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(precificacao.total * quantidadeItens)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {currentStep !== 'categoria' && (
            <Button
              variant="outline"
              onClick={() => {
                if (currentStep === 'variacao') setCurrentStep('categoria')
                else if (currentStep === 'componentes') setCurrentStep('variacao')
                else if (currentStep === 'resumo') setCurrentStep('componentes')
              }}
              disabled={isPending}
            >
              Voltar
            </Button>
          )}

          {currentStep === 'categoria' && (
            <Button
              onClick={() => setCurrentStep('variacao')}
              disabled={!canProceedToVariacao || isPending}
            >
              Próximo
            </Button>
          )}

          {currentStep === 'variacao' && (
            <Button
              onClick={() => setCurrentStep('componentes')}
              disabled={!canProceedToComponentes || isPending}
            >
              Próximo
            </Button>
          )}

          {currentStep === 'componentes' && (
            <Button
              onClick={() => setCurrentStep('resumo')}
              disabled={!canProceedToResumo || isPending}
            >
              Próximo
            </Button>
          )}

          {currentStep === 'resumo' && (
            <Button
              onClick={handleCriarPedido}
              disabled={
                !clienteData.nome ||
                isPending ||
                Object.keys(selectedComponentes).length === 0
              }
              className="gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {isPending ? 'Criando...' : 'Criar Pedido'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
