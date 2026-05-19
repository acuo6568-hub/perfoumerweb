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
  apiUrl?: string;
}> {
  // If a remote rembg HTTP service is configured, report it as available
  const apiUrl = process.env.REMBG_API_URL;
  if (apiUrl) {
    return Promise.resolve({
      pythonAvailable: false,
      rembgAvailable: true,
      apiUrl,
    });
  }

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

  const apiUrl = process.env.REMBG_API_URL;
  if (apiUrl) {
    // Use remote rembg HTTP service (e.g., docker danielgatis/rembg)
    const inputData = await fs.readFile(inputPath);

    // Attempt to POST raw bytes to the remote service and write response
    try {
      const endpoint = apiUrl.replace(/\/$/, "") + "/v1/remove";
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
      };

      // Support an optional API key header for external services (e.g., Hugging Face)
      const apiKey = process.env.REMBG_API_KEY;
      const apiKeyHeader = process.env.REMBG_API_KEY_HEADER || "Authorization";
      if (apiKey) {
        headers[apiKeyHeader] = apiKey;
      }

      const resp = await fetch(endpoint, {
        method: "POST",
        headers,
        body: inputData,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Remote rembg service returned ${resp.status}: ${text}`);
      }

      const outBuf = Buffer.from(await resp.arrayBuffer());
      await fs.writeFile(outputPath, outBuf);
      return;
    } catch (err: any) {
      throw new Error(`Background removal via REMBG_API_URL failed: ${err.message}`);
    }
  }

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
If you run the Docker image as a service (recommended for serverless hosts), expose its port and set `REMBG_API_URL` in your environment, for example:

```bash
# run container
docker run -d -p 5000:5000 danielgatis/rembg:latest

# then in your .env.local or hosting env:
REMBG_API_URL=http://localhost:5000
```

### Option 4: Use an external inference API (Hugging Face / other)
If you prefer not to host the model yourself you can use an external inference API. Many providers require an API key and may have rate limits.

1. Obtain an API endpoint URL that accepts raw image bytes and returns the processed image (PNG) — e.g., a Hugging Face inference endpoint or another compatible service.
2. Set the endpoint and optional API key in your environment:

```env
REMBG_API_URL=https://api.your-provider.example/endpoint
REMBG_API_KEY=<your_api_key>
# Optionally override which header to send the key in (default: Authorization)
REMBG_API_KEY_HEADER=Authorization
```

The code will attach the API key header automatically when present.

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
