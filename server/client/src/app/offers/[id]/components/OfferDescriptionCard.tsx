"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type OfferDescriptionCardProps = {
  value: string;
  onChange: (value: string) => void;
};

export function OfferDescriptionCard({ value, onChange }: OfferDescriptionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popis</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Přidat popis nabídky..." rows={4} />
      </CardContent>
    </Card>
  );
}
