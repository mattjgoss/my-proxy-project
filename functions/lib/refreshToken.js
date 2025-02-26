const https = require("https");
const querystring = require("querystring");

let cachedAccessToken = null;
let tokenExpiryTime = 0; // Timestamp when token expires

async function getNewAccessToken() {
  // Use cached token if it's still valid
  if (cachedAccessToken && Date.now() < tokenExpiryTime) {
    console.log("Using cached access token");
    return { access_token: cachedAccessToken };
  }

  console.log("Fetching a new access token...");

  const postData = querystring.stringify({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: process.env.REFRESH_TOKEN,
    scope: process.env.SCOPE || ""
  });

  const options = {
    hostname: "us.api.concursolutions.com",
    path: "/oauth2/v0/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            cachedAccessToken = parsed.access_token;
            tokenExpiryTime = Date.now() + (parsed.expires_in * 1000) - 30000; // Buffer 30 seconds before expiry
            console.log("New access token fetched successfully");
            resolve(parsed);
          } catch (err) {
            reject(new Error("Failed to parse token response: " + err.message));
          }
        } else {
          reject(new Error(`Token refresh failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

module.exports = {
  getNewAccessToken
};
