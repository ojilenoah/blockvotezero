import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  nin: z
    .string()
    .min(11, { message: "NIN must be 11 digits" })
    .max(11, { message: "NIN must be 11 digits" })
    .regex(/^\d+$/, { message: "NIN must contain only numbers" }),
});

interface NinLoginFormProps {
  onComplete: () => void;
}

export function NinLoginForm({ onComplete }: NinLoginFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nin: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // In a real app, this would validate the NIN against a server
    toast({
      title: "NIN verified",
      description: "Please complete the liveness check",
    });
    
    // Move to the next step
    onComplete();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Voter Verification</CardTitle>
        <CardDescription>Please enter your National Identity Number</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>National Identity Number (NIN)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter 11-digit NIN"
                      {...field}
                      maxLength={11}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}