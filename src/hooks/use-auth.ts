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

  useEffect(() => {
    const checkAuthAndSubscription = async (currentUser: User | null | undefined) => {
      if (loading) return;

      if (!currentUser) {
        if (required) {
          router.push('/');
        }
        return;
      }
      
      // Check subscription status
      const ownerDocRef = doc(db, 'gymOwners', currentUser.uid);
      const ownerDoc = await getDoc(ownerDocRef);

      if (ownerDoc.exists()) {
        const data = ownerDoc.data();
        const endDate = data.subscriptionEndDate.toDate();
        if (new Date() > endDate) {
          setSubscriptionActive(false);
          toast({
            variant: 'destructive',
            title: 'Subscription Expired',
            description: 'Please renew your subscription to continue.',
          });
           // Log out the user and redirect
          await auth.signOut();
          router.push('/');
        } else {
          setSubscriptionActive(true);
        }
      } else if (required) {
        // This case might happen if user exists in auth but not in gymOwners collection
        setSubscriptionActive(false);
        toast({
          variant: 'destructive',
          title: 'Account Error',
          description: 'Could not find your subscription details.',
        });
        await auth.signOut();
        router.push('/');
      }
    };

    checkAuthAndSubscription(user);

  }, [user, loading, required, router, toast]);

  return { user, loading, error, isSubscriptionActive };
}
