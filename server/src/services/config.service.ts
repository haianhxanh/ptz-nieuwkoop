import { randomUUID } from "crypto";
import DmpConfig from "../model/dmp_config.model";

export class ConfigService {
  async getByKey(key: string): Promise<DmpConfig | null> {
    return await DmpConfig.findOne({ where: { key } });
  }

  async get(key: string): Promise<string | null> {
    const config = await this.getByKey(key);
    return config ? (config.get("value") as string) : null;
  }

  async set(key: string, value: string, description?: string): Promise<DmpConfig> {
    return await this.saveConfig(key, value, description);
  }

  async getExchangeRate(): Promise<number> {
    const rate = await this.get("EXCHANGE_RATE_EUR_CZK");
    return rate ? parseFloat(rate) : 25.0;
  }

  async setExchangeRate(rate: number): Promise<void> {
    await this.set("EXCHANGE_RATE_EUR_CZK", rate.toString(), "Exchange rate from EUR to CZK");
  }

  async getExchangeRateLastUpdated(): Promise<string | null> {
    const config = await DmpConfig.findOne({ where: { key: "EXCHANGE_RATE_EUR_CZK" } });
    if (!config) return null;
    const updatedAt = config.get("updatedAt") as Date | undefined;
    if (!updatedAt) return null;
    return new Date(updatedAt).toISOString().split("T")[0];
  }

  async getCompanyProfiles(): Promise<Array<{ companyName: string; companyIco: string; companyDic: string; logoUrl?: string; fakturoidSlug?: string }>> {
    const raw = await this.get("COMPANY_PROFILES");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((profile: any) => ({
        companyName: profile.companyName ?? profile.company_name ?? "",
        companyIco: profile.companyIco ?? profile.company_ico ?? "",
        companyDic: profile.companyDic ?? profile.company_dic ?? "",
        logoUrl: profile.logoUrl ?? profile.logo_url,
        fakturoidSlug: profile.fakturoidSlug ?? profile.fakturoid_slug,
      }));
    } catch {
      return [];
    }
  }

  async listAll(): Promise<DmpConfig[]> {
    return await DmpConfig.findAll({
      order: [["key", "ASC"]],
    });
  }

  async saveConfig(key: string, value: string, description?: string): Promise<DmpConfig> {
    const existing = await this.getByKey(key);
    const nextDescription = description !== undefined ? description : ((existing?.get("description") as string | null) ?? undefined);

    if (existing) {
      await existing.update({
        value,
        description: nextDescription,
      });
      return existing;
    }

    return await DmpConfig.create({
      id: randomUUID(),
      key,
      value,
      description: nextDescription,
    });
  }
}

export const configService = new ConfigService();
