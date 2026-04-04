import { NextResponse } from 'next/server'
import { executeUpdate } from '@/lib/mysql-client'

export async function POST() {
  try {
    await executeUpdate('DELETE FROM webauthn_credentials')
    return NextResponse.json({ message: 'Credenciais biométricas removidas com sucesso' })
  } catch (error) {
    console.error('[API] WebAuthn cleanup error:', error)
    return NextResponse.json({ error: 'Erro ao limpar credenciais biométricas' }, { status: 500 })
  }
}
