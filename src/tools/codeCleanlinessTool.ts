import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Debug logger
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
function logDebug(...args: any[]): void {
  if (DEBUG) {
    console.error('[DEBUG]', ...args);
  }
}

// Tool result type - simplified to match what we need
interface ToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Analyze code cleanliness using knip
 * @returns Tool result with knip analysis results
 */
export async function analyzeCode(): Promise<ToolResult> {
  try {
    // Create a unique temp file name
    const tempDir = '.';
    const tempFile = path.join(tempDir, `knip-output-${Date.now()}.json`);
    
    logDebug('Running knip analysis...');
    
    // Create exec options with proper types
    const execOptions: ExecSyncOptionsWithStringEncoding = {
      stdio: 'pipe',
      encoding: 'utf-8'
    };
    
    // First check if knip is installed and available
    try {
      execSync('npx knip --version', execOptions);
      logDebug('Knip is available');
    } catch (error) {
      logDebug('Knip not available, attempting to install...');
      try {
        execSync('npm install -g knip', execOptions);
      } catch (installError) {
        throw new Error(`Failed to install knip: ${installError instanceof Error ? installError.message : String(installError)}`);
      }
    }
    
    // Run knip and direct its output to a file - avoid setting shell explicitly to use default
    try {
      logDebug(`Running knip with output to ${tempFile}`);
      execSync(`npx knip --reporter markdown > "${tempFile}"`, execOptions);
    } catch (error) {
      logDebug(`Knip command execution error: ${error instanceof Error ? error.message : String(error)}`);
      // Continue anyway, as knip might have created the file despite the error
    }
    
    // Check if the file exists
    let fileExists = false;
    try {
      await fs.access(tempFile);
      fileExists = true;
      logDebug('Knip output file exists');
    } catch (accessError) {
      logDebug(`Knip output file doesn't exist: ${accessError instanceof Error ? accessError.message : String(accessError)}`);
    }
    
    if (!fileExists) {
      // Get the current working directory
      let cwd = '';
      try {
        cwd = process.cwd();
        logDebug(`Current working directory: ${cwd}`);
      } catch (cwdError) {
        logDebug(`Error getting current working directory: ${cwdError instanceof Error ? cwdError.message : String(cwdError)}`);
        cwd = 'Unable to determine working directory';
      }
      
      return {
        content: [{ 
          type: 'text', 
          text: `Failed to run knip analysis: Could not create output file. Current working directory: ${cwd}`
        }]
      };
    }
    
    // Read the file contents
    let knipOutput: string;
    try {
      knipOutput = await fs.readFile(tempFile, 'utf-8');
      logDebug(`Read ${knipOutput.length} bytes from knip output file`);
    } catch (readError) {
      logDebug(`Error reading knip output file: ${readError instanceof Error ? readError.message : String(readError)}`);
      return {
        content: [{ 
          type: 'text', 
          text: `Failed to read knip output: ${readError instanceof Error ? readError.message : String(readError)}`
        }]
      };
    } finally {
      // Try to clean up the temp file, ignore errors
      try {
        await fs.unlink(tempFile);
        logDebug('Removed temp file');
      } catch (unlinkError) {
        logDebug(`Failed to remove temp file: ${unlinkError instanceof Error ? unlinkError.message : String(unlinkError)}`);
      }
    }
    
    if (!knipOutput || knipOutput.trim() === '') {
      logDebug('Knip output is empty');
      return {
        content: [{ 
          type: 'text', 
          text: "Knip analysis produced empty output"
        }]
      };
    }
    
    // Return the raw analysis results
    return {
      content: [{ type: 'text', text: knipOutput }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Code Cleanliness tool failed: ${error instanceof Error ? error.message : String(error)}` }]
    };
  }
}