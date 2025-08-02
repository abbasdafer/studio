import { UserNav } from "@/components/user-nav";
import { MemberManager } from "@/components/member-manager";
import { Dumbbell } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-8">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Gym Admin</h1>
        </div>
        <UserNav />
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto">
          <MemberManager />
        </div>
      </main>
    </div>
  );
}
