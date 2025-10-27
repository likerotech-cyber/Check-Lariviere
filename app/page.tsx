'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BikeIcon, WrenchIcon, ClipboardListIcon, SettingsIcon } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Don't auto-redirect, let user see the landing page
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <BikeIcon className="h-8 w-8 text-slate-700" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Les Cycles Larivière</h1>
                <p className="text-xs text-slate-600">Check Pro</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin')}
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              {user ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push('/login');
                  }}
                >
                  Se déconnecter
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    router.push('/login');
                  }}
                >
                  Se connecter
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Bienvenue sur Check Pro
          </h2>
          <p className="text-lg text-slate-600">
            Sélectionnez votre rôle pour commencer
          </p>
        </div>

        {user ? (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group" onClick={() => router.push('/vendor')}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <ClipboardListIcon className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Vendeur</CardTitle>
                <CardDescription className="text-base">
                  Prise en charge et diagnostic initial
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-slate-600 space-y-2 mb-6">
                  <li>• Enregistrement client</li>
                  <li>• Checklist guidée</li>
                  <li>• Devis préliminaire</li>
                  <li>• Envoi par email</li>
                </ul>
                <Button className="w-full" size="lg">
                  Accéder au mode Vendeur
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group" onClick={() => router.push('/technician')}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <WrenchIcon className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Technicien</CardTitle>
                <CardDescription className="text-base">
                  Planning et réparations
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-slate-600 space-y-2 mb-6">
                  <li>• Planning visuel</li>
                  <li>• Fiches de réparation</li>
                  <li>• Devis détaillé</li>
                  <li>• Suivi des statuts</li>
                </ul>
                <Button className="w-full" size="lg" variant="default">
                  Accéder au mode Technicien
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl mb-2">Bienvenue sur Check Pro</CardTitle>
                <CardDescription className="text-base">
                  Pour accéder à l&apos;application, veuillez vous connecter
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button size="lg" onClick={() => router.push('/login')}>
                  Se connecter / Créer un compte
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
