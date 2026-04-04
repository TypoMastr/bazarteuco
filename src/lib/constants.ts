import { ShoppingCart, Package, PackageCheck, FileText } from 'lucide-react'

export const navItems = [
  { href: '/sales', label: 'Vendas', icon: ShoppingCart },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/products/stock', label: 'Estoque', icon: PackageCheck },
  { href: '/reports', label: 'Relatórios', icon: FileText },
]

export const DEFAULT_PAGE_SIZE = 100
export const TOAST_DURATION = 4000
export const CACHE_MAX_DAYS = 7
export const POLL_INTERVAL = 60000
