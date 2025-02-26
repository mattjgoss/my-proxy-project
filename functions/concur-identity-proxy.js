// functions/concur-identity-proxy.js
const https = require('https');

exports.handler = async function (event, context) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }
  
  // Retrieve token from query parameters
  const accessToken = event.queryStringParameters && event.queryStringParameters.token;
  if (!accessToken) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Access token missing" })
    };
  }
  
  // Set up the options for the API request.
  const options = {
    hostname: "us2.api.concursolutions.com",
    path: "/identity/v4/users/me",
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  };

  try {
    const identityResponse = await new Promise((resolve, reject) => {
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
      req.end();
    });
    return {
      statusCode: identityResponse.statusCode,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: identityResponse.body
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.body || "Unknown error" })
    };
  }
};
