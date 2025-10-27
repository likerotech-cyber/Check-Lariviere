'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, XCircle, Save, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendEmail, generateCompletionEmailForClient, generateCompletionEmailForTechnician } from '@/lib/email-service';

interface ChecklistItem {
  id: string;
  category: string;
  item_name: string;
  estimated_labor_minutes: number;
  estimated_parts_cost: number;
}

interface RepairChecklistItem {
  id: string;
  status: 'ok' | 'ng';
  technician_notes: string | null;
  checklist_items: ChecklistItem;
}

interface Repair {
  id: string;
  client_id: string;
  vehicle_id: string;
  vendor_name: string;
  client_issue: string;
  status: string;
  desired_return_date: string | null;
  estimated_labor_minutes: number;
  preliminary_quote: number;
  client_decision: string | null;
  max_price: number | null;
  detailed_quote_fee: number;
  final_quote: number | null;
  created_at: string;
  clients: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  vehicles: {
    type: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
  };
}

export default function RepairDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [repair, setRepair] = useState<Repair | null>(null);
  const [checklistItems, setChecklistItems] = useState<RepairChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState('');
  const [finalQuote, setFinalQuote] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState<{ [key: string]: string }>({});
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && params.id) {
      loadRepairDetails();
    }
  }, [user, params.id]);

  const loadRepairDetails = async () => {
    try {
      setLoading(true);

      const { data: repairData, error: repairError } = await supabase
        .from('repairs')
        .select(`
          *,
          clients (name, phone, email),
          vehicles (type, brand, model, serial_number)
        `)
        .eq('id', params.id)
        .single();

      if (repairError) throw repairError;
      setRepair(repairData);
      setStatus(repairData.status);
      setFinalQuote(repairData.final_quote?.toString() || '');

      const { data: checklistData, error: checklistError } = await supabase
        .from('repair_checklist')
        .select(`
          *,
          checklist_items (id, category, item_name, estimated_labor_minutes, estimated_parts_cost)
        `)
        .eq('repair_id', params.id)
        .eq('status', 'ng');

      if (checklistError) throw checklistError;
      setChecklistItems(checklistData || []);

      const notesMap: { [key: string]: string } = {};
      checklistData?.forEach((item) => {
        if (item.technician_notes) {
          notesMap[item.id] = item.technician_notes;
        }
      });
      setTechnicianNotes(notesMap);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les détails de la réparation',
      });
      router.push('/technician');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!repair) return;

    setStatus(newStatus);
    setIsSavingStatus(true);

    try {
      const previousStatus = repair.status;

      const { error: repairError } = await supabase
        .from('repairs')
        .update({ status: newStatus })
        .eq('id', repair.id);

      if (repairError) throw repairError;

      if (newStatus === 'completed' && previousStatus !== 'completed') {
        if (repair.clients.email) {
          const clientEmailBody = generateCompletionEmailForClient(
            repair.clients.name,
            repair.vehicles.type
          );

          await sendEmail({
            to: repair.clients.email,
            subject: 'Votre véhicule est prêt - Les Cycles Larivière',
            body: clientEmailBody,
            repairId: repair.id,
            clientName: repair.clients.name,
          });
        }

        const technicianEmailBody = generateCompletionEmailForTechnician(
          repair.id,
          repair.clients.name,
          repair.vehicles.type,
          finalQuote ? parseFloat(finalQuote) : null
        );

        await sendEmail({
          to: 'technicien@lescycleslariviere.com',
          subject: 'Réparation terminée - Prêt pour facturation',
          body: technicianEmailBody,
          repairId: repair.id,
          clientName: repair.clients.name,
        });

        toast({
          title: 'Réparation terminée',
          description: 'Des notifications par email ont été envoyées au client et au technicien',
        });
      } else {
        toast({
          title: 'Statut mis à jour',
          description: 'Le statut a été sauvegardé automatiquement',
        });
      }

      setRepair({ ...repair, status: newStatus });
    } catch (error: any) {
      setStatus(repair.status);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le statut',
      });
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleSave = async () => {
    if (!repair) return;

    setSaving(true);
    try {
      const { error: repairError } = await supabase
        .from('repairs')
        .update({
          final_quote: finalQuote ? parseFloat(finalQuote) : null,
        })
        .eq('id', repair.id);

      if (repairError) throw repairError;

      for (const [itemId, notes] of Object.entries(technicianNotes)) {
        if (notes.trim()) {
          const { error: notesError } = await supabase
            .from('repair_checklist')
            .update({ technician_notes: notes })
            .eq('id', itemId);

          if (notesError) throw notesError;
        }
      }

      toast({
        title: 'Succès',
        description: 'Les modifications ont été enregistrées',
      });

      router.push('/technician');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non spécifiée';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getClientDecisionLabel = (decision: string | null) => {
    const labels: { [key: string]: string } = {
      accepted: 'Acceptation du devis',
      max_price: 'Prix maximum fixé',
      detailed_quote: 'Devis détaillé payant (50 €)',
    };
    return decision ? labels[decision] || decision : 'Non spécifié';
  };

  const groupedItems = checklistItems.reduce((acc, item) => {
    const category = item.checklist_items.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as { [key: string]: RepairChecklistItem[] });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user || !repair) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={() => router.push('/technician')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au planning
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Nom</p>
                    <p className="font-medium">{repair.clients.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Téléphone</p>
                    <p className="font-medium">{repair.clients.phone || 'Non renseigné'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-slate-600">Email</p>
                    <p className="font-medium">{repair.clients.email || 'Non renseigné'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Véhicule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Type</p>
                    <p className="font-medium">
                      {repair.vehicles.type === 'bike' ? 'Vélo' : 'Trottinette'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Marque</p>
                    <p className="font-medium">{repair.vehicles.brand || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Modèle</p>
                    <p className="font-medium">{repair.vehicles.model || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Numéro de série</p>
                    <p className="font-medium">{repair.vehicles.serial_number || 'Non renseigné'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Points à Corriger</CardTitle>
                <CardDescription>
                  {checklistItems.length} élément(s) identifié(s) comme défectueux
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.entries(groupedItems).length === 0 ? (
                  <div className="text-center py-8 text-slate-600">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Aucun défaut identifié</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <div key={category}>
                        <h3 className="font-semibold text-lg mb-3 flex items-center">
                          <XCircle className="h-5 w-5 mr-2 text-red-600" />
                          {category}
                        </h3>
                        <div className="space-y-4 ml-7">
                          {items.map((item) => (
                            <div key={item.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{item.checklist_items.item_name}</p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    Temps estimé: {item.checklist_items.estimated_labor_minutes} min •{' '}
                                    Pièces: {item.checklist_items.estimated_parts_cost.toFixed(2)} €
                                  </p>
                                </div>
                                <Badge variant="destructive">NG</Badge>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`notes-${item.id}`} className="text-sm">
                                  Notes du technicien
                                </Label>
                                <Textarea
                                  id={`notes-${item.id}`}
                                  placeholder="Observations, pièces réelles utilisées, temps réel..."
                                  value={technicianNotes[item.id] || ''}
                                  onChange={(e) =>
                                    setTechnicianNotes((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  rows={2}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statut de la Réparation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Statut actuel</Label>
                  <Select value={status} onValueChange={handleStatusChange} disabled={isSavingStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Initial</SelectItem>
                      <SelectItem value="pending_approval">En attente accord</SelectItem>
                      <SelectItem value="parts_ordered">Commande de pièces</SelectItem>
                      <SelectItem value="in_repair">En réparation</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSavingStatus && (
                    <p className="text-xs text-slate-600">Sauvegarde en cours...</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informations Réparation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Vendeur</p>
                  <p className="font-medium">{repair.vendor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Date retour souhaitée</p>
                  <p className="font-medium">{formatDate(repair.desired_return_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Temps estimé</p>
                  <p className="font-medium">
                    {Math.floor(repair.estimated_labor_minutes / 60)}h{' '}
                    {repair.estimated_labor_minutes % 60}min
                  </p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-slate-600 mb-2">Problème signalé</p>
                  <p className="text-sm bg-slate-50 p-3 rounded">{repair.client_issue}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Devis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Devis préliminaire</p>
                  <p className="text-2xl font-bold">{repair.preliminary_quote.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Décision du client</p>
                  <p className="font-medium text-sm">
                    {getClientDecisionLabel(repair.client_decision)}
                  </p>
                  {repair.max_price && (
                    <p className="text-sm text-slate-600 mt-1">
                      Prix max: {repair.max_price.toFixed(2)} €
                    </p>
                  )}
                </div>
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="finalQuote">Devis final (€)</Label>
                  <Input
                    id="finalQuote"
                    type="number"
                    step="0.01"
                    placeholder="Montant final"
                    value={finalQuote}
                    onChange={(e) => setFinalQuote(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
