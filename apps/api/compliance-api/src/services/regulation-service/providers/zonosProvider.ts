import axios, { AxiosResponse } from "axios";

export interface ZonosComplianceResult {
  valid: boolean;
  issues: string[];
}

export interface ComplianceData {
  items: Array<{ name: string; category: string; value?: number }>;
  destination: string;
  origin: string;
}

export async function checkZonosCompliance(
  data: ComplianceData
): Promise<ZonosComplianceResult> {
  try {
    const res: AxiosResponse<ZonosComplianceResult> = await axios.post(
      "https://api.zonos.com/classify",
      {
        items: data.items,
        destination: data.destination,
        origin: data.origin,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ZONOS_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    return res.data;
  } catch (err: any) {
    throw new Error(`Zonos API error: ${err.message}`);
  }
}
