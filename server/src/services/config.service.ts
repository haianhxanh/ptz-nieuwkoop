import Config from "../model/config.model";

export class ConfigService {
  async get(key: string): Promise<string | null> {
    const config = await Config.findOne({ where: { key } });
    return config ? (config.get("value") as string) : null;
  }

  async set(key: string, value: string, description?: string): Promise<Config> {
    const [config] = await Config.upsert({
      key,
      value,
      description,
    });
    return config;
  }

  async getExchangeRate(): Promise<number> {
    const rate = await this.get("EXCHANGE_RATE_EUR_CZK");
    return rate ? parseFloat(rate) : 25.0;
  }

  async setExchangeRate(rate: number): Promise<void> {
    await this.set("EXCHANGE_RATE_EUR_CZK", rate.toString(), "Exchange rate from EUR to CZK");
  }

  async getExchangeRateLastUpdated(): Promise<string | null> {
    const config = await Config.findOne({ where: { key: "EXCHANGE_RATE_EUR_CZK" } });
    if (!config) return null;
    const updatedAt = config.get("updated_at") as Date | undefined;
    if (!updatedAt) return null;
    return new Date(updatedAt).toISOString().split("T")[0];
  }

  async listAll(): Promise<Config[]> {
    return await Config.findAll({
      order: [["key", "ASC"]],
    });
  }
}

export const configService = new ConfigService();
