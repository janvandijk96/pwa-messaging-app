const axios = require('axios');
const logger = require('../utils/logger');

const ollamaClient = axios.create({
  baseURL: process.env.OLLAMA_API_URL || 'http://localhost:11434',
  timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 30000
});

const checkStatus = async () => {
  try {
    const response = await ollamaClient.get('/api/tags');
    const models = response.data.models || [];
    return {
      available: true,
      models: models.map(m => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at
      }))
    };
  } catch (err) {
    logger.warn('Ollama unavailable:', err.message);
    return {
      available: false,
      models: []
    };
  }
};

const generateResponse = async (prompt, model = 'mistral') => {
  try {
    const response = await ollamaClient.post('/api/generate', {
      model,
      prompt,
      stream: false
    });
    return response.data.response;
  } catch (err) {
    logger.error('Ollama generation error:', err.message);
    throw new Error('Failed to generate response');
  }
};

module.exports = { checkStatus, generateResponse };