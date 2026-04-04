import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/mysql-client'

export async function GET() {
  try {
    const db = await testConnection()
    return NextResponse.json({
      status: 'ok',
      database: db.success ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
    }, { status: 500 })
  }
}
