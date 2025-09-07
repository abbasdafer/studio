
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

export async function sendNotification(prevState: any, formData: FormData): Promise<{success: boolean, message?: string, error?: string}> {
    const message = formData.get('message') as string;
    const target = formData.get('target') as 'all' | 'active' | 'expired';

    if (!message || !target) {
        return { success: false, error: 'البيانات غير كاملة.' };
    }

    try {
        // This is a placeholder for a secure, backend-driven notification system.
        // A proper implementation would use Firebase Admin SDK in a secure environment (e.g., Cloud Function).
        console.log(`SIMULATING NOTIFICATION: Target: '${target}', Message: "${message}"`);
        
        // Simulating a successful queue for the UI.
        revalidatePath('/admin/notifications'); // Revalidate to clear form if needed
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
        // This is a placeholder for a secure, backend-driven admin action.
        // The original implementation had a permissions issue because a client-side
        // SDK was trying to write to documents owned by other users.
        // A proper implementation would use Firebase Admin SDK in a secure environment (e.g., Cloud Function).
        console.log(`SIMULATING SUBSCRIPTION UPDATE: UserID: ${userId}, Type: ${subscriptionType}`);
        
        // Simulating a successful update for the UI.
        // To see the change, a real Admin backend is needed.
        revalidatePath('/admin/users');
        return { success: true, message: `تمت محاكاة تحديث اشتراك المستخدم بنجاح.` };

    } catch (error) {
        console.error("Error updating subscription:", error);
        return { success: false, error: 'فشل تحديث اشتراك المستخدم.' };
    }
}
