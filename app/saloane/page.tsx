'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2, Calendar, Settings as SettingsIcon, Plus } from 'lucide-react';

export default function SaloanePage() {
  const { user, loading } = useAuth();
  const router = useRouter();


  const handleBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-500 to-purple-600 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const salons = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-500 to-purple-600">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2 text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-white" />
                <h1 className="text-xl font-semibold text-white">Management Pacienti - Secția Urologie</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Cards */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="text-4xl font-bold mb-2">0</div>
                <div className="text-blue-100">Pacienti Totali</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="text-4xl font-bold mb-2">0</div>
                <div className="text-blue-100">Operații Azi</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="text-4xl font-bold mb-2">0</div>
                <div className="text-blue-100">Externări Azi</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="text-4xl font-bold mb-2">40</div>
                <div className="text-blue-100">Paturi Libere</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <Button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  Internare Nouă
                </Button>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">
                  <Calendar className="w-4 h-4 mr-2" />
                  Vedere Calendar
                </Button>
                <Button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Setări
                </Button>
              </div>
              <div className="text-slate-600 font-medium">
                Vedere Saloane
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salons Grid */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {salons.slice(0, 4).map((salonNumber) => (
                <div key={salonNumber} className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Building2 className="w-5 h-5 text-slate-600" />
                    <h3 className="text-lg font-semibold text-slate-800">Salon {salonNumber}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, bedIndex) => (
                      <div
                        key={bedIndex}
                        className="border-2 border-dashed border-green-400 rounded-lg p-6 text-center bg-green-50/50 hover:bg-green-100/50 transition-colors cursor-pointer"
                      >
                        <div className="text-green-600 font-medium">Liber</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Second Row of Salons */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {salons.slice(4, 8).map((salonNumber) => (
                <div key={salonNumber} className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Building2 className="w-5 h-5 text-slate-600" />
                    <h3 className="text-lg font-semibold text-slate-800">Salon {salonNumber}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, bedIndex) => (
                      <div
                        key={bedIndex}
                        className="border-2 border-dashed border-green-400 rounded-lg p-6 text-center bg-green-50/50 hover:bg-green-100/50 transition-colors cursor-pointer"
                      >
                        <div className="text-green-600 font-medium">Liber</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Third Row of Salons */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {salons.slice(8, 10).map((salonNumber) => (
                <div key={salonNumber} className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Building2 className="w-5 h-5 text-slate-600" />
                    <h3 className="text-lg font-semibold text-slate-800">Salon {salonNumber}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, bedIndex) => (
                      <div
                        key={bedIndex}
                        className="border-2 border-dashed border-green-400 rounded-lg p-6 text-center bg-green-50/50 hover:bg-green-100/50 transition-colors cursor-pointer"
                      >
                        <div className="text-green-600 font-medium">Liber</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {/* Empty spaces to maintain grid alignment */}
              <div className="hidden lg:block"></div>
              <div className="hidden lg:block"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}