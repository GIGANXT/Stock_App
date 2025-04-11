import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Correct Flask API URL
    const response = await fetch("http://148.135.138.22/aluminium/stream");

    // Read raw response
    const text = await response.text();

    // Debug log
    console.log("🔍 Raw response from Flask:", text);

    // Try parsing JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonError) {
      console.error("🚨 Error parsing JSON:", jsonError);
      return res.status(500).json({ error: "Invalid JSON from Flask API" });
    }

    // Check if API response is OK
    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    // Important: Always send a response
    return res.status(200).json({ success: true, data: data.data });
  } catch (error: unknown) {
    console.error("🚨 Error fetching aluminum price:", error instanceof Error ? error.message : String(error));

    // Important: Send error response
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

// import { NextApiRequest, NextApiResponse } from "next";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   try {
//     // ✅ Ensure we're using GET method
//     if (req.method !== "GET") {
//       return res.status(405).json({ error: "Method not allowed" });
//     }

//     // ✅ Correct Flask API URL for stream endpoint
//     const streamUrl = "http://localhost:5003/stream";

//     // ✅ Set up headers for SSE
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");

//     // ✅ Create connection to Flask SSE endpoint
//     const flaskResponse = await fetch(streamUrl);

//     // ✅ Check if API response is OK
//     if (!flaskResponse.ok) {
//       throw new Error(
//         `API error: ${flaskResponse.status} - ${flaskResponse.statusText}`
//       );
//     }

//     // ✅ Check if we got a readable stream
//     if (!flaskResponse.body) {
//       throw new Error("No streaming response from aluminum price API");
//     }

//    catch (error: any)  // ✅ Set up event stream handling
//     const reader = flaskResponse.body.getReader();
//     const decoder = new TextDecoder();

//     // Handle client disconnect
//     req.on("close", () => {
//       // Clean up the reader when client disconnects
//       reader.cancel();
//       res.end();
//       console.log("🔌 Client disconnected from SSE stream");
//     });

//     // ✅ Stream events to client
//     async function streamEvents() {
//       try {
//         while (true) {
//           const { done, value } = await reader.read();

//           if (done) {
//             console.log("✅ Stream closed by server");
//             break;
//           }

//           const chunk = decoder.decode(value, { stream: true });
//           res.write(chunk);
//         }
//       } catch (error) {
//         console.error("🚨 Error in stream:", error);
//         res.end();
//       }
//     }

//     // Start streaming
//     streamEvents();
//   } catch (error: any) {
//     console.error("🚨 Error setting up aluminum price stream:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// }
