import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MessagesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages privés</h1>
        <p className="text-muted-foreground mt-1">
          Tes conversations avec tes amis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🚧 Bientôt disponible</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>La messagerie privée arrivera en Phase 2. Tu pourras envoyer des messages à tes amis, après avoir accepté des demandes d'amitié.</p>
        </CardContent>
      </Card>
    </div>
  );
}
