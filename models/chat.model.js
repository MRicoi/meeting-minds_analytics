
const mongoose = require('mongoose');

// Schema de uma mensagem
const messageSchema = new mongoose.Schema({
  role: { type: String, required: true },     // 'user' ou 'assistant'
  content: { type: String, required: true },  // texto da mensagem
  timestamp: { type: Date, required: true }   // data da mensagem
}, { _id: false }); // _id: false para não criar IDs para sub-documentos

const chatSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  messages: [messageSchema], // Lista de mensagens usando o schema
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema, 'chats');

module.exports = Chat;