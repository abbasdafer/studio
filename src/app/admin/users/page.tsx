
'use server';

import { UsersTable } from '@/components/admin/users-table';

// NOTE: This type is kept for future implementation with a secure backend.
export type GymOwnerAccount = {
  uid: string;
  email?: string;
  phone?: string;
  subscriptionEndDate: Date;
  status: 'Active' | 'Expired';
};

export default async function AdminUsersPage() {
  // IMPORTANT: The direct fetching of all gym owners from the client-side has been
  // disabled because it violates Firestore security rules. A normal user, even an admin,
  // should not have permission to read all user documents directly.
  //
  // This functionality should be replaced with a secure call to a backend service
  // (e.g., a Firebase Cloud Function) that runs with admin privileges.
  // The function would verify that the caller is an admin and then return the user list.
  //
  // For now, we return an empty array to prevent the app from crashing due to
  // permission errors. The UI will correctly display "No users to show".

  const owners: GymOwnerAccount[] = [];

  return <UsersTable users={owners} />;
}
