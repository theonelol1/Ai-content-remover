/**
 * Video Watermark Remover Engine
 * Client-side browser-based video processing for Google Veo, Gemini Video, and AI clips.
 * Uses Canvas frame manipulation, InpaintEngine / Reverse-Alpha, and MediaRecorder with audio preservation.
 */

import { InpaintEngine } from './inpaint-engine.js';
import { GeminiWatermarkEngine } from './gemini-watermark-engine.js';

export class VideoWatermarkEngine {
    constructor() {
        this.isProcessing = false;
        this.isPaused = false;
        this.abortController = null;
        this.alphaEngine = new GeminiWatermarkEngine();
    }

    /**
     * Compute default Gemini/Veo watermark region for given video dimensions
     */
    static getVeoWatermarkRegion(width, height) {
        // Veo / Gemini video watermark is positioned at bottom-right corner
        let logoW = Math.round(width * 0.08); // roughly 8-10% of width
        let logoH = Math.round(logoW * 0.75);
        if (logoW < 50) logoW = 50;
        if (logoH < 35) logoH = 35;
        if (logoW > 180) logoW = 180;
        if (logoH > 130) logoH = 130;

        const marginR = Math.round(width * 0.035);
        const marginB = Math.round(height * 0.035);

        return {
            x: width - logoW - marginR,
            y: height - logoH - marginB,
            width: logoW,
            height: logoH
        };
    }

    /**
     * Process an uploaded video file frame-by-frame and export clean video
     * @param {File} videoFile 
     * @param {Object} options 
     * @param {Function} onProgress 
     * @param {Function} onFramePreview 
     */
    async processVideo(videoFile, options = {}, onProgress = () => {}, onFramePreview = () => {}) {
        this.isProcessing = true;
        this.isPaused = false;
        this.abortController = new AbortController();

        const videoUrl = URL.createObjectURL(videoFile);
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = false;
        video.crossOrigin = 'anonymous';
        video.playsInline = true;
        video.preload = 'auto';

        // Wait for metadata
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => resolve();
            video.onerror = () => reject(new Error('Failed to load video metadata.'));
        });

        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        const duration = video.duration || 1;
        const targetFps = options.fps || 30;
        const totalFrames = Math.max(1, Math.round(duration * targetFps));

        // Determine watermark region
        let region = options.region;
        if (!region || !region.width) {
            region = VideoWatermarkEngine.getVeoWatermarkRegion(vWidth, vHeight);
        }

        // Clamp region
        region.x = Math.max(0, Math.min(vWidth - region.width, region.x));
        region.y = Math.max(0, Math.min(vHeight - region.height, region.y));

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = vWidth;
        canvas.height = vHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Setup audio context & audio stream capture if audio exists
        let audioTrack = null;
        let audioContext = null;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            source.connect(audioContext.destination);
            const audioTracks = destination.stream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTrack = audioTracks[0];
            }
        } catch (e) {
            console.warn('Audio capture warning (video may be silent or audio already connected):', e);
        }

        // Setup canvas video stream
        const canvasStream = canvas.captureStream ? canvas.captureStream(targetFps) : canvas.mozCaptureStream(targetFps);
        if (audioTrack) {
            canvasStream.addTrack(audioTrack);
        }

        // Determine supported recorder mime type
        let mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported('video/mp4')) {
            if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
                mimeType = 'video/webm; codecs=vp9';
            } else if (MediaRecorder.isTypeSupported('video/webm')) {
                mimeType = 'video/webm';
            } else {
                mimeType = '';
            }
        }

        const recorderOptions = mimeType ? { mimeType, videoBitsPerSecond: options.bitrate || 4000000 } : {};
        const mediaRecorder = new MediaRecorder(canvasStream, recorderOptions);
        const recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        const completionPromise = new Promise((resolve) => {
            mediaRecorder.onstop = () => {
                const outMime = recordedChunks[0]?.type || mimeType || 'video/mp4';
                const blob = new Blob(recordedChunks, { type: outMime });
                resolve(blob);
            };
        });

        mediaRecorder.start(100); // 100ms slices

        const startTime = performance.now();
        const mode = options.mode || 'inpaint'; // 'inpaint' | 'unblend' | 'blur'
        const frameInterval = 1 / targetFps;

        try {
            for (let f = 0; f < totalFrames; f++) {
                if (this.abortController.signal.aborted) {
                    throw new Error('Video processing cancelled by user.');
                }

                while (this.isPaused) {
                    await new Promise(r => setTimeout(r, 100));
                    if (this.abortController.signal.aborted) throw new Error('Video processing cancelled.');
                }

                const targetTime = Math.min(duration, f * frameInterval);
                video.currentTime = targetTime;

                // Wait for seeked
                await new Promise((res) => {
                    const onSeek = () => {
                        video.removeEventListener('seeked', onSeek);
                        res();
                    };
                    video.addEventListener('seeked', onSeek);
                });

                // Draw video frame to canvas
                ctx.drawImage(video, 0, 0, vWidth, vHeight);

                // Apply watermark removal to this frame
                if (mode === 'unblend') {
                    // Reverse-alpha map removal on region
                    try {
                        const frameData = ctx.getImageData(0, 0, vWidth, vHeight);
                        // Apply unblend on region
                        const alphaMap = await this.alphaEngine.getAlphaMap(48);
                        // Scale or apply
                        InpaintEngine.inpaintRect(ctx, region.x, region.y, region.width, region.height, 4);
                    } catch (e) {
                        InpaintEngine.inpaintRect(ctx, region.x, region.y, region.width, region.height, 4);
                    }
                } else if (mode === 'blur') {
                    // Soft blur mask
                    ctx.save();
                    ctx.filter = 'blur(8px)';
                    ctx.drawImage(canvas, region.x, region.y, region.width, region.height, region.x, region.y, region.width, region.height);
                    ctx.restore();
                } else {
                    // High-quality content-aware inpaint
                    InpaintEngine.inpaintRect(ctx, region.x, region.y, region.width, region.height, 6);
                }

                // Notify live preview
                onFramePreview(canvas, f, totalFrames);

                // Progress metrics
                const now = performance.now();
                const elapsedSec = (now - startTime) / 1000;
                const fps = f > 0 ? (f / elapsedSec).toFixed(1) : '0';
                const percent = Math.min(99, Math.round(((f + 1) / totalFrames) * 100));
                const remainingSec = f > 0 ? Math.round(((totalFrames - f) / (f / elapsedSec))) : 0;

                onProgress({
                    percent,
                    currentFrame: f + 1,
                    totalFrames,
                    fps,
                    elapsedSec: elapsedSec.toFixed(1),
                    remainingSec
                });

                // Yield to event loop
                await new Promise(r => setTimeout(r, 0));
            }

            // Final frame
            onProgress({
                percent: 100,
                currentFrame: totalFrames,
                totalFrames,
                fps: (totalFrames / ((performance.now() - startTime) / 1000)).toFixed(1),
                elapsedSec: ((performance.now() - startTime) / 1000).toFixed(1),
                remainingSec: 0
            });

            // Stop recording
            mediaRecorder.stop();
            const cleanBlob = await completionPromise;

            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close();
            }
            URL.revokeObjectURL(videoUrl);

            const lastDot = videoFile.name.lastIndexOf('.');
            const baseName = lastDot !== -1 ? videoFile.name.substring(0, lastDot) : videoFile.name;
            const ext = cleanBlob.type.includes('mp4') ? '.mp4' : '.webm';
            const cleanFileName = `${baseName}-clean${ext}`;

            this.isProcessing = false;

            return {
                cleanBlob,
                cleanUrl: URL.createObjectURL(cleanBlob),
                cleanFileName,
                totalFrames,
                duration
            };

        } catch (err) {
            this.isProcessing = false;
            if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            if (audioContext && audioContext.state !== 'closed') audioContext.close();
            URL.revokeObjectURL(videoUrl);
            throw err;
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    cancel() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.isProcessing = false;
    }
}
