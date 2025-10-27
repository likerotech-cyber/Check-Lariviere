'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SettingsIcon, ClockIcon, ListIcon, PencilIcon, TrashIcon, PlusIcon, ArrowLeftIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminSettings {
  id: string;
  hourly_rate: number;
}

interface RepairTemplate {
  id: string;
  name: string;
  description: string;
  estimated_minutes: number;
  vehicle_type: string;
  is_active: boolean;
}

interface ChecklistItem {
  id: string;
  category: string;
  item_name: string;
  estimated_labor_minutes: number;
  estimated_parts_cost: number;
  order_index: number;
  vehicle_type: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [hourlyRate, setHourlyRate] = useState('60');
  const [repairTemplates, setRepairTemplates] = useState<RepairTemplate[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RepairTemplate | null>(null);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistItem | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadRepairTemplates();
      loadChecklistItems();
    }
  }, [user]);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les paramètres',
      });
      return;
    }

    if (data) {
      setSettings(data);
      setHourlyRate(data.hourly_rate.toString());
    }
  };

  const loadRepairTemplates = async () => {
    const { data, error } = await supabase
      .from('repair_templates')
      .select('*')
      .order('name');

    if (!error && data) {
      setRepairTemplates(data);
    }
  };

  const loadChecklistItems = async () => {
    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .order('category, order_index');

    if (!error && data) {
      setChecklistItems(data);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    const { error } = await supabase
      .from('admin_settings')
      .update({ hourly_rate: parseFloat(hourlyRate), updated_at: new Date().toISOString() })
      .eq('id', settings.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
      });
      return;
    }

    toast({
      title: 'Paramètres sauvegardés',
      description: 'Le taux horaire a été mis à jour',
    });
    loadSettings();
  };

  const saveTemplate = async (template: Partial<RepairTemplate>) => {
    if (editingTemplate) {
      const { error } = await supabase
        .from('repair_templates')
        .update({ ...template, updated_at: new Date().toISOString() })
        .eq('id', editingTemplate.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de modifier le modèle',
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('repair_templates')
        .insert([template]);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de créer le modèle',
        });
        return;
      }
    }

    toast({
      title: 'Modèle sauvegardé',
      description: editingTemplate ? 'Le modèle a été modifié' : 'Le modèle a été créé',
    });
    setIsDialogOpen(false);
    setEditingTemplate(null);
    loadRepairTemplates();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('repair_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer le modèle',
      });
      return;
    }

    toast({
      title: 'Modèle supprimé',
      description: 'Le modèle a été supprimé',
    });
    loadRepairTemplates();
  };

  const saveChecklistItem = async (item: Partial<ChecklistItem>) => {
    if (editingChecklist) {
      const { error } = await supabase
        .from('checklist_items')
        .update(item)
        .eq('id', editingChecklist.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de modifier l&apos;élément',
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('checklist_items')
        .insert([item]);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de créer l&apos;élément',
        });
        return;
      }
    }

    toast({
      title: 'Élément sauvegardé',
      description: editingChecklist ? 'L&apos;élément a été modifié' : 'L&apos;élément a été créé',
    });
    setIsChecklistDialogOpen(false);
    setEditingChecklist(null);
    loadChecklistItems();
  };

  const deleteChecklistItem = async (id: string) => {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer l&apos;élément',
      });
      return;
    }

    toast({
      title: 'Élément supprimé',
      description: 'L&apos;élément a été supprimé',
    });
    loadChecklistItems();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={() => router.push('/')} className="hover:bg-blue-50">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Retour à l&apos;accueil
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Administration</h1>
              <p className="text-xs text-slate-600">Gestion du système</p>
            </div>
            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-white/60 backdrop-blur-sm p-1 h-auto">
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Paramètres
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3">
              <ClockIcon className="h-4 w-4 mr-2" />
              Modèles
            </TabsTrigger>
            <TabsTrigger value="checklist" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3">
              <ListIcon className="h-4 w-4 mr-2" />
              Checklist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card className="border-blue-200 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-200">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <SettingsIcon className="h-5 w-5 text-blue-600" />
                  Paramètres Généraux
                </CardTitle>
                <CardDescription>
                  Configuration des tarifs et paramètres système
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate" className="text-slate-700 font-medium">Taux horaire (€)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    min="0"
                    step="0.01"
                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
                <Button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700 shadow-md">Sauvegarder</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card className="border-emerald-200 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-b border-emerald-200">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-emerald-900">
                      <ClockIcon className="h-5 w-5 text-emerald-600" />
                      Modèles de Réparation
                    </CardTitle>
                    <CardDescription>
                      Gérer les modèles de réparation avec temps estimés
                    </CardDescription>
                  </div>
                  <TemplateDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    template={editingTemplate}
                    onSave={saveTemplate}
                    onClose={() => {
                      setIsDialogOpen(false);
                      setEditingTemplate(null);
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Temps (min)</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repairTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.description}</TableCell>
                        <TableCell>{template.estimated_minutes}</TableCell>
                        <TableCell>
                          {template.vehicle_type === 'both' ? 'Tous' : template.vehicle_type === 'bike' ? 'Vélo' : 'Scooter'}
                        </TableCell>
                        <TableCell>
                          <span className={template.is_active ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800' : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800'}>
                            {template.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTemplate(template);
                              setIsDialogOpen(true);
                            }}
                            className="hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                            className="hover:bg-red-50 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist">
            <Card className="border-cyan-200 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-cyan-100/50 border-b border-cyan-200">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-cyan-900">
                      <ListIcon className="h-5 w-5 text-cyan-600" />
                      Éléments de Checklist
                    </CardTitle>
                    <CardDescription>
                      Gérer les éléments de diagnostic du vendeur
                    </CardDescription>
                  </div>
                  <ChecklistDialog
                    isOpen={isChecklistDialogOpen}
                    onOpenChange={setIsChecklistDialogOpen}
                    item={editingChecklist}
                    onSave={saveChecklistItem}
                    onClose={() => {
                      setIsChecklistDialogOpen(false);
                      setEditingChecklist(null);
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Élément</TableHead>
                      <TableHead>Temps (min)</TableHead>
                      <TableHead>Coût pièces (€)</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checklistItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.estimated_labor_minutes}</TableCell>
                        <TableCell>{item.estimated_parts_cost}</TableCell>
                        <TableCell>
                          {item.vehicle_type === 'both' ? 'Tous' : item.vehicle_type === 'bike' ? 'Vélo' : 'Scooter'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingChecklist(item);
                              setIsChecklistDialogOpen(true);
                            }}
                            className="hover:bg-cyan-50 hover:text-cyan-700"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteChecklistItem(item.id)}
                            className="hover:bg-red-50 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TemplateDialog({
  isOpen,
  onOpenChange,
  template,
  onSave,
  onClose,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  template: RepairTemplate | null;
  onSave: (template: Partial<RepairTemplate>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimated_minutes: 0,
    vehicle_type: 'both',
    is_active: true,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        estimated_minutes: template.estimated_minutes,
        vehicle_type: template.vehicle_type,
        is_active: template.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        estimated_minutes: 0,
        vehicle_type: 'both',
        is_active: true,
      });
    }
  }, [template, isOpen]);

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
          <PlusIcon className="h-4 w-4 mr-2" />
          Nouveau modèle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template ? 'Modifier le modèle' : 'Nouveau modèle'}</DialogTitle>
          <DialogDescription>
            Définir un modèle de réparation avec temps estimé
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Mise au point complète"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la réparation"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minutes">Temps estimé (minutes)</Label>
            <Input
              id="minutes"
              type="number"
              value={formData.estimated_minutes}
              onChange={(e) => setFormData({ ...formData, estimated_minutes: parseInt(e.target.value) })}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Type de véhicule</Label>
            <Select
              value={formData.vehicle_type}
              onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Tous</SelectItem>
                <SelectItem value="bike">Vélo</SelectItem>
                <SelectItem value="scooter">Scooter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="active">Actif</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistDialog({
  isOpen,
  onOpenChange,
  item,
  onSave,
  onClose,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: ChecklistItem | null;
  onSave: (item: Partial<ChecklistItem>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    category: '',
    item_name: '',
    estimated_labor_minutes: 0,
    estimated_parts_cost: 0,
    order_index: 0,
    vehicle_type: 'both',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        category: item.category,
        item_name: item.item_name,
        estimated_labor_minutes: item.estimated_labor_minutes,
        estimated_parts_cost: item.estimated_parts_cost,
        order_index: item.order_index,
        vehicle_type: item.vehicle_type,
      });
    } else {
      setFormData({
        category: '',
        item_name: '',
        estimated_labor_minutes: 0,
        estimated_parts_cost: 0,
        order_index: 0,
        vehicle_type: 'both',
      });
    }
  }, [item, isOpen]);

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-cyan-600 hover:bg-cyan-700 shadow-md">
          <PlusIcon className="h-4 w-4 mr-2" />
          Nouvel élément
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Modifier l&apos;élément' : 'Nouvel élément'}</DialogTitle>
          <DialogDescription>
            Définir un élément de checklist pour le diagnostic
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Ex: Freins"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="itemName">Élément</Label>
            <Input
              id="itemName"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              placeholder="Ex: Plaquettes avant"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labor">Temps main d&apos;œuvre (minutes)</Label>
            <Input
              id="labor"
              type="number"
              value={formData.estimated_labor_minutes}
              onChange={(e) => setFormData({ ...formData, estimated_labor_minutes: parseInt(e.target.value) })}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parts">Coût des pièces (€)</Label>
            <Input
              id="parts"
              type="number"
              value={formData.estimated_parts_cost}
              onChange={(e) => setFormData({ ...formData, estimated_parts_cost: parseFloat(e.target.value) })}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order">Ordre d&apos;affichage</Label>
            <Input
              id="order"
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Type de véhicule</Label>
            <Select
              value={formData.vehicle_type}
              onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Tous</SelectItem>
                <SelectItem value="bike">Vélo</SelectItem>
                <SelectItem value="scooter">Scooter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
