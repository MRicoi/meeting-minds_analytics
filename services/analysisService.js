
const Chat = require('../models/chat.model.js');

/**
 * @param {string} startDate - "2025-08-23T00:00:00.000Z"
 * @param {string} endDate - "2025-09-23T23:59:59.999Z"
 * @returns {Promise<string[]>} - Array com os textos das mensagens dos usuários.
 */
async function getUserMessages(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const userMessagesResult = await Chat.aggregate([
    { $unwind: '$messages' },

    {
      $match: {
        'messages.role': 'user',
        'messages.timestamp': { $gte: start, $lte: end }
      }
    },

    { $replaceRoot: { newRoot: '$messages' } },

    { $project: { _id: 0, content: 1 } }
  ]);


  return userMessagesResult.map(msg => msg.content);
}

module.exports = { getUserMessages };