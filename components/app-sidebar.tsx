'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Boxes,
  CalendarDays,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Estoque',
    url: '/dashboard/estoque',
    icon: Boxes,
  },
  {
    title: 'Produtos',
    url: '/dashboard/produtos',
    icon: Package,
  },
  {
    title: 'Pedidos',
    url: '/dashboard/pedidos',
    icon: ShoppingCart,
  },
  {
    title: 'Calendario',
    url: '/dashboard/calendario',
    icon: CalendarDays,
  },
  {
    title: 'Financeiro',
    url: '/dashboard/financeiro',
    icon: Wallet,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <Link href="/dashboard" className="flex items-center justify-center">
          <div className={`relative transition-all duration-200 ${isCollapsed ? 'h-10 w-10' : 'h-16 w-16'}`}>
            <Image
              src="/logo.jpg"
              alt="Exclusiv Art"
              fill
              className="rounded-full object-cover shadow-md"
              priority
            />
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== '/dashboard' && pathname.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.title}
                      className="transition-all duration-200"
                    >
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <p className="text-xs text-sidebar-foreground/60 text-center font-medium">
          Exclusiv Art v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
