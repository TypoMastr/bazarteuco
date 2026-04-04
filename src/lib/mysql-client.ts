import mysql from 'mysql2/promise'

const mysqlConfig = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
}

if (!mysqlConfig.host || !mysqlConfig.database || !mysqlConfig.user || !mysqlConfig.password) {
  throw new Error('Missing required MySQL environment variables')
}

let pool: mysql.Pool | null = null

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...mysqlConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 50,
      connectTimeout: 10000,
      idleTimeout: 600000,
    })
  }
  return pool
}

export async function testConnection(): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const connection = await getPool().getConnection()
    await connection.ping()
    connection.release()
    return { success: true, message: 'Conexão MySQL estabelecida com sucesso!' }
  } catch (error: any) {
    return { success: false, error: error.message, message: 'Falha ao conectar no MySQL' }
  }
}

export async function executeQuery<T>(query: string, params?: any[]): Promise<T[]> {
  const pool = getPool()
  const [rows] = await pool.execute(query, params)
  return rows as T[]
}

export async function executeUpdate(query: string, params?: any[]): Promise<{ affectedRows: number }> {
  const pool = getPool()
  const [result] = await pool.execute(query, params)
  return { affectedRows: (result as any).affectedRows }
}

export async function getLastInsertId(): Promise<number> {
  const [rows] = await getPool().execute('SELECT LAST_INSERT_ID() as id')
  return (rows as any)[0].id
}

export default getPool