'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail } from 'lucide-react';

export default function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
    }

    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await signUp(email, password);

    if (error) {
      setError(error.message);
    } else {
      setError('Verifică email-ul pentru confirmare!');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
    } else {
      setError('Verifică email-ul pentru link-ul de resetare!');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            {mode === 'login' && 'Autentificare'}
            {mode === 'register' && 'Creare Cont'}
            {mode === 'forgot' && 'Resetare Parolă'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={
            mode === 'login' ? handleLogin : 
            mode === 'register' ? handleRegister : 
            handleForgotPassword
          } className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Parolă
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className={`text-sm text-center p-2 rounded ${
                error.includes('Verifică') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Se procesează...</span>
                </div>
              ) : (
                <>
                  {mode === 'login' && 'Intră în cont'}
                  {mode === 'register' && 'Creează cont'}
                  {mode === 'forgot' && 'Trimite email resetare'}
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => setMode('forgot')}
                  className="text-sm text-blue-600 hover:underline block w-full"
                >
                  Ai uitat parola?
                </button>
                <button
                  onClick={() => setMode('register')}
                  className="text-sm text-blue-600 hover:underline block w-full"
                >
                  Nu ai cont? Înregistrează-te
                </button>
              </>
            )}
            {mode === 'register' && (
              <button
                onClick={() => setMode('login')}
                className="text-sm text-blue-600 hover:underline"
              >
                Ai deja cont? Autentifică-te
              </button>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="text-sm text-blue-600 hover:underline"
              >
                Înapoi la autentificare
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}