'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Upload, 
  Image, 
  Settings, 
  Mic, 
  X, 
  Copy, 
  CheckCircle,
  LogOut,
  User,
  Calendar,
  Building2,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [medicalInfo, setMedicalInfo] = useState('');
  const [medicalFiles, setMedicalFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('');
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTranscribe, setActiveTranscribe] = useState<string | null>(null);
  const [dragStates, setDragStates] = useState({
    medical: false
  });
  const [isCopied, setIsCopied] = useState(false);
  const [isUpdatingDocument, setIsUpdatingDocument] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  // Refs for transcription
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
const audioChunksRef = useRef<any>(null);
  const handleSignOut = async () => {
    await signOut();
  };

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

  const handleFileUpload = (files: File[] | FileList | null, type: string) => {
    if (!files) return;
    const fileArray = Array.from(files);
    if (type === 'medical') {
      setMedicalFiles(prev => [...prev, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    setMedicalFiles(prev => prev.filter((_, i) => i !== index));
  };
const toggleTranscribe = async (type: string) => {
  console.log('🎯 toggleTranscribe called with type:', type);
  console.log('🎯 Current activeTranscribe:', activeTranscribe);

  if (activeTranscribe === type) {
    console.log('🛑 Turning OFF transcription for:', type);
    
    // Clean up audio processing
    if (audioChunksRef.current) {
      const { audioContext, processor, source, stream } = audioChunksRef.current;
      
      processor.disconnect();
      source.disconnect();
      audioContext.close();
      
      // Stop all tracks to release the microphone
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      
      audioChunksRef.current = null;
    }
    
    // Stop recording and close WebSocket
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: "stop_recording"
      }));
      
      setTimeout(() => {
        websocketRef.current?.close(1000);
      }, 1000);
    }
    
    setActiveTranscribe(null);
  } else {
    console.log('🟢 Turning ON transcription for:', type);
    setActiveTranscribe(type);
    await startGladiaTranscription();
  }
};
const startGladiaTranscription = async () => {
  try {
    console.log('📡 Initiating Gladia session...');
    
    // Step 1: Initiate the session
    const response = await fetch('https://api.gladia.io/v2/live', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gladia-Key': '66e1c189-a317-4ede-be75-d48e743a2af4	',
      },
      body: JSON.stringify({
        encoding: 'wav/pcm',
        sample_rate: 16000,
        bit_depth: 16,
        channels: 1,
      }),
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to initiate session: ${response.status}: ${errorText}`);
      setActiveTranscribe(null);
      return;
    }

    const sessionData = await response.json();
    console.log('✅ Session initiated:', sessionData);
    
    if (!sessionData.url) {
      console.error('❌ No WebSocket URL in response');
      setActiveTranscribe(null);
      return;
    }

    // Step 2: Connect to the WebSocket
    const ws = new WebSocket(sessionData.url);
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Gladia WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('📝 Received message:', message);
      
      // Check for transcript messages
      if (message.type === 'transcript' && message.data?.utterance?.text) {
        console.log('🎯 TRANSCRIPT:', message.data.utterance.text);
        // Append to medical info
        setMedicalInfo(prev => prev + ' ' + message.data.utterance.text);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Gladia WebSocket error:', error);
    };

    ws.onclose = ({ code, reason }) => {
      console.log(`🔌 Gladia WebSocket closed - Code: ${code}, Reason: ${reason}`);
    };

    // Step 3: Set up audio capture with AudioContext for PCM conversion
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }
    });

    console.log('🎤 Microphone permission granted');

    // Use AudioContext to get PCM data
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert float32 to int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64
        const uint8Array = new Uint8Array(pcmData.buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);
        
        // Send as JSON with base64
        websocketRef.current.send(JSON.stringify({
          type: 'audio_chunk',
          data: {
            chunk: base64Audio
          }
        }));
      }
    };

    // Store references for cleanup
    audioChunksRef.current = { audioContext, processor, source, stream };
    
    console.log('✅ Gladia transcription started successfully');

  } catch (error) {
    console.error('❌ Error starting Gladia transcription:', error);
    setActiveTranscribe(null);
  }
};
  useEffect(() => {
    console.log('🔄 activeTranscribe changed to:', activeTranscribe);
  }, [activeTranscribe]);

  const handleSubmit = async () => {
    if (!documentType || (!medicalInfo && medicalFiles.length === 0)) {
      alert('Vă rugăm să completați informațiile medicale și să selectați tipul documentului.');
      return;
    }

    setIsLoading(true);
    setGeneratedDocument('');

    try {
      const formData = new FormData();
      formData.append('medicalInfo', medicalInfo);
      formData.append('documentType', documentType);
      
      medicalFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const response = await fetch('https://n8n.voisero.info/webhook/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicalInfo,
          documentType,
          operation: "generate-document"
        }),
      });

      if (response.ok) {
        let responseText = await response.text();
        
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
        
        setGeneratedDocument(responseText || 'Document generat cu succes!');
      } else {
        const errorText = await response.text();
        console.error('Webhook request failed:', response.status, errorText);
        alert(`Eroare la generarea documentului (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea - verificați conexiunea'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDocument = async () => {
    if (generatedDocument) {
      try {
        await navigator.clipboard.writeText(generatedDocument);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const handleUpdateDocument = async () => {
    if (!generatedDocument) {
      setUpdateMessage('Nu există document de actualizat.');
      setTimeout(() => setUpdateMessage(''), 3000);
      return;
    }

    setIsUpdatingDocument(true);
    setUpdateMessage('');

    try {
      const response = await fetch('https://n8n.voisero.info/webhook/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: generatedDocument,
          operation: "update-document"
        }),
      });

      if (response.ok) {
        let responseText = await response.text();
        
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
        
        setGeneratedDocument(responseText || generatedDocument);
        setUpdateMessage('Document actualizat cu succes!');
      } else {
        const errorText = await response.text();
        console.error('Update request failed:', response.status, errorText);
        setUpdateMessage(`Eroare la actualizarea documentului (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating document:', error);
      setUpdateMessage(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsUpdatingDocument(false);
      setTimeout(() => setUpdateMessage(''), 5000);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">UroMed AI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/pacienti')}
                className="flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
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
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Ieșire</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Medical Information Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 border-b border-slate-200">
            <CardTitle className="flex items-center justify-between text-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
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