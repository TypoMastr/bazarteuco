import React, { useState, useEffect } from 'react';
import { PageHeader, Input, Button, Card } from '../components/UI';
import { saveAuth, clearAuth, checkAuth } from '../services/api';
import { Key, LogOut, ShieldCheck, Terminal } from 'lucide-react';

export const Settings: React.FC = () => {
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(checkAuth());
    if(checkAuth()) {
        setKeyId(localStorage.getItem('sp_key_id') || '');
    }
  }, []);

  const handleSave = () => {
    if (!keyId) return alert('Por favor insira um ID');
    saveAuth({ keyId, keySecret: keySecret || 'mock_secret' });
    setIsAuthenticated(true);
    alert('Sessão iniciada!');
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
    setKeyId('');
    setKeySecret('');
  };

  return (
    <div className="h-full pb-24 md:pb-0 animate-in fade-in duration-500">
      <PageHeader title="Configurações" />
      
      <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
        <Card className="p-6 space-y-6 border-emerald-100 shadow-emerald-600/5">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full transition-all duration-500 ${isAuthenticated ? 'bg-emerald-100 text-emerald-600 rotate-0' : 'bg-amber-100 text-amber-600 rotate-12'}`}>
                    {isAuthenticated ? <ShieldCheck className="w-8 h-8" /> : <Terminal className="w-8 h-8" />}
                </div>
                <div>
                    <h2 className="font-bold text-lg text-slate-900">{isAuthenticated ? 'Sistema Conectado' : 'Modo de Desenvolvimento'}</h2>
                    <p className="text-sm text-slate-500">{isAuthenticated ? 'Usando dados simulados' : 'Autenticação Necessária'}</p>
                </div>
            </div>
            
            <div className="space-y-5">
                {!isAuthenticated && (
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 border border-blue-100">
                        <strong>Dica:</strong> Como estamos em modo de teste, você pode digitar qualquer valor (ex: "admin") para entrar.
                    </div>
                )}

                <Input 
                    label="ID da Chave de API" 
                    value={keyId}
                    onChange={e => setKeyId(e.target.value)}
                    placeholder="Insira o ID (ex: admin)"
                />
                <Input 
                    label="Segredo da API (Opcional)" 
                    type="password"
                    value={keySecret}
                    onChange={e => setKeySecret(e.target.value)}
                    placeholder="Qualquer senha"
                />
                <Button onClick={handleSave} className="w-full">
                    {isAuthenticated ? 'Atualizar Credenciais' : 'Iniciar Sessão'}
                </Button>
            </div>
        </Card>

        {isAuthenticated && (
            <div className="pt-4 border-t border-slate-200">
                 <Button variant="danger" className="w-full" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
                </Button>
            </div>
        )}
        
        <div className="text-center text-xs text-slate-400 mt-8">
            Versão 1.0.0 • SmartPOS Manager
        </div>
      </div>
    </div>
  );
};