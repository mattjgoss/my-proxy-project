const https = require("https");
const { getNewAccessToken } = require("./lib/refreshToken");

exports.handler = async function (event, context) {
  console.log("Concur Identity Proxy invoked");

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const username = event.queryStringParameters?.username;
  if (!username) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "username parameter missing" })
    };
  }

  try {
    const { access_token } = await getNewAccessToken();
    const encodedFilter = encodeURIComponent(`userName eq "${username}"`);

    const options = {
      hostname: "us2.api.concursolutions.com",
      path: `/profile/identity/v4/Users?filter=${encodedFilter}`,
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${access_token}`
      }
    };

    console.log(`Requesting user info for: ${username}`);

    const identityResponse = await new Promise((resolve, reject) => {
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

    if (identityResponse.body.Resources?.length > 0) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ userId: identityResponse.body.Resources[0].id })
      };
    } else {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "User not found" })
      };
    }
  } catch (error) {
    console.error("Error in identity proxy:", error.message);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
