"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CompanyProfile } from "@/lib/api";

type OfferCompanyCardProps = {
  companyProfile: CompanyProfile | null;
  availableCompanies: CompanyProfile[];
  onChange: (profile: CompanyProfile) => void;
};

export function OfferCompanyCard({ companyProfile, availableCompanies, onChange }: OfferCompanyCardProps) {
  if (availableCompanies.length === 0) return null;

  const selectedName = companyProfile?.companyName ?? "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Nabídku připravuje:</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={selectedName}
          onValueChange={(name) => {
            const found = availableCompanies.find((c) => c.companyName === name);
            if (found) onChange(found);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Vyberte" />
          </SelectTrigger>
          <SelectContent>
            {availableCompanies.map((c) => (
              <SelectItem key={c.companyName} value={c.companyName}>
                {c.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {companyProfile && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {companyProfile.companyIco && <div>IČO: {companyProfile.companyIco}</div>}
            {companyProfile.companyDic && <div>DIČ: {companyProfile.companyDic}</div>}
            {companyProfile.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyProfile.logoUrl} alt={companyProfile.companyName} className="mt-2 h-8 object-contain" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
