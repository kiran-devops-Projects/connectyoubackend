const express = require("express");
const router = express.Router();
const { getAIResponse } = require("../controllers/aiController");
const { validateAIRequest } = require("../middleware/validators");

router.post("/chat", validateAIRequest, getAIResponse);

module.exports = router;