import fs from 'fs'
import path from 'path'
import { executeQuery } from './mysql-client'

const CATEGORY_EMOJIS: Record<string, string> = {
  'acessorios': '📿',
  'brecho': '👕',
  'cantina': '🥤',
  'charuto': '🚬',
  'cigarro': '🚬',
  'diversos': '🔮',
  'figa': '🤞',
  'amuleto': '🤞',
  'gira': '🌳',
  'mata': '🌳',
  'imagem': '🖼️',
  'decoracao': '🖼️',
  'decoração': '🖼️',
  'religioso': '🖼️',
  'livro': '📚',
  'moda': '👚',
  'textil': '👚',
  'têxtil': '👚',
  'pedra': '💎',
  'pulseira': '📿',
  'rifa': '💰',
  'doacao': '💰',
  'doação': '💰',
  'vela': '🕯️',
  'incenso': '🕯️',
  'defumador': '🕯️',
}

function getEmoji(categoryName: string): string {
  const lower = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (lower.includes(key)) return emoji
  }
  return '📦'
}

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function generateSiteHtml(): Promise<string> {
  const categories: any[] = await executeQuery(
    'SELECT id, name, show_catalog, oculto FROM categories ORDER BY name'
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products: any[] = await executeQuery(
    'SELECT alpha_code, name, sell_value, category_id, category_name FROM products ORDER BY category_id, name'
  )

  const visibleCategories = categories.filter(c => !c.oculto)

  const catalogo = visibleCategories.map(cat => {
    const catProducts = products.filter(p => p.category_id === cat.id && p.name)
    return {
      categoria: cat.name,
      emoji: getEmoji(cat.name),
      produtos: catProducts.map(p => ({
        codigo: p.alpha_code || '',
        nome: p.name,
        preco: formatPrice(p.sell_value || 0),
      })),
    }
  }).filter(cat => cat.produtos.length > 0)

  const templatePath = path.join(process.cwd(), 'src', 'lib', 'site-template.html')
  let html = fs.readFileSync(templatePath, 'utf-8')

  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  html = html.replace('__GENERATED_AT__', now)
  html = html.replace('__CATALOGO_JSON__', JSON.stringify(catalogo, null, 4))

  return html
}
