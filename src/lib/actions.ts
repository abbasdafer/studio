
'use server';

import { collection, getDocs, writeBatch, serverTimestamp, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { revalidatePath } from "next/cache";

export type GymOwner = {
    uid: string;
    email?: string;
    phone?: string;
    subscriptionEndDate: Timestamp;
};

export async function sendNotification(formData: FormData) {
    const message = formData.get('message') as string;
    const target = formData.get('target') as 'all' | 'active' | 'expired';

    if (!message || !target) {
        return { success: false, error: 'البيانات غير كاملة.' };
    }

    try {
        const batch = writeBatch(db);
        const gymOwnersSnapshot = await getDocs(collection(db, "gymOwners"));
        
        let targetedOwners: GymOwner[] = [];
        const now = new Date();

        gymOwnersSnapshot.forEach(doc => {
            const owner = { uid: doc.id, ...doc.data() } as GymOwner;
            const endDate = owner.subscriptionEndDate.toDate();

            if (target === 'all') {
                targetedOwners.push(owner);
            } else if (target === 'active' && endDate > now) {
                targetedOwners.push(owner);
            } else if (target === 'expired' && endDate <= now) {
                targetedOwners.push(owner);
            }
        });

        if (targetedOwners.length === 0) {
            return { success: true, message: 'لم يتم العثور على مستخدمين مطابقين للمعايير.' };
        }

        targetedOwners.forEach(owner => {
            const notificationRef = doc(collection(db, `gymOwners/${owner.uid}/notifications`));
            batch.set(notificationRef, {
                message,
                target,
                isRead: false,
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();

        return { success: true, message: `تم إرسال الإشعار بنجاح إلى ${targetedOwners.length} مستخدم.` };

    } catch (error) {
        console.error("Error sending notification:", error);
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
