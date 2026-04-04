'use client'
import { useSaleItems } from '@/hooks/use-sales'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { useParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export default function SaleDetailPage() {
  const { id } = useParams()
  const { data: items, loading, error } = useSaleItems(id as string)

  if (loading) return <div className="p-4"><p>Carregando...</p></div>

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-900">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Erro ao carregar itens da venda</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const total = items.reduce((sum, item) => sum + (item.netItem || 0), 0)

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Detalhes da Venda</h1>
      <Card>
        <CardHeader>
          <CardTitle>Itens da Venda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Preço Unit.</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.product?.name || '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.listPrice)}</TableCell>
                    <TableCell>{formatCurrency(item.itemDiscount)}</TableCell>
                    <TableCell>{formatCurrency(item.netItem)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {items.map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border">
                <p className="font-medium">{item.product?.name || '-'}</p>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                  <span className="font-semibold">{formatCurrency(item.netItem)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-xl font-bold">{formatCurrency(total)}</span>
          </div>

          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum item encontrado</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
