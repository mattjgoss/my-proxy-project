const https = require("https");
const { getNewAccessToken } = require("./lib/refreshToken");

exports.handler = async function (event, context) {
  console.log("Concur Reports Proxy invoked");

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

  try {
    const { access_token } = await getNewAccessToken();

    const options = {
      hostname: "us2.api.concursolutions.com", // Notice us2 instead of us
      path: `/expensereports/v4/users/${userId}/context/TRAVELER/reports`,
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${access_token}`
      }
    };

    console.log(`Requesting reports for user: ${userId}`);

    const reportsResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", chunk => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve({ statusCode: 200, body: JSON.parse(data) });
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
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};