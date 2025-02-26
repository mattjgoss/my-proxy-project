const https = require('https');

exports.handler = async function (event, context) {
  console.log("concur-identity-proxy invoked with event:", JSON.stringify(event));

  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    console.error("Invalid HTTP method:", event.httpMethod);
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  // Expect a 'username' query parameter
  const username = event.queryStringParameters && event.queryStringParameters.username;
  if (!username) {
    console.error("Missing 'username' parameter");
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "username parameter missing" })
    };
  }

  // Build the filter query according to the API documentation:
  // GET https://{datacenterURI}/profile/identity/v4/Users?filter=userName eq "username"
  const filter = `userName eq "${username}"`;
  const encodedFilter = encodeURIComponent(filter);

  const options = {
    hostname: "us2.api.concursolutions.com",
    path: `/profile/identity/v4/Users?filter=${encodedFilter}`,
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  };
  console.log("Request options for Concur Identity API:", options);

  try {
    const identityResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        console.log("Concur Identity API response status:", res.statusCode);
        res.on("data", chunk => { data += chunk; });
        res.on("end", () => {
          console.log("Concur Identity API response body:", data);
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

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(identityResponse.body);
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Error parsing JSON response" })
      };
    }

    // Expect the API to return a list of users in the Resources array
    if (jsonResponse.Resources && jsonResponse.Resources.length > 0) {
      const userId = jsonResponse.Resources[0].id;
      console.log("Retrieved userId:", userId);
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId })
      };
    } else {
      console.error("No user found for username:", username);
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "User not found" })
      };
    }
  } catch (error) {
    console.error("Error in identity proxy:", error);
    return {
      statusCode: error.statusCode || 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.body || "Unknown error" })
    };
  }
};
