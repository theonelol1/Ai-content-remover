# PurePixel Studio - AI Media & Metadata Suite

A high-performance, 100% private, client-side web application for stripping AI metadata, removing watermarks, and optimizing digital media for social platforms.

All processing occurs directly inside the browser using WebAssembly, HTML5 Canvas, and binary ArrayBuffers. **No media files are ever uploaded to any external server.**

---

## ✨ Features

### 1. 🛡️ Lossless AI Metadata & C2PA Stripper
- **Lossless Binary Parsing**: Strips AI tags directly at the byte level without re-encoding, preserving 100% of original image quality and sharpness.
- **Deep Clean Engine**: Eliminates C2PA JUMBF manifests (`APP11` in JPEG, `c2pa` and `caBX` chunks in PNG), IPTC `trainedAlgorithmicMedia` flags, and Adobe XMP generation histories.
- **Prompt & Parameter Scrubbing**: Removes text generation prompts, negative prompts, seeds, steps, and sampler metadata left by Midjourney, Stable Diffusion, DALL-E, Flux, and Ideogram.
- **Supported Formats**: JPEG, PNG, WebP, and MP4.

### 2. 📷 Camera Stealth Mode (Authentic EXIF Injection)
Neutralizes secondary automated scans on social networks by replacing blank metadata with realistic digital camera EXIF headers:
- **Sony Alpha 7 IV** (`ILCE-7M4` + `FE 24-70mm F2.8 GM II`)
- **Canon EOS R5** (`RF 24-70mm F2.8 L IS USM`)
- **Apple iPhone 15 Pro** (48MP Main f/1.78)
- **Fujifilm X-T5** (`XF 33mm F1.4 R`)
- **Nikon Z 8** (`NIKKOR Z 50mm f/1.2 S`)

### 3. 🌐 Social Platform AI Risk Matrix
Provides real-time compliance and risk assessment before uploading to major platforms:
- **LinkedIn**: Flagging status, IPTC compliance, and feed penalty risk.
- **Instagram & Meta**: Detection of C2PA manifests and automatic "Made with AI" badge triggers.
- **TikTok**: Verification of algorithmic content labeling criteria.
- **Google Search**: Assessment of synthetic media provenance flags.

### 4. 🖼️ Image Watermark Remover
- **Reverse Alpha Unblending**: Mathematical unblending calibrated for corner badges to recover original underlying pixel values without blurring.
- **Content-Aware Inpainting**: Fast boundary diffusion for custom or non-uniform watermark areas.
- **Batch Processing**: Clean multiple files simultaneously and download all results in a single ZIP archive.

### 5. 🎬 Video Watermark Remover
- **Frame-by-Frame Processing**: Client-side video processing for MP4, WebM, and MOV files.
- **Full Audio Preservation**: Routes original audio streams via the Web Audio API to prevent audio loss or sync drift.
- **Side-by-Side Preview**: Real-time progress monitoring with live frame rendering.

### 6. 🎞️ Anti-AI Analog Humanizer
- **Micro-Dither Perturbation**: Applies imperceptible, organic photographic film-grain dithering across high-frequency color channels.
- **Frequency Disruption**: Disrupts latent diffusion periodicity and synthetic frequency harmonics used by AI classifiers.

### 7. 📋 Global Clipboard Support
- **`Ctrl + V` / `Cmd + V` Paste**: Instant image import from your clipboard anywhere on the page for maximum workflow speed.
- **Drag & Drop**: Native drag-and-drop zone with instant file validation.

### 8. 📱 Modern Responsive Interface
- **Shadcn UI Design**: Clean aesthetics with glassmorphic accents and tactile feedback.
- **Dark / Light Theme**: Instant theme toggle with system preference auto-detection.
- **Mobile Optimized**: Full responsiveness across smartphones, tablets, and desktop displays.

### 9. 🔒 Complete Privacy by Design
- **Zero Server Uploads**: Every byte is decoded, manipulated, and exported locally in the user's browser.
- **Works Offline**: The application can be saved locally or run on a local network without an internet connection.

---

## 🚀 Getting Started

### Option 1: Run Locally (Zero Dependencies)
You can start the built-in HTTP server using Node.js:
```bash
npm start
```
or:
```bash
node server.js
```
Then visit:
```
http://localhost:3000
```

### Option 2: Direct Offline Usage
You can open `index.html` directly in any modern web browser (Chrome, Edge, Firefox, Safari) without running a server.

---

## 📁 Project Structure

```
AI Content remover/
├── index.html                      # Main web application interface
├── privacy.html                    # Privacy Policy page
├── terms.html                      # Terms & Conditions page
├── server.js                       # Lightweight local HTTP server
├── package.json                    # Project configuration and start scripts
├── README.md                       # Documentation and feature guide
└── assets/
    ├── css/
    │   └── style.css               # Responsive design, themes, and UI components
    └── js/
        ├── app.js                  # Main controller, tab management, clipboard paste
        ├── metadata-stripper.js    # Binary C2PA metadata stripper & EXIF injector
        ├── gemini-watermark-engine.js # Mathematical reverse-alpha unblending engine
        ├── video-watermark-engine.js  # Video canvas & audio stream pipeline
        ├── analog-humanizer.js     # Film-grain micro-dither generator
        ├── inpaint-engine.js       # Fast content-aware boundary diffusion
        └── jszip.min.js            # Offline ZIP archive builder
```

---

## 📄 Custom Scripts & Analytics Integration

To integrate custom scripts (such as Google Analytics, Google Tag Manager, AdSense, or custom tracking), open the HTML files and locate the marked header section:

```html
<!-- ============================================================ -->
<!-- INSERT CUSTOM SCRIPTS HERE (Analytics, GTM, AdSense, etc.)   -->
<!-- ============================================================ -->
```
This placeholder is present in:
- `index.html` (lines ~9–12)
- `privacy.html` (lines ~9–11)
- `terms.html` (lines ~9–11)

---

## 📜 License
Distributed under the MIT License. Processed media remains 100% the property of the end user.
