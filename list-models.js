const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Read .env.local to get the key
        const envPath = path.join(__dirname, '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);

        if (!match) {
            console.error('Could not find API key in .env.local');
            return;
        }

        const apiKey = match[1].trim();
        console.log('Found API Key (first 5 chars):', apiKey.substring(0, 5));

        const genAI = new GoogleGenerativeAI(apiKey);
        // Note: listModels is on the model manager, but SDK might expose it differently.
        // Actually, usually it's not directly on genAI instance in some versions.
        // Let's try to just use a model and see if we can get a list from an error or just try a known working one.
        // Wait, the error message said "Call ListModels".
        // In the Node SDK, it might be `genAI.getGenerativeModel({ model: ... })` doesn't have list.
        // We might need to use the REST API to list models if the SDK doesn't expose it easily.

        // Let's try to fetch the list via REST
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log('Error listing models:', data);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
