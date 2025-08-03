"use client";

import { MemberManager } from "@/components/member-manager";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  
  if (loading || !user) {
    // The layout handles the main loading state, 
    // but we can return null here to avoid rendering the manager prematurely.
    return null;
  }

  return (
    <div className="container mx-auto">
        <MemberManager gymOwnerId={user.uid} />
    </div>
  );
}
