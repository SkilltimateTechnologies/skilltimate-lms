import { marked } from "marked";
marked.setOptions({ gfm: true, breaks: true });
export function md(src: string): string {
  return marked.parse(src || "", { async: false }) as string;
}
