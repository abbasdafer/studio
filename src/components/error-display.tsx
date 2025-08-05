"use client";

import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  title: string;
  message: string;
}

export function ErrorDisplay({ title, message }: ErrorDisplayProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center text-destructive"
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm">{message}</p>
      <p className="mt-4 text-xs text-destructive/80">
        تم تسجيل تفاصيل هذا الخطأ. يرجى المحاولة مرة أخرى أو الاتصال بالدعم إذا استمرت المشكلة.
      </p>
    </div>
  );
}
