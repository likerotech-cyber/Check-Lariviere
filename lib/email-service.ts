import { supabase } from './supabase';

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  repairId?: string;
  clientName?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notification-email`;

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('No active session for sending email');
      return false;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to send email:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export function generatePreliminaryQuoteEmail(
  clientName: string,
  vehicleType: string,
  vehicleBrand: string | null,
  vehicleModel: string | null,
  preliminaryQuote: number,
  estimatedTime: number,
  defectCount: number
): string {
  const vehicleInfo = vehicleBrand && vehicleModel
    ? `${vehicleBrand} ${vehicleModel}`
    : vehicleType === 'bike' ? 'Vélo' : 'Trottinette';

  const hours = Math.floor(estimatedTime / 60);
  const minutes = estimatedTime % 60;
  const timeStr = hours > 0 ? `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}` : `${minutes}min`;

  return `
Bonjour ${clientName},

Nous avons effectué le diagnostic de votre ${vehicleInfo}.

RÉSUMÉ DU DIAGNOSTIC :
- Nombre de points à corriger : ${defectCount}
- Temps de réparation estimé : ${timeStr}
- Montant estimé : ${preliminaryQuote.toFixed(2)} €

Ce devis est préliminaire et basé sur notre diagnostic initial. Le montant final pourra légèrement varier en fonction des pièces réellement nécessaires.

Nous vous contacterons prochainement pour confirmer votre accord et planifier la réparation.

Cordialement,
L'équipe Les Cycles Larivière
  `.trim();
}

export function generateCompletionEmailForClient(
  clientName: string,
  vehicleType: string
): string {
  const vehicle = vehicleType === 'bike' ? 'vélo' : 'trottinette';

  return `
Bonjour ${clientName},

Bonne nouvelle ! Votre ${vehicle} est prêt à être récupéré.

La réparation a été effectuée avec succès. Vous pouvez venir chercher votre ${vehicle} à notre magasin pendant nos heures d'ouverture.

Merci de votre confiance.

Cordialement,
L'équipe Les Cycles Larivière
  `.trim();
}

export function generateCompletionEmailForTechnician(
  repairId: string,
  clientName: string,
  vehicleType: string,
  finalQuote: number | null
): string {
  const vehicle = vehicleType === 'bike' ? 'vélo' : 'trottinette';
  const quoteInfo = finalQuote ? `${finalQuote.toFixed(2)} €` : 'Non spécifié';

  return `
Une réparation a été marquée comme terminée.

DÉTAILS :
- ID Réparation : ${repairId}
- Client : ${clientName}
- Véhicule : ${vehicle}
- Montant final : ${quoteInfo}

Le travail est achevé et prêt pour facturation.

Le client a été notifié que son véhicule est prêt à être récupéré.
  `.trim();
}
