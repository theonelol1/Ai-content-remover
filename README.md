# PurePixel Studio: AI Watermark & C2PA Metadata Remover

An all-in-one, 100% private, client-side web application reverse-engineered from:
1. **[removeailabel.com](https://removeailabel.com/)** (AI Label & C2PA Stripper with Camera Stealth EXIF Injection)
2. **[geminiwatermarkremover.io](https://geminiwatermarkremover.io/)** (Image Watermark Remover)
3. **[geminiwatermarkremover.io/video](https://geminiwatermarkremover.io/video)** (Video Watermark Remover)
4. **[polipics.in/free-tools/ai-metadata-remover](https://polipics.in/free-tools/ai-metadata-remover)** (Lossless AI Metadata Cleaner)
5. **[wiltodelta/remove-ai-watermarks](https://github.com/wiltodelta/remove-ai-watermarks)** (Analog Humanizer & Anti-SynthID Perturbation)

---

## 🔬 Reverse Engineering Breakdown

### 1. Social AI Label Bypass & Camera Stealth Mode ([removeailabel.com](https://removeailabel.com/))
Social platforms (LinkedIn, Instagram, Facebook, Meta, TikTok, and X) scan uploaded media for specific metadata manifests and headers:
- **C2PA JUMBF Manifests** (`APP11` in JPEG, `c2pa`/`caBX` in PNG)
- **IPTC Digital Source Type**: `trainedAlgorithmicMedia`
- **Adobe XMP History** tracking AI tools (`Photoshop Generative Fill`, `Firefly`)
- **Generation Parameters**: Text prompts, negative prompts, seeds, samplers

#### Why Camera Stealth Mode is Critical:
When an image is completely scrubbed of all metadata, social media algorithms may submit it to secondary visual neural network classification. **Camera Stealth Mode** removes all AI manifests and injects authentic hardware camera EXIF headers into the file:
- **Sony Alpha 7 IV** (`ILCE-7M4` + `FE 24-70mm F2.8 GM II`)
- **Canon EOS R5** (`RF 24-70mm F2.8 L IS USM`)
- **Apple iPhone 15 Pro** (48MP Main f/1.78)
- **Fujifilm X-T5** (`XF 33mm F1.4 R`)
- **Nikon Z 8** (`NIKKOR Z 50mm f/1.2 S`)

This causes social media inspection systems to classify the file as a genuine digital camera photograph, bypassing automated "Created with AI" badges.

### 2. Analog Humanizer & Anti-SynthID Disruptor ([remove-ai-watermarks](https://github.com/wiltodelta/remove-ai-watermarks))
- Imperceptible pixel-domain watermarks (such as Google SynthID) and AI classifiers (Hive, Sightengine, Illuminarty) analyze high-frequency Fourier harmonics and latent diffusion periodicity.
- The **Analog Humanizer** applies subtle, photographic film-grain micro-dithering across the pixel matrix.
- This breaks the high-frequency harmonics that AI detectors search for without reducing perceptual sharpness or color accuracy.

### 3. Gemini Watermark Removal: Mathematical Reverse Alpha Blending
$$\text{Original} = \frac{\text{Watermarked} - \alpha \cdot \text{Logo}}{1 - \alpha}$$
- Decodes $D_4$ dihedral group symmetry signed alpha maps ($48\times 48$, $96\times 96$, $36\times 36$) for exact unblending with zero blur.

### 4. Video Watermark Removal: Frame-by-Frame WebCodecs & Canvas
- Processes MP4, WebM, and MOV video streams frame-by-frame.
- Removes Veo / Gemini video watermarks via reverse alpha or content-aware diffusion.
- Preserves 100% of the original audio track via Web Audio API routing.

---

## 🚀 Running Locally

The local server is already configured and zero-dependency:
```bash
npm start
```
or:
```bash
node server.js
```
Open your browser at:
```
http://localhost:3000
```
Or open [index.html](file:///c:/Users/amola/Downloads/AI%20Content%20remover/index.html) directly for 100% offline usage.

---

## 📁 Architecture

```
AI Content remover/
├── index.html                      # Single unified web application interface
├── server.js                       # Lightweight zero-dependency Node HTTP server
├── package.json                    # Scripts and project metadata
├── README.md                       # Documentation & reverse engineering architecture
└── assets/
    ├── css/
    │   └── style.css               # Modern glassmorphism dark/light design
    └── js/
        ├── app.js                  # Main UI controller & interactive workflows
        ├── gemini-watermark-engine.js # Calibrated D4 reverse-alpha blending engine
        ├── metadata-stripper.js    # Lossless binary C2PA stripper & EXIF injector
        ├── analog-humanizer.js     # Film-grain micro-dither to disrupt AI classifiers
        ├── video-watermark-engine.js  # Video canvas & MediaRecorder frame engine
        ├── inpaint-engine.js       # Fast content-aware boundary diffusion inpainting
        └── jszip.min.js            # Offline ZIP archive creator for batch downloads
```
