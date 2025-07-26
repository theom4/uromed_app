'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Settings, FileText } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [exempluText, setExempluText] = useState('');
  const [temperature, setTemperature] = useState(0.5);

  // Check for existing login state on component mount
  useEffect(() => {
    const loginState = localStorage.getItem('isLoggedIn');
    if (loginState === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
  };

  const handleBack = () => {
    router.push('/');
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
              <h1 className="text-xl font-semibold text-slate-900">Setări</h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Prompt */}
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 border-b border-slate-200">
              <CardTitle className="flex items-center space-x-2 text-slate-800">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Prompt</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="prompt-text" className="text-sm font-medium text-slate-700">
                    Configurați prompt-ul pentru generarea documentelor medicale
                  </Label>
                  <Textarea
                    id="prompt-text"
                    placeholder="Introduceți prompt-ul personalizat aici..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className="mt-2 min-h-[200px] resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Side - Document Type Selector and Exemplu */}
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b border-slate-200">
              <CardTitle className="flex items-center space-x-2 text-slate-800">
                <Settings className="w-5 h-5 text-green-600" />
                <span>Configurări</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    Selectați tipul documentului medical implicit
                  </Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue placeholder="Selectați tipul documentului medical" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spitalizare-zi">Spitalizare de Zi</SelectItem>
                      <SelectItem value="examen-clinic">Examen Clinic</SelectItem>
                      <SelectItem value="recomandari-medicale">Recomandări Medicale</SelectItem>
                      <SelectItem value="consultatie-urologica">Consultația Urologică</SelectItem>
                      <SelectItem value="scrisoare-medicala">Scrisoare Medicală</SelectItem>
                      <SelectItem value="interpretare-analiza">Interpretare Analiză</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="exemplu-text" className="text-sm font-medium text-slate-700">
                    Exemplu
                  </Label>
                  <Textarea
                    id="exemplu-text"
                    placeholder="Introduceți exemplul aici..."
                    value={exempluText}
                    onChange={(e) => setExempluText(e.target.value)}
                    className="mt-2 min-h-[200px] resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Temperature Slider */}
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-slate-200">
              <CardTitle className="flex items-center space-x-2 text-slate-800">
                <Settings className="w-5 h-5 text-orange-600" />
                <span>Temperatură</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-slate-700">0</span>
                    <span className="text-sm font-medium text-slate-700">1</span>
                  </div>
                  <Slider
                    value={[temperature]}
                    onValueChange={(value) => setTemperature(value[0])}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="text-center mt-2">
                    <span className="text-sm text-slate-600">Valoare curentă: {temperature}</span>
                  </div>
                </div>
                
                <div className="flex justify-center pt-4">
                  <Button className="bg-green-500 hover:bg-green-600 text-white px-8 py-2">
                    Aplică modificări
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
      </div>
    </div>
  );
}