'use client'
import { useState, useEffect } from 'react'
import { ShoppingBag, Lock, AlertCircle, Loader2, Fingerprint } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { isWebAuthnAvailable, isPlatformAuthenticatorAvailable, registerCredential, authenticateCredential, getDeviceName } from '@/lib/webauthn'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricRegistered, setBiometricRegistered] = useState(false)
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)

  useEffect(() => {
    async function checkBiometric() {
      const available = isWebAuthnAvailable() && await isPlatformAuthenticatorAvailable()
      setBiometricAvailable(available)

      if (available) {
        try {
          const res = await fetch('/api/auth/webauthn/available')
          const data = await res.json()
          setBiometricRegistered(data.available)
        } catch {
          setBiometricRegistered(false)
        }
      }
    }
    checkBiometric()
  }, [])

  const isLocalNetwork = typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      
      if (res.ok) {
        await new Promise(r => setTimeout(r, 200))

        if (biometricAvailable && !biometricRegistered && rememberDevice) {
          setShowBiometricPrompt(true)
          try {
            const credential = await registerCredential({
              userName: 'bazar-user',
              displayName: 'Bazar TEUCO User',
            })

            const regRes = await fetch('/api/auth/webauthn/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                password,
                publicKey: credential.publicKey,
                credentialId: credential.credentialId,
                deviceName: getDeviceName(),
              }),
            })

            if (!regRes.ok) {
              setError('Falha ao salvar biometria. Login realizado normalmente.')
            }
          } catch (err: any) {
            if (err.name === 'NotAllowedError') {
              setError('Biometria cancelada. Login realizado normalmente.')
            } else {
              setError('Não foi possível salvar a biometria. Login realizado normalmente.')
            }
            setTimeout(() => {
              window.location.href = '/sales'
            }, 2000)
            return
          }
        }

        window.location.href = '/sales'
      } else {
        const data = await res.json()
        setError(data.error || 'Senha incorreta')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometricLogin() {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/webauthn/authenticate')
      const data = await res.json()

      if (!data.credentialIds || data.credentialIds.length === 0) {
        setError('Biometria não configurada')
        setLoading(false)
        return
      }

      const assertion = await authenticateCredential(data.credentialIds)

      const authRes = await fetch('/api/auth/webauthn/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      })

      if (authRes.ok) {
        await new Promise(r => setTimeout(r, 200))
        window.location.href = '/sales'
      } else {
        setError('Falha na autenticação biométrica')
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Autenticação cancelada')
      } else {
        setError('Erro na biometria. Use a senha.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--teuco-bg)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--teuco-green)] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--teuco-green-light)] blur-[120px]" />
      </div>

      <div className="w-full max-w-[480px] relative z-10 animate-slide-up">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-[var(--teuco-green)] text-white mb-8 shadow-2xl shadow-[var(--teuco-green)]/30">
            <ShoppingBag className="h-10 w-10 stroke-[2.5px]" />
          </div>
          <h1 className="text-5xl font-black text-[var(--teuco-green)] mb-3 uppercase tracking-tighter font-montserrat">
            Bazar <span className="opacity-40">TEUCO</span>
          </h1>
          <p className="text-[var(--teuco-text-muted)] font-black uppercase tracking-[4px] text-[10px] opacity-60">Painel Administrativo</p>
        </div>

        <Card variant="teuco" className="p-10 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="password" className="block text-[11px] font-black text-[var(--teuco-green)] uppercase tracking-[2px] ml-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-[var(--teuco-text-muted)] opacity-50" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-16 text-center text-2xl tracking-[0.4em] font-bold"
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full h-18 text-base tracking-[3px]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  ENTRANDO...
                </div>
              ) : (
                'ENTRAR NO SISTEMA'
              )}
            </Button>

            {biometricAvailable && biometricRegistered && (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ou</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  className="w-full h-14 flex items-center justify-center gap-3 rounded-xl border-2 border-[var(--teuco-green)]/30 bg-[var(--teuco-green)]/5 text-[var(--teuco-green)] font-black text-sm uppercase tracking-wider hover:bg-[var(--teuco-green)]/10 transition-colors disabled:opacity-50"
                >
                  <Fingerprint className="h-6 w-6" />
                  Entrar com Biometria
                </button>
              </>
            )}

            {!showBiometricPrompt && biometricAvailable && !biometricRegistered && (
              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${rememberDevice ? 'bg-[var(--teuco-green)]' : 'bg-black/10'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${rememberDevice ? 'left-5' : 'left-1'}`} />
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                />
                <span className="text-[10px] font-bold text-[var(--teuco-text-muted)] uppercase tracking-wider">
                  Usar biometria neste dispositivo
                </span>
              </label>
            )}

            {!showBiometricPrompt && !biometricAvailable && (
              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${rememberDevice ? 'bg-[var(--teuco-green)]' : 'bg-black/10'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${rememberDevice ? 'left-5' : 'left-1'}`} />
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                />
                <span className="text-[10px] font-bold text-[var(--teuco-text-muted)] uppercase tracking-wider">
                  Lembrar neste dispositivo (30 dias)
                </span>
              </label>
            )}
          </form>
        </Card>
      </div>
    </div>
  )
}
