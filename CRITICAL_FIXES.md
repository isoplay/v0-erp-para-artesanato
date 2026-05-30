# Critical Issues - Detailed Fixes

## 🔴 CRITICAL FIX #1: Type Casting Errors in Pedidos Actions

**File**: `app/dashboard/pedidos/actions.ts`
**Lines**: 320-380

### Problem
The Supabase query returns material as an array, but the code casts it to a single object. This causes type mismatch errors.

### Current Code (BROKEN)
```typescript
// Line 329 - WRONG
const customMats = item.pedido_itens_materiais as Array<{
  material_id: string
  quantidade: number
  material: { nome: string; unidade: string; quantidade: number; quantidade_atual?: number }
}>

// Line 366 - WRONG
const material = pm.material as {
  nome: string
  unidade: string
  quantidade: number
  quantidade_atual?: number
}
```

### Fix
```typescript
// Correct type definition - material should be a single object, not array
const customMats = item.pedido_itens_materiais as Array<{
  material_id: string
  quantidade: number
  material: {
    nome: string
    unidade: string
    quantidade: number
    quantidade_atual?: number
  }
}>

// When Supabase returns nested objects correctly:
for (const mat of customMats) {
  const atual = mat.material?.quantidade_atual ?? mat.material?.quantidade ?? 0
  // Use optional chaining to handle undefined
}
```

---

## 🔴 CRITICAL FIX #2: Missing Type Annotations in Supabase Middleware

**File**: `lib/supabase/middleware.ts`
**Lines**: 20-45

### Problem
Missing type annotations causing TypeScript strict mode errors.

### Current Code (BROKEN)
```typescript
cookies: {
  getAll() {
    return request.cookies.getAll()
  },
  setAll(cookiesToSet) {  // ❌ No type
    cookiesToSet.forEach(({ name, value }) =>  // ❌ Implicit any
      request.cookies.set(name, value),
    )
    supabaseResponse = NextResponse.next({
      request,
    })
    cookiesToSet.forEach(({ name, value, options }) =>  // ❌ Implicit any
      supabaseResponse.cookies.set(name, value, options),
    )
  },
},
```

### Fix
```typescript
import { type CookieOptions } from '@supabase/ssr'

cookies: {
  getAll() {
    return request.cookies.getAll()
  },
  setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
    cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
      request.cookies.set(name, value),
    )
    supabaseResponse = NextResponse.next({
      request,
    })
    cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: CookieOptions }) =>
      supabaseResponse.cookies.set(name, value, options),
    )
  },
},
```

---

## 🔴 CRITICAL FIX #3: Same Type Annotations in Server Client

**File**: `lib/supabase/server.ts`
**Lines**: 20-40

### Fix
```typescript
import { type CookieOptions } from '@supabase/ssr'

cookies: {
  getAll() {
    return cookieStore.getAll()
  },
  setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
    try {
      cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: CookieOptions }) =>
        cookieStore.set(name, value, options),
      )
    } catch {
      // The "setAll" method was called from a Server Component.
      // This can be ignored if you have middleware refreshing
      // user sessions.
    }
  },
},
```

---

## 🟡 HIGH FIX #1: useEffect Dependencies in Cliente Autocomplete

**File**: `components/cliente-autocomplete.tsx`
**Lines**: 42-76

### Problem
`performSearch` callback is recreated on every render, causing infinite useEffect loops.

### Current Code (BROKEN)
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    performSearch(value)
  }, 300)
  return () => clearTimeout(timer)
}, [value, performSearch])  // ❌ performSearch changes constantly
```

### Fix
```typescript
// Make performSearch stable by using useCallback with no dependencies
const performSearch = useCallback(async (searchQuery: string) => {
  if (searchQuery.length < 2) {
    setSuggestions([])
    return
  }
  
  setIsLoading(true)
  try {
    const results = await searchClientes(searchQuery)
    setSuggestions(results)
    setIsOpen(results.length > 0)
  } catch (error) {
    console.error('Search error:', error)
    setSuggestions([])
  } finally {
    setIsLoading(false)
  }
}, [])  // ✅ No dependencies - stable callback

useEffect(() => {
  const timer = setTimeout(() => {
    performSearch(value)
  }, 300)
  return () => clearTimeout(timer)
}, [value, performSearch])  // ✅ Now safe
```

---

## 🟡 HIGH FIX #2: PWA Install Prompt useEffect Cleanup

**File**: `components/pwa-install-prompt.tsx`
**Lines**: 19-47

### Problem
Multiple useEffect hooks with incomplete cleanup and uncancelled timeouts.

### Current Code (BROKEN)
```typescript
useEffect(() => {
  // ... code
  const handler = (e: Event) => {
    e.preventDefault()
    setDeferredPrompt(e as BeforeInstallPromptEvent)
    // Show prompt after 30 seconds of use
    setTimeout(() => {  // ❌ No cleanup!
      setShowPrompt(true)
    }, 30000)
  }

  window.addEventListener('beforeinstallprompt', handler)
  
  if (ios && !standalone) {
    setTimeout(() => {  // ❌ No cleanup!
      setShowPrompt(true)
    }, 60000)
  }

  return () => {
    window.removeEventListener('beforeinstallprompt', handler)
    // ❌ Missing timeout cleanup
  }
}, [])

// Second useEffect with empty dependencies but uses state
useEffect(() => {
  const dismissed = localStorage.getItem('pwa-prompt-dismissed')
  if (dismissed) {
    const dismissedTime = parseInt(dismissed)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    if (Date.now() - dismissedTime < sevenDays) {
      setShowPrompt(false)
    }
  }
}, [])  // ❌ Should run once, but no dependency array specified
```

### Fix
```typescript
useEffect(() => {
  // Check if already installed
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  setIsStandalone(standalone)

  // Check if iOS
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  setIsIOS(ios)

  let promptTimeout: NodeJS.Timeout
  let iosTimeout: NodeJS.Timeout

  // Listen for beforeinstallprompt event (Android/Chrome)
  const handler = (e: Event) => {
    e.preventDefault()
    setDeferredPrompt(e as BeforeInstallPromptEvent)
    // Show prompt after 30 seconds of use
    promptTimeout = setTimeout(() => {
      setShowPrompt(true)
    }, 30000)
  }

  window.addEventListener('beforeinstallprompt', handler)

  // For iOS, show instructions after delay
  if (ios && !standalone) {
    iosTimeout = setTimeout(() => {
      setShowPrompt(true)
    }, 60000)
  }

  return () => {
    window.removeEventListener('beforeinstallprompt', handler)
    if (promptTimeout) clearTimeout(promptTimeout)  // ✅ Cleanup
    if (iosTimeout) clearTimeout(iosTimeout)        // ✅ Cleanup
  }
}, [])

// Separate useEffect for localStorage check - runs once on mount
useEffect(() => {
  const dismissed = localStorage.getItem('pwa-prompt-dismissed')
  if (dismissed) {
    const dismissedTime = parseInt(dismissed, 10)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    if (Date.now() - dismissedTime < sevenDays) {
      setShowPrompt(false)
    }
  }
}, [])  // ✅ Explicit empty dependencies
```

---

## 🟡 HIGH FIX #3: Dialog State Management in Pedidos

**File**: `app/dashboard/pedidos/pedidos-content.tsx`
**Lines**: 449-455

### Problem
Dialog doesn't properly reset state when closed, leaving dangling state.

### Current Code (BROKEN)
```typescript
<Dialog
  open={isAddOpen}
  onOpenChange={(open) => {
    setIsAddOpen(open)
    if (!open) resetClienteForm()  // ❌ Called after state changes
  }}
>
```

### Fix
```typescript
function handleDialogOpenChange(open: boolean) {
  setIsAddOpen(open)
  if (!open) {
    // Reset form state when closing
    resetClienteForm()
    setSelectedItens([])
    setSelectedMateraisTemp([])
    setSelectedItemIndex(null)
    setIsMaterialsOpen(false)
  }
}

<Dialog
  open={isAddOpen}
  onOpenChange={handleDialogOpenChange}
>
```

---

## 🟡 HIGH FIX #4: Form Submission Double-Submit Prevention

**File**: `app/dashboard/pedidos/pedidos-content.tsx`
**Lines**: 280-300

### Problem
No prevention of multiple rapid form submissions.

### Current Code (BROKEN)
```typescript
function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  if (selectedItens.length === 0) {
    toast.error('Adicione pelo menos um item ao pedido')
    return
  }
  const formData = new FormData(e.currentTarget)
  formData.set('cliente_nome', clienteNome)
  formData.set('cliente_contato', clienteTelefone)
  startTransition(async () => {
    const result = await createPedido(formData, selectedItens)
    if (result.success) {
      toast.success('Pedido criado com sucesso!')
      setIsAddOpen(false)
      resetClienteForm()
      router.refresh()
    } else {
      toast.error(result.error || 'Erro ao criar pedido.')
    }
  })
}
```

### Fix
```typescript
function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  
  if (selectedItens.length === 0) {
    toast.error('Adicione pelo menos um item ao pedido')
    return
  }
  
  // ✅ Prevent submission if already pending
  if (isPending) {
    return
  }
  
  const formData = new FormData(e.currentTarget)
  formData.set('cliente_nome', clienteNome)
  formData.set('cliente_contato', clienteTelefone)
  
  startTransition(async () => {
    try {
      const result = await createPedido(formData, selectedItens)
      if (result.success) {
        toast.success('Pedido criado com sucesso!')
        setIsAddOpen(false)
        resetClienteForm()
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao criar pedido.')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Erro inesperado ao criar pedido')
    }
  })
}

// And update button disabled state:
<Button type="submit" disabled={isPending}>  // ✅ Disable when pending
  {isPending ? 'Salvando...' : 'Salvar'}
</Button>
```

---

## 🟡 HIGH FIX #5: File Input Change Handler Memory Leak

**File**: `app/dashboard/estoque/estoque-content.tsx`
**Lines**: 220, 520

### Problem
`handleImageChange` handler not shown, likely creates FileReader without cleanup.

### Safe Implementation
```typescript
function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return

  // Validate file size (e.g., max 5MB)
  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    toast.error('Arquivo muito grande (máximo 5MB)')
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.error('Por favor, selecione uma imagem válida')
    return
  }

  const reader = new FileReader()
  
  // ✅ Set timeout to prevent memory issues
  const timeout = setTimeout(() => {
    reader.abort()
    toast.error('Erro ao carregar imagem')
  }, 10000)

  reader.onload = (event) => {
    clearTimeout(timeout)
    try {
      const result = event.target?.result as string
      // Process image
      console.log('Image loaded:', result.substring(0, 50) + '...')
    } catch (error) {
      console.error('Error reading file:', error)
    }
  }

  reader.onerror = () => {
    clearTimeout(timeout)
    toast.error('Erro ao carregar imagem')
  }

  reader.readAsDataURL(file)
}

// Usage:
<input 
  type="file" 
  accept="image/*" 
  onChange={handleImageChange}
/>
```

---

## 🟡 HIGH FIX #6: Async Operation Error Handling

**File**: `app/dashboard/pedidos/pedidos-content.tsx`
**Lines**: 195-210

### Problem
Async operation inside `updateItem` doesn't have proper error handling.

### Current Code (BROKEN)
```typescript
if (produto) {
  startTransition(async () => {
    const composicao = await getComposicaoProduto(produto.id)  // ❌ No error handling
    setSelectedItens((prev) => {
      const copy = [...prev]
      if (!copy[index]) return copy
      copy[index] = {
        ...copy[index],
        materiais: composicao.map((c) => ({
          material_id: c.material_id,
          quantidade: c.quantidade_usada * copy[index].quantidade,
        })),
      }
      return copy
    })
  })
}
```

### Fix
```typescript
if (produto) {
  startTransition(async () => {
    try {
      const composicao = await getComposicaoProduto(produto.id)
      
      // Validate response
      if (!Array.isArray(composicao)) {
        console.error('Invalid composition data:', composicao)
        toast.error('Erro ao carregar composição do produto')
        return
      }
      
      setSelectedItens((prev) => {
        const copy = [...prev]
        if (!copy[index]) return copy
        copy[index] = {
          ...copy[index],
          materiais: composicao.map((c) => ({
            material_id: c.material_id,
            quantidade: c.quantidade_usada * copy[index].quantidade,
          })),
        }
        return copy
      })
    } catch (error) {
      console.error('Error loading product composition:', error)
      toast.error('Erro ao carregar materiais do produto')
    }
  })
}
```

---

## 🟡 HIGH FIX #7: Production Checker useEffect Dependencies

**File**: `components/production-checker.tsx`
**Lines**: 40-50

### Problem
`verificar` callback dependency might cause infinite loops.

### Fix
```typescript
const verificar = useCallback(async () => {
  if (itens.length === 0 || itens.every(i => !i.produto_id)) {
    setVerificacoes([])
    return
  }

  const validItens = itens.filter(i => i.produto_id && i.quantidade > 0)
  if (validItens.length === 0) {
    setVerificacoes([])
    return
  }

  setIsLoading(true)
  try {
    const result = await verificarMateriaisProducao(validItens)
    setVerificacoes(result)
  } catch (error) {
    console.error('Error checking production:', error)
    setVerificacoes([])  // Reset on error
  } finally {
    setIsLoading(false)
  }
}, [itens])  // ✅ Only depends on itens

useEffect(() => {
  const timer = setTimeout(() => {
    verificar()
  }, 500)
  
  return () => clearTimeout(timer)  // ✅ Cleanup timer
}, [verificar])  // ✅ Safe now
```

---

## Summary of Changes

| File | Issue | Fix | Priority |
|------|-------|-----|----------|
| `lib/supabase/middleware.ts` | Missing types | Add `CookieOptions` type | 🔴 CRITICAL |
| `lib/supabase/server.ts` | Missing types | Add `CookieOptions` type | 🔴 CRITICAL |
| `app/dashboard/pedidos/actions.ts` | Type casting | Fix material object type | 🔴 CRITICAL |
| `app/dashboard/pedidos/builder-actions.ts` | Type casting | Fix CategoriaProduto type | 🔴 CRITICAL |
| `components/cliente-autocomplete.tsx` | useEffect deps | Fix useCallback | 🟡 HIGH |
| `components/pwa-install-prompt.tsx` | Missing cleanup | Add timeout cleanup | 🟡 HIGH |
| `app/dashboard/pedidos/pedidos-content.tsx` | Dialog state | Reset on close | 🟡 HIGH |
| `app/dashboard/pedidos/pedidos-content.tsx` | Double submit | Add isPending check | 🟡 HIGH |
| `app/dashboard/pedidos/pedidos-content.tsx` | Error handling | Add try-catch | 🟡 HIGH |
| `app/dashboard/estoque/estoque-content.tsx` | File handler | Add FileReader cleanup | 🟡 HIGH |
| `components/production-checker.tsx` | useEffect deps | Refactor dependencies | 🟡 HIGH |

