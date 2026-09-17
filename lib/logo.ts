export const AFC_NAVY = "#081C3C";

/**
 * Adapt the AFC Gent SVG for light backgrounds:
 * - white rectangles (canvas / clip masks) become transparent
 * - remaining white fills (wordmark letters) become AFC navy
 */
export function adaptLogoSvgForLightBackground(
  svg: string,
  ink = AFC_NAVY,
): string {
  let out = svg.replace(
    /<rect\b([^>]*?)fill="(?:white|#fff(?:fff)?)"([^>]*)\/?>/gi,
    (_match, before: string, after: string) => {
      const cleaned = String(after).replace(/\/\s*$/, "");
      return `<rect${before}fill="none"${cleaned}/>`;
    },
  );

  out = out.replace(/fill="white"/gi, `fill="${ink}"`);
  out = out.replace(/fill="#fff(?:fff)?"/gi, `fill="${ink}"`);
  out = out.replace(/fill:white\b/gi, `fill:${ink}`);
  out = out.replace(/fill:#fff(?:fff)?\b/gi, `fill:${ink}`);

  return out;
}
