const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }
  // Extract the access token from a query parameter or header if needed.
  // For demo purposes, assume the client passes the token as a query parameter.
  const accessToken = event.queryStringParameters && event.queryStringParameters.token;
  if (!accessToken) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Access token missing" })
    };
  }
  
  const options = {
    hostname: "us.api.concursolutions.com",
    path: "/identity/v4/users/me",
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  };

  let identityResponse;
  try {
    identityResponse = await new Promise((resolve, reject) => {
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
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.body || "Error during Identity API call" })
    };
  }
  
  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: identityResponse.body
  };
};
