export type VideoFormatId = "landscape" | "portrait";

export interface VideoFormat {
  id: VideoFormatId;
  label: string;
  aspect: "16:9" | "9:16";
  width: number;
  height: number;
  fps: number;
}

export const VIDEO_FORMAT: VideoFormat = {
  id: "__VIDEO_FORMAT_ID__" as VideoFormatId,
  label: "__VIDEO_FORMAT_LABEL__",
  aspect: "__VIDEO_FORMAT_ASPECT__" as VideoFormat["aspect"],
  width: __VIDEO_WIDTH__,
  height: __VIDEO_HEIGHT__,
  fps: __VIDEO_FPS__,
};
