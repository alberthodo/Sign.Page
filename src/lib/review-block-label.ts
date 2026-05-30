import type { FolderContentBlock } from "@/lib/folder-content";
import { fileNameFromAssetUrl } from "@/lib/project-page";

export function reviewBlockLabel(
  block: FolderContentBlock,
  index: number,
  blocks: FolderContentBlock[],
): string {
  const n = index + 1;
  if (block.type === "file") {
    const name = fileNameFromAssetUrl(block.url);
    return name.length > 48 ? `${name.slice(0, 45)}…` : name;
  }
  if (block.type === "heading") {
    const text = block.text.trim();
    if (text) {
      return text.length > 40 ? `${text.slice(0, 37)}…` : text;
    }
    return `Heading ${n}`;
  }
  const text = block.text.trim();
  if (text) {
    const firstLine = text.split("\n")[0] ?? text;
    return firstLine.length > 40 ? `${firstLine.slice(0, 37)}…` : firstLine;
  }
  return `Note ${n}`;
}

export function reviewBlockLabelById(
  blockId: string,
  blocks: FolderContentBlock[],
): string {
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index < 0) return "Item";
  return reviewBlockLabel(blocks[index]!, index, blocks);
}
