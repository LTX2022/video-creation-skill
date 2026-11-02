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
  id: "landscape" as VideoFormatId,
  label: "Landscape 16:9",
  aspect: "16:9" as VideoFormat["aspect"],
  width: 960,
  height: 540,
  fps: 30,
};
