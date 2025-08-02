"use client";

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';

export function useAuth(required = true) {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && required) {
      router.push('/');
    }
  }, [user, loading, required, router]);

  return { user, loading, error };
}
