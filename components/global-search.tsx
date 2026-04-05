'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import {
  Search,
  Package,
  ShoppingCart,
  Boxes,
  User,
} from 'lucide-react'
import { searchGlobal, type SearchResult } from '@/app/dashboard/search-actions'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({
    produtos: [],
    pedidos: [],
    materiais: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults({ produtos: [], pedidos: [], materiais: [] })
      return
    }
    
    setIsLoading(true)
    try {
      const data = await searchGlobal(searchQuery)
      setResults(data)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  function handleSelect(type: string, id?: string) {
    setOpen(false)
    setQuery('')
    switch (type) {
      case 'produto':
        router.push('/dashboard/produtos')
        break
      case 'pedido':
        router.push('/dashboard/pedidos')
        break
      case 'material':
        router.push('/dashboard/estoque')
        break
    }
  }

  const totalResults = results.produtos.length + results.pedidos.length + results.materiais.length

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar produtos, pedidos, materiais..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          ) : query.length < 2 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar
            </div>
          ) : totalResults === 0 ? (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          ) : (
            <>
              {results.produtos.length > 0 && (
                <CommandGroup heading="Produtos">
                  {results.produtos.map((produto) => (
                    <CommandItem
                      key={produto.id}
                      onSelect={() => handleSelect('produto', produto.id)}
                      className="cursor-pointer"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{produto.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {produto.categoria} - R$ {produto.preco_venda.toFixed(2)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.pedidos.length > 0 && (
                <CommandGroup heading="Pedidos">
                  {results.pedidos.map((pedido) => (
                    <CommandItem
                      key={pedido.id}
                      onSelect={() => handleSelect('pedido', pedido.id)}
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{pedido.cliente_nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {pedido.status} - R$ {(pedido.valor_total - pedido.desconto).toFixed(2)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.materiais.length > 0 && (
                <CommandGroup heading="Materiais">
                  {results.materiais.map((material) => (
                    <CommandItem
                      key={material.id}
                      onSelect={() => handleSelect('material', material.id)}
                      className="cursor-pointer"
                    >
                      <Boxes className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{material.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          Estoque: {material.quantidade_atual} {material.unidade}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
