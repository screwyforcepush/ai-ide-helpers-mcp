import path from 'path';
import { generateText } from 'ai';
// Import the standard Google Vertex provider for Gemini models.
import { createVertex } from '@ai-sdk/google-vertex';
// Import the Anthropic provider for Claude models.
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
// Import the OpenAI provider.
import { openai } from '@ai-sdk/openai';

// Resolve the path to your Vertex AI credentials.
const credentialsPath = path.resolve(process.env.GOOGLE_SERVICE_KEY_PATH || '');

// Set up Vertex AI credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
// process.env.GOOGLE_VERTEX_PROJECT = 'litellm-429002';

// OpenAI API key should be set in the environment as OPENAI_API_KEY
// Verify we have the necessary environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY environment variable is not set. OpenAI models will not work.');
}

/**
 * Prompts the specified model with a given prompt and prints the response.
 * 
 * @param modelId - The model identifier (Claude, Gemini, or OpenAI model)
 * @param prompt - The prompt to send to the model.
 */
async function promptModel(modelId: string, prompt: string): Promise<string> {
  try {
    let modelInstance;
    
    console.error('[DEBUG]', process.env.GOOGLE_VERTEX_PROJECT, process.env.GOOGLE_VERTEX_LOCATION);
    // For Claude models, we need a different approach since they're through Anthropic
    if (modelId.startsWith('claude')) {
      // For Claude models using Vertex AI Anthropic
      process.env.GOOGLE_VERTEX_LOCATION = 'us-east5';
      const vertexAnthropic = createVertexAnthropic();
      modelInstance = vertexAnthropic(modelId);
    } else if (modelId.startsWith('gemini')) {
      // For Gemini models using Vertex AI
      process.env.GOOGLE_VERTEX_LOCATION = 'us-central1';
      const vertex = createVertex();
      modelInstance = vertex(modelId);
    } else if (modelId.startsWith('gpt') || modelId.startsWith('o3') || modelId.startsWith('o1') || modelId.startsWith('4o')) {
      // For OpenAI models
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      modelInstance = openai(modelId);
    } else {
      throw new Error(`Unsupported model: ${modelId}`);
    }

    const { text } = await generateText({
      model: modelInstance,
      prompt,
    });

    return text;
  } catch (error) {
    console.error(`Error prompting ${modelId}:`, error);
    return 'Error prompting '+modelId+': '+error;
  }
}

export async function callOpenAI(prompt: string, model: string = 'o3-mini'): Promise<string> {
  return promptModel(model, prompt);
}

export async function callVertexAI(prompt: string,  model: string = 'gemini-2.5-pro-exp-03-25'): Promise<string> {
  return promptModel(model, prompt);
}


export function cleanCommandResponse(content: string, defaultCommand: string): string {
  let cleanedContent = content.trim();
  
  // Remove markdown formatting if present
  if (cleanedContent.startsWith('```')) {
    const endIdx = cleanedContent.indexOf('```', 3);
    if (endIdx !== -1) {
      // Extract content between backticks
      cleanedContent = cleanedContent.substring(3, endIdx).trim();
      
      // Remove language identifier if present (like 'bash')
      if (cleanedContent.includes('\n')) {
        cleanedContent = cleanedContent.substring(cleanedContent.indexOf('\n')).trim();
      } else if (cleanedContent.startsWith('bash ')) {
        cleanedContent = cleanedContent.substring(5).trim();
      }
    }
  } else if (cleanedContent.startsWith('`') && cleanedContent.endsWith('`')) {
    // Handle single backticks
    cleanedContent = cleanedContent.substring(1, cleanedContent.length - 1).trim();
  }
  
  // Remove any "bash" prefix if it exists
  if (cleanedContent.startsWith('bash ')) {
    cleanedContent = cleanedContent.substring(5).trim();
  }
  
  // Clean up output
  cleanedContent = cleanedContent.replace(/\r?\n/g, ' ').trim();
  
  // Validate and return
  return cleanedContent || defaultCommand;
}

