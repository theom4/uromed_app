'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  email?: string;
  telefon?: string;
  created_at: string;
}

export default function PacientiPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [addPatientDialogOpen, setAddPatientDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    nume: '',
    prenume: '',
    email: '',
    telefon: '',
    cnp: '',
    data_nasterii: '',
    sex: '',
    judet_domiciliu: '',
    localitate_domiciliu: '',
    adresa: '',
    medic_familie: '',
    greutate: '',
    inaltime: '',
    nr_card: ''
  });
  const [isAddingPatient, setIsAddingPatient] = useState(false);

  // Check for existing login state on component mount
  useEffect(() => {
    const loginState = localStorage.getItem('isLoggedIn');
    if (loginState === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch patients from Supabase
  useEffect(() => {
    if (isLoggedIn) {
      fetchPatients();
    }
  }, [isLoggedIn]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('id, nume, prenume, email, telefon, created_at')
        .limit(5)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patients:', error);
        setPatients([]);
      } else {
        setPatients(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

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
      // Send webhook with patient data
      const webhookData = {
        ...newPatient,
        documentType: 'addPatient',
        greutate: newPatient.greutate ? parseFloat(newPatient.greutate) : null,
        inaltime: newPatient.inaltime ? parseFloat(newPatient.inaltime) : null
      };

      try {
        await fetch('http://n8n.voisero.info/webhook-test/patients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
        });
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
        // Continue with database insertion even if webhook fails
      }

      const { error } = await supabase
        .from('patients')
        .insert([{
          nume: newPatient.nume,
          prenume: newPatient.prenume,
          email: newPatient.email || null,
          telefon: newPatient.telefon || null,
          cnp: newPatient.cnp || null,
          data_nasterii: newPatient.data_nasterii || null,
          sex: newPatient.sex || null,
          judet_domiciliu: newPatient.judet_domiciliu || null,
          localitate_domiciliu: newPatient.localitate_domiciliu || null,
          adresa: newPatient.adresa || null,
          medic_familie: newPatient.medic_familie || null,
          greutate: newPatient.greutate ? parseFloat(newPatient.greutate) : null,
          inaltime: newPatient.inaltime ? parseFloat(newPatient.inaltime) : null,
          nr_card: newPatient.nr_card || null
        }]);

      if (error) {
        console.error('Error adding patient:', error);
        alert('Eroare la adăugarea pacientului');
      } else {
        // Reset form and close dialog
        setNewPatient({
          nume: '',
          prenume: '',
          email: '',
          telefon: '',
          cnp: '',
          data_nasterii: '',
          sex: '',
          judet_domiciliu: '',
          localitate_domiciliu: '',
          adresa: '',
          medic_familie: '',
          greutate: '',
          inaltime: '',
          nr_card: ''
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
      email: '',
      telefon: '',
      cnp: '',
      data_nasterii: '',
      sex: '',
      judet_domiciliu: '',
      localitate_domiciliu: '',
      adresa: '',
      medic_familie: '',
      greutate: '',
      inaltime: '',
      nr_card: ''
    });
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
  };

  const handleBack = () => {
    router.push('/');
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
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
              <h1 className="text-xl font-semibold text-slate-900">Pacienti</h1>
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
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 border-b border-slate-200">
            <CardTitle className="flex items-center justify-between text-slate-800">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-blue-600" />
                <span>Căutare Pacienți</span>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Cauta pacienti"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
            <CardTitle className="flex items-center space-x-2 text-slate-800">
              <User className="w-5 h-5 text-purple-600" />
              <span>Pacienți Recenți</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-600">Se încarcă pacienții...</span>
              </div>
            ) : patients.length > 0 ? (
              <div className="space-y-3">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => router.push(`/pacienti/${patient.id}`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">{patient.nume} {patient.prenume}</h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-slate-500">
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
                <p className="text-slate-600">Nu au fost găsiți pacienți</p>
                <p className="text-sm text-slate-500 mt-1">
                  Pacienții vor apărea aici când vor fi adăugați în baza de date
                </p>
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
                  <Label htmlFor="data_nasterii" className="text-sm font-medium text-slate-700">
                    Data nașterii
                  </Label>
                  <Input
                    id="data_nasterii"
                    type="date"
                    value={newPatient.data_nasterii}
                    onChange={(e) => setNewPatient({...newPatient, data_nasterii: e.target.value})}
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
                <Label htmlFor="judet_domiciliu" className="text-sm font-medium text-slate-700">
                  Județ domiciliu
                </Label>
                <Select value={newPatient.judet_domiciliu} onValueChange={(value) => setNewPatient({...newPatient, judet_domiciliu: value})}>
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
                <Label htmlFor="localitate_domiciliu" className="text-sm font-medium text-slate-700">
                  Localitatea domiciliu
                </Label>
                <Input
                  id="localitate_domiciliu"
                  value={newPatient.localitate_domiciliu}
                  onChange={(e) => setNewPatient({...newPatient, localitate_domiciliu: e.target.value})}
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
                <Label htmlFor="nr_card" className="text-sm font-medium text-slate-700">
                  Număr card
                </Label>
                <Input
                  id="nr_card"
                  value={newPatient.nr_card}
                  onChange={(e) => setNewPatient({...newPatient, nr_card: e.target.value})}
                  placeholder="Introduceți numărul cardului"
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