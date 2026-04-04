import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function cleanup() {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      waitForConnections: true,
      connectionLimit: 1,
    })

    const [before] = await pool.execute('SELECT COUNT(*) as count FROM webauthn_credentials')
    console.log(`Credenciais antes da limpeza: ${(before as any)[0].count}`)

    await pool.execute('DELETE FROM webauthn_credentials')

    const [after] = await pool.execute('SELECT COUNT(*) as count FROM webauthn_credentials')
    console.log(`Credenciais após limpeza: ${(after as any)[0].count}`)
    console.log('✅ Credenciais biométricas removidas com sucesso!')

    await pool.end()
  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

cleanup()
