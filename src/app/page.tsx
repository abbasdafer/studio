import { AuthForm } from "@/components/auth-form";
import { Dumbbell } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-background">
      <div className="flex items-center gap-4 mb-8">
        <Dumbbell className="h-12 w-12 text-primary" />
        <h1 className="text-4xl font-bold tracking-tighter text-foreground">
          جيم باس برو
        </h1>
      </div>
       <p className="max-w-md text-center text-muted-foreground mb-8">
        الحل المتكامل لإدارة أعضاء ناديك الرياضي، والاشتراكات، والنمو.
      </p>
      <AuthForm />
    </main>
  );
}
