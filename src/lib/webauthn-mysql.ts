import { executeQuery, executeUpdate } from './mysql-client'

export interface WebAuthnCredential {
  id: number
  credential_id: string
  public_key: string
  counter: number
  device_name: string
  created_at: string
  last_used_at: string
}

export async function createCredential(credentialId: string, publicKey: string, counter: number, deviceName: string): Promise<void> {
  await executeUpdate(
    `INSERT INTO webauthn_credentials (credential_id, public_key, counter, device_name)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE public_key = VALUES(public_key), counter = VALUES(counter), last_used_at = NOW()`,
    [credentialId, publicKey, counter, deviceName]
  )
}

export async function getCredential(credentialId: string): Promise<WebAuthnCredential | null> {
  const results = await executeQuery<WebAuthnCredential>(
    `SELECT * FROM webauthn_credentials WHERE credential_id = ?`,
    [credentialId]
  )
  return results[0] || null
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  await executeUpdate(
    `UPDATE webauthn_credentials SET counter = ?, last_used_at = NOW() WHERE credential_id = ?`,
    [counter, credentialId]
  )
}

export async function hasCredentials(): Promise<boolean> {
  const results = await executeQuery<any>(`SELECT COUNT(*) as count FROM webauthn_credentials`)
  return (results[0]?.count || 0) > 0
}

export async function deleteCredential(credentialId: string): Promise<void> {
  await executeUpdate(`DELETE FROM webauthn_credentials WHERE credential_id = ?`, [credentialId])
}

export async function getAllCredentials(): Promise<WebAuthnCredential[]> {
  return executeQuery<WebAuthnCredential>(`SELECT * FROM webauthn_credentials ORDER BY created_at DESC`)
}
