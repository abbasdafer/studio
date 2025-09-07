
"use client";

import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { sendNotification } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';
import { Loader2, Send } from 'lucide-react';

const initialState = {
  success: false,
  message: '',
  error: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
      <Send className="ml-2 h-4 w-4" />
      إرسال الإشعار
    </Button>
  );
}

export default function NotificationsPage() {
  const [state, formAction] = useFormState(sendNotification, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
      if (state?.success && state.message) {
        toast({ title: "نجاح", description: state.message });
        formRef.current?.reset();
      } else if (state?.error) {
        toast({ variant: "destructive", title: "خطأ", description: state.error });
      }
  }, [state, toast]);

  return (
    <form action={formAction} ref={formRef}>
      <Card>
        <CardHeader>
          <CardTitle>إرسال إشعارات للمستخدمين</CardTitle>
          <CardDescription>أرسل رسائل وإشعارات إلى أصحاب النوادي الرياضية.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="message">نص الرسالة</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="اكتب رسالتك هنا..."
              required
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label>الجمهور المستهدف</Label>
            <RadioGroup defaultValue="all" name="target" className="flex flex-col space-y-2">
              <div className="flex items-center space-x-3 space-x-reverse">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal">جميع المستخدمين</Label>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="font-normal">المستخدمون ذوو الاشتراك الفعال</Label>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse">
                <RadioGroupItem value="expired" id="expired" />
                <Label htmlFor="expired" className="font-normal">المستخدمون ذوو الاشتراك المنتهي</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </Card>
    </form>
  );
}
