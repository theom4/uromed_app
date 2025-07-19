import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Patient {
  id: number;
  nume: string;
  prenume: string;
  email?: string;
  telefon?: string;
  cnp?: string;
  data_nasterii?: string;
  sex?: string;
  judet_domiciliu?: string;
  localitate_domiciliu?: string;
  adresa?: string;
  medic_familie?: string;
  greutate?: number;
  inaltime?: number;
  nr_card?: string;
  created_at: string;
}

export async function generateStaticParams() {
  try {
    const { data: patients, error } = await supabase
      .from('patients')
      .select('id');

    if (error) {
      console.error('Error fetching patient IDs:', error);
      return [];
    }

    return patients.map((patient) => ({
      id: patient.id.toString(),
    }));
  } catch (error) {
    console.error('Error in generateStaticParams:', error);
    return [];
  }
}

async function getPatient(id: string): Promise<Patient | null> {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching patient:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

function calculateAge(birthDate: string) {
  if (!birthDate) return '';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const patient = await getPatient(params.id);

  if (!patient) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/pacienti">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-slate-900">Date Pașaportale Pacient</h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-slate-600">
                Cetățean român • <span className="text-red-500 font-semibold">{patient.id}</span>
              </div>
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                Creare card
              </div>
              <div className="text-sm text-slate-600">
                Nr.Card: <span className="font-mono">{patient.nr_card || '441177204580390'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Patient Information */}
        <Card className="shadow-lg border-slate-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 border-b border-slate-200">
            <CardTitle className="flex items-center space-x-2 text-slate-800">
              <User className="w-5 h-5 text-blue-600" />
              <span>Informații Personale</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Nume:</Label>
                    <Input 
                      value={patient.nume || ''} 
                      readOnly 
                      className="mt-1 bg-green-50 border-green-200 text-green-800 font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Prenume:</Label>
                    <Input 
                      value={patient.prenume || ''} 
                      readOnly 
                      className="mt-1 bg-green-50 border-green-200 text-green-800 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">CNP ( ID: <span className="text-red-500">{patient.id}</span> )</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input 
                      value={patient.cnp || '4604012900076'} 
                      readOnly 
                      className="bg-slate-50 border-slate-200"
                    />
                    <Button variant="outline" size="sm" className="bg-green-50 border-green-200 text-green-700">
                      Acord GDPR
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Data nașterii:</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={patient.data_nasterii || '01/04/1946'} 
                        readOnly 
                        className="bg-slate-50 border-slate-200"
                      />
                      <span className="text-sm text-slate-600">/ {calculateAge(patient.data_nasterii || '1946-04-01')} ani</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Sex:</Label>
                    <Select value={patient.sex || 'masculin'}>
                      <SelectTrigger className="mt-1 bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculin">Masculin</SelectItem>
                        <SelectItem value="feminin">Feminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Județ domiciliu:</Label>
                  <Select value={patient.judet_domiciliu || 'PRAHOVA'}>
                    <SelectTrigger className="mt-1 bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRAHOVA">PRAHOVA</SelectItem>
                      <SelectItem value="BUCURESTI">BUCUREȘTI</SelectItem>
                      <SelectItem value="CLUJ">CLUJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Adresa:</Label>
                  <Input 
                    value={patient.adresa || ''} 
                    className="mt-1 bg-slate-50 border-slate-200"
                    placeholder="Introduceți adresa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Act identitate:</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Select defaultValue="serie">
                        <SelectTrigger className="w-20 bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="serie">Serie</SelectItem>
                          <SelectItem value="numar">Număr</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        placeholder="Serie" 
                        className="bg-slate-50 border-slate-200"
                      />
                      <Input 
                        placeholder="Număr" 
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Greutate:</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={patient.greutate || ''} 
                        className="bg-slate-50 border-slate-200"
                        placeholder="0"
                      />
                      <span className="text-sm text-slate-600">kg</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="bg-red-100 border border-red-200 rounded-lg p-3 text-center">
                  <span className="text-red-800 font-medium">CAUTĂ PACIENT</span>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Telefon:</Label>
                  <Input 
                    value={patient.telefon || ''} 
                    className="mt-1 bg-green-50 border-green-200 text-green-800 font-medium"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Localitatea domiciliu:</Label>
                  <Input 
                    value={patient.localitate_domiciliu || 'SCORTENI'} 
                    className="mt-1 bg-slate-50 border-slate-200"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Mail:</Label>
                  <Input 
                    value={patient.email || ''} 
                    className="mt-1 bg-slate-50 border-slate-200"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Medic familie:</Label>
                  <Input 
                    value={patient.medic_familie || ''} 
                    className="mt-1 bg-slate-50 border-slate-200"
                    placeholder="Numele medicului de familie"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Înălțime:</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input 
                      value={patient.inaltime || ''} 
                      className="bg-slate-50 border-slate-200"
                      placeholder="0"
                    />
                    <span className="text-sm text-slate-600">cm</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2">
            Salvează Modificările
          </Button>
          <Button variant="outline" className="px-8 py-2">
            Anulează
          </Button>
        </div>
      </div>
    </div>
  );
}