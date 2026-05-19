import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Local background removal using Python's rembg library
 * No third-party APIs required - runs entirely on your server
 */

export interface RemoveBackgroundOptions {
  inputPath: string;
  outputPath: string;
  model?: "u2net" | "u2netp" | "u2net_human_seg" | "u2net_cloth_seg";
  alpha_matting?: boolean;
  alpha_matting_foreground_threshold?: number;
  alpha_matting_background_threshold?: number;
}

/**
 * Check if Python and rembg are installed
 */
export async function checkPythonSetup(): Promise<{
  pythonAvailable: boolean;
  rembgAvailable: boolean;
  pythonPath?: string;
  errorMessage?: string;
}> {
  return new Promise((resolve) => {
    const pythonProcess = spawn("python3", ["-c", "import rembg; print('OK')"]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0 && stdout.includes("OK")) {
        resolve({
          pythonAvailable: true,
          rembgAvailable: true,
          pythonPath: "python3",
        });
      } else if (stderr.includes("No module named 'rembg'")) {
        resolve({
          pythonAvailable: true,
          rembgAvailable: false,
          pythonPath: "python3",
          errorMessage: "Python is available but rembg is not installed",
        });
      } else {
        resolve({
          pythonAvailable: false,
          rembgAvailable: false,
          errorMessage: stderr || "Python not found",
        });
      }
    });

    pythonProcess.on("error", () => {
      resolve({
        pythonAvailable: false,
        rembgAvailable: false,
        errorMessage: "Could not spawn Python process",
      });
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      pythonProcess.kill();
    }, 5000);
  });
}

/**
 * Remove background from an image using local Python rembg
 */
export async function removeBackground(options: RemoveBackgroundOptions): Promise<void> {
  const {
    inputPath,
    outputPath,
    model = "u2net",
    alpha_matting = true,
    alpha_matting_foreground_threshold = 240,
    alpha_matting_background_threshold = 10,
  } = options;

  // Verify input file exists
  try {
    await fs.access(inputPath);
  } catch {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    // Build Python script to run rembg
    const pythonScript = `
import sys
from rembg import remove
from PIL import Image
import io

try:
    # Open input image
    with open('${inputPath}', 'rb') as f:
        input_data = f.read()
    
    # Remove background
    output_data = remove(
        input_data,
        model_name='${model}',
        alpha_matting=${alpha_matting},
        alpha_matting_foreground_threshold=${alpha_matting_foreground_threshold},
        alpha_matting_background_threshold=${alpha_matting_background_threshold},
    )
    
    # Save output
    with open('${outputPath}', 'wb') as f:
        f.write(output_data)
    
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {str(e)}', file=sys.stderr)
    sys.exit(1)
`;

    const pythonProcess = spawn("python3", ["-c", pythonScript], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000, // 2 minutes timeout for processing
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0 && stdout.includes("SUCCESS")) {
        resolve();
      } else {
        reject(
          new Error(
            `Background removal failed: ${stderr || "Unknown error"}. Make sure rembg is installed: pip install rembg`,
          ),
        );
      }
    });

    pythonProcess.on("error", (error) => {
      reject(
        new Error(
          `Failed to spawn Python process: ${error.message}. Make sure Python 3 is installed and in PATH.`,
        ),
      );
    });
  });
}

/**
 * Get setup instructions for the user
 */
export function getSetupInstructions(): string {
  return `
## Setup Background Removal (Free, Local, No API)

### Option 1: Use Python's rembg (Recommended)
1. Install Python 3.7 or higher: https://www.python.org/downloads/
2. Install rembg:
   \`\`\`bash
   pip install rembg
   \`\`\`
3. (Optional) Download a specific model for faster startup:
   \`\`\`bash
   rembg p
   \`\`\`

### Option 2: Using macOS with Homebrew
\`\`\`bash
brew install python3
pip3 install rembg
\`\`\`

### Option 3: Using Docker
If you prefer isolation, use Docker:
\`\`\`bash
docker pull danielgatis/rembg:latest
\`\`\`

### After Installation
Restart your Next.js server and try removing backgrounds again.

### Models Available
- u2net (default) - Fast and accurate for most images
- u2netp - Lightweight, faster
- u2net_human_seg - Optimized for people
- u2net_cloth_seg - Optimized for clothing

### Troubleshooting
If you get "ModuleNotFoundError: No module named 'rembg'":
1. Check Python is in PATH: \`which python3\`
2. Verify pip installation: \`pip3 --version\`
3. Reinstall rembg: \`pip3 install --upgrade rembg\`

First run will download the ML model (~500MB), subsequent runs are fast.
`;
}
