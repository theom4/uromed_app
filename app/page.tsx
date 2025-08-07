'use client';

import React from 'react';
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
import { Menu, User, Bot, Gamepad2, Building2, Calendar, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const router = useRouter();
  const [medicalInfo, setMedicalInfo] = useState('');
  const [documentType, setDocumentType] = useState('spitalizare-zi');
  const [medicalFiles, setMedicalFiles] = useState<File[]>([]);
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
  interface Presentation {
  data_consult: string;
  titlu: string;
  continut_text: string;
}
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
 const [searchResult, setSearchResult] = useState<string | React.ReactNode>('');
  const [showSearchResult, setShowSearchResult] = useState(false);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [isUpdatingDocument, setIsUpdatingDocument] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [dragStates, setDragStates] = useState({
    main: false,
    medical: false
  });
  
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
          endpointing: 4,
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
            // Initialize variables with default values
            let transcriptText = '';
            let isFinal = false;
            
            if (message.data) {
              transcriptText = message.data.utterance?.text || message.data.text || '';
              isFinal = message.data.is_final || false;
              
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
    setMedicalFiles((prev: File[]) => [...prev, ...fileArray]);
  };

  const removeFile = (index: number) => {
    setMedicalFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
  };

  const toggleTranscribe = async (type: 'medical') => {
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
      
      // Prepare medical info with patient data if available
      let enhancedMedicalInfo = medicalInfo;
      let patientCNP = '0';
      
      if (searchResult) {
        enhancedMedicalInfo = medicalInfo + (medicalInfo ? '\n\n' : '') + 'Date pacient:\n' + searchResult;
        
        // Extract CNP from search result if available (handles both JSON and formatted text)
      if (typeof searchResult === 'string') {
  const cnpMatch = searchResult.match(/(?:cnp|CNP):\s*([^\n\s]+)/);
  if (cnpMatch) {
    patientCNP = cnpMatch[1].trim();
  }
}
      }
      
      // Add data directly as JSON properties
      formData.append('medicalInfo', enhancedMedicalInfo);
      formData.append('documentType', documentType);
      formData.append('cnp', patientCNP);
      
      // Add medical files
      medicalFiles.forEach((file, index) => {
        formData.append(`medicalFile_${index}`, file);
      });
      const response = await fetch('https://n8n.voisero.info/webhook/uromed-app', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
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
            
            // Clear medical information input after successful document generation
            setMedicalInfo('');
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
            
            // Clear medical information input after successful document generation
            setMedicalInfo('');
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

  const handleUpdateDocument = async () => {
    if (!generatedDocument.trim()) {
      setUpdateMessage('Nu există document de actualizat');
      setTimeout(() => setUpdateMessage(''), 3000);
      return;
    }

    setIsUpdatingDocument(true);
    setUpdateMessage('');

    // Extract CNP from search result if available
    let patientCNP = '';
    if (searchResult) {
      if (typeof searchResult === 'string') {
        const cnpMatch = searchResult.match(/(?:cnp|CNP):\s*([^\n\s]+)/);
        if (cnpMatch) {
          patientCNP = cnpMatch[1].trim();
        }
      }
    }
    try {
      const response = await fetch('https://n8n.voisero.info/webhook/update-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: generatedDocument,
          cnp: patientCNP
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.status === 'success') {
          setUpdateMessage('Document actualizat cu succes');
        } else {
          setUpdateMessage('Eroare la actualizarea documentului');
        }
      } else {
        const errorText = await response.text();
        setUpdateMessage(`Eroare la actualizarea documentului (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating document:', error);
      setUpdateMessage(`Eroare la actualizarea documentului: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsUpdatingDocument(false);
      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(''), 3000);
    }
  };

  const handleMainFileUpload = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setAttachedFiles(fileArray);
  };

  const handleAddPatientClick = async () => {
    if (attachedFiles.length > 0) {
      setIsSearchingPatient(true);
      try {
        const formData = new FormData();
        
        // Add operation property
        formData.append('operation', 'search-patient');
        
        // Add files in binary format
        attachedFiles.forEach((file, index) => {
          formData.append(`file_${index}`, file);
        });
        const response = await fetch('https://n8n.voisero.info/webhook/snippet', {
          method: 'POST',
          mode: 'cors',
          body: formData,
        });
        
        if (response.ok) {
          console.log('Files uploaded successfully', response.status);
          const parsedResponse = await response.json();
          
          // Extract data from nested structure - response is array with output property
          const responseData = Array.isArray(parsedResponse) && parsedResponse.length > 0 
            ? parsedResponse[0].output 
            : parsedResponse;
          
          // Handle when patient is found (status is array with presentations)
          let formattedResult: string | JSX.Element;
          if (Array.isArray(responseData.status)) {
            const presentations = responseData.status;
            
            formattedResult = (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-green-700">📋 PACIENT GĂSIT</h3>
                </div>
                
                {/* Patient Data Section */}
                {responseData.patientData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                      <span className="mr-2">👤</span>
                      DATE PACIENT
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="font-medium">Nume:</span> {responseData.patientData.nume}</div>
                      <div><span className="font-medium">Prenume:</span> {responseData.patientData.prenume}</div>
                      <div><span className="font-medium">CNP:</span> {responseData.patientData.cnp}</div>
                      <div><span className="font-medium">Telefon:</span> {responseData.patientData.telefon}</div>
                      <div className="col-span-2"><span className="font-medium">Data nașterii:</span> {responseData.patientData.data_nasterii}</div>
                      {responseData.patientData.istoric && (
                        <div className="col-span-2"><span className="font-medium">Istoric:</span> {responseData.patientData.istoric}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Presentation Dates Section */}
                {presentations.length > 0 && (
                  <div className="bg-white border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                      <span className="mr-2">📝</span>
                      DATE PREZENTĂRI ANTERIOARE ({presentations.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                    {presentations.map((presentation: Presentation, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-25 rounded">
                        <div className="text-sm text-green-600 font-medium">
                          📅 {new Date(presentation.data_consult).toLocaleDateString('ro-RO')}
                        </div>
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {presentation.titlu}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            );
          } else if (responseData.status === 'Pacient nou creat!') {
            formattedResult = (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-blue-700">🆕 PACIENT NOU CREAT</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">
                    Pacientul nu a fost găsit în baza de date și a fost creat un nou profil.
                  </p>
                  <div className="mt-4">
                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                      <span className="mr-2">👤</span>
                      DATE PACIENT NOU
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="font-medium">Nume:</span> {responseData.nume || 'N/A'}</div>
                      <div><span className="font-medium">Prenume:</span> {responseData.prenume || 'N/A'}</div>
                      <div><span className="font-medium">CNP:</span> {responseData.cnp || 'N/A'}</div>
                      <div><span className="font-medium">Telefon:</span> {responseData.telefon || 'N/A'}</div>
                      <div className="col-span-2"><span className="font-medium">Data nașterii:</span> {responseData.data_nasterii || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          } else {
            // Unknown status, show formatted response
            formattedResult = (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-yellow-700">⚠️ RĂSPUNS NECUNOSCUT</h3>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <pre className="text-sm text-yellow-800 whitespace-pre-wrap">{JSON.stringify(responseData, null, 2)}</pre>
                </div>
              </div>
            );
          }
          
          setSearchResult(formattedResult);
          setShowSearchResult(true);
          // Clear attached files after successful upload
          setAttachedFiles([]);
          // Clear medical information field for new patient
          setMedicalInfo('');
          // Clear medical file
          setMedicalFiles([]);
          // Reset the file input
          const fileInput = document.getElementById('main-documents') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to upload files:', response.status, errorText);
          setSearchResult(`❌ EROARE\n\nCod eroare: ${response.status}\nDetalii: ${errorText}`);
          setShowSearchResult(true);
          // Clear medical information field even on error for consistency
          setMedicalInfo('');
          // Clear medical file
          setMedicalFiles([]);
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        
        // Provide specific error messages based on error type
        let errorMessage = '';
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          errorMessage = `❌ EROARE DE CONEXIUNE (CORS)\n\n` +
            `Nu se poate conecta la serverul n8n.\n\n` +
            `Cauze posibile:\n` +
            `• Serverul n8n nu permite cereri de la localhost:3000\n` +
            `• Verificați configurația CORS în n8n\n` +
            `• Serverul poate fi offline\n\n` +
            `Soluție: Configurați n8n să permită cereri de la localhost:3000`;
        } else {
          errorMessage = `❌ EROARE DE CONEXIUNE\n\n${error instanceof Error ? error.message : 'Eroare necunoscută'}`;
        }
        
        setSearchResult(errorMessage);
        setShowSearchResult(true);
        // Clear medical information field even on error for consistency
        setMedicalInfo('');
        // Clear medical file
        setMedicalFiles([]);
      } finally {
        setIsSearchingPatient(false);
      }
    } else {
      // If no files attached, navigate to patients page as before
      router.push('/pacienti');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, type: 'main' | 'medical') => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [type]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, type: 'main' | 'medical') => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [type]: false }));
  };

  const handleDrop = (e: React.DragEvent, type: 'main' | 'medical') => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [type]: false }));
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (type === 'main') {
        handleMainFileUpload(files);
      } else {
        handleFileUpload(files, 'medical');
      }
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
                onClick={() => router.push('/settings')}
              >
                <Settings className="w-5 h-5" />
                <span>Setări</span>
              </button>
              
              <button 
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => router.push('/docs')}
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

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search and Add Patient Section */}
        <Card className="shadow-lg border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="cauta pacient"
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button
                onClick={handleAddPatientClick}
                disabled={isSearchingPatient}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 h-12 font-medium whitespace-nowrap"
              >
                {isSearchingPatient ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Se caută...</span>
                  </div>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Cauta Pacient
                  </>
                )}
              </Button>
            </div>
            
            {/* File Upload Section */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div 
                className="relative"
                onDragOver={(e) => handleDragOver(e, 'main')}
                onDragLeave={(e) => handleDragLeave(e, 'main')}
                onDrop={(e) => handleDrop(e, 'main')}
              >
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={(e) => handleMainFileUpload(e.target.files)}
                  id="main-documents"
                  className="hidden"
                />
                <Label 
                  htmlFor="main-documents" 
                  className={`cursor-pointer flex items-center justify-center space-x-2 px-4 py-6 h-20 border-2 border-dashed rounded-lg transition-colors ${
                    dragStates.main ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 hover:border-blue-400 text-slate-600 hover:text-blue-600'
                  }`}>
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{dragStates.main ? 'Eliberează pentru a încărca' : 'Atașează documente sau trage aici'}</span>
                </Label>
                {attachedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                        <div className="flex items-center space-x-2">
                          <Upload className="w-3 h-3 text-slate-600" />
                          <span className="text-slate-700">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAttachedFiles(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="text-red-500 hover:text-red-700 p-1 h-auto"
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

        {/* Search Result Popup */}
        {showSearchResult && (
          <Card className="shadow-lg border-slate-200 bg-blue-50 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-teal-100 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Search className="w-5 h-5 text-blue-600" />
                  <span>Rezultat Căutare</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearchResult(false)}
                  className="text-slate-600 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-white border border-blue-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="bg-white border border-blue-200 rounded-lg p-4 max-h-[32rem] overflow-y-auto">
                      {typeof searchResult === 'string' ? (
                <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono leading-relaxed">
                {searchResult}
                </pre>
  ) : (
    searchResult
  )}
</div>
              </div>
            </CardContent>
          </Card>
        )}

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
