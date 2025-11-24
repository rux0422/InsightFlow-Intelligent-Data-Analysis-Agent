import PDFParser from "pdf-parse";

export interface PDFData {
  text: string;
  numPages: number;
  metadata: Record<string, unknown>;
  fullText: string; // Store complete text without truncation
}

export class PDFProcessor {
  async extractText(filePath: string): Promise<PDFData> {
    try {
      const fileData = await Deno.readFile(filePath);
      const data = await PDFParser(fileData);
      
      return {
        text: data.text,
        fullText: data.text, // Store complete text
        numPages: data.numpages,
        metadata: data.metadata || {},
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to process PDF: ${message}`);
    }
  }

  extractTables(text: string): string[][] {
    const lines = text.split("\n");
    const tables: string[][] = [];
    let currentTable: string[] = [];

    for (const line of lines) {
      // Detect table rows (lines with multiple spaces or tabs)
      if (line.includes("  ") || line.includes("\t")) {
        const row = line.split(/\s{2,}|\t/).filter((cell) => cell.trim());
        if (row.length > 1) {
          currentTable.push(row.join("|"));
        }
      } else if (currentTable.length > 0) {
        tables.push(currentTable);
        currentTable = [];
      }
    }

    if (currentTable.length > 0) {
      tables.push(currentTable);
    }

    return tables;
  }

  // New method to chunk text for processing
  chunkText(text: string, maxChunkSize: number = 10000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Search for relevant sections in PDF
  searchInText(text: string, query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const relevantSections: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].toLowerCase();
      if (sentence.includes(lowerQuery) || this.containsKeywords(sentence, lowerQuery)) {
        // Include context: previous and next sentence
        const context = [
          sentences[i - 1] || "",
          sentences[i],
          sentences[i + 1] || ""
        ].filter(s => s.trim()).join(". ");
        relevantSections.push(context);
      }
    }

    return relevantSections;
  }

  private containsKeywords(text: string, query: string): boolean {
    const keywords = query.split(/\s+/).filter(w => w.length > 3);
    return keywords.some(keyword => text.includes(keyword));
  }
}