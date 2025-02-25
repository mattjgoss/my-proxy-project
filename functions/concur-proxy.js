const https = require('https');

// Retrieve credentials from environment variables
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

exports.handler = async function (event, context) {
  console.log("Function triggered with event:", JSON.stringify(event));

  if (event.httpMethod !== "POST") {
    console.log("Invalid HTTP method:", event.httpMethod);
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const postData = `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;

  const options = {
    hostname: "us.api.concursolutions.com",
    path: "/oauth2/v0/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData)
    }
  };

  let tokenResponse;
  try {
    tokenResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", chunk => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve({ statusCode: 200, body: data });
          } else {
            reject({ statusCode: res.statusCode, body: data });
          }
        });
      });
      req.on("error", err => reject({ statusCode: 500, body: err.message }));
      req.write(postData);
      req.end();
    });
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.body || "Unknown error" })
    };
  }

  return {
    statusCode: tokenResponse.statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    },
    body: tokenResponse.body
  };
};
