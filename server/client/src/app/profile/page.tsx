"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usersApi, type User } from "@/lib/api";
import { toast } from "sonner";
import { User as UserIcon } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi
      .getMe()
      .then((d) => {
        if (d.success) setUser(d.data);
      })
      .catch(() => toast.error("Nepodařilo se načíst profil"))
      .finally(() => setLoading(false));
  }, []);

  const fields = [
    { label: "Email", value: user?.email },
    { label: "Jméno", value: user?.name },
    { label: "Telefon", value: user?.phone },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container mx-auto max-w-lg px-4 py-10">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Můj profil</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-6 text-center text-muted-foreground">Načítání...</div>
            ) : (
              <dl className="space-y-4">
                {fields.map(({ label, value }) => (
                  <div key={label} className="flex justify-between border-b pb-3 last:border-0 last:pb-0">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium">{value || <span className="text-muted-foreground">—</span>}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
