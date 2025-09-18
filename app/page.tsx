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
      // Debug: Log file details
      console.log('=== UPLOAD DEBUG INFO ===');
      console.log(`Number of files: ${uploadedFiles.length}`);
      console.log(`Total upload size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      console.log('File details:');
      uploadedFiles.forEach((file, index) => {
        console.log(`  File ${index}: ${file.name} (${file.type}) - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      });
      console.log('========================');
      
      console.log('Starting patient search with files:', uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
      console.log(`Total upload size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      const formData = new FormData();
      
      // Add each file with consistent naming
      uploadedFiles.forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name, file.type, file.size);
        // Use file0, file1, file2, etc. naming
        formData.append(`file${index}`, file, file.name);
      });
      
      // Add metadata
      formData.append('fileCount', uploadedFiles.length.toString());
      formData.append('mimeTypes', uploadedFiles.map(file => file.type).join(','));
      formData.append('operation', 'search-patient');
      
      // Log FormData contents for debugging
      console.log('FormData entries:');
      console.log('FormData created with files and metadata');

      console.log('Sending request to webhook...');
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timed out after 5 minutes');
        controller.abort();
      }, 300000); // 5 minutes timeout for 15 PDFs
      
      console.log('Making fetch request...');
      const response = await fetch('https://n8n.voisero.info/webhook-test/snippet', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('Fetch completed successfully');

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
          
          // Handle different response formats
          let patientsArray = [];
          
          // Format 1: Array response - [{ patientData: [...] }]
          if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].patientData && Array.isArray(responseData[0].patientData)) {
            console.log('Array format response detected with patientData array');
            patientsArray = responseData[0].patientData;
            setIsPdfResponse(true);
            
            // Check if multiple patients or single patient
            if (patientsArray.length > 1) {
              console.log(`Multiple patients detected: ${patientsArray.length} patients`);
              setMultiplePatients(patientsArray);
              setFoundPatient(null); // Clear single patient when we have multiple
            } else if (patientsArray.length === 1) {
              console.log('Single patient detected in array format');
              setFoundPatient(patientsArray[0]);
              setMultiplePatients([]); // Clear multiple patients when we have single
            }
            
            // Clear uploaded files after successful processing
            setUploadedFiles([]);
            return;
          }
          // Format 2: Direct object response - { status: "...", patientData: [...] }
          else if (responseData.patientData && Array.isArray(responseData.patientData)) {
            console.log('Direct object format response detected with patientData array');
            patientsArray = responseData.patientData;
            setIsPdfResponse(true);
            
            // Check if multiple patients or single patient
            if (patientsArray.length > 1) {
              console.log(`Multiple patients detected: ${patientsArray.length} patients`);
              setMultiplePatients(patientsArray);
              setFoundPatient(null); // Clear single patient when we have multiple
            } else if (patientsArray.length === 1) {
              console.log('Single patient detected in direct object format');
              setFoundPatient(patientsArray[0]);
              setMultiplePatients([]); // Clear multiple patients when we have single
            }
            
            // Clear uploaded files after successful processing
            setUploadedFiles([]);
            return;
          }
          // Format 3: Snippet response - [{ patientData: {...}, output: [...] }]
          else if (Array.isArray(responseData) && responseData.length > 0) {
            const firstResult = responseData[0];
            console.log('Snippet format response detected');
            setIsPdfResponse(false); // Mark as snippet response
            setMultiplePatients([]); // Clear multiple patients for snippet response
            
            if (firstResult && firstResult.patientData) {
             console.log('Found patientData in snippet format:', firstResult.patientData);
              setFoundPatient(firstResult.patientData);
             setEditableHistory(firstResult.patientData.istoric || '');
             
             // Clear uploaded files after successful search
             setUploadedFiles([]);
             return; // Exit here to prevent showing popup
            }
          }
          // Format 4: Direct single object response - { patientData: {...} }
          else if (responseData && responseData.patientData && !Array.isArray(responseData.patientData)) {
            console.log('Direct object format response detected');
            setFoundPatient(responseData.patientData);
            setIsPdfResponse(false); // Mark as direct object response
            setMultiplePatients([]); // Clear multiple patients for direct object response
            
            // Clear uploaded files after successful search
            setUploadedFiles([]);
            return; // Exit here to prevent showing popup
          }
          
          // If we reach here, no valid patient data was found
          console.log('No valid patient data found in response');
          alert('Nu s-au găsit date de pacient în răspuns.');
          
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
      
      if (error.name === 'AbortError') {
        alert('Cererea a expirat după 5 minute. Încercați cu mai puține fișiere sau fișiere mai mici.');
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Eroare de rețea: Nu se poate conecta la server. Verificați conexiunea la internet.');
      } else if (error.message.includes('Failed to fetch')) {
        alert(`Eroare de conectare la server. Posibil limită de fișiere pe server. Încercați cu ${uploadedFiles.length - 1} fișiere.`);
      } else {
        alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
      }
      
      // Log detailed error info
      console.error('=== ERROR DETAILS ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Number of files when error occurred:', uploadedFiles.length);
      console.error('====================');
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
        setFoundPatient(prevPatient => ({
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