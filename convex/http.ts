import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Tracking pixel endpoint
http.route({
  path: "/track/pixel.gif",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const emailId = url.searchParams.get("id");
    const recipientEmail = url.searchParams.get("email");
    
    if (emailId && recipientEmail) {
      // Get user agent and IP from headers
      const userAgent = request.headers.get("user-agent") || "";
      const ipAddress = request.headers.get("x-forwarded-for") || 
                       request.headers.get("x-real-ip") || 
                       "";
      
      // Filter out known email proxies and scanners
      const isGoogleProxy = userAgent.includes("GoogleImageProxy") || 
                           userAgent.includes("ggpht.com");
      
      const isGoogleIP = ipAddress.startsWith("66.249.") ||  // Google crawlers
                        ipAddress.startsWith("66.102.") ||  // Google crawlers
                        ipAddress.startsWith("74.125.") ||  // Google servers
                        ipAddress.startsWith("108.177.") || // Google servers
                        ipAddress.startsWith("172.253.");   // Google servers
      
      const isOutlookProxy = userAgent.includes("Outlook") || 
                            userAgent.includes("Microsoft");
      
      const isAppleProxy = userAgent.includes("AppleMailProxy");
      
      const isYahooProxy = userAgent.includes("YahooMailProxy");
      
      // Filter out email security scanners
      const isSecurityScanner = userAgent.includes("AHC/") ||  // Asynchronous HTTP Client (security scanners)
                               userAgent.includes("Proofpoint") ||
                               userAgent.includes("Mimecast") ||
                               userAgent.includes("Barracuda") ||
                               userAgent.includes("HeadlessChrome") ||  // Automated browser testing
                               userAgent.includes("PhantomJS") ||       // Headless browser
                               userAgent.includes("Selenium");          // Automated testing
      
      // Only filter if it's explicitly a proxy or scanner, not just a Google IP
      const shouldFilter = isGoogleProxy || isOutlookProxy || isAppleProxy || isYahooProxy || isSecurityScanner;
      
      // Track all opens (we'll filter less aggressively)
      if (!shouldFilter) {
        await ctx.runMutation(api.emailTracking.trackEmailOpen, {
          emailId,
          recipientEmail,
          userAgent: userAgent || undefined,
          ipAddress: ipAddress || undefined,
        });
      }
    }
    
    // Return a 1x1 transparent GIF
    // Base64 encoded 1x1 transparent GIF
    const base64Gif = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const binaryString = atob(base64Gif);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  }),
});

// Unsubscribe endpoint
http.route({
  path: "/unsubscribe",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    
    if (!email) {
      return new Response("Missing email parameter", { status: 400 });
    }
    
    // Save unsubscribe
    await ctx.runMutation(api.unsubscribe.unsubscribe, { email });
    
    // Return HTML page
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - DayBridge</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin: 0 0 16px 0;
      font-size: 28px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .email {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      color: #333;
      margin: 20px 0;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>✓ You've been unsubscribed</h1>
    <p>We've removed your email from our mailing list:</p>
    <div class="email">${email}</div>
    <p>You won't receive any more emails from us.</p>
    <p>If this was a mistake, feel free to reach out at <a href="mailto:hello@daybridge.app">hello@daybridge.app</a></p>
  </div>
</body>
</html>
    `;
    
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }),
});

export default http;
