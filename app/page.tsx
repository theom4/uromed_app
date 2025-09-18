'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, FileText, Users, Calendar, Building2, Settings, User, Upload, Search, X } from 'lucide-react';

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [foundPatient, setFoundPatient] = useState<any>(null);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setUploadedFiles((prev: File[]) => [...prev, ...fileArray]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
  };

  const handleSearchPatient = async () => {
    if (uploadedFiles.length === 0) {
      alert('Vă rugăm să încărcați cel puțin un fișier pentru căutarea pacientului.');
      return;
    }

    setIsSearching(true);

    try {
      console.log('Starting patient search with files:', uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
      
      const formData = new FormData();
      
      // Add each file with proper naming and validation
      uploadedFiles.forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name, file.type, file.size);
        formData.append(`file${index}`, file, file.name); // Use file0, file1, file2 format
      });
      
      // Add mime types array so webhook knows how to parse each file
      const mimeTypes = uploadedFiles.map(file => file.type);
      formData.append('mimeTypes', JSON.stringify(mimeTypes));
      
      formData.append('operation', 'search-patient');

      console.log('Sending request to webhook...');
      
      const response = await fetch('https://n8n.voisero.info/webhook-test/snippet', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Get response as text first to see raw content
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      if (response.ok) {
        try {
          // Try to parse as JSON
          const responseData = JSON.parse(responseText);
          console.log('Parsed response data:', responseData);
          
          // Handle the response structure: [{ patientData: {...}, output: [...] }]
          if (Array.isArray(responseData) && responseData.length > 0) {
            const firstResult = responseData[0];
            console.log('First result:', firstResult);
            
            if (firstResult && firstResult.patientData) {
              console.log('Patient data found:', firstResult.patientData);
              setFoundPatient(firstResult.patientData);
              alert('Pacient găsit cu succes!');
              
              // Clear uploaded files after successful search
              setUploadedFiles([]);
            } else {
              console.log('No patient data in response');
              alert('Răspuns primit, dar structura datelor nu conține informații de pacient!');
            }
          } else if (responseData && responseData.patientData) {
            // Handle direct object response
            console.log('Direct patient data found:', responseData.patientData);
            setFoundPatient(responseData.patientData);
            alert('Pacient găsit cu succes!');
            
            // Clear uploaded files after successful search
            setUploadedFiles([]);
          } else {
            console.log('Unexpected response structure:', responseData);
            alert('Răspuns primit cu structură neașteptată. Verificați consola pentru detalii.');
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          console.error('Response text that failed to parse:', responseText);
          
          // Check if response might be HTML or other format
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            alert('Serverul a returnat o pagină HTML în loc de date JSON. Verificați webhook-ul.');
          } else if (responseText.trim() === '') {
            alert('Serverul a returnat un răspuns gol.');
          } else {
            alert(`Răspuns primit, dar nu s-a putut procesa ca JSON. Tip răspuns: ${typeof responseText}`);
          }
        }
      } else {
        console.error('Patient search failed:', response.status, responseText);
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(responseText);
          alert(`Eroare la căutarea pacientului (${response.status}): ${errorData.message || errorData.error || responseText}`);
        } catch {
          alert(`Eroare la căutarea pacientului (${response.status}): ${responseText || response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error sending patient search:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Eroare de rețea: Nu se poate conecta la server. Verificați conexiunea la internet.');
      } else {
        alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
      }
    } finally {
      setIsSearching(false);
    }
  };
  const handleGenerateDocument = async () => {
    if (!inputText.trim() || !documentType) {
      alert('Vă rugăm să completați toate câmpurile.');
      return;
    }

    setIsGenerating(true);
    setOutputText('');

    try {
      const response = await fetch('https://n8n.voisero.info/webhook/uromed-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicalInfo: inputText,
          documentType: documentType,
          operation: "generate-document"
        }),
      });

      if (response.ok) {
        let responseText = await response.text();
        
        // Handle iframe wrapped responses
        if (responseText.includes('<iframe srcdoc="')) {
          const match = responseText.match(/srcdoc="([^"]*(?:\\.[^"]*)*)"[^>]*>/);
          if (match) {
            responseText = match[1];
            responseText = responseText.replace(/&quot;/g, '"')
                                     .replace(/&amp;/g, '&')
                                     .replace(/&lt;/g, '<')
                                     .replace(/&gt;/g, '>');
          }
        }
        
        responseText = responseText.replace(/\\n/g, '\n');
        
        setOutputText(responseText || 'Document generat cu succes!');
      } else {
        const errorText = await response.text();
        console.error('Webhook request failed:', response.status, errorText);
        alert(`Eroare la generarea documentului (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsGenerating(false);
    }
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
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">UroMed AI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/pacienti')}
                className="flex items-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Pacienti</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/programari')}
                className="flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Programări</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/saloane')}
                className="flex items-center space-x-2"
              >
                <Building2 className="w-4 h-4" />
                <span>Saloane</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/docs')}
                className="flex items-center space-x-2"
              >
                <Bot className="w-4 h-4" />
                <span>Docs AI</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/settings')}
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Setări</span>
              </Button>
              <div className="text-sm text-slate-600">
                {user.email}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <span>Ieșire</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Patient Search Section - At the top */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span>Căutare Pacient</span>
                </div>
                <Button
                  onClick={handleSearchPatient}
                  disabled={isSearching || uploadedFiles.length === 0}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium"
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
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Atașați screenshot sau imagine pentru căutarea pacientului
                  </Label>
                  <div className="mt-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 hover:border-green-400 dark:hover:border-green-500 transition-colors dark:bg-slate-700/50">
                    <Input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                      id="patient-search-files"
                    />
                    <Label htmlFor="patient-search-files" className="cursor-pointer flex flex-col items-center justify-center space-y-2 text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
                      <Upload className="w-8 h-8" />
                      <span className="text-center">
                        Încărcați fișiere (imagine, PDF, DOCX) pentru căutarea pacientului sau trage aici
                      </span>
                    </Label>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-700">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm text-green-700 dark:text-green-300 font-medium">{file.name}</span>
                            <span className="text-xs text-green-600 dark:text-green-400">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient Information Section - Only show when patient is found */}
          {foundPatient && (
            <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 border-l-4 border-green-400">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span>Pacient Găsit</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFoundPatient(null)}
                    className="bg-white dark:bg-green-800/20 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-800/30"
                  >
                    Închide
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Side - Patient Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Informații Personale</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Nume:</span>
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          {foundPatient?.nume || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Prenume:</span>
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          {foundPatient?.prenume || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">CNP:</span>
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          {foundPatient?.cnp || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Telefon:</span>
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          {foundPatient?.telefon || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Data nașterii:</span>
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          {foundPatient?.data_nasterii || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Medical History */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Istoric Consultații</h4>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-600 max-h-40 overflow-y-auto">
                      <div className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                        {foundPatient.istoric || 'Nu există consultații anterioare înregistrate.'}
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
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Generated Document - Now at the bottom */}
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
  );
}