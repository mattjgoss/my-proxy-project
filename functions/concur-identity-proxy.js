const https = require('https');

exports.handler = async function (event, context) {
  console.log("Function invoked with event:", JSON.stringify(event));

  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    console.error("Invalid HTTP method:", event.httpMethod);
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  // Get the token from the query string
  const token = event.queryStringParameters && event.queryStringParameters.token;
  console.log("Extracted token (first 20 chars):", token ? token.substr(0, 20) + "..." : "none");

  if (!token) {
    console.error("Access token is missing in query parameters.");
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Access token missing" })
    };
  }

  // Set up the options for the API call to Concur's Identity API.
  // Note: Verify with Concur's documentation whether the hostname and path are correct.
  const options = {
    hostname: "us2.api.concursolutions.com",
    path: "/identity/v4/users/me",
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  };
  console.log("Request options for Concur API:", options);

  try {
    const identityResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        console.log("Concur API response status:", res.statusCode);
        res.on("data", chunk => { data += chunk; });
        res.on("end", () => {
          console.log("Concur API response body:", data);
          if (res.statusCode === 200) {
            resolve({ statusCode: 200, body: data });
          } else {
            reject({ statusCode: res.statusCode, body: data });
          }
        });
      });
      req.on("error", err => {
        console.error("HTTPS request error:", err);
        reject({ statusCode: 500, body: err.message });
      });
      req.end();
    });

    console.log("Successfully retrieved identity response");
    return {
      statusCode: identityResponse.statusCode,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: identityResponse.body
    };
  } catch (error) {
    console.error("Error in identity proxy:", error);
    return {
      statusCode: error.statusCode || 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.body || "Unknown error" })
    };
  }
};
