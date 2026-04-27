const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

function getSecret(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
    const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

async function testAI() {
  const apiKey = getSecret('OPENROUTER_API_KEY') || getSecret('OPENAI_API_KEY');
  
  if (!apiKey) {
    console.error('No API key found in .env');
    return;
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  try {
    const completion = await client.chat.completions.create({
      model: 'google/gemini-2.0-flash-001',
      messages: [{ role: 'user', content: 'Say OK' }],
    });
    console.log('Response:', completion.choices[0].message.content);
    console.log('SUCCESS');
  } catch (err) {
    console.log('ERROR_STATUS:', err.status);
    console.log('ERROR_MESSAGE:', err.message);
  }
}

testAI();
