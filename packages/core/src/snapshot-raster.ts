const MAX_RASTER_WIDTH = 480
const MAX_RASTER_DIMENSION = 4096
const MAX_RASTER_PIXELS = 2_000_000

/**
 * Preserve full artboards while bounding decoded bitmap cost and browser canvas
 * limits.
 */
export function previewPixelRatio(width: number, height: number): number {
	const safeWidth = Math.max(1, width)
	const safeHeight = Math.max(1, height)
	return Math.min(
		1,
		MAX_RASTER_WIDTH / safeWidth,
		MAX_RASTER_DIMENSION / safeWidth,
		MAX_RASTER_DIMENSION / safeHeight,
		Math.sqrt(MAX_RASTER_PIXELS / (safeWidth * safeHeight)),
	)
}

/**
 * Reject compositor failures that return a valid image containing only the
 * frame background.
 */
export function hasMeaningfulRasterContent(
	pixels: Uint8ClampedArray,
	dark: boolean,
): boolean {
	const background = dark ? 9 : 255
	const pixelCount = Math.floor(pixels.length / 4)
	const requiredForeground = Math.max(1, Math.floor(pixelCount * 0.0005))
	let foreground = 0
	for (let offset = 0; offset < pixelCount * 4; offset += 4) {
		const distance =
			Math.abs(pixels[offset]! - background) +
			Math.abs(pixels[offset + 1]! - background) +
			Math.abs(pixels[offset + 2]! - background)
		if (pixels[offset + 3]! < 250 || distance > 24) foreground += 1
		if (foreground >= requiredForeground) return true
	}
	return false
}
