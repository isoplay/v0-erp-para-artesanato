import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto w-24 h-24 relative">
          <Image
            src="/logo.jpg"
            alt="ExclusivArt"
            fill
            className="rounded-full object-cover opacity-50"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <WifiOff className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Voce esta offline
          </h1>
          <p className="text-muted-foreground text-sm">
            Verifique sua conexao com a internet e tente novamente.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/dashboard">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Algumas funcoes podem estar disponiveis offline.
          </p>
        </div>
      </div>
    </div>
  )
}
