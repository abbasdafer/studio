
import { Dumbbell } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
       <header className="w-full border-b bg-card">
        <div className="container h-16 flex items-center justify-between mx-auto px-4 md:px-6">
            <div className="flex items-center gap-2">
                <Dumbbell className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">جيمكو</span>
            </div>
            <span className="text-sm text-muted-foreground">الملف الشخصي للعضو</span>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
       <footer className="bg-card border-t py-6">
        <div className="container mx-auto px-4 md:px-6 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} جيمكو. نظام إدارة النوادي الرياضية.</p>
        </div>
      </footer>
    </div>
  );
}

    