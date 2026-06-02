import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
