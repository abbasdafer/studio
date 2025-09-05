
"use client";

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from './use-toast';


export function useAuth(required = true) {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [isSubscriptionActive, setSubscriptionActive] = useState(true); // Assume active until checked
  const [gymOwner, setGymOwner] = useState<any>(null); // Store gym owner data

  useEffect(() => {
    const checkAuthAndSubscription = async (currentUser: User) => {
      try {
        const ownerDocRef = doc(db, 'gymOwners', currentUser.uid);
        const ownerDoc = await getDoc(ownerDocRef);

        if (ownerDoc.exists()) {
          const data = ownerDoc.data();
          setGymOwner(data); // Store owner data
          const endDate = data.subscriptionEndDate?.toDate();
          if (endDate && new Date() > endDate) {
            setSubscriptionActive(false);
            toast({
              variant: 'destructive',
              title: 'انتهى اشتراكك',
              description: 'تم تسجيل خروجك. يرجى التواصل معنا لتجديد اشتراكك.',
            });
            await auth.signOut();
            router.push('/');
          } else {
            setSubscriptionActive(true);
          }
        } else if (required) {
          // This case might happen if user exists in auth but not in gymOwners collection
          // which is possible during signup flow. Let's not kick them out immediately.
          // The page logic should handle if gymOwner data is needed but missing.
          console.warn("User exists in auth, but no gymOwner document found.");
        }
      } catch (e) {
        console.error("Error checking subscription:", e);
        setSubscriptionActive(true); 
      }
    };

    if (!loading) {
        if (user) {
            checkAuthAndSubscription(user);
        } else if (required) {
            router.push('/');
        }
    }

  }, [user, loading, required, router, toast]);

  return { user, gymOwner, loading, error, isSubscriptionActive };
}
