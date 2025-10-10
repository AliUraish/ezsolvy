import { config } from 'dotenv';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { Input } from 'Frontend/ezsolvy-app/components/ui/input';

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

// Initialize OpenAI and Google Generative AI clients
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const googleGenerativeAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

//Check for OpenAI API Key
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
}

//Check for Google Generative AI API Key

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
}

//Check if both API Keys are set
if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('OPENAI_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY are not set');
}

//Check for Input Text
const result = await openai.chat.completions.create({
    model: "gpt-5",
    input: [
        {
            role: "user",
            content: [
                { type:'input_text' , text: "input_text" },
                { type:'input_image' , image_base64: "imageBase64" },

            ],
        },
        {
            
        }
    ]
});
const TOOL_MAP = {
    "no_line_break": no_line_break,
    "line_break": line_break,
}
