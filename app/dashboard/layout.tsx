import Image from 'next/image'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { GlobalSearch } from '@/components/global-search'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 shadow-sm">
          <SidebarTrigger className="-ml-1 text-foreground" />
          <div className="h-8 w-8 relative md:hidden">
            <Image
              src="/logo.jpg"
              alt="ExclusivArt"
              fill
              className="rounded-full object-cover"
            />
          </div>
          <span className="font-semibold text-foreground md:hidden">ExclusivArt</span>
          <div className="flex-1 flex justify-center md:justify-start md:ml-4">
            <GlobalSearch />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-background min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </SidebarInset>
      <PWAInstallPrompt />
    </SidebarProvider>
  )
}
