import Image from 'next/image'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { GlobalSearch } from '@/components/global-search'
import { FloatingActionButton } from '@/components/floating-action-button'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/login/actions'
import { LogOut } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-[68px] shrink-0 items-center gap-4 border-b border-[#eee6f5] bg-[#fffcff] px-4 md:px-8">
          <SidebarTrigger className="-ml-1 h-10 w-10 rounded-full text-[#5f5072] hover:bg-[#f3edf8] md:hidden" />
          <div className="relative h-9 w-9 md:hidden">
            <Image
              src="/exclusiv-art-logo.png"
              alt="ExclusivArt"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex flex-1 items-center gap-4">
            <GlobalSearch />
            <div className="ml-auto hidden h-10 items-center gap-2 rounded-full bg-[#fbf8ff] px-4 text-sm text-[#706b82] lg:flex">
              <span>Olá,</span>
              <strong className="font-semibold text-[#15142a]">Exclusiv Art</strong>
              <span aria-hidden="true">👋</span>
            </div>
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="h-10 rounded-full px-3 text-[#5f5072] hover:bg-[#f3edf8] md:px-4"
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </form>
          </div>
        </header>
        <main className="min-h-[calc(100vh-68px)] flex-1 overflow-auto bg-[#fbf8ff] p-5 md:p-8">
          {children}
        </main>
      </SidebarInset>
      <FloatingActionButton />
      <PWAInstallPrompt />
    </SidebarProvider>
  )
}
