'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Image, Activity, Settings, Copy, CheckCircle, Mic, X } from 'lucide-react';
import { Menu, User, Bot, Gamepad2, Building2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const router = useRouter();
  const [medicalInfo, setMedicalInfo] = useState('');
  const [previousMedicalInfo, setPreviousMedicalInfo] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [medicalFiles, setMedicalFiles] = useState<File[]>([]);
  const [previousMedicalFiles, setPreviousMedicalFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [activeTranscribe, setActiveTranscribe] = useState<'medical' | 'previous' | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [transcriptionSocket, setTranscriptionSocket] = useState<WebSocket | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Audio context for processing audio data
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  // Add a ref to track the current activeTranscribe value in the WebSocket handler
  const activeTranscribeRef = useRef<'medical' | 'previous' | null>(null);

  // Update the ref whenever activeTranscribe changes
  useEffect(() => {
    activeTranscribeRef.current = activeTranscribe;
    console.log('🔄 activeTranscribe changed to:', activeTranscribe);
  }, [activeTranscribe]);

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

  const startGladiaTranscription = async () => {
    try {
      // Step 1: Request transcription session from Gladia
      const response = await fetch('https://api.gladia.io/v2/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gladia-Key': '360ec75a-da90-4524-ba21-0ad7445902b5',
        },
        body: JSON.stringify({
          encoding: 'wav/pcm',
          sample_rate: 16000,
          bit_depth: 16,
          channels: 1,
          endpointing: 10,
          maximum_duration_without_endpointing: 10,
          language_config: {
            languages: ["ro"]
          }
        }),
      });

      if (!response.ok) {
        console.error(`${response.status}: ${(await response.text()) || response.statusText}`);
        return null;
      }

      const { id, url } = await response.json();

      // Step 2: Connect to WebSocket
      const socket = new WebSocket(url);
      
      socket.addEventListener("open", function() {
        setIsTranscribing(true);
      });

      socket.addEventListener("error", function(error) {
        console.error("WebSocket error:", error);
        setIsTranscribing(false);
      });

      socket.addEventListener("close", function({code, reason}) {
        setIsTranscribing(false);
        setTranscriptionSocket(null);
      });

      socket.addEventListener("message", function(event) {
        try {
          const message = JSON.parse(event.data.toString());
          
          // Handle transcription results according to Gladia protocol
          if (message.type === 'transcript') {
            if (message.data) {
              const transcriptText = message.data.utterance?.text || message.data.text || '';
              const isFinal = message.data.is_final || false;
              
              console.log(`📝 ${isFinal ? 'FINAL' : 'partial'}: "${transcriptText}"`);
              
              if (isFinal && transcriptText.trim()) {
                const currentTarget = activeTranscribeRef.current;
                console.log('🎯 Current transcribe target from ref:', currentTarget);
                
                if (currentTarget === 'medical') {
                  console.log('🔄 About to update medical info state');
                  console.log('Current activeTranscribe:', currentTarget);
                  console.log('Current medicalInfo:', medicalInfo);
                  console.log('Transcript to add:', transcriptText.trim());
                  setMedicalInfo(prev => {
                    const newText = prev + (prev ? ' ' : '') + transcriptText.trim();
                    console.log('✅ Updated medical info to:', newText);
                    return newText;
                  });
                } else if (currentTarget === 'previous') {
                  console.log('🔄 About to update previous medical info state');
                  console.log('Current activeTranscribe:', currentTarget);
                  console.log('Current previousMedicalInfo:', previousMedicalInfo);
                  console.log('Transcript to add:', transcriptText.trim());
                  setPreviousMedicalInfo(prev => {
                    const newText = prev + (prev ? ' ' : '') + transcriptText.trim();
                    console.log('✅ Updated previous medical info to:', newText);
                    return newText;
                  });
                } else {
                  console.log('❌ No active transcribe target, activeTranscribe is:', currentTarget);
                }
              } else {
                console.log('❌ Transcript conditions not met:', {
                  isFinal,
                  transcriptTextLength: transcriptText.trim().length,
                  activeTranscribe: activeTranscribeRef.current
                });
              }
            } else {
              console.log('Received transcript but conditions not met:', {
                hasData: !!message.data,
                transcriptText,
                isFinal,
                activeTranscribe: activeTranscribeRef.current,
                trimmedLength: transcriptText.trim().length
              });
            }
          }
        } catch (error) {
          console.error("Error parsing Gladia message:", error);
        }
      });

      setTranscriptionSocket(socket);
      return socket;

    } catch (error) {
      console.error('Error starting Gladia transcription:', error);
      return null;
    }
  };

  const stopGladiaTranscription = () => {
    if (transcriptionSocket) {
      transcriptionSocket.close(1000, 'User stopped transcription');
      setTranscriptionSocket(null);
    }
    setIsTranscribing(false);
  };

  const sendAudioToGladia = (buffer: ArrayBuffer) => {
    console.log("sendAudioToGladia called with buffer size:", buffer.byteLength);
    if (transcriptionSocket && transcriptionSocket.readyState === WebSocket.OPEN) {
      console.log("Sending binary audio data to Gladia WebSocket");
      // Send as binary (preferred method)
      transcriptionSocket.send(buffer);
      
      // Alternative: send as JSON (uncomment if binary doesn't work)
      // const uint8Array = new Uint8Array(buffer);
      // const base64String = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      // console.log("Sending JSON audio data to Gladia WebSocket");
      // transcriptionSocket.send(JSON.stringify({
      //   type: 'audio_chunk',
      //   data: {
      //     chunk: base64String,
      //   },
      // }));
    } else {
      console.log("Cannot send audio - WebSocket not available or not open");
      if (transcriptionSocket) {
        console.log("WebSocket state:", transcriptionSocket.readyState);
      } else {
        console.log("WebSocket is null");
      }
    }
  };

  const handlePatientsClick = () => {
    router.push('/patients');
  };

  const handleFileUpload = (files: FileList | null, type: 'medical' | 'previous') => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    if (type === 'medical') {
      setMedicalFiles((prev: File[]) => [...prev, ...fileArray]);
    } else {
      setPreviousMedicalFiles((prev: File[]) => [...prev, ...fileArray]);
    }
  };

  const removeFile = (index: number, type: 'medical' | 'previous') => {
    if (type === 'medical') {
      setMedicalFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
    } else {
      setPreviousMedicalFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
    }
  };

  const toggleTranscribe = async (type: 'medical' | 'previous') => {
    console.log('🎯 toggleTranscribe called with type:', type);
    console.log('🎯 Current activeTranscribe:', activeTranscribe);
    
    if (activeTranscribe === type) {
      // Turn off current transcribe
      console.log('🛑 Turning OFF transcription for:', type);
      setActiveTranscribe(null);
      
      // Stop recording and transcription
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      stopGladiaTranscription();
      
    } else if (activeTranscribe === null) {
      // Turn on transcribe if none is active
      console.log('🟢 Turning ON transcription for:', type);
      setActiveTranscribe(type);
      console.log('🟢 Set activeTranscribe to:', type);
      
      // Start Gladia transcription
      const socket = await startGladiaTranscription();
      if (!socket) {
        console.log('❌ Failed to start Gladia transcription');
        setActiveTranscribe(null);
        return;
      }
      console.log('✅ Gladia transcription started successfully');

      // Request microphone permission and start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          } 
        });
        setHasMicPermission(true);
        console.log('🎤 Microphone permission granted');
        
        // Create audio context for processing
        const context = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000
        });
        setAudioContext(context);
        
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(4096, 1, 1);
        
        source.connect(processor);
        processor.connect(context.destination);
        
        // Store processor for cleanup
        // Store both processor and socket reference for cleanup
        setMediaRecorder(processor as any);
        
        // Create a closure that captures the socket
        processor.onaudioprocess = (event) => {
          if (socket.readyState === WebSocket.OPEN) {
            const inputBuffer = event.inputBuffer;
            const inputData = inputBuffer.getChannelData(0);
            
            // Convert float32 to int16 PCM
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }
            
            socket.send(pcmData.buffer);
          }
        };
        
      } catch (error) {
        console.error('Microphone permission denied:', error);
        console.log('❌ Microphone error, resetting activeTranscribe');
        setActiveTranscribe(null);
        stopGladiaTranscription();
        return;
      }
      
    } else {
      // Switch from one transcription to another
      console.log('🔄 Switching transcription from', activeTranscribe, 'to', type);
      // Stop current recording and transcription
      if (mediaRecorder) {
        // Disconnect audio processing
        try {
          (mediaRecorder as any).disconnect();
        } catch (e) {
          console.log('Error disconnecting processor:', e);
        }
      }
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      stopGladiaTranscription();
      
      // Set new active transcription
      setActiveTranscribe(type);
      
      // Start new transcription
      setTimeout(() => {
        toggleTranscribe(type);
      }, 100);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      
      // Add data directly as JSON properties
      formData.append('medicalInfo', medicalInfo);
      formData.append('previousMedicalInfo', previousMedicalInfo);
      formData.append('documentType', documentType);
      
      // Add medical files
      medicalFiles.forEach((file, index) => {
        formData.append(`medicalFile_${index}`, file);
      });
      
      // Add previous medical files
      previousMedicalFiles.forEach((file, index) => {
        formData.append(`previousMedicalFile_${index}`, file);
      });
      
      const response = await fetch('https://n8n.voisero.info/webhook/uromed-app', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const responseData = await response.json();
            let content = responseData.output || 'Document generat cu succes!';
            
            // Extract content from iframe if present
            if (content.includes('<iframe srcdoc="')) {
              const match = content.match(/srcdoc="([^"]*(?:\\.[^"]*)*)"[^>]*>/);
              if (match) {
                content = match[1];
                // Decode HTML entities
                content = content.replace(/&quot;/g, '"')
                                .replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>');
              }
            }
            
            // Convert \n to actual newlines
            content = content.replace(/\\n/g, '\n');
            
            setGeneratedDocument(content);
          } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            setGeneratedDocument(`Eroare la parsarea răspunsului JSON: ${jsonError instanceof Error ? jsonError.message : 'Format JSON invalid'}`);
          }
        } else {
          // If not JSON, display the response as plain text
          try {
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
            
            setGeneratedDocument(responseText || 'Document generat cu succes!');
          } catch (textError) {
            console.error('Text parsing error:', textError);
            setGeneratedDocument(`Eroare la citirea răspunsului: ${textError instanceof Error ? textError.message : 'Eroare de citire'}`);
          }
        }
      } else {
        try {
          const errorText = await response.text();
          setGeneratedDocument(`Eroare la generarea documentului (${response.status}): ${errorText}`);
        } catch (errorReadError) {
          setGeneratedDocument(`Eroare la generarea documentului (${response.status}): Nu s-a putut citi răspunsul de eroare`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setGeneratedDocument(`Eroare la generarea documentului: ${error instanceof Error ? error.message : 'Eroare de rețea. Verificați conexiunea și încercați din nou.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDocument = async () => {
    try {
      await navigator.clipboard.writeText(generatedDocument);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      setGeneratedDocument(`Eroare la generarea documentului: ${error instanceof Error ? error.message : 'Eroare de rețea. Verificați conexiunea și încercați din nou.'}`);
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sidebar */}
      {isSidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-6">Menu</h2>
              
              <button 
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => router.push('/pacienti')}
              >
                <User className="w-5 h-5" />
                <span>Pacienti</span>
              </button>
              
              <button 
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => router.push('/programari')}
              >
                <Calendar className="w-5 h-5" />
                <span>Programări</span>
              </button>
              
              <button 
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => router.push('/saloane')}
              >
                <Building2 className="w-5 h-5" />
                <span>Saloane</span>
              </button>
              
              <button 
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => router.push('/setari')}
              >
                <Settings className="w-5 h-5" />
                <span>Setari</span>
              </button>
              
              <button 
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => router.push('/documente-ai')}
              >
                <Bot className="w-5 h-5" />
                <span>Documente AI</span>
              </button>
              
              <button 
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => router.push('/automatizari')}
              >
                <Gamepad2 className="w-5 h-5" />
                <span>Automatizari</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </Button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">MyWAbP</h1>
                <p className="text-sm text-slate-600">My personal writing assistant</p>
              </div>
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
                <div className="mt-2 border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(e.target.files, 'medical')}
                    className="hidden"
                    id="medical-files"
                  />
                  <Label htmlFor="medical-files" className="cursor-pointer flex items-center justify-center space-x-2 text-slate-600 hover:text-blue-600">
                    <Upload className="w-5 h-5" />
                    <span>Încărcați fișiere medicale</span>
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
                          onClick={() => removeFile(index, 'medical')}
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

        {/* Previous Medical Information Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
            <CardTitle className="flex items-center justify-between text-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>Informații Medicale Anterioare</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleTranscribe('previous')}
                className={cn(
                  "flex items-center space-x-1",
                  activeTranscribe === 'previous' ? "bg-red-50 border-red-200 text-red-600" : "hover:bg-purple-50"
                )}
              >
                {activeTranscribe === 'previous' ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                <span className="text-xs">
                  {activeTranscribe === 'previous' ? 'Stop' : 'Transcrie'}
                </span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="previous-medical-info" className="text-sm font-medium text-slate-700">
                  Introduceți informațiile medicale anterioare relevante (istoric medical, analize anterioare, tratamente precedente, etc.) sau încărcați documente...
                </Label>
                <Textarea
                  id="previous-medical-info"
                  placeholder="Introduceți informațiile medicale anterioare..."
                  value={previousMedicalInfo}
                  onChange={(e) => setPreviousMedicalInfo(e.target.value)}
                  className="mt-2 min-h-[120px] resize-none"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Acceptă următoarele tip de fișiere în contextul medical pentru a evaluarea mai rapidă:
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Formate suportate: PDF, DOC, DOCX, TXT, JPG, PNG (OCR pentru imagini în documente)
                </p>
                <div className="mt-2 border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-purple-400 transition-colors">
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => handleFileUpload(e.target.files, 'previous')}
                    className="hidden"
                    id="previous-medical-files"
                  />
                  <Label htmlFor="previous-medical-files" className="cursor-pointer flex items-center justify-center space-x-2 text-slate-600 hover:text-purple-600">
                    <Upload className="w-5 h-5" />
                    <span>Încărcați documente anterioare</span>
                  </Label>
                </div>
                {previousMedicalFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {previousMedicalFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <Image className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-700">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index, 'previous')}
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
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {generatedDocument ? (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono leading-relaxed">
                    {generatedDocument}
                  </pre>
                </div>
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