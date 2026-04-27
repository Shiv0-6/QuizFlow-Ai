import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

function getSecret(key: string): string | undefined {
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
  const apiKey = getSecret('OPENROUTER_API_KEY');
  
  console.log('--- Debug Info ---');
  console.log('API Key Found:', apiKey ? 'YES (starts with ' + apiKey.substring(0, 10) + '...)' : 'NO');
  
  if (!apiKey) {
    console.error('ERROR: OPENROUTER_API_KEY is missing from .env');
    return;
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  try {
    console.log('--- Testing API Connectivity ---');
    const completion = await client.chat.completions.create({
      model: 'google/gemini-2.0-flash-001',
      messages: [{ role: 'user', content: 'Say "System OK"' }],
    });

    console.log('Response:', completion.choices[0].message.content);
    console.log('✅ SUCCESS: Your OpenRouter API key is valid and working!');
  } catch (err: any) {
    console.log('❌ FAILED: OpenRouter API Error');
    console.log('Error Message:', err.message);
    console.log('Status Code:', err.status);
    
    if (err.status === 401) {
      console.log('\n--- Troubleshooting ---');
      console.log('The key in your .env file is currently invalid.');
      console.log('Please get a fresh key from https://openrouter.ai/keys and replace the one in your .env file.');
    }
  }
}

testAI();
