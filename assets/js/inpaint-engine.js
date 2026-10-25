/**
 * Content-Aware Fast Inpainting Engine
 * Used for custom rectangular watermark regions, brushed masks, and arbitrary logo removal.
 * Operates directly on Canvas ImageData with fast boundary diffusion.
 */

export class InpaintEngine {
    /**
     * Inpaint a marked region on an ImageData.
     * @param {ImageData} imageData - Target canvas image data
     * @param {Uint8Array} mask - 1D array of length width*height, where 1/255 = inpaint target, 0 = keep
     * @param {number} radius - Neighborhood radius for diffusion (default 4)
     */
    static inpaint(imageData, mask, radius = 5) {
        const { width, height, data } = imageData;
        const total = width * height;
        const resultData = new Uint8ClampedArray(data);

        // Find boundary pixels (masked pixels that have at least one unmasked neighbor)
        const isMasked = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return false;
            return mask[y * width + x] > 0;
        };

        // Create a distance field / known status
        // 0 = known original pixel, 1 = boundary / inpainting, 2 = unknown interior
        const status = new Uint8Array(total);
        const boundary = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx] > 0) {
                    // Check if adjacent to unmasked
                    if (!isMasked(x - 1, y) || !isMasked(x + 1, y) || !isMasked(x, y - 1) || !isMasked(x, y + 1)) {
                        status[idx] = 1;
                        boundary.push({ x, y });
                    } else {
                        status[idx] = 2; // interior
                    }
                } else {
                    status[idx] = 0; // known
                }
            }
        }

        // Iterative inward diffusion with distance weighting
        const maxIter = radius * 4;
        let currentQueue = boundary;

        for (let iter = 0; iter < maxIter && currentQueue.length > 0; iter++) {
            const nextQueue = [];

            for (let i = 0; i < currentQueue.length; i++) {
                const { x, y } = currentQueue[i];
                const pIdx = (y * width + x) * 4;

                let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

                // Scan neighborhood
                for (let dy = -radius; dy <= radius; dy++) {
                    const ny = y + dy;
                    if (ny < 0 || ny >= height) continue;

                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        if (nx < 0 || nx >= width) continue;

                        const nIdx = ny * width + nx;
                        if (status[nIdx] === 0) { // known pixel
                            const distSq = dx * dx + dy * dy;
                            if (distSq === 0) continue;
                            const weight = 1.0 / (Math.sqrt(distSq) + 0.001);

                            const origOffset = nIdx * 4;
                            sumR += resultData[origOffset] * weight;
                            sumG += resultData[origOffset + 1] * weight;
                            sumB += resultData[origOffset + 2] * weight;
                            sumWeight += weight;
                        }
                    }
                }

                if (sumWeight > 0) {
                    resultData[pIdx] = Math.round(sumR / sumWeight);
                    resultData[pIdx + 1] = Math.round(sumG / sumWeight);
                    resultData[pIdx + 2] = Math.round(sumB / sumWeight);
                    status[y * width + x] = 0; // mark as solved

                    // Add adjacent interior pixels to next queue
                    const neighbors = [
                        { x: x - 1, y }, { x: x + 1, y },
                        { x, y: y - 1 }, { x, y: y + 1 }
                    ];
                    for (const n of neighbors) {
                        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                            const nIdx = n.y * width + n.x;
                            if (status[nIdx] === 2) {
                                status[nIdx] = 1;
                                nextQueue.push(n);
                            }
                        }
                    }
                }
            }

            currentQueue = nextQueue;
        }

        // Return new ImageData
        return new ImageData(resultData, width, height);
    }

    /**
     * Inpaint a rectangular box on canvas context
     */
    static inpaintRect(ctx, x, y, width, height, pad = 6) {
        const fullWidth = ctx.canvas.width;
        const fullHeight = ctx.canvas.height;

        // Clip padded bounding box
        const bx = Math.max(0, x - pad);
        const by = Math.max(0, y - pad);
        const bw = Math.min(fullWidth - bx, width + pad * 2);
        const bh = Math.min(fullHeight - by, height + pad * 2);

        if (bw <= 0 || bh <= 0) return;

        const imgData = ctx.getImageData(bx, by, bw, bh);
        const mask = new Uint8Array(bw * bh);

        // Mark central rectangle as mask
        const relX = x - bx;
        const relY = y - by;
        for (let my = 0; my < height; my++) {
            const py = relY + my;
            if (py < 0 || py >= bh) continue;
            for (let mx = 0; mx < width; mx++) {
                const px = relX + mx;
                if (px < 0 || px >= bw) continue;
                mask[py * bw + px] = 255;
            }
        }

        const cleaned = this.inpaint(imgData, mask, 6);
        ctx.putImageData(cleaned, bx, by);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InpaintEngine };
}
