
"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

// This is a temporary diagnostic component.
// Its only purpose is to fetch data and display it raw, to see if the crash
// happens during fetching or during processing.

export default function ProfitsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchDataForDiagnosis = async () => {
      setLoading(true);
      setError(null);
      console.log("Starting data fetch for diagnosis...");

      try {
        const ownerDocRef = doc(db, 'gymOwners', user.uid);
        const membersQuery = query(collection(db, 'members'), where('gymOwnerId', '==', user.uid));
        
        console.log("Fetching gymOwner doc...");
        const ownerDoc = await getDoc(ownerDocRef);

        if (!ownerDoc.exists()) {
            throw new Error("Gym owner document not found.");
        }
        
        console.log("Fetching members...");
        const membersSnapshot = await getDocs(membersQuery);

        const ownerData = ownerDoc.data();
        const membersList = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("Data fetched successfully.");
        setRawData({
          ownerData,
          membersList
        });

      } catch (e: any) {
        console.error("DIAGNOSTIC_ERROR:", e);
        setError(`Failed to fetch data. Please check the browser console for details. Message: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDataForDiagnosis();
  }, [user]);

  if (loading) {
    return (
        <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Running diagnostics... Fetching data...</span>
            </div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-red-500 bg-red-50 p-4">
            <div className="text-center text-red-700">
                <h3 className="font-bold">An Error Occurred During Diagnostics</h3>
                <p>{error}</p>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold">Diagnostic Mode</h1>
        <p className="text-muted-foreground">
            If you can see this page without a crash, it means the data was fetched successfully. 
            The problem is in the data processing code (charts, calculations). 
            Please copy the data below and send it to me.
        </p>
        
        <div className="p-4 bg-muted rounded-lg">
            <h2 className="font-bold mb-2">Raw Fetched Data:</h2>
            <pre className="text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(rawData, (key, value) => {
                    // Convert Firestore Timestamps to strings for readable JSON
                    if (value && value.seconds !== undefined && value.nanoseconds !== undefined) {
                        return new Timestamp(value.seconds, value.nanoseconds).toDate().toISOString();
                    }
                    return value;
                }, 2)}
            </pre>
        </div>
    </div>
  );
}
