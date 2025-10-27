'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BikeIcon, ArrowLeftIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        toast({
          title: 'Compte créé',
          description: 'Vous pouvez maintenant vous connecter',
        });
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        router.push('/');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: isSignUp ? 'Erreur de création' : 'Erreur de connexion',
        description: error.message || 'Une erreur est survenue',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push('/')}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <BikeIcon className="h-8 w-8 text-slate-700" />
            </div>
            <div>
              <CardTitle className="text-2xl">Les Cycles Larivière</CardTitle>
              <CardDescription className="text-base mt-2">
                {isSignUp ? 'Créer un compte' : 'Connectez-vous à Check Pro'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (isSignUp ? 'Création...' : 'Connexion...') : (isSignUp ? 'Créer un compte' : 'Se connecter')}
              </Button>

              <div className="text-center pt-2">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsSignUp(!isSignUp)}
                  disabled={isLoading}
                >
                  {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
