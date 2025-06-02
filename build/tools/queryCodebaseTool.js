import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import { cleanCommandResponse } from './utils/responses.js';
import { callVertexAI } from './utils/responses.js';
import { logDebug, limitContentByTokens } from './utils/context.js';
/**
 * Query the codebase and return the raw repomix output
 * @param task The task description to analyze
 * @returns Tool result with the raw repomix output
 */
export async function queryCodebase(task, additionalContext) {
    try {
        logDebug(`Starting codebase query for task: "${task}"`);
        // Step 1: Get project structure using `tree`
        logDebug('Running tree command to get directory structure...');
        let treeOutput;
        // Define common spawn options with proper shell type
        const spawnOptions = {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'pipe'
        };
        try {
            const treeResult = spawnSync('tree', ['--prune', '-I', '.context|.cursor|.roo|build|.backup|public|magicui|ui|node_modules|coverage|test-results|playwright-report|types|assets|pnpm-lock.yaml|package-lock.yaml|*.lock|*.log|*.svg|assets|.next'], spawnOptions);
            if (treeResult.error) {
                throw new Error(`Tree command failed: ${treeResult.error.message}`);
            }
            if (treeResult.status !== 0) {
                throw new Error(`Tree command failed with exit code ${treeResult.status}: ${treeResult.stderr}`);
            }
            treeOutput = treeResult.stdout;
            logDebug(`Tree command output: ${treeOutput}`);
        }
        catch (err) {
            // If `tree` is not available or fails, throw an error
            const errorMsg = `Tree command required but failed: ${err instanceof Error ? err.message : err}`;
            logDebug(errorMsg);
            throw new Error(errorMsg);
        }
        // Step 2: Get a ripgrep search query 
        logDebug('Generating ripgrep command from OpenAI...');
        const ripgrepCommand = await getRipgrepCommand(task, treeOutput);
        logDebug('Suggested ripgrep command:', ripgrepCommand);
        // Step 3: Run the ripgrep command
        logDebug('Executing ripgrep command...');
        let ripgrepOutput = '';
        try {
            const rgResult = spawnSync('sh', ['-c', ripgrepCommand], spawnOptions);
            ripgrepOutput = rgResult.stdout;
            logDebug(`Ripgrep output: ${ripgrepOutput}`);
            logDebug(`Ripgrep exit code: ${rgResult.status}, stderr: ${rgResult.stderr}`);
            if (rgResult.status !== 0 && !ripgrepOutput) {
                logDebug('Ripgrep warning: search returned non-zero exit code:', rgResult.status);
            }
        }
        catch (err) {
            logDebug('Ripgrep execution error:', err instanceof Error ? err.message : err);
        }
        // Step 4: Get repomix command
        logDebug('Generating repomix command from OpenAI...');
        const repomixCommand = await getRepomixCommand(task, ripgrepOutput, treeOutput);
        logDebug('Suggested repomix command:', repomixCommand);
        // Step 5: Run the repomix command
        logDebug('Executing repomix command...');
        try {
            const repomixResult = spawnSync('sh', ['-c', repomixCommand], spawnOptions);
            if (repomixResult.error) {
                logDebug('Repomix error:', repomixResult.error);
            }
            if (repomixResult.status !== 0) {
                logDebug('Repomix warning:', repomixResult.status, 'stderr:', repomixResult.stderr);
            }
            else {
                logDebug('Repomix command completed successfully with exit code 0');
            }
        }
        catch (err) {
            logDebug('Repomix command execution warning:', err instanceof Error ? err.message : err);
        }
        // Read the generated output file
        logDebug('Reading repomix output file...');
        let repoContent = '';
        try {
            repoContent = await fs.readFile('repomix-output.txt', 'utf-8');
            logDebug(`Repomix output file size: ${repoContent.length} bytes`);
            logDebug(`Repomix output (first 1000 chars): ${repoContent.substring(0, 1000)}...`);
        }
        catch (err) {
            const errorMsg = 'Failed to read repomix-output.txt: ' + (err instanceof Error ? err.message : err);
            logDebug(errorMsg);
            throw new Error(errorMsg);
        }
        // Return the repomix output directly
        return {
            content: [{
                    type: 'text',
                    text: repoContent
                }]
        };
    }
    catch (error) {
        // Handle errors by returning an error message
        const errorMsg = `Codebase query failed: ${error instanceof Error ? error.message : error}`;
        logDebug(errorMsg);
        return {
            content: [{
                    type: 'text',
                    text: errorMsg
                }]
        };
    }
}
/**
 * Ask OpenAI to suggest a ripgrep command for the given task and project structure.
 */
async function getRipgrepCommand(task, fileStructure) {
    logDebug('Starting getRipgrepCommand()');
    const model = 'o3-mini';
    logDebug(`Using OpenAI model: ${model}`);
    // Use token-based limiting for the file structure
    const limitedFileStructure = await limitContentByTokens(fileStructure, 10000, 40000);
    logDebug(`File structure token-limited for the prompt`);
    const prompt = `You are SemanticLib. You are an expert in scouring a codebase to find the most relevant code or references.\n` +
        `you are given a project with the following structure:\n` +
        `${limitedFileStructure}\n\n` +
        `The solution architect has been tasked with: "${task}".\n` +
        `Suggest a ripgrep (rg) command that the Solution Architect should run at project root to find relevant code or references in the project. \n\n` +
        `focus on the key search patterns and related patterns.\n` +
        `Search current path. All code and test files will be searched while ignoring the usual suspects like node_modules, .git, .next, etc.\n` +
        `include the primary pattern and additional related patterns as needed to gather the most relevant context.\n\n` +
        `Respond only with the ripgrep command.\n` +
        `Response Format: \n` +
        `rg --ignore-case -e "{PRIMARY_PATTERN}" -e "{RELATED_PATTERN1}" -e "{RELATED_PATTERN2}" --sort path .`;
    logDebug(`Prompt for ripgrep command (first 100 chars): ${prompt.substring(0, 100)}...`);
    const content = await callVertexAI(prompt, model);
    // Default command if parsing fails
    const defaultRipgrepCmd = `rg -n "${task}" .`;
    // Clean the command using the shared helper function
    const cleanedCommand = cleanCommandResponse(content, defaultRipgrepCmd);
    // Ensure the command uses 'rg'
    if (!cleanedCommand.startsWith('rg')) {
        logDebug(`Command does not start with "rg", using default command. Current command: "${cleanedCommand}"`);
        return defaultRipgrepCmd;
    }
    return cleanedCommand;
}
/**
 * Ask OpenAI to suggest a repomix command based on the search results.
 */
async function getRepomixCommand(task, searchOutput, fileStructure) {
    logDebug('Starting getRepomixCommand()');
    // Use token-based limiting for the search output
    const searchSummary = await limitContentByTokens(searchOutput, 100000, 400000);
    logDebug(`Search output token-limited to approximately 100,000 tokens`);
    const prompt = `You are CodeContextSynthasis.\nYou have the knack for identifying which project files are relevant for a given task, which may be impacted. \nYou cherry pick the relevant files to produce the final context to inform the Solution Architect.\n
    Repomix is your tool of choice, it concatinates code files based on the pattern provided. \n\n` +
        `The task at hand is: "${task}"\n\n` +
        `Doing an initial Code Search we have found the following references to relevant terms:\n` +
        `${searchSummary}\n\n\n` +
        `Here is the full repo tree for context:\n` +
        `${fileStructure}\n\n\n` +
        `Based on the code search results, and repo tree, identify the files that are most relevant to the task. Include files from the repo if they are likly to be impacted when implementing the task, or provide critical context/patterns that will help the Solution Architect implement the task.\n` +
        `The Solution Architect will craft the full implementation plan for the task, based on the context you provide. Get them everything they need, without loading them up with unneeded context.\n` +
        `Suggest a repomix cli command to gather relevant context from the codebase.\n` +
        `repomix Usage:\n` +
        `To pack your entire repository:\n` +
        `\`\`\`bash\n` +
        `repomix\n` +
        `\`\`\`\n\n` +
        `To pack a specific directory:\n` +
        `\`\`\`bash\n` +
        `repomix path/to/directory\n` +
        `\`\`\`\n\n` +
        `To pack specific files or directories using glob patterns:\n` +
        `\`\`\`bash\n` +
        `repomix --include "src/**/*.ts,**/*.md,path/to/directory/file.ts"\n` +
        `\`\`\`\n\n` +
        `# Respond only with the repomix command. Aim to include about 10-20 files with the repomix command.\n\n`;
    logDebug(`Prompt for repomix command (first 100 chars): ${prompt.substring(0, 100)}...`);
    const content = await callVertexAI(prompt);
    // Default command if parsing fails
    const defaultRepomixCmd = 'npx -y repomix > repomix-output.txt';
    // Clean the command using the shared helper function
    let cleanedCommand = cleanCommandResponse(content, defaultRepomixCmd);
    // Default to npx repomix if needed
    if (!cleanedCommand.toLowerCase().includes('repomix')) {
        logDebug('Response does not include "repomix", using default command');
        cleanedCommand = defaultRepomixCmd;
    }
    else if (!cleanedCommand.includes('>')) {
        // Ensure output is redirected to a file
        logDebug('Adding output redirection to repomix command');
        cleanedCommand += ' > repomix-output.txt';
    }
    // Ensure using npx for repomix
    if (!cleanedCommand.startsWith('npx')) {
        // Check if we need to add npx, but make sure we don't add it if the command already has a bash prefix
        if (!cleanedCommand.startsWith('bash ')) {
            logDebug('Adding npx prefix to repomix command');
            cleanedCommand = 'npx -y ' + cleanedCommand;
        }
    }
    return cleanedCommand;
}
