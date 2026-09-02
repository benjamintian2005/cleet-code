import { OG_IMAGE_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "Cleet Code — LeetCode for prompting";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage();
}
