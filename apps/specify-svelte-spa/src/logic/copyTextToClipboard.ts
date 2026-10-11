import { notifications } from "../stores/notifications.svelte";

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    notifications.add({type: "success", message: { "ru": "Скопировано", "en": "Copied" }, duration: 2000});
    return true;
  } catch (error) {
    console.error('Failed to copy the text to the clipboard:', error);
    notifications.add({type: "error", message: { "ru": "Не удалось скопировать", "en": "Failed to copy" }, duration: 2000});
    return false;
  }
}
