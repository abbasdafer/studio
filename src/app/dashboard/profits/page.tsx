
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { DollarSign, Users, TrendingUp, Loader2 } from 'lucide-react';

import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Member = {
  id: string;
  subscriptionType: string;
};

type Pricing = {
  [key: string]: number;
};

// This function safely converts "Monthly Fitness" to "monthlyFitness"
const formatSubscriptionTypeToKey = (type: string): string => {
    if (!type || typeof type !== 'string') return '';
    const parts = type.split(' ');
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].toLowerCase();
    return parts[0].toLowerCase() + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
};

export default function ProfitsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    totalRevenue: number;
    totalMembers: number;
    averageRevenuePerMember: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
        // useAuth hook handles redirection, so we just wait.
        return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch pricing
        const ownerDocRef = doc(db, 'gymOwners', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        if (!ownerDoc.exists()) {
            throw new Error("Gym owner data not found.");
        }
        const pricing = ownerDoc.data().pricing as Pricing || {};

        // 2. Fetch members
        const membersQuery = query(collection(db, 'members'), where('gymOwnerId', '==', user.uid));
        const membersSnapshot = await getDocs(membersQuery);
        const membersList: Member[] = membersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                subscriptionType: data.subscriptionType || '',
            };
        });

        // 3. Calculate stats safely
        const totalMembers = membersList.length;
        let totalRevenue = 0;

        membersList.forEach(member => {
          const priceKey = formatSubscriptionTypeToKey(member.subscriptionType);
          const price = pricing[priceKey] || 0;
          totalRevenue += price;
        });

        const averageRevenuePerMember = totalMembers > 0 ? totalRevenue / totalMembers : 0;
        
        setStats({
            totalRevenue,
            totalMembers,
            averageRevenuePerMember
        });

      } catch (e) {
        console.error("Error fetching or processing data:", e);
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);
  
  if (loading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex items-center justify-center h-64">
            <Card className="w-full max-w-md p-6 text-center bg-destructive/10 border-destructive">
                <CardTitle className="text-destructive">Error</CardTitle>
                <CardContent className="pt-4">
                    <p>Failed to load profit data.</p>
                    <p className="text-xs text-muted-foreground mt-2">{error}</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (!stats) {
    return <div className="text-center">No stats to display.</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total from all members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">All active & expired members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue / Member</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.averageRevenuePerMember.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average lifetime value</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
