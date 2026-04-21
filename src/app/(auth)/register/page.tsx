import Link from "next/link";
import { RegisterForm } from "./register-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>
          Rejoins la communauté AnonRP. Gratuit, anonyme, réservé aux majeurs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground w-full text-center">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Connecte-toi
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
