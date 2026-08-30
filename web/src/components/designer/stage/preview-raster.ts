const MAX_RASTER_WIDTH = 480
const MAX_RASTER_DIMENSION = 4096
const MAX_RASTER_PIXELS = 2_000_000

/**
 * Preserve the full artboard while bounding decoded bitmap cost and browser
 * canvas limits. Tall pages lose overview density instead of losing content.
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
