
'use server';

import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UsersTable } from '@/components/admin/users-table';

export type GymOwnerAccount = {
  uid: string;
  email?: string;
  phone?: string;
  subscriptionEndDate: Date;
  status: 'Active' | 'Expired';
};

export default async function AdminUsersPage() {
  const ownersSnapshot = await getDocs(collection(db, 'gymOwners'));
  
  const owners: GymOwnerAccount[] = ownersSnapshot.docs.map(doc => {
    const data = doc.data();
    const endDate = (data.subscriptionEndDate as Timestamp).toDate();
    const status = new Date() > endDate ? 'Expired' : 'Active';
    return {
      uid: doc.id,
      email: data.email,
      phone: data.phone,
      subscriptionEndDate: endDate,
      status: status,
    };
  });

  return <UsersTable users={owners} />;
}
