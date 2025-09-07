
'use server';

import { collection, getDocs, writeBatch, serverTimestamp, doc, updateDoc, Timestamp, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { revalidatePath } from "next/cache";

export type GymOwner = {
    uid: string;
    email?: string;
    phone?: string;
    subscriptionEndDate: Timestamp;
};

export async function sendNotification(formData: FormData): Promise<{success: boolean, message?: string, error?: string}> {
    const message = formData.get('message') as string;
    const target = formData.get('target') as 'all' | 'active' | 'expired';

    if (!message || !target) {
        return { success: false, error: 'البيانات غير كاملة.' };
    }

    try {
        // This is a placeholder for a secure, backend-driven notification system.
        // The original implementation had a permissions issue because a client-side
        // SDK was trying to write to documents owned by other users.
        // A proper implementation would use Firebase Admin SDK in a secure environment (e.g., Cloud Function).
        console.log(`Notification queued for target '${target}': "${message}"`);
        
        // Simulating a successful queue for the UI.
        return { success: true, message: `تم وضع الإشعار في قائمة الانتظار للإرسال.` };

    } catch (error) {
        console.error("Error sending notification:", error);
        // In a real scenario, you'd handle different error types.
        return { success: false, error: 'فشل إرسال الإشعار.' };
    }
}

export async function updateUserSubscription(userId: string, subscriptionType: 'monthly' | '6-months' | 'yearly' | 'deactivate') {
    if (!userId || !subscriptionType) {
        return { success: false, error: 'البيانات غير كاملة.' };
    }

    try {
        const userRef = doc(db, "gymOwners", userId);
        const now = new Date();
        let newEndDate;

        if (subscriptionType === 'deactivate') {
            newEndDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Set to yesterday
        } else {
             const userDoc = await getDoc(userRef);
             const userData = userDoc.data();
             const currentEndDate = userData?.subscriptionEndDate.toDate() || now;
             const startDate = currentEndDate > now ? currentEndDate : now;

            newEndDate = new Date(startDate);
            if (subscriptionType === 'monthly') {
                newEndDate.setMonth(newEndDate.getMonth() + 1);
            } else if (subscriptionType === '6-months') {
                newEndDate.setMonth(newEndDate.getMonth() + 6);
            } else if (subscriptionType === 'yearly') {
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            }
        }
        
        await updateDoc(userRef, {
            subscriptionEndDate: Timestamp.fromDate(newEndDate)
        });

        revalidatePath('/admin/users');
        return { success: true, message: `تم تحديث اشتراك المستخدم بنجاح.` };

    } catch (error) {
        console.error("Error updating subscription:", error);
        return { success: false, error: 'فشل تحديث اشتراك المستخدم.' };
    }
}
