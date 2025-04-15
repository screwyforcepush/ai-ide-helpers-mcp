import fs from 'fs/promises';

// Debug logger
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
export function logDebug(...args: any[]): void {
  if (DEBUG) {
    console.error('[DEBUG]', ...args);
  }
}

/**
 * Utility function to limit text content by tokens
 * Uses dynamic import of gpt-tokenizer to avoid direct dependency
 * 
 * @param content The content to tokenize and limit
 * @param maxTokens The maximum number of tokens to allow
 * @param fallbackCharLimit The character limit to use if tokenization fails
 * @returns The content limited to maxTokens tokens, or a substring based on fallbackCharLimit
 */
export async function limitContentByTokens(
  content: string,
  maxTokens: number = 12000,
  fallbackCharLimit: number = 15000
): Promise<string> {
  logDebug(`Limiting content with max tokens: ${maxTokens}, fallback char limit: ${fallbackCharLimit}`);
  
  try {
    // Dynamically import the tokenizer to avoid direct dependency
    const { encode, decode } = await import('gpt-tokenizer');
    logDebug('Successfully loaded gpt-tokenizer');
    
    // Tokenize the content
    const tokens = encode(content);
    logDebug(`Content tokenized to ${tokens.length} tokens`);
    
    if (tokens.length <= maxTokens) {
      logDebug('Content is within token limit, returning as is');
      return content;
    }
    
    // Content exceeds token limit, trim it
    const limitedTokens = tokens.slice(0, maxTokens);
    const limitedContent = decode(limitedTokens) + "\n...\n";
    logDebug(`Content trimmed to ${maxTokens} tokens`);
    
    return limitedContent;
  } catch (err) {
    logDebug(`Error using tokenizer: ${err instanceof Error ? err.message : String(err)}`);
    
    // Fall back to character-based limiting if tokenization fails
    const limitedContent = content.length > fallbackCharLimit
      ? content.substring(0, fallbackCharLimit) + "\n...\n"
      : content;
    
    logDebug(`Falling back to character-based limiting. Content length: ${content.length}, trimmed to: ${limitedContent.length}`);
    return limitedContent;
  }
}
