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
  const [sumarizareAI, setSumarizareAI] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [isLoadingSummPrompt, setIsLoadingSummPrompt] = useState(false);

  // Set default template text for exemplu
  useEffect(() => {
    if (!exempluText) {
      setExempluText(`# Template de Prompt pentru Generare Documente

Acest template te ajută să generezi rapid orice tip de document, specificând rolul meu, regulile de generare, contextul și structura dorită.

---

**Instrucțiuni:**
Completează secțiunile de mai jos cu informațiile specifice documentului pe care dorești să-l generezi. Asigură-te că oferi detalii clare pentru fiecare câmp.

---

# Rol
- Ești un/o [ROL_AI_DORIT] (ex: expert în marketing, scriitor creativ, medic specialist, programator Python, etc.)

# Reguli
- [REGULA_1] (ex: Folosește doar informațiile furnizate, nu cere detalii suplimentare)
- [REGULA_2] (ex: Generează documentul în format text simplu/Markdown/HTML/JSON)
- [REGULA_3] (ex: Nu oferi explicații suplimentare, doar documentul generat)
- [REGULA_N] (Adaugă reguli suplimentare dacă este necesar)

# Context
- [CONTEXT_GENERAL] (ex: Vei primi un set de date, o solicitare specifică, un istoric, etc.)
- [SCOP_DOCUMENT] (ex: Va trebui să întocmești un raport, o poveste, o analiză, o scrisoare, un cod, etc.)

# Structura Documentului
- Documentul va fi structurat în următoarele secțiuni principale:
  - [NUME_SECTIUNE_1] [DESCRIERE_CONTINUT_SECTIUNE_1] (ex: Introducere [Prezintă subiectul și scopul])
  - [NUME_SECTIUNE_2] [DESCRIERE_CONTINUT_SECTIUNE_2] (ex: Analiză [Analizează datele și trage concluzii])
  - [NUME_SECTIUNE_3] [DESCRIERE_CONTINUT_SECTIUNE_3] (ex: Recomandări [Sugerează pași următori sau soluții])
  - [NUME_SECTIUNE_N] [DESCRIERE_CONTINUT_SECTIUNE_N] (Adaugă secțiuni suplimentare dacă este necesar)

# Note
- [FORMAT_FINAL] (ex: Textul final trebuie să fie în format txt / Markdown / HTML / JSON)
- [UTILIZARE_DOCUMENT] (ex: Documentul va fi folosit direct de utilizator / va fi editat ulterior / este un draft)
- [ALTE_NOTE] (ex: Include hashtaguri relevante, folosește un ton formal/informal, limitează-te la un anumit număr de cuvinte, etc.)`);
    }
  }, [exempluText]);

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

  const handleDocumentTypeChange = async (value: string) => {
    setDocumentType(value);
    
    if (value) {
      setIsLoadingPrompt(true);
      try {
        const response = await fetch('https://n8n.voisero.info/webhook/patients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentType: value,
            operation: "get-prompt"
          }),
        });

        if (response.ok) {
            let responseText = await response.text();
            
            // Extract content from iframe if present
            if (responseText.includes('<iframe srcdoc="')) {
              const match = responseText.match(/srcdoc="([^"]*(?:\\.[^"]*)*)"[^>]*>/);
              if (match) {
                responseText = match[1];
                // Decode HTML entities
                responseText = responseText.replace(/&quot;/g, '"')
                                         .replace(/&amp;/g, '&')
                                         .replace(/&lt;/g, '<')
                                         .replace(/&gt;/g, '>');
              }
            }
            
            // Convert \n to actual newlines
            responseText = responseText.replace(/\\n/g, '\n');
            
            setPromptText(responseText || 'Document generat cu succes!');
        } else {
          const errorText = await response.text();
          console.error('Webhook request failed:', response.status, errorText);
          setPromptText(`Eroare la încărcarea prompt-ului (${response.status}): ${errorText || response.statusText}`);
        }
      } catch (error) {
        console.error('Error sending webhook:', error);
        setPromptText(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea - verificați conexiunea'}`);
      } finally {
        setIsLoadingPrompt(false);
      }
    }
  };

  const handleGetSummPrompt = async () => {
    setIsLoadingSummPrompt(true);
    try {
      const response = await fetch('https://n8n.voisero.info/webhook/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: "get-summ-prompt"
        }),
      });

      if (response.ok) {
        let responseText = await response.text();
        
        // Extract content from iframe if present
        if (responseText.includes('<iframe srcdoc="')) {
          const match = responseText.match(/srcdoc="([^"]*(?:\\.[^"]*)*)"[^>]*>/);
          if (match) {
            responseText = match[1];
            // Decode HTML entities
            responseText = responseText.replace(/&quot;/g, '"')
                                     .replace(/&amp;/g, '&')
                                     .replace(/&lt;/g, '<')
                                     .replace(/&gt;/g, '>');
          }
        }
        
        // Convert \n to actual newlines
        responseText = responseText.replace(/\\n/g, '\n');
        
        setSumarizareAI(responseText || 'Prompt sumarizare obținut cu succes!');
      } else {
        const errorText = await response.text();
        console.error('Webhook request failed:', response.status, errorText);
        alert(`Eroare la obținerea prompt-ului de sumarizare (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsLoadingSummPrompt(false);
    }
  };

  const handleApplyChanges = async () => {
  

    setIsApplyingChanges(true);
    try {
      const response = await fetch('https://n8n.voisero.info/webhook/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: "set-prompt",
          documentType: documentType || null,
          promptText: promptText,
          exempluText: exempluText,
          temperature: temperature,
          sumarizareAI: sumarizareAI
        }),
      });

      if (response.ok) {
        alert('Modificările au fost aplicate cu succes!');
      } else {
        const errorText = await response.text();
        console.error('Webhook request failed:', response.status, errorText);
        alert(`Eroare la aplicarea modificărilor (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsApplyingChanges(false);
    }
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
                  
                  <div className="mt-2 mb-4">
                    <Label className="text-sm font-medium text-slate-700">
                      Selectați tipul documentului medical implicit
                    </Label>
                    <Select value={documentType} onValueChange={handleDocumentTypeChange}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder={isLoadingPrompt ? "Se încarcă..." : "Selectați tipul documentului medical"} />
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
                  
                  <Textarea
                    id="prompt-text"
                    placeholder={isLoadingPrompt ? "Se încarcă prompt-ul..." : "Introduceți prompt-ul personalizat aici..."}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className={`mt-2 min-h-[600px] max-h-[700px] resize-y ${isLoadingPrompt ? 'opacity-50' : ''}`}
                    disabled={isLoadingPrompt}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Side - Document Type Selector, Exemplu, and Temperature */}
          <div className="space-y-6 flex flex-col">
            {/* Configurări Card */}
            <Card className="shadow-lg border-slate-200 flex-shrink-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b border-slate-200">
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Settings className="w-5 h-5 text-green-600" />
                  <span>Configurări</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="exemplu-text" className="text-sm font-medium text-slate-700">
                      Exemplu
                    </Label>
                    <Textarea
                      id="exemplu-text"
                      placeholder="Introduceți exemplul aici..."
                      value={exempluText}
                      onChange={(e) => setExempluText(e.target.value)}
                      className="mt-2 min-h-[150px] max-h-[200px] resize-y"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sumarizare AI Card */}
            <Card className="shadow-lg border-slate-200 flex-shrink-0">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-slate-200">
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Settings className="w-5 h-5 text-yellow-600" />
                  <span>Sumarizare AI</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sumarizare-ai" className="text-sm font-medium text-slate-700">
                      Configurați sumarizarea AI
                    </Label>
                    <Textarea
                      id="sumarizare-ai"
                      placeholder="Introduceți configurarea pentru sumarizarea AI..."
                      value={sumarizareAI}
                      onChange={(e) => setSumarizareAI(e.target.value)}
                      className="mt-2 min-h-[100px] max-h-[150px] resize-y"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button
                      onClick={handleGetSummPrompt}
                      disabled={isLoadingSummPrompt}
                      variant="outline"
                      className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                    >
                      {isLoadingSummPrompt ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Se încarcă...</span>
                        </div>
                      ) : (
                        'Obține prompt curent'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Temperature Slider Card */}
            <Card className="shadow-lg border-slate-200 flex-shrink-0">
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
                      step={0.01}
                      className="w-full"
                    />
                    <div className="text-center mt-2">
                      <span className="text-sm text-slate-600">Valoare curentă: {temperature.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-4">
                    <Button 
                      onClick={handleApplyChanges}
                      disabled={isApplyingChanges}
                      className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApplyingChanges ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Se aplică...</span>
                        </div>
                      ) : (
                        'Aplică modificări'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}