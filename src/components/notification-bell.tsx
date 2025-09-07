
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { Bell, BellRing, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';

type Notification = {
  id: string;
  message: string;
  createdAt: { seconds: number; nanoseconds: number; };
  isRead: boolean;
};

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, `gymOwners/${userId}/notifications`),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    }, (error) => {
        console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    const notifRef = doc(db, `gymOwners/${userId}/notifications`, notificationId);
    try {
        await updateDoc(notifRef, { isRead: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    notifications.forEach(n => {
        if (!n.isRead) {
            handleMarkAsRead(n.id);
        }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
            <span>الإشعارات</span>
            {unreadCount > 0 && (
                 <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                    <Check className="ml-1 h-4 w-4"/>
                    تحديد الكل كمقروء
                </Button>
            )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <DropdownMenuItem key={notif.id} onSelect={() => !notif.isRead && handleMarkAsRead(notif.id)} className={`flex flex-col items-start gap-1 whitespace-normal ${!notif.isRead ? 'font-bold' : ''}`}>
                <p className="text-sm">{notif.message}</p>
                <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notif.createdAt.seconds * 1000), { addSuffix: true, locale: arSA })}
                </p>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            لا توجد إشعارات جديدة.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
