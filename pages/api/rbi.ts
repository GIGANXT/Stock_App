import { NextApiRequest, NextApiResponse } from "next";

type ExchangeRate = {
  date: string;
  rate: string;
};

type ApiResponse = {
  success?: boolean;
  data?: ExchangeRate[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const response = await fetch("http://148.135.138.22/rbi/scrape"); // Calls Flask API
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch data");
    }

    res.status(200).json({ success: true, data: data.data });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
