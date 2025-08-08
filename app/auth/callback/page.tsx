'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Se procesează autentificarea...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && refreshToken) {
          // Set the session using the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            setStatus('error');
            setMessage('Eroare la procesarea autentificării: ' + error.message);
            return;
          }

          if (data.session) {
            // Clear the URL hash
            window.history.replaceState(null, '', window.location.pathname);
            
            setStatus('success');
            if (type === 'signup') {
              setMessage('Contul a fost confirmat cu succes!');
            } else if (type === 'recovery') {
              setMessage('Parola a fost resetată cu succes!');
            } else {
              setMessage('Autentificare reușită!');
            }

            // Redirect to home page after a short delay
            setTimeout(() => {
              router.push('/');
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Nu s-a putut stabili sesiunea.');
          }
        } else {
          // Try to handle code-based flow (PKCE)
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');

          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);

            if (error) {
              console.error('Error exchanging code for session:', error);
              setStatus('error');
              setMessage('Eroare la procesarea autentificării: ' + error.message);
              return;
            }

            if (data.session) {
              setStatus('success');
              setMessage('Autentificare reușită!');
              
              // Redirect to home page after a short delay
              setTimeout(() => {
                router.push('/');
              }, 2000);
            }
          } else {
            // No tokens or code found, redirect to login
            setStatus('error');
            setMessage('Nu au fost găsite informații de autentificare.');
            setTimeout(() => {
              router.push('/auth/login');
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Eroare neașteptată la procesarea autentificării.');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Se procesează...
              </h2>
              <p className="text-slate-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-700 mb-2">
                Succes!
              </h2>
              <p className="text-slate-600 mb-4">{message}</p>
              <p className="text-sm text-slate-500">
                Vei fi redirecționat în curând...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">
                Eroare
              </h2>
              <p className="text-slate-600 mb-4">{message}</p>
              <p className="text-sm text-slate-500">
                Vei fi redirecționat la pagina de autentificare...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}