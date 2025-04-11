import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // ✅ Correct Flask API URL
    const response = await fetch("http://novexpro.co/sbitt/scrape-sbi-tt");

    // ✅ Read raw response
    const text = await response.text();

    // 🔍 Debugging log
    console.log("🔍 Raw response from Flask:", text);

    // ✅ Try parsing JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonError) {
      console.error("🚨 Error parsing JSON:", jsonError);
      return res.status(500).json({ error: "Invalid JSON from Flask API" });
    }

    // ✅ Check if API response is OK
    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    res.status(200).json({ success: true, data: data.data });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
