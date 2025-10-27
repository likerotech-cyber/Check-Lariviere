'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BikeIcon, Clock, Calendar, User, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  };
}

export default function TechnicianPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadRepairs();

      const channel = supabase
        .channel('repairs-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'repairs' },
          () => {
            loadRepairs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadRepairs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('repairs')
        .select(`
          *,
          clients (name, phone, email),
          vehicles (type, brand, model)
        `)
        .order('desired_return_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRepairs(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les réparations',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      initial: { label: 'Initial', variant: 'secondary' },
      pending_approval: { label: 'En attente accord', variant: 'outline' },
      parts_ordered: { label: 'Commande pièces', variant: 'default' },
      in_repair: { label: 'En réparation', variant: 'default' },
      completed: { label: 'Terminé', variant: 'default' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non spécifiée';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const getTotalEstimatedTime = () => {
    return repairs
      .filter((r) => r.status !== 'completed')
      .reduce((sum, r) => sum + r.estimated_labor_minutes, 0);
  };

  const filteredRepairs = filterStatus === 'all'
    ? repairs
    : repairs.filter((r) => r.status === filterStatus);

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
              <Wrench className="h-8 w-8 text-slate-700" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Mode Technicien</h1>
                <p className="text-xs text-slate-600">Planning et réparations</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/')}>
              Retour
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total réparations</CardDescription>
              <CardTitle className="text-3xl">{repairs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>En cours</CardDescription>
              <CardTitle className="text-3xl">
                {repairs.filter((r) => r.status !== 'completed').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Terminées</CardDescription>
              <CardTitle className="text-3xl">
                {repairs.filter((r) => r.status === 'completed').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Temps total estimé</CardDescription>
              <CardTitle className="text-3xl">
                {formatTime(getTotalEstimatedTime())}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Planning des Réparations</CardTitle>
                <CardDescription>
                  Vue d&apos;ensemble des travaux à effectuer
                </CardDescription>
              </div>
              <Button onClick={loadRepairs} variant="outline">
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2 mb-6">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                Tous
              </Button>
              <Button
                variant={filterStatus === 'initial' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('initial')}
                size="sm"
              >
                Initial ({repairs.filter((r) => r.status === 'initial').length})
              </Button>
              <Button
                variant={filterStatus === 'pending_approval' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending_approval')}
                size="sm"
              >
                En attente ({repairs.filter((r) => r.status === 'pending_approval').length})
              </Button>
              <Button
                variant={filterStatus === 'parts_ordered' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('parts_ordered')}
                size="sm"
              >
                Commande pièces ({repairs.filter((r) => r.status === 'parts_ordered').length})
              </Button>
              <Button
                variant={filterStatus === 'in_repair' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('in_repair')}
                size="sm"
              >
                En réparation ({repairs.filter((r) => r.status === 'in_repair').length})
              </Button>
              <Button
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('completed')}
                size="sm"
              >
                Terminé ({repairs.filter((r) => r.status === 'completed').length})
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
              </div>
            ) : filteredRepairs.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                <BikeIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Aucune réparation à afficher</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRepairs.map((repair) => (
                  <Card
                    key={repair.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/technician/repair/${repair.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              {repair.clients.name}
                            </h3>
                            {getStatusBadge(repair.status)}
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 mb-3">
                            <div className="flex items-center space-x-2">
                              <BikeIcon className="h-4 w-4" />
                              <span>
                                {repair.vehicles.type === 'bike' ? 'Vélo' : 'Trottinette'}{' '}
                                {repair.vehicles.brand && `- ${repair.vehicles.brand}`}{' '}
                                {repair.vehicles.model}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>Vendeur: {repair.vendor_name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>Retour: {formatDate(repair.desired_return_date)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>Temps estimé: {formatTime(repair.estimated_labor_minutes)}</span>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-3 rounded">
                            <p className="text-sm text-slate-700">
                              <strong>Problème:</strong> {repair.client_issue}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <div className="text-sm">
                              <span className="text-slate-600">Devis préliminaire: </span>
                              <span className="font-semibold">{repair.preliminary_quote.toFixed(2)} €</span>
                            </div>
                            {repair.final_quote && (
                              <div className="text-sm">
                                <span className="text-slate-600">Devis final: </span>
                                <span className="font-semibold text-green-600">
                                  {repair.final_quote.toFixed(2)} €
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
