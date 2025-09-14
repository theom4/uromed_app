'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ArrowLeft, User, Plus } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Patient {
  id: number;
  nume: string;
  prenume: string;
  cnp?: string;
  email?: string;
  telefon?: string;
  created_at: string;
}

export default function PacientiPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [addPatientDialogOpen, setAddPatientDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    nume: '',
    prenume: '',
    cnp: '',
    telefon: '',
    data_nastere: '',
    sex: '',
    judet: '',
    localitate: '',
    adresa: '',
    email: '',
    act_identitate: '',
    medic_familie: '',
    greutate: '',
    inaltime: '',
    email_instructiuni: '',
    statut_asigurat: '',
    in_evidenta_la: '',
    tip_pacient: '',
    observatii: ''
  });
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch patients from Supabase

  const handleDeleteClick = (patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientToDelete.id);

      if (error) {
        console.error('Error deleting patient:', error);
      } else {
        // Refresh the patients list
        fetchPatients();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPatientToDelete(null);
  };

  const handleAddPatient = () => {
    setAddPatientDialogOpen(true);
  };

  const handleAddPatientSubmit = async () => {
    if (!newPatient.nume || !newPatient.prenume) {
      alert('Numele și prenumele sunt obligatorii');
      return;
    }

    setIsAddingPatient(true);

    try {
      // Calculate age from birth date
      const calculateAge = (birthDate: string) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age;
      };

      const { error } = await supabase
        .from('patients')
        .insert([{
          nume: newPatient.nume,
          prenume: newPatient.prenume,
          cnp: newPatient.cnp || null,
          telefon: newPatient.telefon || null,
          data_nastere: newPatient.data_nastere || null,
          sex: newPatient.sex || null,
          judet: newPatient.judet || null,
          localitate: newPatient.localitate || null,
          adresa: newPatient.adresa || null,
          email: newPatient.email || null,
          act_identitate: newPatient.act_identitate || null,
          medic_familie: newPatient.medic_familie || null,
          greutate: newPatient.greutate ? parseFloat(newPatient.greutate) : null,
          inaltime: newPatient.inaltime ? parseFloat(newPatient.inaltime) : null,
          email_instructiuni: newPatient.email_instructiuni || null,
          statut_asigurat: newPatient.statut_asigurat || null,
          in_evidenta_la: newPatient.in_evidenta_la || null,
          tip_pacient: newPatient.tip_pacient || null,
          observatii: newPatient.observatii || null,
          varsta: newPatient.data_nastere ? calculateAge(newPatient.data_nastere) : null,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error adding patient:', error);
        alert('Eroare la adăugarea pacientului');
      } else {
        // Reset form and close dialog
        setNewPatient({
          nume: '',
          prenume: '',
          cnp: '',
          telefon: '',
          data_nastere: '',
          sex: '',
          judet: '',
          localitate: '',
          adresa: '',
          email: '',
          act_identitate: '',
          medic_familie: '',
          greutate: '',
          inaltime: '',
          email_instructiuni: '',
          statut_asigurat: '',
          in_evidenta_la: '',
          tip_pacient: '',
          observatii: ''
        });
        setAddPatientDialogOpen(false);
        // Refresh the patients list
        fetchPatients();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Eroare la adăugarea pacientului');
    } finally {
      setIsAddingPatient(false);
    }
  };

  const handleAddPatientCancel = () => {
    setAddPatientDialogOpen(false);
    setNewPatient({
      nume: '',
      prenume: '',
      cnp: '',
      telefon: '',
      data_nastere: '',
      sex: '',
      judet: '',
      localitate: '',
      adresa: '',
      email: '',
      act_identitate: '',
      medic_familie: '',
      greutate: '',
      inaltime: '',
      email_instructiuni: '',
      statut_asigurat: '',
      in_evidenta_la: '',
      tip_pacient: '',
      observatii: ''
    });
  };

  const handleSearchPatient = async () => {
    if (!searchQuery.trim()) {
      alert('Vă rugăm să introduceți un nume sau CNP pentru căutare');
      return;
    }

    setIsSearching(true);
    setPatientsLoading(true);
    try {
      const response = await fetch('https://n8n.voisero.info/webhook/search-patient-cnp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: searchQuery.trim(),
          operation: "search-patient"
        }),
        mode: 'cors',
      });

      if (response.status === 200) {
        const responseData = await response.json();
        console.log('Search response:', responseData);
        
        // The response is an array of patients
        if (Array.isArray(responseData) && responseData.length > 0) {
          setPatients(responseData);
        } else {
          // Empty array means no patients found
          setPatients([]);
        }
      } else if (response.status === 404) {
        // No patient found
        setPatients([]);
      } else {
        // Other errors
        const errorText = await response.text();
        console.error('Search webhook failed:', response.status, errorText);
        alert(`Eroare la căutarea pacientului (${response.status}): ${errorText || response.statusText}`);
        setPatients([]);
      }
    } catch (error) {
      console.error('Error sending search webhook:', error);
      alert(`Eroare la conectarea la server: ${error instanceof Error ? error.message : 'Eroare de rețea'}`);
      setPatients([]);
    } finally {
      setIsSearching(false);
      setPatientsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/');
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Pacienti</h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center justify-between text-slate-800">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="dark:text-white">Căutare Pacienți</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPatient}
                className="flex items-center space-x-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Plus className="w-4 h-4" />
                <span>Add Patients</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cauta pacienti"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchPatient();
                    }
                  }}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button
                onClick={handleSearchPatient}
                disabled={isSearching || !searchQuery.trim()}
                className="h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium"
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
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center space-x-2 text-slate-800 dark:text-white">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>{searchQuery.trim() ? `Rezultate căutare: "${searchQuery}"` : 'Pacienți Recenți'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {patientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-600 dark:text-slate-400">
                  Se caută pacienții...
                </span>
              </div>
            ) : patients.length > 0 ? (
              <div className="space-y-3">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                    onClick={() => router.push(`/pacienti/${patient.id}`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800 dark:text-slate-200">{patient.nume} {patient.prenume}</h3>
                        {patient.cnp && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">CNP: {patient.cnp}</p>
                        )}
                        {patient.telefon && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Tel: {patient.telefon}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(patient.created_at).toLocaleDateString('ro-RO')}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(patient);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                {searchQuery.trim() ? (
                  <>
                    <p className="text-slate-600 dark:text-slate-400">
                      Niciun pacient găsit pentru "{searchQuery}"
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Încercați să căutați cu alți termeni
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-600 dark:text-slate-400">
                      Introduceți un nume sau CNP și apăsați "Caută Pacient" pentru a căuta pacienți
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Rezultatele căutării vor apărea aici
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmare Ștergere</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să ștergi pacientul {patientToDelete?.nume} {patientToDelete?.prenume}?
              Această acțiune nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Șterge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Patient Dialog */}
      <Dialog open={addPatientDialogOpen} onOpenChange={setAddPatientDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adaugă Pacient Nou</DialogTitle>
            <DialogDescription>
              Completați informațiile pacientului. Câmpurile marcate cu * sunt obligatorii.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nume" className="text-sm font-medium text-slate-700">
                    Nume *
                  </Label>
                  <Input
                    id="nume"
                    value={newPatient.nume}
                    onChange={(e) => setNewPatient({...newPatient, nume: e.target.value})}
                    placeholder="Introduceți numele"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="prenume" className="text-sm font-medium text-slate-700">
                    Prenume *
                  </Label>
                  <Input
                    id="prenume"
                    value={newPatient.prenume}
                    onChange={(e) => setNewPatient({...newPatient, prenume: e.target.value})}
                    placeholder="Introduceți prenumele"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cnp" className="text-sm font-medium text-slate-700">
                  CNP
                </Label>
                <Input
                  id="cnp"
                  value={newPatient.cnp}
                  onChange={(e) => setNewPatient({...newPatient, cnp: e.target.value})}
                  placeholder="Introduceți CNP-ul"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data_nastere" className="text-sm font-medium text-slate-700">
                    Data nașterii
                  </Label>
                  <Input
                    id="data_nastere"
                    type="date"
                    value={newPatient.data_nastere}
                    onChange={(e) => setNewPatient({...newPatient, data_nastere: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sex" className="text-sm font-medium text-slate-700">
                    Sex
                  </Label>
                  <Select value={newPatient.sex} onValueChange={(value) => setNewPatient({...newPatient, sex: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selectați sexul" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculin">Masculin</SelectItem>
                      <SelectItem value="feminin">Feminin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="judet" className="text-sm font-medium text-slate-700">
                  Județ
                </Label>
                <Select value={newPatient.judet} onValueChange={(value) => setNewPatient({...newPatient, judet: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selectați județul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRAHOVA">PRAHOVA</SelectItem>
                    <SelectItem value="BUCURESTI">BUCUREȘTI</SelectItem>
                    <SelectItem value="CLUJ">CLUJ</SelectItem>
                    <SelectItem value="TIMIS">TIMIȘ</SelectItem>
                    <SelectItem value="IASI">IAȘI</SelectItem>
                    <SelectItem value="CONSTANTA">CONSTANȚA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="adresa" className="text-sm font-medium text-slate-700">
                  Adresa
                </Label>
                <Input
                  id="adresa"
                  value={newPatient.adresa}
                  onChange={(e) => setNewPatient({...newPatient, adresa: e.target.value})}
                  placeholder="Introduceți adresa"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="greutate" className="text-sm font-medium text-slate-700">
                  Greutate (kg)
                </Label>
                <Input
                  id="greutate"
                  type="number"
                  value={newPatient.greutate}
                  onChange={(e) => setNewPatient({...newPatient, greutate: e.target.value})}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="telefon" className="text-sm font-medium text-slate-700">
                  Telefon
                </Label>
                <Input
                  id="telefon"
                  value={newPatient.telefon}
                  onChange={(e) => setNewPatient({...newPatient, telefon: e.target.value})}
                  placeholder="Introduceți numărul de telefon"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="localitate" className="text-sm font-medium text-slate-700">
                  Localitate
                </Label>
                <Input
                  id="localitate"
                  value={newPatient.localitate}
                  onChange={(e) => setNewPatient({...newPatient, localitate: e.target.value})}
                  placeholder="Introduceți localitatea"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                  placeholder="email@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="medic_familie" className="text-sm font-medium text-slate-700">
                  Medic familie
                </Label>
                <Input
                  id="medic_familie"
                  value={newPatient.medic_familie}
                  onChange={(e) => setNewPatient({...newPatient, medic_familie: e.target.value})}
                  placeholder="Numele medicului de familie"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="inaltime" className="text-sm font-medium text-slate-700">
                  Înălțime (cm)
                </Label>
                <Input
                  id="inaltime"
                  type="number"
                  value={newPatient.inaltime}
                  onChange={(e) => setNewPatient({...newPatient, inaltime: e.target.value})}
                  placeholder="0"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="act_identitate" className="text-sm font-medium text-slate-700">
                  Act identitate
                </Label>
                <Input
                  id="act_identitate"
                  value={newPatient.act_identitate}
                  onChange={(e) => setNewPatient({...newPatient, act_identitate: e.target.value})}
                  placeholder="Introduceți actul de identitate"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email_instructiuni" className="text-sm font-medium text-slate-700">
                  Email instrucțiuni
                </Label>
                <Input
                  id="email_instructiuni"
                  type="email"
                  value={newPatient.email_instructiuni}
                  onChange={(e) => setNewPatient({...newPatient, email_instructiuni: e.target.value})}
                  placeholder="email@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="statut_asigurat" className="text-sm font-medium text-slate-700">
                  Statut asigurat
                </Label>
                <Select value={newPatient.statut_asigurat} onValueChange={(value) => setNewPatient({...newPatient, statut_asigurat: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selectați statutul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asigurat">Asigurat</SelectItem>
                    <SelectItem value="neasigurat">Neasigurat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="in_evidenta_la" className="text-sm font-medium text-slate-700">
                  În evidența la
                </Label>
                <Input
                  id="in_evidenta_la"
                  value={newPatient.in_evidenta_la}
                  onChange={(e) => setNewPatient({...newPatient, in_evidenta_la: e.target.value})}
                  placeholder="Introduceți instituția"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tip_pacient" className="text-sm font-medium text-slate-700">
                  Tip pacient
                </Label>
                <Select value={newPatient.tip_pacient} onValueChange={(value) => setNewPatient({...newPatient, tip_pacient: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selectați tipul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambulatoriu">Ambulatoriu</SelectItem>
                    <SelectItem value="spitalizare">Spitalizare</SelectItem>
                    <SelectItem value="urgenta">Urgență</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="observatii" className="text-sm font-medium text-slate-700">
                  Observații
                </Label>
                <Input
                  id="observatii"
                  value={newPatient.observatii}
                  onChange={(e) => setNewPatient({...newPatient, observatii: e.target.value})}
                  placeholder="Observații suplimentare"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleAddPatientCancel}>
              Anulează
            </Button>
            <Button 
              onClick={handleAddPatientSubmit}
              disabled={isAddingPatient}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isAddingPatient ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Se adaugă...</span>
                </div>
              ) : (
                'Adaugă Pacient'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}