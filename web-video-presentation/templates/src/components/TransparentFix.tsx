/** Scoped transparency: remove stage/background layers, never card surfaces or shadows.
 * Mark a chapter's full-frame background with data-scene-background, or honor isOverlay.
 * prefix is retained for legacy chapters, but applies only inside alpha/composite roots.
 */
export function TransparentFix({ prefix }: { prefix?: string }) {
  const safePrefix = prefix && /^[a-zA-Z_][\w-]*$/.test(prefix) ? prefix : null;
  const root = '[data-output-mode="alpha"], [data-output-mode="composite"]';
  const scope = `:is(${root})`;
  return <style>{`
    body:has([data-output-mode="alpha"]) { background: transparent !important; }
    ${scope} { background: transparent !important; box-shadow: none !important; }
    ${scope}::before, ${scope}::after { display: none !important; }
    ${scope} .scene { padding-bottom: 0 !important; }
    ${scope} .scene, ${scope} [data-scene-background]${safePrefix ? `, ${scope} .${safePrefix}-chapter` : ''} { background: transparent !important; }
    ${scope} [data-scene-decoration="background"] { display: none !important; }
  `}</style>;
}
