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
  const [editableHistory, setEditableHistory] = useState('');
  const [isUpdatingHistory, setIsUpdatingHistory] = useState(false);
  const [isPdfResponse, setIsPdfResponse] = useState(false);
  const [multiplePatients, setMultiplePatients] = useState<any[]>([]);

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

  // Check total file size (limit to 50MB total)
  const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
  const maxSize = 150 * 1024 * 1024; // 150MB (10MB per PDF x 15 PDFs)
  
  if (totalSize > maxSize) {
    alert(`Fișierele sunt prea mari (${(totalSize / 1024 / 1024).toFixed(1)}MB). Limita este 150MB total.`);
    return;
  }
  setIsSearching(true);

  try {
    const formData = new FormData();
    
    // Add each file with consistent naming
    uploadedFiles.forEach((file, index) => {
      // Use file0, file1, file2, etc. naming
      formData.append(`file${index}`, file, file.name);
    });
    
    // Add metadata
    formData.append('fileCount', uploadedFiles.length.toString());
    formData.append('mimeTypes', uploadedFiles.map(file => file.type).join(','));
    formData.append('operation', 'search-patient');
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 300000); // 5 minutes timeout for 15 PDFs
    
    const response = await fetch('https://n8n.voisero.info/webhook-test/snippet', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Get response as text first to see raw content
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    if (response.ok) {
      try {
        // Try to parse as JSON
        const responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
        
        // Check if response is an array
        if (Array.isArray(responseData) && responseData.length > 0) {
          const firstItem = responseData[0];
          console.log('First item:', firstItem);
          
          // Check if it has patientData
          if (firstItem.patientData) {
            console.log('Found patientData:', firstItem.patientData);
            
            // Check if patientData is an array (multiple patients)
            if (Array.isArray(firstItem.patientData)) {
              console.log('Multiple patients detected');
              setMultiplePatients(firstItem.patientData);
              setFoundPatient(null);
              setIsPdfResponse(true);
            } else if (typeof firstItem.patientData === 'object' && firstItem.patientData !== null) {
              console.log('Single patient detected');
              setFoundPatient(firstItem.patientData);
              setEditableHistory(firstItem.patientData.istoric || '');
              setMultiplePatients([]);
              setIsPdfResponse(true);
            }
            setUploadedFiles([]);
            return;
          }
          
          // Direct patient object (for image responses)
          if (firstItem.id && firstItem.nume) {
            console.log('Direct patient object detected');
            setFoundPatient(firstItem);
            setEditableHistory(firstItem.istoric || '');
            setMultiplePatients([]);
            setIsPdfResponse(false);
            setUploadedFiles([]);
            return;
          }
        }
        
        console.log('No matching case found, clearing results');
        setFoundPatient(null);
        setMultiplePatients([]);
        setUploadedFiles([]);
        
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Try to extract JSON from response text
        try {
          const jsonMatch = responseText.match(/\[.*\]/s);
          if (jsonMatch) {
            const cleanJson = jsonMatch[0];
            const responseData = JSON.parse(cleanJson);
            console.log('Extracted JSON:', responseData);
            
            if (Array.isArray(responseData) && responseData.length > 0) {
              const firstItem = responseData[0];
              
              if (firstItem.patientData) {
                if (Array.isArray(firstItem.patientData)) {
                  setMultiplePatients(firstItem.patientData);
                  setFoundPatient(null);
                  setIsPdfResponse(true);
                } else if (typeof firstItem.patientData === 'object' && firstItem.patientData !== null) {
                  setFoundPatient(firstItem.patientData);
                  setEditableHistory(firstItem.patientData.istoric || '');
                  setMultiplePatients([]);
                  setIsPdfResponse(true);
                }
                setUploadedFiles([]);
                return;
              }
              
              // Direct patient object
              if (firstItem.id && firstItem.nume) {
                setFoundPatient(firstItem);
                setEditableHistory(firstItem.istoric || '');
                setMultiplePatients([]);
                setIsPdfResponse(false);
                setUploadedFiles([]);
                return;
              }
            }
          }
        } catch (extractError) {
          console.error('Failed to extract JSON:', extractError);
        }
        
        // Clear results on parse error
        setFoundPatient(null);
        setMultiplePatients([]);
        setUploadedFiles([]);
        return;
      }
    } else {
      console.error('Patient search failed:', response.status, responseText);
      setFoundPatient(null);
      setMultiplePatients([]);
      setUploadedFiles([]);
    }
  } catch (error) {
    console.error('Network error:', error);
    setFoundPatient(null);
    setMultiplePatients([]);
    setUploadedFiles([]);
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

  const handleUpdateHistory = async () => {
    if (!foundPatient) {
      alert('Nu există pacient selectat pentru actualizare.');
      return;
    }

    setIsUpdatingHistory(true);

    try {
      const response = await fetch('https://n8n.voisero.info/webhook-test/update-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...foundPatient,
          istoric: editableHistory,
          operation: 'update-history'
        }),
      });

      if (response.ok) {
        alert('Istoricul medical a fost actualizat cu succes!');
        // Update the foundPatient with the new history to preserve the data
     setFoundPatient((prevPatient: any) => ({
  ...prevPatient!,
  istoric: editableHistory
}));
      } else {
        const errorText = await response.text();
        console.error('Update history failed:', response.status, errorText);
        alert(`Eroare la actualizarea istoricului (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating history:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsUpdatingHistory(false);
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
          {(foundPatient || multiplePatients.length > 0) && (
            <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 border-l-4 border-green-400">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span>
                      {multiplePatients.length > 0 
                        ? `${multiplePatients.length} Pacienți ${isPdfResponse ? 'Creați' : 'Găsiți'}` 
                        : `Pacient ${isPdfResponse ? 'Creat' : 'Găsit'}`
                      }
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFoundPatient(null);
                      setMultiplePatients([]);
                    }}
                    className="bg-white dark:bg-green-800/20 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-800/30"
                  >
                    Închide
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {multiplePatients.length > 0 ? (
                  // Multiple patients view
                  <div className="space-y-6">
                    {multiplePatients.map((patient, index) => (
                      <div key={index} className="border border-green-200 dark:border-green-600 rounded-lg p-4 bg-green-50/50 dark:bg-green-900/10">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                          Pacient #{index + 1}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex justify-between">
                            <span className="text-base font-bold text-slate-700 dark:text-slate-300">Nume:</span>
                            <span className="text-base font-bold text-green-800 dark:text-green-200">
                              {patient?.nume || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base font-bold text-slate-700 dark:text-slate-300">Prenume:</span>
                            <span className="text-base font-bold text-green-800 dark:text-green-200">
                              {patient?.prenume || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base font-bold text-slate-700 dark:text-slate-300">CNP:</span>
                            <span className="text-base font-bold text-green-800 dark:text-green-200">
                              {patient?.cnp || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single patient view
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Side - Patient Info */}
                  <div className="space-y-4">
                    {/* Personal Information */}
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Informații Personale</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-base font-bold text-slate-700 dark:text-slate-300">Nume:</span>
                          <span className="text-base font-bold text-green-800 dark:text-green-200">
                            {foundPatient?.nume || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base font-bold text-slate-700 dark:text-slate-300">Prenume:</span>
                          <span className="text-base font-bold text-green-800 dark:text-green-200">
                            {foundPatient?.prenume || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base font-bold text-slate-700 dark:text-slate-300">CNP:</span>
                          <span className="text-base font-bold text-green-800 dark:text-green-200">
                            {foundPatient?.cnp || 'N/A'}
                          </span>
                        </div>
                        {!isPdfResponse && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-base font-bold text-slate-700 dark:text-slate-300">Telefon:</span>
                              <span className="text-base font-bold text-green-800 dark:text-green-200">
                                {foundPatient?.telefon || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-base font-bold text-slate-700 dark:text-slate-300">Data nașterii:</span>
                              <span className="text-base font-bold text-green-800 dark:text-green-200">
                                {foundPatient?.data_nasterii || 'N/A'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Medical History - Only show for non-PDF responses */}
                    {!isPdfResponse && (
                      <>
                        <div>
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Istoric Medical</h4>
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-600 max-h-32 overflow-y-auto">
                           <Textarea
                             value={editableHistory}
                             onChange={(e) => setEditableHistory(e.target.value)}
                             placeholder="Nu există istoric medical disponibil."
                             className="min-h-[80px] max-h-[120px] resize-none bg-transparent border-none p-0 text-sm text-green-700 dark:text-green-300 focus:ring-0 focus:outline-none"
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
                      </>
                    )}
                  </div>

                  {/* Right Side - Consultation History */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Istoric Consultații</h4>
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
                </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Document Generation */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center space-x-2 text-slate-800 dark:text-white">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Generare Document Medical</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="medical-info" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Informații medicale
                    </Label>
                    <Textarea
                      id="medical-info"
                      placeholder="Introduceți informațiile medicale pentru generarea documentului..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="mt-1 min-h-[120px] resize-none"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="document-type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tipul documentului
                    </Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selectați tipul documentului" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fisa-consultatie">Fișă de consultație</SelectItem>
                        <SelectItem value="bilet-iesire">Bilet de ieșire</SelectItem>
                        <SelectItem value="scrisoare-medicala">Scrisoare medicală</SelectItem>
                        <SelectItem value="recomandari">Recomandări medicale</SelectItem>
                        <SelectItem value="diagnostic">Diagnostic medical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleGenerateDocument}
                    disabled={isGenerating || !inputText.trim() || !documentType}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generez...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4" />
                        <span>Generează Document</span>
                      </div>
                    )}
                  </Button>
                </div>

                {/* Output Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Document generat
                  </Label>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto border border-slate-200 dark:border-slate-600">
                    {outputText ? (
                      <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                        {outputText}
                      </div>
                    ) : (
                      <div className="text-slate-500 dark:text-slate-400 text-sm italic">
                        Documentul generat va apărea aici...
                      </div>
                    )}
                  </div>
                  
                  {outputText && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(outputText);
                        alert('Document copiat în clipboard!');
                      }}
                      className="w-full"
                    >
                      Copiază în clipboard
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}