
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { createOpenAI } = require('@ai-sdk/openai');
const { generateText } = require('ai');


const { getUserMessages } = require('./services/analysisService.js');
const { TopicsSchema } = require('./lib/schemas.js');

const app = express();
const PORT = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log("Conectado ao MongoDB!"))
  .catch((err) => console.error("Falha ao conectar:", err.message));

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get('/', (req, res) => res.send('Servidor de Análise está no ar!'));

app.get('/analisar-uso', async (req, res) => {
  try {
    // Pega e valida as datas da URL (ex: ?startDate=2025-08-23)
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate e endDate são parâmetros obrigatórios.' });
    }

    // Busca as mensagens
    console.log(`Buscando mensagens de ${startDate} até ${endDate}`);
    const userMessages = await getUserMessages(startDate, endDate);

    if (userMessages.length === 0) {
      return res.status(404).json({ message: 'Nenhuma mensagem de usuário encontrada no período.' });
    }

    console.log(`Encontradas ${userMessages.length} mensagens. Formatando para a IA...`);
    const formattedMessages = userMessages.join('\n---\n'); // Junta as mensagens

    // Prompt
    const systemPrompt = `Você é um analista de produto responsável por identificar principais usos de um chat com LLM.
Seu trabalho é ler um conjunto de mensagens enviadas por usuários no período informado e agrupar por tópicos de uso (ex.: “ajuste de texto”, “resumo de reunião/transcrição”, “dúvidas sobre conteúdo”, “tradução”, “explicação de código”, etc.).
Regras:
1. Foque no intento do usuário (o que ele queria fazer), não no conteúdo exato.
2. Crie de 3 a 12 tópicos. Una sinônimos e subdivida apenas quando realmente necessário.
3. Dê nomes curtos e autoexplicativos aos tópicos (ex.: “Reescrita e Tom de Voz”, “Resumo de Áudio/Transcrição”, “Q&A sobre PDF/Arquivo”).
4. Para cada tópico, forneça: topic (string curta), description (1–2 frases), support_count (número de mensagens que sustentam o tópico), example_messages (até 3 exemplos reais, truncados se longos), confidence (0–1, sua confiança na taxonomia).
5. Responda exclusivamente em JSON válido, seguindo estritamente o schema abaixo. Não inclua comentários, texto fora de JSON ou chaves extras.
Schema de saída:
{
  "topics": [ { "topic": "string", "description": "string", "support_count": 0, "example_messages": ["string"], "confidence": 0 } ],
  "simple_topics": ["string"]
}`;
    
    const context = `Análise de mensagens de usuários entre ${startDate} e ${endDate}.`;

    // Chama a IA
    console.log('Enviando para a IA para análise de tópicos...');
    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      prompt: `{{contexto}}\n${context}\n{{mensagens}}\n${formattedMessages}`
    });

    // Valida a resposta da IA com Zod
    console.log('Resposta da IA recebida. Validando o schema...');

const jsonStart = text.indexOf('{');
const jsonEnd = text.lastIndexOf('}');

if (jsonStart === -1 || jsonEnd === -1) {
  throw new Error("A resposta da IA não continha um objeto JSON válido.");
}

const jsonString = text.substring(jsonStart, jsonEnd + 1);
const aiResponse = JSON.parse(jsonString);
    const validatedResponse = TopicsSchema.parse(aiResponse);

    console.log('Validação bem-sucedida!');
    res.status(200).json(validatedResponse);

  } catch (error) {
    console.error("ERRO NO PROCESSO DE ANÁLISE:", error);
    // Identifica se o erro foi do Zod para dar uma resposta melhor
    if (error.name === 'ZodError') {
      return res.status(500).json({ error: 'A resposta da IA falhou na validação do schema.', details: error.issues });
    }
    res.status(500).json({ error: "Ocorreu um erro interno." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});