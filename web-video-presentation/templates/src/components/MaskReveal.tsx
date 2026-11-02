import type { CSSProperties, ReactNode } from "react";

interface Props {
  show: boolean;
  delay?: number;
  duration?: number;
  progress?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Clip-path text wipe. For Remotion-bound chapters, pass a frame-derived
 * progress value from src/video/motion.ts instead of relying on CSS timing.
 */
export function MaskReveal({
  show,
  delay = 0,
  duration,
  progress,
  className,
  children,
}: Props) {
  const clamped =
    typeof progress === "number" ? Math.max(0, Math.min(1, progress)) : show ? 1 : 0;
  const cls = ["mask-reveal", show ? "in" : "", className]
    .filter(Boolean)
    .join(" ");
  const style: CSSProperties = {
    display: "inline-block",
    clipPath: `inset(0 ${100 - clamped * 100}% 0 0)`,
    ...(delay || duration ? { "--legacy-delay": delay, "--legacy-duration": duration } as CSSProperties : null),
  };
  return (
    <span className={cls} style={style}>
      {children}
    </span>
  );
}
