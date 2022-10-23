"use strict";

/**
 * @param {File} file 
 */
async function loadImage(file) {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    await image.decode();
    return image;
}

/**
 * @param {HTMLImageElement} image 
 */
function getImageData(image) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * @param {Uint8Array} bmp 
 */
function makeBMPURL(bmp) {
    return URL.createObjectURL(new Blob([bmp], { type: "image/bmp" }));
}

/**
 * @param {number} value 
 */
function numberToBytes(value) {
    return [0, 8, 16, 24].map(sh => value >> sh & 0xff);
}

/**
 * @param {number[]} data 
 * @param {4 | 8} bitCount 
 */
function encodeBMPRLE(data, bitCount = 8) {
    if (data.length === 0) return [];
    const rle = [[0, data[0]]];
    const d = bitCount === 4 ? 2 : 1;
    for (const x of data) {
        if (x === rle[rle.length - 1][1] && rle[rle.length - 1][0] + d < 256) {
            rle[rle.length - 1][0] += d;
            continue;
        }
        rle.push([d, x]);
    }
    const partialSum = [0];
    const absRanges = [];
    let absStart = null;
    for (const i of rle.keys()) {
        partialSum.push(partialSum[partialSum.length - 1] + rle[i][0] / d);
        if (absStart === null && rle[i][0] === d) {
            absStart = i;
        }
        else if (absStart !== null && rle[i][0] !== d) {
            absRanges.push([absStart, i]);
            absStart = null;
        }
    }
    if (absStart !== null) {
        absRanges.push([absStart, rle.length]);
    }
    const score = (first, last) => Math.max(0, (last - first) * 2 - (2 + ((partialSum[last] - partialSum[first] + 1) & ~1)));
    for (let i = 0; i + 1 < absRanges.length;) {
        if (score(...absRanges[i]) + score(...absRanges[i + 1]) < score(absRanges[i][0], absRanges[i + 1][1])) {
            absRanges[i][1] = absRanges[i + 1][1];
            absRanges.splice(i + 1, 1);
            i = Math.max(0, i - 1);
            continue;
        }
        ++i;
    }
    const result = [];
    let preLast = 0;
    for (const [first, last] of absRanges) {
        result.push(...rle.slice(preLast, first).flat());
        preLast = last;
        if (score(first, last) > 0) {
            const absData = rle.slice(first, last).flatMap(([n, p]) => new Array(n / d).fill(p));
            for (let i = Math.ceil(absData.length / (256 / d - 1)) - 1; i >= 0; --i) {
                const data = absData.splice(0, 256 / d - 1);
                if (data.length === 1) {
                    result.push(1, data[0]);
                }
                else {
                    result.push(0, data.length * d, ...data, ...((data.length & 1) ? [0] : []));
                }
            }
        }
        else {
            result.push(...rle.slice(first, last).flat());
        }
    }
    result.push(...rle.slice(preLast).flat());
    return result;
}

/**
 * @param {number} imageWidth 
 * @param {number} imageHeight 
 * @param {number} bitCount 
 * @param {number} compression 
 * @param {number} palleteSize 
 * @param {number} imageDataSize 
 */
function makeBMPHeader(imageWidth, imageHeight, bitCount, compression, palleteSize, imageDataSize) {
    return [
        0x42, 0x4d,
        ...numberToBytes(54 + palleteSize * 4 + imageDataSize),
        0, 0, 0, 0,
        ...numberToBytes(54 + palleteSize * 4),
        0x28, 0x00, 0x00, 0x00,
        ...numberToBytes(imageWidth),
        ...numberToBytes(imageHeight),
        0x01, 0x00, ...numberToBytes(bitCount).slice(0, 2),
        ...numberToBytes(compression),
        ...numberToBytes(imageDataSize),
        0, 0, 0, 0,
        0, 0, 0, 0,
        ...numberToBytes(palleteSize),
        0, 0, 0, 0,
    ];
}

/**
 * @typedef {Object} BMPPallete
 * @property {number[]} pallete
 * @property {number} size
 * @property {number[][]} image
 * @property {number} width
 * @property {number} height
 */

/**
 * @param {ImageData} imageData 
 * @returns {BMPPallete} 
 */
function makeBMPPallete(imageData) {
    const pallete = new Map();
    const palleteImage = [];
    const data = imageData.data;
    for (let y = 0, i = 0; y < imageData.height; ++y) {
        palleteImage.push([]);
        for (let x = 0; x < imageData.width; ++x, i += 4) {
            const pixel = data[i] << 16 | data[i + 1] << 8 | data[i + 2];
            if (!pallete.has(pixel)) {
                if (pallete.size >= 256) {
                    return null;
                }
                pallete.set(pixel, pallete.size);
            }
            palleteImage[y].push(pallete.get(pixel));
        }
    }
    return {
        pallete: [...pallete.keys()].flatMap(color => numberToBytes(color)),
        size: pallete.size,
        image: palleteImage,
        width: imageData.width,
        height: imageData.height,
    };
}

/**
 * @param {BMPPallete} pallete 
 */
function makeBMPData1bit(pallete) {
    /** @type {number[][]} */
    const data = [];
    for (let y = 0; y < pallete.height; ++y) {
        data.unshift(new Array((pallete.width + 31) >> 5 << 2).fill(0));
        for (let x = 0; x < pallete.width; ++x) {
            data[0][x >> 3] |= pallete.image[y][x] << (7 - x % 8);
        }
    }
    return data;
}

/**
 * @param {BMPPallete} pallete 
 */
 function makeBMPData4bit(pallete) {
    /** @type {number[][]} */
    const data = [];
    for (let y = 0; y < pallete.height; ++y) {
        data.unshift(new Array((pallete.width + 7) >> 3 << 2).fill(0));
        for (let x = 0; x < pallete.width; ++x) {
            data[0][x >> 1] |= pallete.image[y][x] << (1 - x % 2) * 4;
        }
    }
    return data;
}

/**
 * @param {BMPPallete} pallete 
 */
 function makeBMPData8bit(pallete) {
    /** @type {number[][]} */
    const data = [];
    for (let y = 0; y < pallete.height; ++y) {
        data.unshift(new Array((pallete.width + 3) >> 2 << 2).fill(0));
        for (let x = 0; x < pallete.width; ++x) {
            data[0][x] = pallete.image[y][x];
        }
    }
    return data;
}

/**
 * @param {ImageData} imageData 
 */
 function makeBMPData16bit(imageData) {
    /** @type {number[][]} */
    const data = [];
    for (let y = 0, i = 0; y < imageData.height; ++y) {
        data.unshift(new Array((imageData.width * 2 + 3) >> 2 << 2).fill(0));
        for (let x = 0; x < imageData.width; ++x, i += 4) {
            const r = Math.floor(imageData.data[i] / 255 * 31);
            const g = Math.floor(imageData.data[i + 1] / 255 * 31);
            const b = Math.floor(imageData.data[i + 2] / 255 * 31);
            const pixel = numberToBytes(r << 10 | g << 5 | b);
            data[0][x * 2] = pixel[0];
            data[0][x * 2 + 1] = pixel[1];
        }
    }
    return data;
}

/**
 * @param {ImageData} imageData 
 */
 function makeBMPData24bit(imageData) {
    /** @type {number[][]} */
    const data = [];
    for (let y = 0, i = 0; y < imageData.height; ++y) {
        data.unshift(new Array((imageData.width * 3 + 3) >> 2 << 2).fill(0));
        for (let x = 0; x < imageData.width; ++x, i += 4) {
            data[0][x * 3] = imageData.data[i + 2];
            data[0][x * 3 + 1] = imageData.data[i + 1];
            data[0][x * 3 + 2] = imageData.data[i];
        }
    }
    return data;
}

/**
 * @param {number[][]} pixels 
 * @param {number} width
 * @param {4 | 8} bitCount 
 */
function makeBMPDataRLE(pixels, width, bitCount) {
    return [...pixels.map(row => [...encodeBMPRLE(row.slice(0, width >> (bitCount === 4 ? 1 : 0)), bitCount), 0, 0]).flat(), 0, 1];
}

/**
 * @param {number[][] | number[]} pixels 
 * @param {number} bitCount
 * @param {number} compression
 * @param {BMPPallete} pallete 
 */
 function makeBMP(pixels, bitCount, compression, pallete) {
    const data = pixels.flat();
    return Uint8Array.from([
        ...makeBMPHeader(pallete.width, pallete.height, bitCount, compression, pallete?.size ?? 0, data.length),
        ...(pallete?.pallete ?? []),
        ...data,
    ]);
}
