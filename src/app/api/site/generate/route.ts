import { NextResponse } from 'next/server'
import { generateSiteHtml } from '@/lib/site-generator'
import { syncProductsToMySQL, syncCategoriesToMySQL } from '@/lib/sync-to-mysql'
import * as ftp from 'basic-ftp'
import { Readable } from 'stream'

export async function POST() {
  try {
    await syncCategoriesToMySQL()
    await syncProductsToMySQL()

    const html = await generateSiteHtml()

    const ftpHost = process.env.FTP_HOST
    const ftpUser = process.env.FTP_USER
    const ftpPass = process.env.FTP_PASSWORD
    const ftpPort = parseInt(process.env.FTP_PORT || '21')
    const ftpPath = process.env.FTP_REMOTE_PATH

    if (!ftpHost || !ftpUser || !ftpPass || !ftpPath) {
      return NextResponse.json({ error: 'Credenciais FTP não configuradas' }, { status: 500 })
    }

    const client = new ftp.Client()
    client.ftp.verbose = false

    try {
      await client.access({
        host: ftpHost,
        user: ftpUser,
        password: ftpPass,
        port: ftpPort,
        secure: false,
      })

      await client.uploadFrom(
        Readable.from([html]),
        ftpPath
      )

      return NextResponse.json({ message: 'Site atualizado com sucesso!' })
    } finally {
      client.close()
    }
  } catch (error: any) {
    console.error('[API] Site generation error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao atualizar site' }, { status: 500 })
  }
}
