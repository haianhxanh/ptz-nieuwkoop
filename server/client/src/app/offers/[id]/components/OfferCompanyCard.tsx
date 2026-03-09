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

  const selectedName = companyProfile?.company_name ?? "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Nabídku připravuje:</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={selectedName}
          onValueChange={(name) => {
            const found = availableCompanies.find((c) => c.company_name === name);
            if (found) onChange(found);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Vyberte" />
          </SelectTrigger>
          <SelectContent>
            {availableCompanies.map((c) => (
              <SelectItem key={c.company_name} value={c.company_name}>
                {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {companyProfile && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {companyProfile.company_ico && <div>IČO: {companyProfile.company_ico}</div>}
            {companyProfile.company_dic && <div>DIČ: {companyProfile.company_dic}</div>}
            {companyProfile.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyProfile.logo_url} alt={companyProfile.company_name} className="mt-2 h-8 object-contain" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
