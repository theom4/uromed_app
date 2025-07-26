'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bot, Upload, FileText, BookOpen, Settings } from 'lucide-react';

export default function DocsPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [eauFiles, setEauFiles] = useState<File[]>([]);
  const [cunostinteGenerale, setCunostinteGenerale] = useState('');
  const [reguli, setReguli] = useState('');

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

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setEauFiles((prev: File[]) => [...prev, ...fileArray]);
  };

  const removeFile = (index: number) => {
    setEauFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
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
              <h1 className="text-xl font-semibold text-slate-900">Documente AI</h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Documente EAU Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 border-b border-slate-200">
            <CardTitle className="flex items-center space-x-2 text-slate-800">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Documente EAU</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Atașați documente EAU (European Association of Urology)
                </Label>
                <div className="mt-2 border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="eau-files"
                  />
                  <Label htmlFor="eau-files" className="cursor-pointer flex items-center justify-center space-x-2 text-slate-600 hover:text-blue-600">
                    <Upload className="w-5 h-5" />
                    <span>Încărcați documente EAU</span>
                  </Label>
                </div>
                {eauFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {eauFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-700">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cunoștințe Generale Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b border-slate-200">
            <CardTitle className="flex items-center space-x-2 text-slate-800">
              <BookOpen className="w-5 h-5 text-green-600" />
              <span>Cunoștințe Generale</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="cunostinte-generale" className="text-sm font-medium text-slate-700">
                  Introduceți cunoștințele generale medicale relevante
                </Label>
                <Textarea
                  id="cunostinte-generale"
                  placeholder="Introduceți cunoștințele generale aici..."
                  value={cunostinteGenerale}
                  onChange={(e) => setCunostinteGenerale(e.target.value)}
                  className="mt-2 min-h-[150px] resize-y"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reguli Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
            <CardTitle className="flex items-center space-x-2 text-slate-800">
              <Settings className="w-5 h-5 text-purple-600" />
              <span>Reguli</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="reguli" className="text-sm font-medium text-slate-700">
                  Definiți regulile și protocoalele medicale
                </Label>
                <Textarea
                  id="reguli"
                  placeholder="Introduceți regulile aici..."
                  value={reguli}
                  onChange={(e) => setReguli(e.target.value)}
                  className="mt-2 min-h-[150px] resize-y"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card className="shadow-lg border-slate-200">
          <CardContent className="p-6">
            <Button
              className="w-full h-12 text-white font-medium text-lg bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <span>Salvează Configurația AI</span>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}