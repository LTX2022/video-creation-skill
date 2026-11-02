import "./Subtitle.css";
import { activeSubtitleCue, buildSubtitleCues, type SubtitleCue } from "./subtitleTiming";

interface SubtitleProps {
  text: string;
  visible: boolean;
  blocked?: boolean;
  elapsedMs?: number;
  durationMs?: number;
  cues?: SubtitleCue[];
}

export function Subtitle({
  text,
  visible,
  blocked = false,
  elapsedMs = 0,
  durationMs,
  cues,
}: SubtitleProps) {
  if (!visible) return null;
  const activeCue = activeSubtitleCue(
    cues ?? buildSubtitleCues(text, durationMs ?? Math.max(1800, text.length * 260)),
    elapsedMs,
  );
  const lines = activeCue?.chunks ?? [];
  if (lines.length === 0) return null;

  return (
    <div className={"subtitle-safe-area" + (blocked ? " is-blocked" : "")}>
      <div className="subtitle-box">
        {lines.map((line, index) => (
          <div className="subtitle-line" key={index}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
