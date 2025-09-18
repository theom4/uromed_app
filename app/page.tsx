'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bot, 
  FileText, 
  Search, 
  Calendar, 
  User, 
  Building2, 
  Settings, 
  LogOut,
  Upload,
  BookOpen
} from 'lucide-react';

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [foundPatient, setFoundPatient] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdatingHistory, setIsUpdatingHistory] = useState(false);
  const [newConsultation, setNewConsultation] = useState({
    data: '',
    descriere: ''
  });

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('https://n8n.voisero.info/webhook/patients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: "get-settings"
          }),
        });

        if (response.ok) {
          const settings = await response.json();
          // Store settings in localStorage for the settings page to use
          localStorage.setItem('uromed_settings', JSON.stringify(settings));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    if (user) {
      loadSettings();
    }
  }, [user]);

  const handleGenerateDocument = async () => {
    if (!inputText.trim() || !documentType) {
      alert('Vă rugăm să completați toate câmpurile obligatorii');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('inputText', inputText);
      formData.append('documentType', documentType);
      formData.append('operation', 'generate-document');

      // Check if there are any file inputs and add them
      const fileInputs = document.querySelectorAll('input[type="file"]');
      let fileCount = 0;
      
      fileInputs.forEach((input: any, index) => {
        if (input.files && input.files.length > 0) {
          Array.from(input.files).forEach((file: any) => {
            console.log(`Adding file ${fileCount + 1}:`, {
              name: file.name,
              size: file.size,
              type: file.type
            });
            formData.append(`file_${fileCount}`, file);
            fileCount++;
          });
        }
      });

      console.log(`Total files being sent: ${fileCount}`);

      const response = await fetch('https://n8n.voisero.info/webhook/snippet', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        let responseText = await response.text();
        
        // Extract content from iframe if present
        if (responseText.includes('<iframe srcdoc="')) {
          const match = responseText.match(/srcdoc="([^"]*(?:\\.[^"]*)*)"[^>]*>/);
          if (match) {
            responseText = match[1];
            // Decode HTML entities
            responseText = responseText.replace(/"/g, '"')
                                     .replace(/&/g, '&')
                                     .replace(/</g, '<')
                                     .replace(/>/g, '>');
          }
        }
        
        // Convert \n to actual newlines
        responseText = responseText.replace(/\\n/g, '\n');
        
        setOutputText(responseText || 'Document generat cu succes!');
      } else {
        const errorText = await response.text();
        console.error('Webhook request failed:', response.status, errorText);
        setOutputText(`Eroare la generarea documentului (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
      setOutputText(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea - verificați conexiunea'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchPatient = async () => {
    if (!searchQuery.trim()) {
      alert('Vă rugăm să introduceți un nume sau CNP pentru căutare');
      return;
    }

    setIsSearching(true);
    setFoundPatient(null);
    
    try {
      const response = await fetch('https://n8n.voisero.info/webhook/search-patient-cnp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: searchQuery.trim(),
          operation: "search-patient"
        }),
      });

      if (response.ok) {
        const patientData = await response.json();
        
        if (patientData && (Array.isArray(patientData) ? patientData.length > 0 : patientData.id)) {
          const patient = Array.isArray(patientData) ? patientData[0] : patientData;
          setFoundPatient(patient);
        } else {
          alert('Nu s-au găsit pacienți cu acest nume sau CNP');
        }
      } else {
        const errorText = await response.text();
        console.error('Search request failed:', response.status, errorText);
        alert(`Eroare la căutarea pacientului (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error searching patient:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateHistory = async () => {
    if (!foundPatient || !newConsultation.descriere.trim()) {
      alert('Vă rugăm să completați descrierea consultației');
      return;
    }

    setIsUpdatingHistory(true);
    
    try {
      const response = await fetch('https://n8n.voisero.info/webhook/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: "update-history",
          patientId: foundPatient.id,
          consultatie: {
            data: newConsultation.data || new Date().toLocaleDateString('ro-RO'),
            descriere: newConsultation.descriere
          }
        }),
      });

      if (response.ok) {
        // Update the local patient data
        const updatedConsultatii = foundPatient.consultatii || [];
        updatedConsultatii.push({
          data: newConsultation.data || new Date().toLocaleDateString('ro-RO'),
          descriere: newConsultation.descriere
        });
        
        setFoundPatient({
          ...foundPatient,
          consultatii: updatedConsultatii
        });
        
        // Clear the form
        setNewConsultation({ data: '', descriere: '' });
        
        alert('Istoricul a fost actualizat cu succes!');
      } else {
        const errorText = await response.text();
        console.error('Update history request failed:', response.status, errorText);
        alert(`Eroare la actualizarea istoricului (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating history:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsUpdatingHistory(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">UroMed AI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/pacienti')}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <User className="w-4 h-4" />
                <span>Pacienti</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/saloane')}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Building2 className="w-4 h-4" />
                <span>Saloane</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/programari')}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Calendar className="w-4 h-4" />
                <span>Programări</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/docs')}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <BookOpen className="w-4 h-4" />
                <span>Docs</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/settings')}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Settings className="w-4 h-4" />
                <span>Setări</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <LogOut className="w-4 h-4" />
                <span>Ieșire</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Patient Search */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center space-x-2 text-slate-800 dark:text-white">
                  <Search className="w-5 h-5 text-green-600" />
                  <span>Căutare Pacient</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex space-x-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Introduceți numele sau CNP-ul pacientului"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchPatient();
                        }
                      }}
                      className="pl-10 h-12 text-lg"
                    />
                  </div>
                  <Button
                    onClick={handleSearchPatient}
                    disabled={isSearching || !searchQuery.trim()}
                    className="h-12 px-6 bg-green-500 hover:bg-green-600 text-white font-medium"
                  >
                    {isSearching ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Caută...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4" />
                        <span>Caută Pacient</span>
                      </div>
                    )}
                  </Button>
                </div>

                {foundPatient && (
                  <div className="space-y-4 mt-6">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Informații Pacient</h4>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-600">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-green-800 dark:text-green-200">Nume:</span>
                          <span className="text-green-700 dark:text-green-300">{foundPatient.nume} {foundPatient.prenume}</span>
                        </div>
                        {foundPatient.cnp && (
                          <div className="flex justify-between">
                            <span className="font-medium text-green-800 dark:text-green-200">CNP:</span>
                            <span className="text-green-700 dark:text-green-300">{foundPatient.cnp}</span>
                          </div>
                        )}
                        {foundPatient.telefon && (
                          <div className="flex justify-between">
                            <span className="font-medium text-green-800 dark:text-green-200">Telefon:</span>
                            <span className="text-green-700 dark:text-green-300">{foundPatient.telefon}</span>
                          </div>
                        )}
                        {foundPatient.email && (
                          <div className="flex justify-between">
                            <span className="font-medium text-green-800 dark:text-green-200">Email:</span>
                            <span className="text-green-700 dark:text-green-300">{foundPatient.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* New Consultation Form */}
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">Consultație Nouă</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="consultation-date" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Data Consultației
                        </Label>
                        <Input
                          id="consultation-date"
                          type="date"
                          value={newConsultation.data}
                          onChange={(e) => setNewConsultation({...newConsultation, data: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="consultation-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Descrierea Consultației
                        </Label>
                        <Textarea
                          id="consultation-description"
                          placeholder="Introduceți detaliile consultației..."
                          value={newConsultation.descriere}
                          onChange={(e) => setNewConsultation({...newConsultation, descriere: e.target.value})}
                          className="mt-1 min-h-[120px] resize-none"
                        />
                      </div>
                    </div>
                    
                    {/* Update History Button */}
                    <div className="flex justify-center mt-4">
                      <Button
                        onClick={handleUpdateHistory}
                        disabled={isUpdatingHistory}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                      >
                        {isUpdatingHistory ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Actualizează...</span>
                          </div>
                        ) : (
                          'Actualizează istoric'
                        )}
                      </Button>
                    </div>

                    {/* Consultation History */}
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">Istoric Consultații</h4>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-600 max-h-64 overflow-y-auto">
                      {foundPatient.consultatii && foundPatient.consultatii.length > 0 ? (
                        <div className="space-y-3">
                          {foundPatient.consultatii.map((consultatie: any, index: number) => (
                            <div key={index} className="bg-white dark:bg-green-800/20 rounded-lg p-3 border border-green-200 dark:border-green-600">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                  Consultația #{index + 1}
                                </span>
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  {consultatie.data || 'Data necunoscută'}
                                </span>
                              </div>
                              <div className="text-sm text-green-700 dark:text-green-300">
                                {consultatie.descriere || consultatie.diagnostic || 'Fără descriere disponibilă'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <div className="text-sm text-green-600 dark:text-green-400">
                            Nu există consultații anterioare înregistrate
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-600">
                      <div className="text-sm text-green-700 dark:text-green-300">
                        <strong>Ultima evaluare:</strong> Pacient evaluat pentru suspiciune proces proliferativ prostatic, cu aspecte sugestive imagistice și PSA. Plan: tuseu rectal, PSA total/free, RMN multiparametric, biopsie prostatică ghidată.
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Vezi Detalii Complete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Document Generation */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center space-x-2 text-slate-800 dark:text-white">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Generare Document Medical</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Input Text */}
                <div>
                  <Label htmlFor="input-text" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Informații Medicale
                  </Label>
                  <Textarea
                    id="input-text"
                    placeholder="Introduceți informațiile medicale aici..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="mt-2 min-h-[200px] resize-none"
                  />
                </div>

                {/* Document Type */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tipul Documentului
                  </Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="mt-2">
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

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateDocument}
                  disabled={isGenerating || !inputText.trim() || !documentType}
                  className="w-full h-12 text-white font-medium text-lg bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generează Document...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Generează Document Medical</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Document */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center space-x-2 text-slate-800 dark:text-white">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span>Document Generat</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {outputText ? (
                  <div className="space-y-4">
                    <Textarea
                      value={outputText}
                      onChange={(e) => setOutputText(e.target.value)}
                      className="min-h-[400px] max-h-[600px] resize-y text-sm font-mono leading-relaxed"
                      placeholder="Documentul generat va apărea aici..."
                    />
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(outputText)}
                        className="flex items-center space-x-2"
                      >
                        <span>Copiază</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-2"
                      >
                        <span>Descarcă</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">
                      Documentul generat va apărea aici
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Completați informațiile medicale și selectați tipul documentului
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}