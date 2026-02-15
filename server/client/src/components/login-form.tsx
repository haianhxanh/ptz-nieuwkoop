"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { authService } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

const loginSchema = z.object({
  username: z.string().min(1, "Uživatelské jméno je povinné"),
  password: z.string().min(1, "Heslo je povinné"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      console.log("Testing credentials against server...");
      const isValid = await authApi.testCredentials(data.username, data.password);
      console.log("Credentials valid:", isValid);

      if (!isValid) {
        toast.error("Nesprávné přihlašovací údaje");
        setIsLoading(false);
        return;
      }

      console.log("Storing credentials in cookie...");
      authService.login(data.username, data.password);

      toast.success("Přihlášení úspěšné!");
      console.log("Redirecting to /offers...");
      router.push("/offers");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Došlo k chybě při přihlášení");
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Přihlášení</CardTitle>
        <CardDescription>Zadejte přihlašovací údaje</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uživatelské jméno</FormLabel>
                  <FormControl>
                    <Input placeholder="admin" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heslo</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Přihlašování..." : "Přihlásit se"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
