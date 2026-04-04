const RP_NAME = 'Bazar TEUCO'
const RP_ID = typeof window !== 'undefined' ? (window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname) : 'localhost'
const TIMEOUT = 60000

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64ToBuffer(base64: string): ArrayBuffer {
  let s = base64.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const binary = atob(s)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function isWebAuthnAvailable(): boolean {
  if (typeof window === 'undefined') return false
  const hasCreds = !!navigator.credentials
  const hasPKC = !!(window as any).PublicKeyCredential
  return hasCreds && hasPKC
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false
  const PC = (window as any).PublicKeyCredential
  if (PC && PC.isUserVerifyingPlatformAuthenticatorAvailable) {
    return PC.isUserVerifyingPlatformAuthenticatorAvailable()
  }
  return false
}

interface RegistrationOptions {
  userName: string
  displayName: string
}

export async function registerCredential(
  options: RegistrationOptions
): Promise<{ publicKey: string; credentialId: string; counter: number }> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  
  const createOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: RP_NAME,
      id: RP_ID || undefined,
    },
    user: {
      id: new TextEncoder().encode(options.userName),
      name: options.userName,
      displayName: options.displayName,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      requireResidentKey: false,
    },
    timeout: TIMEOUT,
  }

  const credential = await navigator.credentials.create({
    publicKey: createOptions,
  }) as PublicKeyCredential

  if (!credential || credential.type !== 'public-key') {
    throw new Error('Credential creation failed')
  }

  const response = credential.response as AuthenticatorAttestationResponse

  const publicKey = bufferToBase64(response.getPublicKey()!)
  const credentialId = bufferToBase64(credential.rawId)

  return { publicKey, credentialId, counter: 0 }
}

export async function authenticateCredential(
  allowedCredentialIds: string[]
): Promise<{ credentialId: string; counter: number; authenticatorData: string; clientDataJSON: string; signature: string }> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const getOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: allowedCredentialIds.map(id => ({
      id: base64ToBuffer(id),
      type: 'public-key' as const,
      transports: ['internal'] as AuthenticatorTransport[],
    })),
    userVerification: 'required',
    timeout: TIMEOUT,
  }

  const assertion = await navigator.credentials.get({
    publicKey: getOptions,
  }) as PublicKeyCredential

  if (!assertion) {
    throw new Error('Authentication failed')
  }

  const response = assertion.response as AuthenticatorAssertionResponse

  return {
    credentialId: bufferToBase64(assertion.rawId),
    counter: 0,
    authenticatorData: bufferToBase64(response.authenticatorData),
    clientDataJSON: bufferToBase64(response.clientDataJSON),
    signature: bufferToBase64(response.signature),
  }
}

export function getDeviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'Apple Device'
  if (/Android/.test(ua)) return 'Android Device'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Linux/.test(ua)) return 'Linux PC'
  return 'Unknown Device'
}
