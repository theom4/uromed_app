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
import { Bot, FileText, Users, Calendar, Building2, Settings, User, Upload, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [searchFoundPatients, setSearchFoundPatients] = useState<any[]>([]);
  const [editableHistories, setEditableHistories] = useState<{[key: number]: string}>({});
  const [uploadedFileTypes, setUploadedFileTypes] = useState<string[]>([]);
  const [editableDocument, setEditableDocument] = useState('');
  const [isUpdatingDocument, setIsUpdatingDocument] = useState(false);
  const [currentPatientCnp, setCurrentPatientCnp] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);

  // Set default document type to 'spitalizare-zi'
  useEffect(() => {
    if (!documentType) {
      setDocumentType('spitalizare-zi');
    }
  }, []);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setUploadedFiles((prev: File[]) => [...prev, ...fileArray]);
    
    // Track file types
    const newFileTypes = fileArray.map(file => {
      if (file.type.includes('pdf')) return 'pdf';
      if (file.type.includes('image')) return 'image';
      return 'other';
    });
    setUploadedFileTypes((prev: string[]) => [...prev, ...newFileTypes]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
    setUploadedFileTypes((prev: string[]) => prev.filter((_: string, i: number) => i !== index));
    setUploadedFileTypes((prev: string[]) => prev.filter((_: string, i: number) => i !== index));
  };

const handleSearchPatient = async () => {
  if (uploadedFiles.length === 0) {
    alert('Vă rugăm să încărcați cel puțin un fișier pentru căutarea pacientului.');
    return;
  }

  // Check total file size (limit to 150MB total)
  const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
  const maxSize = 150 * 1024 * 1024; // 150MB
  
  if (totalSize > maxSize) {
    alert(`Fișierele sunt prea mari (${(totalSize / 1024 / 1024).toFixed(1)}MB). Limita este 150MB total.`);
    return;
  }
  
  setIsSearching(true);
  setSearchFoundPatients([]);
  setEditableHistories({});
  
  // Determine if we're dealing with PDFs or images
  const hasPdfs = uploadedFileTypes.some(type => type === 'pdf');
  const hasImages = uploadedFileTypes.some(type => type === 'image');

  try {
    const formData = new FormData();
    
    // Add each file with consistent naming (file0, file1, etc.)
    uploadedFiles.forEach((file, index) => {
      formData.append(`file${index}`, file);
    });
    
    // Add metadata
    formData.append('fileCount', uploadedFiles.length.toString());
    formData.append('mimeTypes', uploadedFiles.map(file => file.type).join(','));
    formData.append('operation', 'search-patient');
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 300000); // 5 minutes timeout
    
    const response = await fetch('https://n8n.voisero.info/webhook-test/snippet', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      try {
        const responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
        
        // Handle PDF response format: Object with patientData array and status
        if (responseData.patientData && Array.isArray(responseData.patientData) && responseData.patientData.length > 0) {
          console.log('PDF response detected with patientData array');
          
          const patients = responseData.patientData.map((patient, index) => ({
            id: index,
            nume: patient.nume || '',
            prenume: patient.prenume || '',
            cnp: patient.cnp || '',
            telefon: patient.telefon || '',
            data_nasterii: patient.data_nasterii || '',
            istoric: patient.istoric || '',
            status: responseData.status || 'PDF FOUND'
          }));
          
          setSearchFoundPatients(patients);
          
          // Initialize editable histories for all patients
          const histories = {};
          patients.forEach((patient, index) => {
            histories[index] = patient.istoric || '';
          });
          setEditableHistories(histories);
          
          setUploadedFiles([]); // Clear uploaded files after successful search
          setUploadedFileTypes([]); // Clear file types too
          setIsSearching(false);
          return;
        }
        
        // Handle legacy array response format (backward compatibility)
        if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].patientData) {
          const patients = responseData.map((item, index) => ({
            id: index,
            nume: item.nume || '',
            prenume: item.prenume || '',
            cnp: item.cnp || '',
            telefon: item.telefon || '',
            data_nasterii: item.data_nasterii || '',
            istoric: item.istoric || '',
            status: item.status || 'IMG FOUND'
          }));
          
          setSearchFoundPatients(patients);
          
          // Initialize editable histories for all patients
          const histories = {};
          patients.forEach((patient, index) => {
            histories[index] = patient.istoric || '';
          });
          setEditableHistories(histories);
          
          // Save the first patient's CNP for document generation
          if (patients.length > 0 && patients[0].cnp) {
            setCurrentPatientCnp(patients[0].cnp);
          }
          
          setUploadedFiles([]);
          setUploadedFileTypes([]);
          setIsSearching(false);
          return;
        }
        
        // Handle single patient response (for images)
        if (responseData.status === 'IMG FOUND' || responseData.status === 'IMG NEW') {
          console.log('Single patient search result:', responseData.status);
          
          const patientData = {
            id: 0,
            nume: responseData.nume || '',
            prenume: responseData.prenume || '',
            cnp: responseData.cnp || '',
            telefon: responseData.telefon || '',
            data_nasterii: responseData.data_nasterii || '',
            istoric: responseData.istoric_medical || responseData.istoric || '',
            status: responseData.status,
            output: responseData.output || []
          };
          
          setSearchFoundPatients([patientData]);
          setEditableHistories({0: responseData.istoric_medical || responseData.istoric || ''});
          
          // Save the patient's CNP for document generation
          if (patientData.cnp) {
            setCurrentPatientCnp(patientData.cnp);
          }
          
          setUploadedFiles([]);
          setUploadedFileTypes([]);
          setIsSearching(false);
          return;
        }
        
        console.log('No valid patient data found in response');
        setSearchFoundPatients([]);
        setEditableHistories({});
        setIsSearching(false);
        alert('Nu s-au găsit date valide de pacient în răspuns.');
        
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setIsSearching(false);
        alert('Eroare la procesarea răspunsului de la server.');
        setSearchFoundPatients([]);
        setEditableHistories({});
      }
    } else {
      console.error('Patient search failed:', response.status);
      setIsSearching(false);
      alert(`Eroare la căutarea pacientului (${response.status})`);
      setSearchFoundPatients([]);
      setEditableHistories({});
    }
  } catch (error) {
    console.error('Network error:', error);
    setIsSearching(false);
    if (error instanceof Error && error.name === 'AbortError') {
      alert('Căutarea a fost întreruptă din cauza timeout-ului.');
    } else {
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    }
    setSearchFoundPatients([]);
    setEditableHistories({});
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
      const response = await fetch('https://n8n.voisero.info/webhook-test/uromed-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicalInfo: inputText,
          documentType: documentType,
          cnp: currentPatientCnp,
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
        setEditableDocument(responseText || 'Document generat cu succes!');
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

  const handleUpdateHistory = async (patientIndex: number) => {
    if (!searchFoundPatients[patientIndex]) {
      alert('Nu există pacient selectat pentru actualizare.');
      return;
    }

    setIsUpdatingHistory(true);

    try {
      const patient = searchFoundPatients[patientIndex];
      const updatedHistory = editableHistories[patientIndex] || '';
      
      const response = await fetch('https://n8n.voisero.info/webhook-test/update-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cnp: patient.cnp,
          istoric_medical: updatedHistory,
          operation: 'update-history'
        }),
      });

      if (response.ok) {
        alert('Istoricul medical a fost actualizat cu succes!');
        // Update the patient with the new history
        setSearchFoundPatients(prevPatients => 
          prevPatients.map((patient, index) => 
            index === patientIndex 
              ? { ...patient, istoric: updatedHistory }
              : patient
          )
        );
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

  const handleUpdateDocument = async () => {
    if (!editableDocument.trim() || searchFoundPatients.length === 0) {
      alert('Nu există document sau pacient pentru actualizare.');
      return;
    }

    setIsUpdatingDocument(true);

    try {
      const patient = searchFoundPatients[0]; // Use first patient for now
      
      const response = await fetch('https://n8n.voisero.info/webhook-test/update-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...patient,
          cnp: patient.cnp,
          document: editableDocument,
          operation: 'update-document'
        }),
      });

      if (response.ok) {
        alert('Documentul a fost actualizat cu succes!');
      } else {
        const errorText = await response.text();
        console.error('Update document failed:', response.status, errorText);
        alert(`Eroare la actualizarea documentului (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating document:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsUpdatingDocument(false);
    }
  };

  const handleHistoryChange = (patientIndex: number, newHistory: string) => {
    setEditableHistories(prev => ({
      ...prev,
      [patientIndex]: newHistory
    }));
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
          {searchFoundPatients.length > 0 && (
            <div className="space-y-6">
              {searchFoundPatients.map((patient, index) => (
                <Card key={index} className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 border-l-4 border-green-400">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-slate-200 dark:border-slate-700">
                    <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span>
                          {patient.status === 'IMG FOUND' ? 'Pacient Găsit' : 'Pacient Creat'}
                          {searchFoundPatients.length > 1 && ` (${index + 1}/${searchFoundPatients.length})`}
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nume</Label>
                        <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                          <span className="text-slate-900 dark:text-white">{patient.nume || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Prenume</Label>
                        <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                          <span className="text-slate-900 dark:text-white">{patient.prenume || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">CNP</Label>
                        <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                          <span className="text-slate-900 dark:text-white">{patient.cnp || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Telefon</Label>
                        <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                          <span className="text-slate-900 dark:text-white">{patient.telefon || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data Nașterii</Label>
                        <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                          <span className="text-slate-900 dark:text-white">{patient.data_nasterii || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Previous Consultations Section */}
                    {patient.output && Array.isArray(patient.output) && patient.output.length > 0 && (
                      <div className="mt-6">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Consultații Anterioare</Label>
                        <div className="mt-2 space-y-2">
                          {patient.output.map((consultation, consultIndex) => (
                            <div key={consultIndex} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                setSelectedConsultation(consultation);
                                setConsultationDialogOpen(true);
                              }}>
                              <div className="flex items-center space-x-3">
                                <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                <div>
                                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                                    {consultation.titlu || 'Document Medical'}
                                  </span>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(consultation.data_consult).toLocaleDateString('ro-RO', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-6">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Istoric Medical</Label>
                      <Textarea
                        value={editableHistories[index] || ''}
                        onChange={(e) => handleHistoryChange(index, e.target.value)}
                        className="mt-2 min-h-[150px] bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                        placeholder="Istoricul medical al pacientului..."
                      />
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={() => handleUpdateHistory(index)}
                        disabled={isUpdatingHistory}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium"
                      >
                        {isUpdatingHistory ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Actualizează...</span>
                          </div>
                        ) : (
                          <span>Actualizează Istoric</span>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Document Generation Section */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center space-x-2 text-slate-800 dark:text-white">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Generator Documente Medicale</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                  <div>
                    <Label htmlFor="medical-info" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Informații Medicale
                    </Label>
                    <Textarea
                      id="medical-info"
                      placeholder="Introduceți informațiile medicale ale pacientului..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="mt-2 min-h-[200px] bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="document-type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tip Document
                    </Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                        <SelectValue placeholder="Selectați tipul documentului" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                        <SelectItem value="spitalizare-zi" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Spitalizare de Zi</SelectItem>
                        <SelectItem value="examen-clinic" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Examen Clinic</SelectItem>
                        <SelectItem value="recomandari-medicale" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Recomandări Medicale</SelectItem>
                        <SelectItem value="consultatie-urologica" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Consultația Urologică</SelectItem>
                        <SelectItem value="scrisoare-medicala" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Scrisoare Medicală</SelectItem>
                        <SelectItem value="interpretare-analiza" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Interpretare Analiză</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleGenerateDocument}
                    disabled={isGenerating || !inputText.trim() || !documentType}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3"
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generez document...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Generează Document</span>
                      </div>
                    )}
                  </Button>
              </div>
            </CardContent>
          </Card>

          {/* Document Output Section - Below the generator */}
          {outputText && (
            <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center space-x-2 text-slate-800 dark:text-white">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span>Document Generat</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Textarea
                  value={editableDocument}
                  onChange={(e) => setEditableDocument(e.target.value)}
                  className="min-h-[400px] bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-sm"
                  placeholder="Documentul generat va apărea aici..."
                />
                <Button
                  onClick={handleUpdateDocument}
                  disabled={isUpdatingDocument || !editableDocument.trim() || searchFoundPatients.length === 0}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3"
                >
                  {isUpdatingDocument ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Actualizează...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>Actualizează Document</span>
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Consultation Document Dialog */}
      <Dialog open={consultationDialogOpen} onOpenChange={setConsultationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>{selectedConsultation?.titlu || 'Document Medical'}</span>
            </DialogTitle>
            <DialogDescription>
              Data consultației: {selectedConsultation?.data_consult ? new Date(selectedConsultation.data_consult).toLocaleDateString('ro-RO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-600 max-h-[60vh] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-slate-900 dark:text-white font-mono">
                {selectedConsultation?.continut_text || 'Nu există conținut disponibil pentru acest document.'}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}