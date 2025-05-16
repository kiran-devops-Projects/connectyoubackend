const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin-sdk.json"); // Your Firebase JSON file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
