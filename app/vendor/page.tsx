'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BikeIcon, ArrowLeft, ArrowRight, CheckCircle2, XCircle, Mail, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sendEmail, generatePreliminaryQuoteEmail } from '@/lib/email-service';

type VehicleType = 'bike' | 'scooter';
type ChecklistStatus = 'ok' | 'ng';
type ClientDecision = 'accepted' | 'max_price' | 'detailed_quote';

interface ChecklistItem {
  id: string;
  category: string;
  item_name: string;
  estimated_labor_minutes: number;
  estimated_parts_cost: number;
  order_index: number;
  vehicle_type: string;
  tutorial_video_url: string | null;
}

interface ChecklistResponse {
  [itemId: string]: ChecklistStatus;
}

export default function VendorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [vendorName, setVendorName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const [vehicleType, setVehicleType] = useState<VehicleType>('bike');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clientIssue, setClientIssue] = useState('');
  const [desiredReturnDate, setDesiredReturnDate] = useState('');

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistResponses, setChecklistResponses] = useState<ChecklistResponse>({});
  const [currentCategory, setCurrentCategory] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  const [preliminaryQuote, setPreliminaryQuote] = useState(0);
  const [estimatedLaborMinutes, setEstimatedLaborMinutes] = useState(0);
  const [clientDecision, setClientDecision] = useState<ClientDecision>('accepted');
  const [maxPrice, setMaxPrice] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (step === 3) {
      loadChecklistItems();
    }
  }, [step, vehicleType]);

  useEffect(() => {
    calculateQuote();
  }, [checklistResponses, checklistItems]);

  const loadChecklistItems = async () => {
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .or(`vehicle_type.eq.${vehicleType},vehicle_type.eq.both`)
        .order('order_index');

      if (error) throw error;
      setChecklistItems(data || []);

      if (data && data.length > 0) {
        setCurrentCategory(data[0].category);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger la checklist',
      });
    }
  };

  const calculateQuote = () => {
    let totalCost = 0;
    let totalMinutes = 0;

    checklistItems.forEach((item) => {
      if (checklistResponses[item.id] === 'ng') {
        totalCost += Number(item.estimated_parts_cost);
        totalMinutes += item.estimated_labor_minutes;
      }
    });

    const laborCost = (totalMinutes / 60) * 60;
    setPreliminaryQuote(totalCost + laborCost);
    setEstimatedLaborMinutes(totalMinutes);
  };

  const categories = Array.from(new Set(checklistItems.map((item) => item.category)));
  const currentCategoryItems = checklistItems.filter((item) => item.category === currentCategory);
  const currentCategoryIndex = categories.indexOf(currentCategory);

  const handleNext = () => {
    if (step === 1 && (!vendorName || !clientName)) {
      toast({
        variant: 'destructive',
        title: 'Champs requis',
        description: 'Veuillez remplir le nom du vendeur et du client',
      });
      return;
    }

    if (step === 2 && !clientIssue) {
      toast({
        variant: 'destructive',
        title: 'Champs requis',
        description: 'Veuillez décrire le problème du client',
      });
      return;
    }

    if (step === 3 && currentCategoryIndex < categories.length - 1) {
      setCurrentCategory(categories[currentCategoryIndex + 1]);
      return;
    }

    setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step === 3 && currentCategoryIndex > 0) {
      setCurrentCategory(categories[currentCategoryIndex - 1]);
      return;
    }

    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleChecklistChange = (itemId: string, status: ChecklistStatus) => {
    setChecklistResponses((prev) => ({
      ...prev,
      [itemId]: status,
    }));
  };

  const handleSaveRepair = async () => {
    setIsLoading(true);

    try {
      let clientId: string;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', clientEmail)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;

        await supabase
          .from('clients')
          .update({
            name: clientName,
            phone: clientPhone,
          })
          .eq('id', clientId);
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: clientName,
            phone: clientPhone,
            email: clientEmail,
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          client_id: clientId,
          type: vehicleType,
          brand: vehicleBrand,
          model: vehicleModel,
          serial_number: serialNumber,
        })
        .select()
        .single();

      if (vehicleError) throw vehicleError;

      const { data: repair, error: repairError } = await supabase
        .from('repairs')
        .insert({
          client_id: clientId,
          vehicle_id: vehicle.id,
          vendor_name: vendorName,
          client_issue: clientIssue,
          desired_return_date: desiredReturnDate || null,
          estimated_labor_minutes: estimatedLaborMinutes,
          preliminary_quote: preliminaryQuote,
          client_decision: clientDecision,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
          detailed_quote_fee: clientDecision === 'detailed_quote' ? 50 : 0,
        })
        .select()
        .single();

      if (repairError) throw repairError;

      const checklistInserts = Object.entries(checklistResponses).map(([itemId, status]) => ({
        repair_id: repair.id,
        checklist_item_id: itemId,
        status,
      }));

      if (checklistInserts.length > 0) {
        const { error: checklistError } = await supabase
          .from('repair_checklist')
          .insert(checklistInserts);

        if (checklistError) throw checklistError;
      }

      toast({
        title: 'Succès',
        description: 'Le diagnostic a été enregistré avec succès',
      });

      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!clientEmail) {
      toast({
        variant: 'destructive',
        title: 'Email requis',
        description: 'Veuillez entrer l\'adresse email du client',
      });
      return;
    }

    const defectCount = Object.values(checklistResponses).filter((s) => s === 'ng').length;
    const emailBody = generatePreliminaryQuoteEmail(
      clientName,
      vehicleType,
      vehicleBrand,
      vehicleModel,
      preliminaryQuote,
      estimatedLaborMinutes,
      defectCount
    );

    const success = await sendEmail({
      to: clientEmail,
      subject: 'Devis préliminaire - Les Cycles Larivière',
      body: emailBody,
      clientName,
    });

    if (success) {
      toast({
        title: 'Email envoyé',
        description: 'Le devis préliminaire a été envoyé au client',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'email. Veuillez réessayer.',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <BikeIcon className="h-8 w-8 text-slate-700" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Mode Vendeur</h1>
                <p className="text-xs text-slate-600">Prise en charge et diagnostic</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/')}>
              Retour
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    s === step
                      ? 'bg-blue-600 text-white'
                      : s < step
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {s < step ? <CheckCircle2 className="h-6 w-6" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-20 h-1 ${
                      s < step ? 'bg-green-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Client</span>
            <span>Véhicule</span>
            <span>Checklist</span>
            <span>Devis</span>
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Informations Client et Vendeur</CardTitle>
              <CardDescription>
                Enregistrez les informations du client et du vendeur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendorName">Nom du Vendeur *</Label>
                <Input
                  id="vendorName"
                  placeholder="Votre nom"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-4">Informations Client</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nom du Client *</Label>
                    <Input
                      id="clientName"
                      placeholder="Nom complet"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Téléphone</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="client@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} size="lg">
                  Suivant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Informations Véhicule</CardTitle>
              <CardDescription>
                Enregistrez les détails du véhicule et le problème client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Type de véhicule *</Label>
                <RadioGroup value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bike" id="bike" />
                    <Label htmlFor="bike" className="cursor-pointer">Vélo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scooter" id="scooter" />
                    <Label htmlFor="scooter" className="cursor-pointer">Trottinette</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marque</Label>
                  <Input
                    id="brand"
                    placeholder="ex: Trek, Xiaomi..."
                    value={vehicleBrand}
                    onChange={(e) => setVehicleBrand(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modèle</Label>
                  <Input
                    id="model"
                    placeholder="ex: FX 3, M365..."
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial">Numéro de série</Label>
                <Input
                  id="serial"
                  placeholder="Numéro de cadre ou série"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue">Problème signalé par le client *</Label>
                <Textarea
                  id="issue"
                  placeholder="Décrivez le problème..."
                  rows={4}
                  value={clientIssue}
                  onChange={(e) => setClientIssue(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="returnDate">Date de retour souhaitée</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={desiredReturnDate}
                  onChange={(e) => setDesiredReturnDate(e.target.value)}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button onClick={handlePrevious} variant="outline" size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                </Button>
                <Button onClick={handleNext} size="lg">
                  Suivant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{currentCategory}</CardTitle>
                  <CardDescription>
                    Catégorie {currentCategoryIndex + 1} sur {categories.length}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-base px-4 py-2">
                  {Object.values(checklistResponses).filter((s) => s === 'ng').length} défauts
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentCategoryItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.item_name}</p>
                      {item.tutorial_video_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentVideoUrl(item.tutorial_video_url);
                            setShowVideoModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          Vidéo
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      ~{item.estimated_labor_minutes} min • {item.estimated_parts_cost.toFixed(2)} €
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant={checklistResponses[item.id] === 'ok' ? 'default' : 'outline'}
                      size="lg"
                      onClick={() => handleChecklistChange(item.id, 'ok')}
                      className={checklistResponses[item.id] === 'ok' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      OK
                    </Button>
                    <Button
                      variant={checklistResponses[item.id] === 'ng' ? 'default' : 'outline'}
                      size="lg"
                      onClick={() => handleChecklistChange(item.id, 'ng')}
                      className={checklistResponses[item.id] === 'ng' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      NG
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between pt-4">
                <Button onClick={handlePrevious} variant="outline" size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {currentCategoryIndex > 0 ? 'Catégorie Précédente' : 'Précédent'}
                </Button>
                <Button onClick={handleNext} size="lg">
                  {currentCategoryIndex < categories.length - 1 ? 'Catégorie Suivante' : 'Voir le Devis'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Devis Préliminaire</CardTitle>
              <CardDescription>
                Résumé et accord client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-lg">
                <div className="text-center mb-4">
                  <p className="text-sm text-slate-600 mb-1">Montant estimé</p>
                  <p className="text-4xl font-bold text-slate-900">
                    {preliminaryQuote.toFixed(2)} €
                  </p>
                  <p className="text-sm text-slate-600 mt-2">
                    Temps estimé: {Math.round(estimatedLaborMinutes / 60)}h {estimatedLaborMinutes % 60}min
                  </p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-slate-600">
                    <strong>{Object.values(checklistResponses).filter((s) => s === 'ng').length}</strong> points à corriger
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Accord du client *</Label>
                <RadioGroup value={clientDecision} onValueChange={(v) => setClientDecision(v as ClientDecision)}>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="accepted" id="accepted" className="mt-1" />
                    <div>
                      <Label htmlFor="accepted" className="cursor-pointer font-medium">
                        Acceptation du devis approximatif
                      </Label>
                      <p className="text-sm text-slate-600">
                        Le client accepte le montant estimé
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="max_price" id="max_price" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="max_price" className="cursor-pointer font-medium">
                        Fourchette de prix maximale
                      </Label>
                      <p className="text-sm text-slate-600 mb-2">
                        Le client fixe un prix maximum
                      </p>
                      {clientDecision === 'max_price' && (
                        <Input
                          type="number"
                          placeholder="Prix maximum (€)"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="detailed_quote" id="detailed_quote" className="mt-1" />
                    <div>
                      <Label htmlFor="detailed_quote" className="cursor-pointer font-medium">
                        Devis détaillé payant
                      </Label>
                      <p className="text-sm text-slate-600">
                        Frais de 50 € pour un devis complet
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {clientEmail && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSendEmail}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer le devis par email
                </Button>
              )}

              <div className="flex justify-between pt-4">
                <Button onClick={handlePrevious} variant="outline" size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                </Button>
                <Button onClick={handleSaveRepair} size="lg" disabled={isLoading}>
                  {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tutoriel vidéo</DialogTitle>
          </DialogHeader>
          <div className="aspect-video">
            {currentVideoUrl && (
              <iframe
                width="100%"
                height="100%"
                src={currentVideoUrl}
                title="Tutoriel vidéo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
