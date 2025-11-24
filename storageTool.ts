export class DataStorage {
  private storagePath = "./extracted_data";

  async ensureStorageDir(): Promise<void> {
    try {
      await Deno.mkdir(this.storagePath, { recursive: true });
    } catch {
      // Directory already exists
    }
  }

  async saveExtractedData(fileName: string, data: any): Promise<string> {
    await this.ensureStorageDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const savePath = `${this.storagePath}/${fileName}_${timestamp}.json`;
    
    await Deno.writeTextFile(savePath, JSON.stringify(data, null, 2));
    return savePath;
  }

  async listSavedData(): Promise<string[]> {
    await this.ensureStorageDir();
    const files: string[] = [];
    
    try {
      for await (const entry of Deno.readDir(this.storagePath)) {
        if (entry.isFile && entry.name.endsWith(".json")) {
          files.push(entry.name);
        }
      }
    } catch {
      // Directory doesn't exist or is empty
    }
    
    return files.sort((a, b) => b.localeCompare(a)); // Most recent first
  }

  async loadSavedData(fileName: string): Promise<any> {
    const filePath = `${this.storagePath}/${fileName}`;
    const content = await Deno.readTextFile(filePath);
    return JSON.parse(content);
  }

  async getLatestFile(prefix: string): Promise<any | null> {
    const files = await this.listSavedData();
    const matchingFile = files.find(f => f.startsWith(prefix));
    
    if (!matchingFile) return null;
    
    return await this.loadSavedData(matchingFile);
  }

  async clearOldData(keepRecent: number = 5): Promise<void> {
    const files = await this.listSavedData();
    
    if (files.length > keepRecent) {
      const filesToDelete = files.slice(keepRecent);
      
      for (const file of filesToDelete) {
        try {
          await Deno.remove(`${this.storagePath}/${file}`);
        } catch {
          // Ignore errors
        }
      }
    }
  }
}