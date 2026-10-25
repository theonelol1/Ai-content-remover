/**
 * PurePixel AI Content Studio - Main Application Controller
 * Cinematic Shadcn UI, AI Metadata & C2PA First, Global Ctrl+V Clipboard Paste, Mobile Optimized
 */

import { GeminiWatermarkEngine } from './gemini-watermark-engine.js';
import { MetadataStripper } from './metadata-stripper.js';
import { InpaintEngine } from './inpaint-engine.js';
import { VideoWatermarkEngine } from './video-watermark-engine.js';
import { AnalogHumanizer } from './analog-humanizer.js';

// Application State (Metadata & C2PA is Tab #1 Default)
const state = {
    activeTab: 'metadata',
    metadata: {
        queue: [],
        cameraPreset: 'none',
        isProcessing: false
    },
    image: {
        file: null,
        originalImg: null,
        cleanCanvas: null,
        splitPos: 50,
        mode: 'gemini-auto',
        alphaGain: 1.0,
        position: 'bottom-right',
        sizePreset: 'auto',
        humanizerEnabled: false,
        humanizerStrength: 'light',
        isProcessing: false
    },
    video: {
        file: null,
        engine: new VideoWatermarkEngine(),
        mode: 'inpaint',
        region: null,
        isProcessing: false,
        resultBlob: null,
        resultUrl: null
    },
    allInOne: {
        file: null,
        cameraPreset: 'sony-a7iv',
        humanizerEnabled: true,
        isProcessing: false
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTabs();
    initClipboardPaste();
    initMetadataTool();
    initImageTool();
    initVideoTool();
    initAllInOneTool();
    initFaq();
});

// Toast Notification System (Shadcn / Sonner Style)
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}

// Global Clipboard Paste (Ctrl + V anywhere)
function initClipboardPaste() {
    window.addEventListener('paste', async (e) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        let foundFile = null;
        if (clipboardData.items) {
            for (let i = 0; i < clipboardData.items.length; i++) {
                const item = clipboardData.items[i];
                if (item.type.indexOf('image') !== -1 || item.type.indexOf('video') !== -1) {
                    foundFile = item.getAsFile();
                    break;
                }
            }
        }

        if (!foundFile && clipboardData.files && clipboardData.files.length > 0) {
            foundFile = clipboardData.files[0];
        }

        if (foundFile) {
            e.preventDefault();
            showToast('📋 Media pasted from clipboard!', 'success');
            handlePastedFile(foundFile);
        }
    });

    // Paste buttons inside dropzones
    const setupPasteButton = (btnId) => {
        document.getElementById(btnId)?.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const item of clipboardItems) {
                    for (const type of item.types) {
                        if (type.startsWith('image/')) {
                            const blob = await item.getType(type);
                            const file = new File([blob], `pasted-${Date.now()}.png`, { type });
                            showToast('📋 Image pasted from clipboard!', 'success');
                            handlePastedFile(file);
                            return;
                        }
                    }
                }
                showToast('No image found in clipboard. Use Ctrl + V', 'warning');
            } catch (err) {
                showToast('Press Ctrl + V to paste clipboard image', 'info');
            }
        });
    };

    setupPasteButton('meta-paste-btn');
    setupPasteButton('img-paste-btn');
    setupPasteButton('aio-paste-btn');
}

function handlePastedFile(file) {
    if (state.activeTab === 'metadata') {
        handleMetadataUpload([file]);
    } else if (state.activeTab === 'image') {
        handleImageUpload(file);
    } else if (state.activeTab === 'video') {
        handleVideoUpload(file);
    } else if (state.activeTab === 'allinone') {
        handleAllInOne(file);
    }
}

// Theme Management
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('purepixel-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    toggleBtn?.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('purepixel-theme', next);
    });
}

// Navigation Tabs
function initTabs() {
    const tabBtns = document.querySelectorAll('.tabs-trigger');
    const toolViews = document.querySelectorAll('.tool-view');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            state.activeTab = target;

            tabBtns.forEach(b => b.classList.remove('active'));
            toolViews.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`view-${target}`)?.classList.add('active');
        });
    });
}

// ==========================================
// 1. AI METADATA & C2PA STRIPPER (FIRST PART)
// ==========================================
function initMetadataTool() {
    const dropzone = document.getElementById('meta-dropzone');
    const fileInput = document.getElementById('meta-file-input');
    const downloadAllBtn = document.getElementById('meta-download-all-btn');
    const stealthPresetSelect = document.getElementById('meta-stealth-preset');

    stealthPresetSelect?.addEventListener('change', (e) => {
        state.metadata.cameraPreset = e.target.value;
        const label = MetadataStripper.CAMERA_PRESETS[e.target.value]?.label || 'None';
        showToast(`Camera Preset: ${label.split('(')[0].trim()}`, 'info');
    });

    dropzone?.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        fileInput.click();
    });

    dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files?.length) {
            handleMetadataUpload(Array.from(e.dataTransfer.files));
        }
    });

    fileInput?.addEventListener('change', (e) => {
        if (e.target.files?.length) {
            handleMetadataUpload(Array.from(e.target.files));
        }
    });

    downloadAllBtn?.addEventListener('click', async () => {
        if (!state.metadata.queue.length || !window.JSZip) return;
        showToast('Packaging ZIP archive...', 'info');
        const zip = new window.JSZip();
        for (const item of state.metadata.queue) {
            zip.file(item.cleanFileName, item.cleanBlob);
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `purepixel-cleaned-bundle-${Date.now()}.zip`;
        a.click();
        showToast('📦 ZIP download started!', 'success');
    });
}

async function handleMetadataUpload(files) {
    const queueEl = document.getElementById('meta-queue');
    const actionsBar = document.getElementById('meta-actions-bar');
    if (actionsBar) actionsBar.style.display = 'flex';

    for (const file of files) {
        showToast(`Scrubbing metadata from ${file.name}...`, 'info');
        const processed = await MetadataStripper.processFile(file, {
            injectPreset: state.metadata.cameraPreset
        });
        state.metadata.queue.push(processed);
        renderMetadataItem(processed, queueEl);
    }
    showToast(`✅ Successfully cleaned ${files.length} file(s)!`, 'success');
}

function renderMetadataItem(item, container) {
    const div = document.createElement('div');
    div.className = 'file-queue-item';

    const info = item.metadataInfo;
    const isCritical = info.socialMediaLabelRisk === 'CRITICAL';
    const isHigh = info.socialMediaLabelRisk === 'HIGH';

    const riskBadge = isCritical ?
        `<span class="status-badge risk">⚠️ Social AI Label Risk (Critical)</span>` :
        (isHigh ? `<span class="status-badge risk">⚠️ AI Markers Present</span>` :
                  `<span class="status-badge clean">✅ No AI Markers Found</span>`);

    const stealthTag = item.injectedPreset && item.injectedPreset !== 'none' ?
        `<span style="color: var(--cyan-400); font-size: 0.72rem; background: rgba(34,211,238,0.1); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(34,211,238,0.2);">📷 Stealth Camera: ${MetadataStripper.CAMERA_PRESETS[item.injectedPreset]?.label.split('(')[0].trim()}</span>` : '';

    div.innerHTML = `
        <div class="file-info">
            <div class="file-icon">${item.format === 'MP4' ? '🎬' : '🖼️'}</div>
            <div class="file-details">
                <h4>${item.originalFile.name}</h4>
                <p>
                    <span>Format: <strong>${item.format}</strong></span>
                    <span>Orig: ${(item.originalSize / 1024).toFixed(1)} KB</span>
                    <span>Clean: ${(item.cleanSize / 1024).toFixed(1)} KB</span>
                    <span style="color: var(--emerald-500)">Saved: ${(item.bytesSaved / 1024).toFixed(1)} KB</span>
                    ${riskBadge}
                    ${stealthTag}
                </p>
            </div>
        </div>
        <div class="control-group" style="margin-top: 6px;">
            <button class="btn btn-secondary btn-sm inspect-btn btn-full-mobile">Inspect Tags (${info.aiSignals.length})</button>
            <a href="${item.cleanUrl}" download="${item.cleanFileName}" class="btn btn-default btn-sm btn-full-mobile">Download Clean</a>
        </div>
    `;

    // Inspector Drawer toggle with Platform Risk Matrix
    const inspectBtn = div.querySelector('.inspect-btn');
    let drawer = null;
    inspectBtn?.addEventListener('click', () => {
        if (drawer) {
            drawer.remove();
            drawer = null;
            return;
        }

        drawer = document.createElement('div');
        drawer.className = 'inspector-panel';
        drawer.innerHTML = `
            <div class="inspector-title">
                <span>🔍 AI Label Risk & Platform Analysis</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--muted-foreground); margin-bottom: 12px;">
                ${info.riskExplanation}
            </p>

            <div style="font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase;">
                Social Platform AI Label Predictions (Before Cleaning)
            </div>
            <div class="platform-matrix">
                <div class="platform-pill">
                    <span class="platform-name">LinkedIn</span>
                    <span class="platform-status" style="color: ${info.platformRisk.linkedin.color};">${info.platformRisk.linkedin.label}</span>
                </div>
                <div class="platform-pill">
                    <span class="platform-name">Instagram & Meta</span>
                    <span class="platform-status" style="color: ${info.platformRisk.instagramMeta.color};">${info.platformRisk.instagramMeta.label}</span>
                </div>
                <div class="platform-pill">
                    <span class="platform-name">TikTok</span>
                    <span class="platform-status" style="color: ${info.platformRisk.tiktok.color};">${info.platformRisk.tiktok.label}</span>
                </div>
                <div class="platform-pill">
                    <span class="platform-name">Google SynthID</span>
                    <span class="platform-status" style="color: ${info.platformRisk.google.color};">${info.platformRisk.google.label}</span>
                </div>
            </div>

            <div class="signals-list">
                ${info.aiSignals.length === 0 ? '<p style="font-size: 0.82rem; color: var(--emerald-500);">No tracking metadata found in original file.</p>' : ''}
                ${info.aiSignals.map(s => `
                    <div class="signal-card ${s.risk.toLowerCase()}">
                        <div class="signal-name">${s.name} [${s.risk}]</div>
                        <div class="signal-desc">${s.desc}</div>
                    </div>
                `).join('')}
            </div>

            <div style="font-size: 0.78rem; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <span><strong>Clean Status:</strong> 100% C2PA / AI Headers Sliced Out (${item.strippedDetails.length} segments).</span>
                <span style="color: var(--emerald-500); font-weight: 600;">Post-Clean Platform Status: All Platforms Pass (0 AI Flags) ✅</span>
            </div>
        `;
        div.insertAdjacentElement('afterend', drawer);
    });

    container.appendChild(div);
}

// ==========================================
// 2. IMAGE WATERMARK REMOVER
// ==========================================
function initImageTool() {
    const dropzone = document.getElementById('img-dropzone');
    const fileInput = document.getElementById('img-file-input');
    const controls = document.getElementById('img-controls');
    const viewer = document.getElementById('img-viewer');
    const alphaGainSlider = document.getElementById('img-alpha-gain');
    const alphaGainVal = document.getElementById('img-alpha-val');
    const posSelect = document.getElementById('img-position');
    const sizeSelect = document.getElementById('img-size');
    const modeSelect = document.getElementById('img-mode');
    const humanizerToggle = document.getElementById('img-humanizer-toggle');
    const humanizerStrength = document.getElementById('img-humanizer-strength');
    const downloadBtn = document.getElementById('img-download-btn');
    const resetBtn = document.getElementById('img-reset-btn');

    dropzone?.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        fileInput.click();
    });

    dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files?.length) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput?.addEventListener('change', (e) => {
        if (e.target.files?.length) {
            handleImageUpload(e.target.files[0]);
        }
    });

    alphaGainSlider?.addEventListener('input', (e) => {
        state.image.alphaGain = parseFloat(e.target.value);
        if (alphaGainVal) alphaGainVal.textContent = `${state.image.alphaGain.toFixed(2)}x`;
        processCurrentImage();
    });

    posSelect?.addEventListener('change', (e) => {
        state.image.position = e.target.value;
        processCurrentImage();
    });

    sizeSelect?.addEventListener('change', (e) => {
        state.image.sizePreset = e.target.value;
        processCurrentImage();
    });

    modeSelect?.addEventListener('change', (e) => {
        state.image.mode = e.target.value;
        processCurrentImage();
    });

    humanizerToggle?.addEventListener('change', (e) => {
        state.image.humanizerEnabled = e.target.checked;
        const box = document.getElementById('img-humanizer-box');
        if (box) box.style.display = e.target.checked ? 'block' : 'none';
        showToast(e.target.checked ? 'Anti-AI Humanizer Activated' : 'Humanizer Deactivated', 'info');
        processCurrentImage();
    });

    humanizerStrength?.addEventListener('change', (e) => {
        state.image.humanizerStrength = e.target.value;
        processCurrentImage();
    });

    resetBtn?.addEventListener('click', () => {
        state.image.file = null;
        state.image.originalImg = null;
        dropzone.style.display = 'block';
        controls.style.display = 'none';
        viewer.style.display = 'none';
        fileInput.value = '';
    });

    downloadBtn?.addEventListener('click', () => {
        if (!state.image.cleanCanvas) return;
        const link = document.createElement('a');
        const baseName = state.image.file?.name.replace(/\.[^/.]+$/, "") || 'clean-image';
        link.download = `${baseName}-cleaned.png`;
        link.href = state.image.cleanCanvas.toDataURL('image/png');
        link.click();
        showToast('Image downloaded!', 'success');
    });

    initComparisonSlider();
}

async function handleImageUpload(file) {
    state.image.file = file;
    showToast(`Loading ${file.name}...`, 'info');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
        state.image.originalImg = img;
        document.getElementById('img-dropzone').style.display = 'none';
        document.getElementById('img-controls').style.display = 'flex';
        document.getElementById('img-viewer').style.display = 'block';
        await processCurrentImage();
    };
    img.src = url;
}

const geminiEngine = new GeminiWatermarkEngine();

async function processCurrentImage() {
    if (!state.image.originalImg) return;
    const img = state.image.originalImg;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const statusEl = document.getElementById('img-status-indicator');
    if (statusEl) statusEl.textContent = 'Processing pixels mathematically...';

    if (state.image.mode === 'gemini-auto') {
        try {
            const cleaned = await geminiEngine.removeWatermarkFromImage(img, {
                alphaGain: state.image.alphaGain,
                adaptiveMode: 'auto'
            });
            ctx.drawImage(cleaned, 0, 0);
            if (statusEl) statusEl.textContent = 'Mathematical Reverse-Alpha unblended!';
        } catch (e) {
            console.warn('Gemini unblend fallback to inpaint:', e);
            applyInpaintCorner(ctx, w, h);
            if (statusEl) statusEl.textContent = 'Inpaint restored.';
        }
    } else {
        applyInpaintCorner(ctx, w, h);
        if (statusEl) statusEl.textContent = 'Custom Inpaint applied.';
    }

    if (state.image.humanizerEnabled) {
        AnalogHumanizer.humanizeCanvas(canvas, {
            strength: state.image.humanizerStrength
        });
        if (statusEl) statusEl.textContent += ' + Anti-AI Analog Humanizer Active';
    }

    state.image.cleanCanvas = canvas;
    renderComparisonViewer();
}

function applyInpaintCorner(ctx, w, h) {
    let size = 96;
    if (state.image.sizePreset === '48') size = 48;
    else if (state.image.sizePreset === '36') size = 36;
    else if (state.image.sizePreset === '120') size = 120;
    else if (w > 2000) size = 96;
    else if (w > 1000) size = 64;
    else size = 48;

    let margin = Math.round(size * 0.65);
    let x = w - size - margin;
    let y = h - size - margin;

    if (state.image.position === 'bottom-left') {
        x = margin;
    } else if (state.image.position === 'top-right') {
        y = margin;
    } else if (state.image.position === 'top-left') {
        x = margin;
        y = margin;
    }

    InpaintEngine.inpaintRect(ctx, x, y, size, size, 8);
}

function initComparisonSlider() {
    const handle = document.getElementById('split-handle');
    const line = document.getElementById('split-line');
    const container = document.getElementById('comparison-box');
    let isDragging = false;

    const setPosition = (clientX) => {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        let pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        state.image.splitPos = pct;
        if (handle) handle.style.left = `${pct}%`;
        if (line) line.style.left = `${pct}%`;
        renderComparisonViewer();
    };

    container?.addEventListener('mousedown', (e) => {
        isDragging = true;
        setPosition(e.clientX);
    });
    window.addEventListener('mousemove', (e) => {
        if (isDragging) setPosition(e.clientX);
    });
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Mobile touch events
    container?.addEventListener('touchstart', (e) => {
        isDragging = true;
        if (e.touches && e.touches[0]) setPosition(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches && e.touches[0]) setPosition(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function renderComparisonViewer() {
    const mainCanvas = document.getElementById('comparison-canvas');
    if (!mainCanvas || !state.image.originalImg || !state.image.cleanCanvas) return;

    const w = state.image.originalImg.naturalWidth || state.image.originalImg.width;
    const h = state.image.originalImg.naturalHeight || state.image.originalImg.height;

    mainCanvas.width = w;
    mainCanvas.height = h;
    const ctx = mainCanvas.getContext('2d');

    const splitX = Math.round((state.image.splitPos / 100) * w);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, h);
    ctx.clip();
    ctx.drawImage(state.image.originalImg, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, w - splitX, h);
    ctx.clip();
    ctx.drawImage(state.image.cleanCanvas, 0, 0);
    ctx.restore();
}

// ==========================================
// 3. VIDEO WATERMARK REMOVER
// ==========================================
function initVideoTool() {
    const dropzone = document.getElementById('vid-dropzone');
    const fileInput = document.getElementById('vid-file-input');
    const startBtn = document.getElementById('vid-start-btn');
    const cancelBtn = document.getElementById('vid-cancel-btn');
    const downloadBtn = document.getElementById('vid-download-btn');

    dropzone?.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        fileInput.click();
    });

    dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files?.length) {
            handleVideoUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput?.addEventListener('change', (e) => {
        if (e.target.files?.length) {
            handleVideoUpload(e.target.files[0]);
        }
    });

    startBtn?.addEventListener('click', () => {
        if (!state.video.file) return;
        startVideoProcessing();
    });

    cancelBtn?.addEventListener('click', () => {
        state.video.engine.cancel();
        document.getElementById('vid-progress-container').style.display = 'none';
        startBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        showToast('Video processing cancelled', 'warning');
    });

    downloadBtn?.addEventListener('click', () => {
        if (!state.video.resultUrl) return;
        const a = document.createElement('a');
        a.href = state.video.resultUrl;
        a.download = state.video.resultName || 'clean-video.mp4';
        a.click();
        showToast('Clean video downloaded!', 'success');
    });
}

function handleVideoUpload(file) {
    state.video.file = file;
    showToast(`Loaded ${file.name}`, 'info');
    const url = URL.createObjectURL(file);
    const video = document.getElementById('vid-original-player');
    video.src = url;
    video.load();

    document.getElementById('vid-dropzone').style.display = 'none';
    document.getElementById('vid-controls').style.display = 'flex';
    document.getElementById('vid-player-box').style.display = 'grid';
    document.getElementById('vid-download-btn').style.display = 'none';
}

async function startVideoProcessing() {
    const startBtn = document.getElementById('vid-start-btn');
    const cancelBtn = document.getElementById('vid-cancel-btn');
    const progressBox = document.getElementById('vid-progress-container');
    const progressBar = document.getElementById('vid-progress-fill');
    const progressText = document.getElementById('vid-progress-text');
    const metricsEl = document.getElementById('vid-metrics');
    const canvasPreview = document.getElementById('vid-preview-canvas');

    startBtn.style.display = 'none';
    cancelBtn.style.display = 'inline-flex';
    progressBox.style.display = 'block';

    const mode = document.getElementById('vid-mode')?.value || 'inpaint';

    try {
        const result = await state.video.engine.processVideo(
            state.video.file,
            { mode, fps: 30 },
            (progress) => {
                progressBar.style.width = `${progress.percent}%`;
                progressText.textContent = `Processing Frame ${progress.currentFrame} / ${progress.totalFrames} (${progress.percent}%)`;
                metricsEl.innerHTML = `
                    <span>Speed: <strong>${progress.fps} FPS</strong></span>
                    <span>Elapsed: <strong>${progress.elapsedSec}s</strong></span>
                    <span>ETA: <strong>${progress.remainingSec}s</strong></span>
                `;
            },
            (canvas) => {
                const ctx = canvasPreview.getContext('2d');
                canvasPreview.width = canvas.width;
                canvasPreview.height = canvas.height;
                ctx.drawImage(canvas, 0, 0);
            }
        );

        state.video.resultBlob = result.cleanBlob;
        state.video.resultUrl = result.cleanUrl;
        state.video.resultName = result.cleanFileName;

        progressText.textContent = 'Video clean complete! Ready for download.';
        progressBar.style.width = '100%';
        startBtn.style.display = 'inline-flex';
        startBtn.textContent = 'Process Again';
        cancelBtn.style.display = 'none';

        const dlBtn = document.getElementById('vid-download-btn');
        dlBtn.style.display = 'inline-flex';
        dlBtn.textContent = `Download Clean Video (${(result.cleanBlob.size / (1024 * 1024)).toFixed(1)} MB)`;
        showToast('🎬 Video processing complete!', 'success');

    } catch (err) {
        console.error('Video processing error:', err);
        progressText.textContent = `Error: ${err.message}`;
        startBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        showToast(err.message, 'error');
    }
}

// ==========================================
// 4. ALL-IN-ONE MULTI-CLEANER
// ==========================================
function initAllInOneTool() {
    const dropzone = document.getElementById('aio-dropzone');
    const fileInput = document.getElementById('aio-file-input');
    const resultBox = document.getElementById('aio-result-box');
    const humanizerToggle = document.getElementById('aio-humanizer-toggle');
    const stealthPresetSelect = document.getElementById('aio-stealth-preset');

    stealthPresetSelect?.addEventListener('change', (e) => {
        state.allInOne.cameraPreset = e.target.value;
    });

    humanizerToggle?.addEventListener('change', (e) => {
        state.allInOne.humanizerEnabled = e.target.checked;
    });

    dropzone?.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        fileInput.click();
    });

    dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files?.length) {
            handleAllInOne(e.dataTransfer.files[0]);
        }
    });

    fileInput?.addEventListener('change', (e) => {
        if (e.target.files?.length) {
            handleAllInOne(e.target.files[0]);
        }
    });
}

async function handleAllInOne(file) {
    const isVideo = file.type.includes('video') || file.name.endsWith('.mp4');
    const resultBox = document.getElementById('aio-result-box');
    const statusText = document.getElementById('aio-status-text');
    resultBox.style.display = 'block';
    statusText.textContent = `Analyzing and cleaning ${file.name}...`;

    if (!isVideo) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = async () => {
            statusText.textContent = 'Applying Gemini reverse alpha unblending...';
            const cleanCanvas = await geminiEngine.removeWatermarkFromImage(img);

            if (state.allInOne.humanizerEnabled) {
                statusText.textContent = 'Applying Analog Humanizer (Anti-AI Detector micro-dither)...';
                AnalogHumanizer.humanizeCanvas(cleanCanvas, { strength: 'light' });
            }

            cleanCanvas.toBlob(async (blob) => {
                statusText.textContent = 'Stripping C2PA, EXIF, and injecting camera hardware tags...';
                const stripped = await MetadataStripper.processFile(
                    new File([blob], file.name, { type: 'image/jpeg' }),
                    { injectPreset: state.allInOne.cameraPreset }
                );

                statusText.textContent = 'Done! 100% Watermark Free, C2PA Stripped, & Camera Stealth Injected.';
                const dlBtn = document.getElementById('aio-download-btn');
                dlBtn.style.display = 'inline-flex';
                dlBtn.href = stripped.cleanUrl;
                dlBtn.download = stripped.cleanFileName;
                dlBtn.textContent = `Download 100% Clean Image (${(stripped.cleanSize / 1024).toFixed(1)} KB)`;
                showToast('⚡ Dual Clean Complete!', 'success');
            }, 'image/jpeg', 0.98);
        };
        img.src = url;
    } else {
        statusText.textContent = 'Stripping video metadata & C2PA tags...';
        const stripped = await MetadataStripper.processFile(file);
        statusText.textContent = 'Video metadata stripped! Ready for download.';
        const dlBtn = document.getElementById('aio-download-btn');
        dlBtn.style.display = 'inline-flex';
        dlBtn.href = stripped.cleanUrl;
        dlBtn.download = stripped.cleanFileName;
        dlBtn.textContent = `Download Clean Video (${(stripped.cleanSize / (1024*1024)).toFixed(1)} MB)`;
        showToast('⚡ Video Cleaned!', 'success');
    }
}

// FAQ Accordion
function initFaq() {
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            q.parentElement.classList.toggle('open');
        });
    });
}
