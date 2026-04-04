const GIRA_DA_MATA_KEYWORDS = ['onibus', 'onibus - gira da mata', 'gira da mata']
const EVENTOS_KEYWORDS = ['cerveja', 'salgado', 'refrigerante', 'agua', 'bolos', 'palha italiana', 'agua co gas', 'churrasquinho', 'cuscuz', 'cachoro-quente', 'cachorro-quente', 'cerveja brahma', 'empadão', 'empadao', 'guaravita', 'batida 100ml', 'caipirinha', 'brincadeiras', 'caldo verde', 'salsichão', 'salsichao', 'cerveja stela', 'canjica', 'pipoca', 'karaokê', 'karaoke', 'kafta', 'cachaça', 'cachaca', 'lembrancinha', 'pavê', 'pave', 'caldo aipim', 'mate', 'caçulinha', 'caculinha', 'caldo vegano', 'feijão amigo', 'feijao amigo']

export function matchesGiraDaMata(productName: string): boolean {
  const name = productName.toLowerCase()
  return GIRA_DA_MATA_KEYWORDS.some(kw => name.includes(kw))
}

export function matchesEventos(productName: string): boolean {
  const name = productName.toLowerCase()
  return EVENTOS_KEYWORDS.some(kw => name.includes(kw))
}

export function calculateCategoryRevenue(
  products: { name: string; total: number }[],
  matcher: (name: string) => boolean
): number {
  return products
    .filter(p => matcher(p.name))
    .reduce((sum, p) => sum + p.total, 0)
}

export function hasCategoryProducts(
  products: { name: string; total: number }[],
  matcher: (name: string) => boolean
): boolean {
  return products.some(p => matcher(p.name))
}
