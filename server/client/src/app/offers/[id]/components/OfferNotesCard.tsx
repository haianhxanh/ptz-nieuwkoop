"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type OfferNotesCardProps = {
  value: string;
  onChange: (value: string) => void;
};

export function OfferNotesCard({ value, onChange }: OfferNotesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Poznámka</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Poznámka k nabídce..."
          rows={3}
        />
      </CardContent>
    </Card>
  );
}
