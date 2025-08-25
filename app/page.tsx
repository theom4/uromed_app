'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  User, 
  FileText, 
  Calendar, 
  Settings, 
  Building2, 
  Bot,
  X,
  Eye
} from 'lucide-react';

interface PatientData {
  nume: string;
  prenume: string;
  cnp: string;
  telefon: string;
  data_nasterii?: string;
  data_nastere?: string;
  istoric?: string;
}

interface ConsultationData {
  id: string;
  data_consult: string;
  patient_id: string;
  titlu: string;
  continut_text: string;
  fisier_original?: string;
}

interface FoundPatientData {
  patientData: PatientData;
  status: ConsultationData[];
}

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundPatient, setFoundPatient] = useState<FoundPatientData | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Vă rugăm să introduceți un termen de căutare');
      return;
    }

    setIsSearching(true);
    setFoundPatient(null);
    setDebugInfo('');

    try {
      const response = await fetch('https://n8n.voisero.info/webhook/snippet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery
        }),
      });

      if (response.ok) {
        let result;
        
        try {
          // Try to parse as JSON first
          result = await response.json();
          console.log('JSON Response:', result);
          setDebugInfo(JSON.stringify(result, null, 2));
        } catch (jsonError) {
          // If JSON parsing fails, try to parse as text and extract JSON
          const textResponse = await response.text();
          console.log('Text Response:', textResponse);
          setDebugInfo(textResponse);
          
          // Try to extract JSON from text response
          const jsonMatch = textResponse.match(/\[.*\]/s);
          if (jsonMatch) {
            try {
              result = JSON.parse(jsonMatch[0]);
              console.log('Extracted JSON:', result);
            } catch (extractError) {
              console.error('Failed to extract JSON:', extractError);
              alert('Eroare la procesarea răspunsului de la server');
              return;
            }
          } else {
            alert('Răspuns invalid de la server');
            return;
          }
        }

        // Handle the response structure
        let patientData = null;
        let consultations = [];

        if (Array.isArray(result) && result.length > 0) {
          // Handle array format: [{ output: { patientData: ..., status: ... } }]
          const firstResult = result[0];
          if (firstResult && firstResult.output) {
            patientData = firstResult.output.patientData;
            consultations = firstResult.output.status || [];
          }
        } else if (result && result.output) {
          // Handle direct object format: { output: { patientData: ..., status: ... } }
          patientData = result.output.patientData;
          consultations = result.output.status || [];
        } else if (result && result.patientData) {
          // Handle direct format: { patientData: ..., status: ... }
          patientData = result.patientData;
          consultations = result.status || [];
        }

        console.log('Extracted patientData:', patientData);
        console.log('Extracted consultations:', consultations);

        if (patientData && (patientData.nume || patientData.prenume)) {
          setFoundPatient({
            patientData,
            status: consultations
          });
        } else {
          alert('Nu au fost găsite informații despre pacient.');
        }
      } else {
        const errorText = await response.text();
        console.error('Webhook request failed:', response.status, errorText);
        alert(`Eroare la căutarea pacientului (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const handleClosePatientDetails = () => {
    setFoundPatient(null);
    setSearchQuery('');
  };

  const handleViewFullDetails = () => {
    if (foundPatient?.patientData) {
      // Navigate to patient details page if we have patient ID
      // For now, just show an alert since we don't have the patient ID in the response
      alert('Funcționalitatea de vizualizare completă va fi implementată în curând');
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
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">UroMed AI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                Bun venit, {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-600 hover:text-slate-800"
              >
                Ieșire
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-slate-800">
                <Search className="w-5 h-5 text-blue-600" />
                <span>Căutare Pacient</span>
              </CardTitle>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Se caută...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Caută Pacient</span>
                  </div>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Introduceți numele, prenumele sau CNP-ul pacientului"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 h-12 text-lg"
                disabled={isSearching}
              />
            </div>
          </CardContent>
        </Card>

        {/* Patient Details Section */}
        {foundPatient && (
          <Card className="shadow-lg border-green-200 bg-green-50">
            <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b border-green-200">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-green-800">
                  <User className="w-5 h-5 text-green-600" />
                  <span>Pacient Găsit</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePatientDetails}
                  className="text-green-600 hover:text-green-800 hover:bg-green-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Patient Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">Informații Pacient</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-green-700 w-20">Nume:</span>
                      <span className="text-sm text-green-800 font-semibold">
                        {foundPatient.patientData.nume} {foundPatient.patientData.prenume}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-green-700 w-20">CNP:</span>
                      <span className="text-sm text-green-800 font-mono">
                        {foundPatient.patientData.cnp}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-green-700 w-20">Telefon:</span>
                      <span className="text-sm text-green-800">
                        {foundPatient.patientData.telefon}
                      </span>
                    </div>
                    
                    {(foundPatient.patientData.data_nasterii || foundPatient.patientData.data_nastere) && (
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-green-700 w-20">Născut:</span>
                        <span className="text-sm text-green-800">
                          {foundPatient.patientData.data_nasterii || foundPatient.patientData.data_nastere}
                        </span>
                      </div>
                    )}
                    
                    {foundPatient.patientData.istoric && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-green-700 block mb-2">Istoric Medical:</span>
                        <div className="bg-white p-3 rounded-lg border border-green-200">
                          <p className="text-sm text-green-800 leading-relaxed">
                            {foundPatient.patientData.istoric}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Consultation History */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">
                    Istoric Consultații ({foundPatient.status.length})
                  </h3>
                  
                  {foundPatient.status.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {foundPatient.status.map((consultation, index) => (
                        <div key={consultation.id || index} className="bg-white p-4 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-700 capitalize">
                              {consultation.titlu.replace('-', ' ')}
                            </span>
                            <span className="text-xs text-green-600">
                              {new Date(consultation.data_consult).toLocaleDateString('ro-RO', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-green-800 leading-relaxed">
                            {consultation.continut_text.length > 200 
                              ? `${consultation.continut_text.substring(0, 200)}...`
                              : consultation.continut_text
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
                      <p className="text-sm text-green-600">Nu există consultații anterioare</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 mt-6 pt-4 border-t border-green-200">
                <Button
                  onClick={handleClosePatientDetails}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  Închide
                </Button>
                <Button
                  onClick={handleViewFullDetails}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!foundPatient.patientData}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vezi Detalii Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Information (remove in production) */}
        {debugInfo && (
          <Card className="shadow-lg border-yellow-200 bg-yellow-50">
            <CardHeader className="bg-gradient-to-r from-yellow-100 to-amber-100 border-b border-yellow-200">
              <CardTitle className="text-yellow-800">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <pre className="text-xs text-yellow-800 overflow-auto max-h-40 bg-white p-2 rounded border">
                {debugInfo}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pacienti Card */}
          <Card 
            className="shadow-lg border-slate-200 hover:shadow-xl transition-shadow cursor-pointer group"
            onClick={() => router.push('/pacienti')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Pacienti</h3>
                  <p className="text-sm text-slate-600">Gestionează pacienții</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documente AI Card */}
          <Card 
            className="shadow-lg border-slate-200 hover:shadow-xl transition-shadow cursor-pointer group"
            onClick={() => router.push('/docs')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Documente AI</h3>
                  <p className="text-sm text-slate-600">Generează documente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Programari Card */}
          <Card 
            className="shadow-lg border-slate-200 hover:shadow-xl transition-shadow cursor-pointer group"
            onClick={() => router.push('/programari')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Programări</h3>
                  <p className="text-sm text-slate-600">Calendar programări</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saloane Card */}
          <Card 
            className="shadow-lg border-slate-200 hover:shadow-xl transition-shadow cursor-pointer group"
            onClick={() => router.push('/saloane')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Saloane</h3>
                  <p className="text-sm text-slate-600">Management saloane</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card 
            className="shadow-lg border-slate-200 hover:shadow-xl transition-shadow cursor-pointer group"
            onClick={() => router.push('/settings')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Setări</h3>
                  <p className="text-sm text-slate-600">Configurări sistem</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}