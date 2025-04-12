import { NextApiRequest, NextApiResponse } from "next";
import { EventSource } from 'eventsource';

interface SSEData {
  Value: string;
  "Time span": string;
  "Rate of Change": string;
  Timestamp: string;
  error: null | string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let eventSource: EventSource | null = null;

  try {
    // First check if the external service is available
    try {
      const checkResponse = await fetch('http://148.135.138.22/aluminium/health');
      if (!checkResponse.ok) {
        throw new Error('External service is not available');
      }
    } catch (error) {
      console.error('External service check failed:', error);
      return res.status(503).json({
        error: 'External service is currently unavailable',
        details: error instanceof Error ? error.message : 'Connection failed'
      });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Create EventSource connection
    eventSource = new EventSource('http://148.135.138.22/aluminium/stream');

    let isFirstConnection = true;
    let connectionTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // Set initial connection timeout
    connectionTimeout = setTimeout(() => {
      if (isFirstConnection) {
        console.error('Initial connection timeout');
        if (eventSource) {
          eventSource.close();
        }
        if (!res.writableEnded) {
          res.status(504).json({ 
            error: 'Connection timeout',
            details: 'Failed to establish connection with external service'
          });
        }
      }
    }, 5000); // 5 second initial connection timeout

    // Handle connection open
    eventSource.onopen = () => {
      console.log('SSE Connection opened for LME Aluminium');
      isFirstConnection = false;
      retryCount = 0;
      clearTimeout(connectionTimeout);
    };

    // Handle incoming messages
    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const rawData = JSON.parse(event.data);
        if (rawData && rawData.data) {
          const data: SSEData = {
            Value: rawData.data.Value || "0",
            "Time span": rawData.data["Time span"] || new Date().toISOString(),
            "Rate of Change": rawData.data["Rate of Change"] || "0 ((0%))",
            Timestamp: rawData.data.Timestamp || new Date().toISOString(),
            error: null
          };
          
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ success: true, data })}\n\n`);
          }
        }
      } catch (error) {
        console.error('Error parsing LME message:', error);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ 
            error: 'Invalid data format',
            details: error instanceof Error ? error.message : 'Parse error'
          })}\n\n`);
        }
      }
    };

    // Handle errors
    eventSource.onerror = (event: Event) => {
      const error = event as ErrorEvent;
      console.error('SSE Error:', error);
      
      retryCount++;
      if (retryCount >= MAX_RETRIES) {
        if (eventSource) {
          eventSource.close();
        }
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ 
            error: 'Connection failed after multiple retries',
            details: error.message || 'Connection failed'
          })}\n\n`);
          res.end();
        }
      } else {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ 
            error: `Connection error - retrying (${retryCount}/${MAX_RETRIES})`,
            details: error.message || 'Connection failed'
          })}\n\n`);
        }
      }
    };

    // Handle client disconnect
    req.on('close', () => {
      clearTimeout(connectionTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (!res.writableEnded) {
        res.end();
      }
    });

  } catch (error: any) {
    // Clean up EventSource if it exists
    if (eventSource) {
      eventSource.close();
    }
    
    console.error('Server error:', error);
    if (!res.writableEnded) {
      res.status(500).json({
        error: 'Internal server error',
        details: error.message || 'Unknown error occurred'
      });
    }
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
