'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Image, Settings, Mic, X, Copy, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MedicalDocumentGenerator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [medicalInfo, setMedicalInfo] = useState('');
  const [medicalFiles, setMedicalFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('');
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingDocument, setIsUpdatingDocument] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [activeTranscribe, setActiveTranscribe] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const dragStates = {
    medical: false
  };

  const [dragStates, setDragStates] = useState({
    medical: false
  });

  const handleDragOver = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [type]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [type]: false }));
  };

  const handleDrop = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [type]: false }));
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files, type);
  };

  const handleFileUpload = (files: FileList | File[] | null, type: string) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    if (type === 'medical') {
      setMedicalFiles(prev => [...prev, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    setMedicalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyDocument = async () => {
    if (generatedDocument) {
      await navigator.clipboard.writeText(generatedDocument);
      setIsCopied(true);
    }
  };

  // Reset copy state after 2 seconds
  useState(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  });

  // Reset copy state after 2 seconds
  setTimeout(() => {
    setIsCopied(false);
  }, 2000);

  const stopTranscription = useCallback(() => {
    console.log('🛑 Stopping transcription...');
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Close WebSocket connection
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.close();
    }
    
    // Clear refs
    mediaRecorderRef.current = null;
    websocketRef.current = null;
    audioChunksRef.current = [];
    
    setActiveTranscribe(null);
  }, []);

  const startTranscription = useCallback(async (type: string) => {
    console.log('🟢 Starting transcription for:', type);
    
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      console.log('🎤 Microphone access granted');

      // Create WebSocket connection to Gladia
      const ws = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 WebSocket connected to Gladia');
        // Send configuration
        ws.send(JSON.stringify({
          x_gladia_key: 'gsk_2f4b8b4b8b4b8b4b8b4b8b4b8b4b8b4b8b4b8b4b', // Replace with your actual API key
          language: 'romanian',
          model_type: 'fast',
          transcription_hint: 'medical',
          enable_code_switching: false
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📝 Transcription received:', data);
          
          if (data.type === 'transcript' && data.transcript) {
            const transcript = data.transcript;
            console.log('✅ Adding transcript:', transcript);
            
            // Update the appropriate field based on type
            if (type === 'medical') {
              setMedicalInfo(prev => prev + ' ' + transcript);
            }
          }
        } catch (error) {
          console.error('❌ Error parsing transcription data:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket connection closed');
      };

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          console.log('🎵 Sending audio chunk, size:', event.data.size);
          // Convert blob to base64 and send
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            ws.send(JSON.stringify({
              type: 'audio_chunk',
              data: base64
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder stopped');
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with small chunks for real-time processing
      mediaRecorder.start(250); // Send data every 250ms
      console.log('🎙️ Recording started');
      
      setActiveTranscribe(type);
      
    } catch (error) {
      console.error('❌ Error starting transcription:', error);
      setActiveTranscribe(null);
    }
  }, []);

  const toggleTranscribe = useCallback(async (type: string) => {
    console.log('🎯 toggleTranscribe called with type:', type);
    console.log('🎯 Current activeTranscribe:', activeTranscribe);
    
    if (activeTranscribe === type) {
      console.log('🛑 Turning OFF transcription for:', type);
      stopTranscription();
    } else {
      console.log('🟢 Turning ON transcription for:', type);
      // Stop any existing transcription first
      if (activeTranscribe) {
        stopTranscription();
      }
      await startTranscription(type);
    }
  }, [activeTranscribe, startTranscription, stopTranscription]);

  // Update activeTranscribe effect
  useEffect(() => {
    console.log('🔄 activeTranscribe changed to:', activeTranscribe);
  }, [activeTranscribe]);

  // Cleanup on unmount
  useRef(() => {
    return () => {
      stopTranscription();
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const handleSubmit = async () => {
    if (!documentType || (!medicalInfo && medicalFiles.length === 0)) {
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('medicalInfo', medicalInfo);
      formData.append('documentType', documentType);
      
      medicalFiles.forEach((file, index) => {
        formData.append(`medicalFile${index}`, file);
      });

      const response = await fetch('/api/generate-medical-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const data = await response.json();
      setGeneratedDocument(data.document);
      
    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDocument = async () => {
    if (!generatedDocument) return;
    
    setIsUpdatingDocument(true);
    setUpdateMessage('');
    
    try {
      const response = await fetch('/api/update-medical-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: generatedDocument,
          documentType: documentType
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update document');
      }

      const data = await response.json();
      setGeneratedDocument(data.document);
      setUpdateMessage('Document actualizat cu succes!');
      
    } catch (error) {
      console.error('Error updating document:', error);
      setUpdateMessage('Eroare la actualizarea documentului. Vă rugăm să încercați din nou.');
    } finally {
      setIsUpdatingDocument(false);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setUpdateMessage('');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Generator Document Medical
          </h1>
          <p className="text-slate-600 text-lg">
            Creați documente medicale profesionale cu ajutorul inteligenței artificiale
          </p>
        </div>

        {/* Medical Information Section */}
        <Card className="shadow-lg border-slate-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-slate-200">
            <CardTitle className="flex items-center justify-between text-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-red-600" />
                <span>Informații Medicale</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleTranscribe('medical')}
                className={cn(
                  "flex items-center space-x-1",
                  activeTranscribe === 'medical' ? "bg-red-50 border-red-200 text-red-600" : "hover:bg-blue-50"
                )}
              >
                {activeTranscribe === 'medical' ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                <span className="text-xs">
                  {activeTranscribe === 'medical' ? 'Stop' : 'Transcrie'}
                </span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="medical-info" className="text-sm font-medium text-slate-700">
                  Introduceți sau dictați informațiile medicale aici... Puteți scrie toate... structura textului conform standardelor medicale.
                </Label>
                <Textarea
                  id="medical-info"
                  placeholder="Introduceți informațiile medicale..."
                  value={medicalInfo}
                  onChange={(e) => setMedicalInfo(e.target.value)}
                  className="mt-2 min-h-[120px] resize-none"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Atașați fișiere medicale (imagini, documente)
                </Label>
                <div 
                  className={`mt-2 border-2 border-dashed rounded-lg p-4 transition-colors ${
                    dragStates.medical ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
                  }`}
                  onDragOver={(e) => handleDragOver(e, 'medical')}
                  onDragLeave={(e) => handleDragLeave(e, 'medical')}
                  onDrop={(e) => handleDrop(e, 'medical')}
                >
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(e.target.files, 'medical')}
                    className="hidden"
                    id="medical-files"
                  />
                  <Label htmlFor="medical-files" className={`cursor-pointer flex items-center justify-center space-x-2 h-20 ${
                    dragStates.medical ? 'text-blue-700' : 'text-slate-600 hover:text-blue-600'
                  }`}>
                    <Upload className="w-5 h-5" />
                    <span>{dragStates.medical ? 'Eliberează pentru a încărca' : 'Încărcați fișiere medicale sau trage aici'}</span>
                  </Label>
                </div>
                {medicalFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {medicalFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <Image className="w-4 h-4 text-slate-600" />
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

        {/* Document Type Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b border-slate-200">
            <CardTitle className="flex items-center space-x-2 text-slate-800">
              <Settings className="w-5 h-5 text-green-600" />
              <span>Tipul Documentului</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="w-full">
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
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Card className="shadow-lg border-slate-200">
          <CardContent className="p-6">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !documentType || (!medicalInfo && medicalFiles.length === 0)}
              className={cn(
                "w-full h-12 text-white font-medium text-lg",
                "bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600",
                "shadow-lg hover:shadow-xl transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generează Document Medical...</span>
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

        {/* Document General Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-slate-800">
                <FileText className="w-5 h-5 text-slate-600" />
                <span>Document General</span>
              </CardTitle>
              {generatedDocument && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyDocument}
                    className="flex items-center space-x-2"
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Copiat!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiază</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateDocument}
                    disabled={isUpdatingDocument}
                    className="flex items-center space-x-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    {isUpdatingDocument ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Se actualizează...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>Actualizează Document</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            {updateMessage && (
              <div className={`mt-2 text-sm px-3 py-2 rounded-md ${
                updateMessage.includes('succes') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {updateMessage}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {generatedDocument ? (
              <div className="space-y-4">
                <Textarea
                  value={generatedDocument}
                  onChange={(e) => setGeneratedDocument(e.target.value)}
                  className="min-h-[400px] max-h-[600px] resize-y text-sm font-mono leading-relaxed"
                  placeholder="Documentul generat va apărea aici și poate fi editat..."
                />
              </div>
            ) : (
              <p className="text-slate-600 text-sm">
                Documentul generat va fi disponibil după procesare. Vă rugăm să completați toate câmpurile necesare și să selectați tipul documentului dorit.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}