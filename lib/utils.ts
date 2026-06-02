import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Arredonda um valor para cima em incrementos de R$ 0,50 (meio real).
 * Usado para o preço final de pedidos.
 * Exemplos:
 *   31.01 → 31.50
 *   31.50 → 31.50
 *   31.51 → 32.00
 */
export function arredondarParaCimaMeioReal(valor: number): number {
  if (!Number.isFinite(valor) || valor < 0) return 0
  return Math.ceil(valor * 2) / 2
}

/**
 * Parseia string de data no formato 'YYYY-MM-DD' (comum em inputs type=date e colunas date do Supabase)
 * de forma consistente entre navegadores/dispositivos (evita bug de fuso horário em Safari/iOS).
 * Usa date-fns parseISO para garantir que seja tratado como data local.
 */
export function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  try {
    const date = parseISO(dateStr)
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

/**
 * Formata data para padrão brasileiro de forma segura.
 * Aceita string 'YYYY-MM-DD' ou ISO e evita problemas de parsing por dispositivo.
 */
export function formatDateBR(dateStr: string | null | undefined, fmt: string = 'dd/MM/yyyy'): string {
  const date = parseDateString(dateStr)
  if (!date) return '-'
  return format(date, fmt, { locale: ptBR })
}

/**
 * Retorna a data de hoje no formato 'YYYY-MM-DD' (compatível com <input type="date">).
 * Usa componentes locais do Date para evitar qualquer problema de fuso/ISO.
 */
export function getTodayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Normaliza um valor de data (string do DB ou ISO) para o formato de input date 'YYYY-MM-DD'.
 */
export function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return getTodayDateString()
  const cleaned = dateStr.split('T')[0] // handles full ISO or already YYYY-MM-DD
  // validate roughly
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  const parsed = parseDateString(dateStr)
  if (parsed) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return getTodayDateString()
}
