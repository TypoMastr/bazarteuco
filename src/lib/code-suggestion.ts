const CATEGORY_PREFIX_MAP: Record<number, string> = {
  4477356: '7',  // Moda e Têxteis
  4477357: '4',  // Figas e Amuletos
  4477358: '6',  // Livros
  4477359: '8',  // Pedras
  4477360: '5',  // Imagens e Decoração Religiosa
  4477361: '3',  // Diversos
  4477362: '1',  // Acessórios Religiosos
  4477363: '96', // Velas, Incensos e Defumadores
  4477364: '2',  // Charutos e Cigarros
  4477365: '95', // Rifa e Doação
  4477366: '9',  // Pulseiras
}

const CATEGORY_PREFIX_BY_NAME: Record<string, string> = {
  'moda e têxteis': '7',
  'moda e texteis': '7',
  'figas e amuletos': '4',
  'livros': '6',
  'pedras': '8',
  'imagens e decoração religiosa': '5',
  'imagens e decoracao religiosa': '5',
  'diversos': '3',
  'acessórios religiosos': '1',
  'acessorios religiosos': '1',
  'velas, incensos e defumadores': '96',
  'charutos e cigarros': '2',
  'rifa e doação': '95',
  'rifa e doacao': '95',
  'pulseiras': '9',
}

export function getCategoryPrefix(categoryId: number | string, categoryName?: string): string {
  const id = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId
  
  if (CATEGORY_PREFIX_MAP[id]) {
    return CATEGORY_PREFIX_MAP[id]
  }
  
  if (categoryName) {
    const normalizedName = categoryName.toLowerCase().trim()
    if (CATEGORY_PREFIX_BY_NAME[normalizedName]) {
      return CATEGORY_PREFIX_BY_NAME[normalizedName]
    }
  }
  
  return '3'
}

export function findNextCode(prefix: string, existingCodes: string[]): string {
  const prefixNum = parseInt(prefix)
  const isTwoDigits = prefix.length === 2
  
  const relevantCodes = existingCodes
    .filter(code => {
      const codeNum = parseInt(code)
      if (isTwoDigits) {
        return Math.floor(codeNum / 100) === prefixNum
      }
      return Math.floor(codeNum / 1000) === prefixNum
    })
    .map(code => parseInt(code))
    .sort((a, b) => a - b)
  
  let nextCode = prefixNum * (isTwoDigits ? 100 : 1000) + 1
  
  for (const code of relevantCodes) {
    if (code === nextCode) {
      nextCode++
    } else if (code > nextCode) {
      break
    }
  }
  
  return nextCode.toString().padStart(isTwoDigits ? 4 : 4, '0')
}

export function validateCode(code: string, prefix: string, existingCodes: string[]): { valid: boolean; error?: string } {
  if (!code || code.trim() === '') {
    return { valid: false, error: 'Código é obrigatório' }
  }
  
  const codeNum = parseInt(code)
  const prefixNum = parseInt(prefix)
  const isTwoDigits = prefix.length === 2
  
  if (isTwoDigits) {
    const codePrefix = Math.floor(codeNum / 100)
    if (codePrefix !== prefixNum) {
      return { valid: false, error: `Código deve começar com ${prefix}` }
    }
  } else {
    const codePrefix = Math.floor(codeNum / 1000)
    if (codePrefix !== prefixNum) {
      return { valid: false, error: `Código deve começar com ${prefix}` }
    }
  }
  
  if (existingCodes.includes(code)) {
    return { valid: false, error: 'Código já está sendo utilizado' }
  }
  
  return { valid: true }
}

export function validateCodeWithException(code: string, prefix: string, existingCodes: string[], excludeCode?: string): { valid: boolean; error?: string } {
  const filteredCodes = excludeCode 
    ? existingCodes.filter(c => c !== excludeCode)
    : existingCodes
    
  return validateCode(code, prefix, filteredCodes)
}

export function getAllPrefixes(): { prefix: string; name: string }[] {
  return [
    { prefix: '1', name: 'Acessórios Religiosos' },
    { prefix: '2', name: 'Charutos e Cigarros' },
    { prefix: '3', name: 'Diversos' },
    { prefix: '4', name: 'Figas e Amuletos' },
    { prefix: '5', name: 'Imagens e Decoração Religiosa' },
    { prefix: '6', name: 'Livros' },
    { prefix: '7', name: 'Moda e Têxteis' },
    { prefix: '8', name: 'Pedras' },
    { prefix: '9', name: 'Pulseiras' },
    { prefix: '95', name: 'Rifa e Doação' },
    { prefix: '96', name: 'Velas, Incensos e Defumadores' },
  ]
}