import axios, { AxiosResponse } from "axios";

const BASE_URL = "https://www.trade-tariff.service.gov.uk/api/v2";

export interface TariffData {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

export async function getTariffData(hsCode: string): Promise<TariffData | null> {
  try {
    const res: AxiosResponse<{ data: TariffData }> = await axios.get(
      `${BASE_URL}/commodities/${hsCode}`,
      {
        timeout: 10000,
      }
    );

    return res.data.data;
  } catch (err: any) {
    throw new Error(`TradeTariff API error: ${err.message}`);
  }
}
