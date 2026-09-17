import fs from "node:fs";
import path from "node:path";

export const AFC_NAVY = "#081C3C";

/**
 * Adapt the AFC Gent SVG for light backgrounds:
 * - full-bleed white rectangles become transparent
 * - remaining white fills (wordmark letters) become AFC navy
 */
export function adaptLogoSvgForLightBackground(
  svg: string,
  ink = AFC_NAVY,
): string {
  let out = svg;

  // White canvas/background rects → transparent so the page paper shows through.
  out = out.replace(
    /<rect\b([^>]*?)fill="(?:white|#fff(?:fff)?)"([^>]*)\/?>/gi,
    (_match, before: string, after: string) =>
      `<rect${before}fill="none"${after}/>`,
  );

  // Any remaining white fills (letterforms) → brand navy.
  out = out.replace(/fill="white"/gi, `fill="${ink}"`);
  out = out.replace(/fill="#fff(?:fff)?"/gi, `fill="${ink}"`);
  out = out.replace(/fill:white\b/gi, `fill:${ink}`);
  out = out.replace(/fill:#fff(?:fff)?\b/gi, `fill:${ink}`);

  return out;
}

export function readAdaptedAfcLogoSvg(ink = AFC_NAVY): string {
  const filePath = path.join(process.cwd(), "public", "afc-gent-logo.svg");
  const raw = fs.readFileSync(filePath, "utf8");
  return adaptLogoSvgForLightBackground(raw, ink);
}
