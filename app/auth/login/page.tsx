'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

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
          <CardTitle className="text-2xl font-bold">
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
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              <div>
                <Label htmlFor="password">Parolă</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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