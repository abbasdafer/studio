import { PromoCodeManager } from "@/components/promo-code-manager";
import { TicketPercent } from "lucide-react";

export default function PromoCodesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card p-4">
        <div className="container mx-auto flex items-center gap-4">
          <TicketPercent className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">
            Promo Code Management
          </h1>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto">
          <PromoCodeManager />
        </div>
      </main>
    </div>
  );
}
