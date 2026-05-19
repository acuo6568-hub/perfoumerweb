# Custom Background Removal Setup

## Overview

Your Perfoumer app now has a **custom, local background removal feature** with no external APIs or third-party services needed. It uses Python's `rembg` library to intelligently remove backgrounds from product images.

### Benefits
✅ **Free** - No API costs  
✅ **Local** - Everything runs on your server  
✅ **Unlimited** - No rate limits  
✅ **Fast** - Usually completes in 2-5 seconds  
✅ **Quality** - Uses state-of-the-art ML models  
✅ **Private** - Images never leave your server  

---

## Installation

### macOS (Recommended)

**Step 1: Install Python 3.7+**
```bash
# Using Homebrew (fastest)
brew install python3

# Or download from: https://www.python.org/downloads/
```

**Step 2: Install rembg**
```bash
pip3 install rembg
```

**Step 3: Verify Installation**
```bash
python3 -c "import rembg; print('✅ rembg installed successfully')"
```

**Step 4: Restart Your Server**
```bash
# Stop your dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Linux (Ubuntu/Debian)

```bash
# Install Python and pip
sudo apt-get update
sudo apt-get install python3 python3-pip

# Install rembg
pip3 install rembg

# Verify
python3 -c "import rembg; print('✅ rembg installed successfully')"
```

### Windows

```powershell
# Download Python 3.7+ from https://www.python.org/downloads/
# Or use Chocolatey:
choco install python

# Install rembg
pip install rembg

# Verify
python -c "import rembg; print('✅ rembg installed successfully')"
```

### Using Docker (Optional, for isolation)

If you prefer not to install Python directly:

```bash
# Pull the official rembg image
docker pull danielgatis/rembg:latest

# Run it as a service
docker run -d -p 5000:5000 danielgatis/rembg
```

Then update your `.env.local`:
```
REMBG_API_URL=http://localhost:5000
```

### Writable CSV fallback
If your host's filesystem is read-only (serverless), you can point CSV writes to a writable directory or temp mount by adding:

```env
# Directory where the app can write fallback CSVs (optional). Defaults to OS temp dir.
WRITABLE_DATA_DIR=/path/to/writable/dir
```

When `WRITABLE_DATA_DIR` is set, the app will save `perfm77.csv` there if it cannot write to `data/perfm77.csv`.

### Admin image uploads on read-only hosts
The admin upload endpoint writes to `public/uploads/admin/...` by default. If your host is read-only, configure S3 so uploads still work:

```env
S3_BUCKET=your-bucket-name
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# Optional public URL base for the bucket/CDN
S3_PUBLIC_URL=https://cdn.example.com
```

If S3 is set, the admin image upload API will store files there automatically and return a public URL that the admin panel can save.

### Uploading processed images to S3
If you want processed images uploaded automatically to S3 (instead of returning base64), set these environment variables:

```env
S3_BUCKET=your-bucket-name
AWS_REGION=your-aws-region
# AWS credentials can be provided via standard env vars:
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# Optional custom public URL base (e.g. CloudFront)
S3_PUBLIC_URL=https://cdn.example.com
```

If S3 is configured, the admin remove-bg API will upload processed images to `uploads/admin/<type>/...` and return a public `newImageUrl`.

---

## First Run

When you click "Remove Background" for the first time:
1. Python will download the ML model (~500MB)
2. This takes 2-5 minutes on first run
3. Subsequent runs are much faster (2-5 seconds)

The model is cached locally, so it won't download again.

---

## Usage

### In the Admin Panel

1. Go to **Admin Panel** → **Perfumes** (or **Notes**)
2. Click on a perfume/note to edit
3. In the **Media** tab, find the **Remove Background** button (✨)
4. Click it to remove the background
5. The new image appears instantly

### What You Get

- **PNG with transparency** - Perfect for web use
- **Optimized file size** - Usually smaller than originals
- **Preserved quality** - High-quality output for product images
- **Backup original** - Original image is preserved

### Models

The system uses the **u2net** model by default. Other available models:

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| u2net | Normal | Excellent | All images (default) |
| u2netp | Fast | Good | Quick processing |
| u2net_human_seg | Normal | Excellent | People, fashion |
| u2net_cloth_seg | Normal | Excellent | Clothing products |

---

## Troubleshooting

### Error: "Python is not installed or not in PATH"

**Solution:**
1. Verify Python is installed: `python3 --version`
2. Add Python to PATH:
   - **macOS/Linux**: Usually automatic with Homebrew
   - **Windows**: Reinstall Python and check "Add Python to PATH"
3. Restart your terminal and server

### Error: "Python is available but rembg library is not installed"

**Solution:**
```bash
# Reinstall rembg
pip3 install --upgrade rembg

# Verify installation
python3 -c "import rembg; print('OK')"

# Then restart your server
```

### Error: "Input image file not found"

**Solution:**
- Make sure you've already uploaded the image to the admin panel
- Images must be stored locally (not remote URLs)
- Check file permissions: `chmod 644 public/uploads/admin/perfumes/*`

### Error: "Write permission denied"

**Solution:**
```bash
# Fix directory permissions
chmod 755 public/uploads/admin/perfumes
chmod 755 public/uploads/admin/notes
```

### Slow Performance

**Try:**
```bash
# Download model cache in advance (optional)
rembg p
# This pre-caches the model, making first real use faster
```

### High Memory Usage

The rembg model requires ~2GB RAM during processing. If you have limited resources:
- Use the lightweight `u2netp` model
- Process images during off-peak hours
- Increase swap space: `sudo dd if=/dev/zero of=/swapfile bs=1G count=2; sudo chmod 600 /swapfile; sudo mkswap /swapfile; sudo swapon /swapfile`

---

## Configuration

### Environment Variables (Optional)

Add to `.env.local` if needed:

```env
# Use a specific Python version
PYTHON_PATH=/usr/local/bin/python3

# Model to use (default: u2net)
REMBG_MODEL=u2net

# Temp directory for processing (default: .tmp)
REMBG_TEMP_DIR=.tmp
```

---

## Performance Metrics

Typical performance on a standard machine:

- **First run**: 2-5 minutes (downloads model)
- **Subsequent runs**: 2-5 seconds per image
- **Memory usage**: ~2GB during processing
- **Model size**: ~500MB (cached locally)

---

## Advanced: Batch Processing

To process multiple images at once:

```bash
# From your project root:
python3 << 'EOF'
from rembg import remove
import os
from PIL import Image

input_dir = "public/uploads/admin/perfumes"
output_dir = "public/uploads/admin/perfumes/no-bg"

os.makedirs(output_dir, exist_ok=True)

for filename in os.listdir(input_dir):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, f"{filename.split('.')[0]}-nobg.png")
        
        print(f"Processing {filename}...")
        with open(input_path, 'rb') as f:
            input_data = f.read()
        
        output_data = remove(input_data)
        
        with open(output_path, 'wb') as f:
            f.write(output_data)
        
        print(f"✅ Saved to {output_path}")

print("Done!")
EOF
```

---

## Security & Privacy

✅ **Images never leave your server**  
✅ **No cloud storage involved**  
✅ **No tracking or analytics**  
✅ **Full data control**  

All processing happens locally on your machine. The ML model is downloaded from GitHub (open-source), but your images are never sent anywhere.

---

## Support & Resources

- **rembg GitHub**: https://github.com/danielgatis/rembg
- **rembg Issues**: https://github.com/danielgatis/rembg/issues
- **Python Installation**: https://python.org
- **Troubleshooting**: See "Troubleshooting" section above

---

## License

- **rembg**: MIT License (Open Source)
- **ML Models**: Used for non-commercial purposes by default
- **Your Images**: 100% owned by you

---

Questions? Check the error message in the admin panel—it will guide you through setup!
