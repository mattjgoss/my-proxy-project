// Make sure this file is deployed to your Netlify function directory

const https = require("https");
const { getNewAccessToken } = require("./lib/refreshToken");

exports.handler = async function (event, context) {
  console.log("Concur Reports Proxy invoked with params:", event.queryStringParameters);

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "userId parameter missing" })
    };
  }

  // Add contextType parameter handling
  const contextType = event.queryStringParameters?.contextType;
  if (!contextType) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "contextType parameter missing" })
    };
  }

  // Validate contextType value
  const validContextTypes = ["TRAVELER", "MANAGER", "PROCESSOR", "PROXY"];
  if (!validContextTypes.includes(contextType)) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: `Invalid contextType: ${contextType}. Must be one of: TRAVELER, MANAGER, PROCESSOR, PROXY` })
    };
  }

  try {
    const { access_token } = await getNewAccessToken();

    const options = {
      hostname: "us2.api.concursolutions.com", 
      path: `/expensereports/v4/users/${userId}/context/${contextType}/reports`,
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${access_token}`
      }
    };

    console.log(`Requesting reports for user: ${userId} with context: ${contextType}`);

    const reportsResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", chunk => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              resolve({ statusCode: 200, body: JSON.parse(data) });
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error.message}`));
            }
          } else {
            reject(new Error(`Concur API error ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on("error", err => {
        reject(err);
      });

      req.end();
    });

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*", 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(reportsResponse.body)
    };
  } catch (error) {
    console.error("Error in reports proxy:", error.message);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message || "Internal Server Error" })
    };
  }
};