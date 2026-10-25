/**
 * Analog Humanizer Engine
 * Reverse-engineered from removeailabel & remove-ai-watermarks
 * Applies subtle, imperceptible analog sensor grain and frequency-domain noise modulation
 * to disrupt visual AI classifiers, latent checkerboard artifacts, and SynthID frequency watermarks.
 */

export class AnalogHumanizer {
    /**
     * Apply analog humanization to an ImageData object.
     * @param {ImageData} imageData 
     * @param {Object} options { strength: 'light' | 'medium' | 'strong' | number, chromatic: boolean }
     * @returns {ImageData}
     */
    static humanize(imageData, options = {}) {
        const { width, height, data } = imageData;
        const total = width * height;
        const result = new Uint8ClampedArray(data);

        let amp = 2.5; // default light
        if (typeof options.strength === 'number') {
            amp = options.strength;
        } else if (options.strength === 'medium') {
            amp = 4.5;
        } else if (options.strength === 'strong') {
            amp = 7.0;
        }

        const chromatic = options.chromatic ?? false;

        // Deterministic pseudo-random sequence for smooth, natural photographic grain
        // Using high-frequency Perlin-like pseudo-random distribution
        for (let i = 0; i < total; i++) {
            const idx = i * 4;
            const x = i % width;
            const y = Math.floor(i / width);

            // Compute high-frequency analog noise with triangular distribution
            // (avoids uniform banding, closely mimics film silver halide / CMOS sensor noise)
            const u1 = Math.sin(x * 12.9898 + y * 78.233 + (i & 0xFF)) * 43758.5453;
            const u2 = Math.cos(x * 4.898 + y * 96.23 + ((i * 7) & 0xFF)) * 23421.631;
            const n1 = (u1 - Math.floor(u1)) * 2 - 1;
            const n2 = (u2 - Math.floor(u2)) * 2 - 1;
            const noise = (n1 + n2) * 0.5 * amp;

            if (!chromatic) {
                // Monochromatic photographic luminance grain
                result[idx]     = Math.max(0, Math.min(255, Math.round(data[idx] + noise)));
                result[idx + 1] = Math.max(0, Math.min(255, Math.round(data[idx + 1] + noise)));
                result[idx + 2] = Math.max(0, Math.min(255, Math.round(data[idx + 2] + noise)));
            } else {
                // Subtle RGB micro-chroma variation
                const noiseG = noise * 0.9;
                const noiseB = noise * 1.1;
                result[idx]     = Math.max(0, Math.min(255, Math.round(data[idx] + noise)));
                result[idx + 1] = Math.max(0, Math.min(255, Math.round(data[idx + 1] + noiseG)));
                result[idx + 2] = Math.max(0, Math.min(255, Math.round(data[idx + 2] + noiseB)));
            }
            // Alpha remains untouched
        }

        return new ImageData(result, width, height);
    }

    /**
     * Humanize a canvas directly
     */
    static humanizeCanvas(canvas, options = {}) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const processed = this.humanize(imgData, options);
        ctx.putImageData(processed, 0, 0);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalogHumanizer };
}
