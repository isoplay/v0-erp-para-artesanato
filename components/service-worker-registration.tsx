'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope)
        })
        .catch((error) => {
          console.warn('⚠️ Service Worker falhou:', error.message)
        })
    } else {
      console.warn('Service Worker nao suportado neste navegador')
    }
  }, [])

  return null
}
