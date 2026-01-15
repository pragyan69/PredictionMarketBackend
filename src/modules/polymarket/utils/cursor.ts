// src/modules/polymarket/utils/cursor.ts

export class CursorManager {
  private cursors: Map<string, string | undefined> = new Map();

  setCursor(key: string, cursor: string | undefined): void {
    this.cursors.set(key, cursor);
  }

  getCursor(key: string): string | undefined {
    return this.cursors.get(key);
  }

  hasCursor(key: string): boolean {
    return this.cursors.has(key) && this.cursors.get(key) !== undefined;
  }

  clearCursor(key: string): void {
    this.cursors.delete(key);
  }

  clearAll(): void {
    this.cursors.clear();
  }
}

export const cursorManager = new CursorManager();