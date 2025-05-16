const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/:user1/:user2', chatController.getMessagesBetweenUsers);

router.post('/send', chatController.sendMessage);

module.exports = router;
