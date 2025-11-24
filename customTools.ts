import { PDFProcessor } from "./pdfTool.ts";
import { TableProcessor } from "./tableTool.ts";
import { DataStorage } from "./storageTool.ts";

const pdfProcessor = new PDFProcessor();
const tableProcessor = new TableProcessor();
const storage = new DataStorage();

// Tool 1: Check if file exists
export const checkFileTool = {
  name: "check_file",
  description: "Check if a file exists at the specified path. Use this BEFORE attempting to process any file.",
  input_schema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the file to check",
      },
    },
    required: ["file_path"],
  },
  execute: async (input: { file_path: string }) => {
    try {
      const stat = await Deno.stat(input.file_path);
      
      if (stat.isFile) {
        const ext = input.file_path.split('.').pop()?.toLowerCase();
        return JSON.stringify({
          exists: true,
          path: input.file_path,
          size: stat.size,
          type: ext,
          message: `✅ File found: ${input.file_path} (${(stat.size / 1024).toFixed(2)} KB)`,
        });
      } else {
        return JSON.stringify({
          exists: false,
          message: `❌ Path exists but is not a file: ${input.file_path}`,
        });
      }
    } catch (error) {
      return JSON.stringify({
        exists: false,
        message: `❌ File not found: ${input.file_path}. Please ensure the file is in the uploads folder.`,
      });
    }
  },
};

// Tool 2: List available files
export const listFilesTool = {
  name: "list_files",
  description: "List all files available in the uploads directory. Use this to help users see what files they can analyze.",
  input_schema: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: "Directory to list files from (default: ./uploads)",
      },
    },
  },
  execute: async (input: { directory?: string }) => {
    try {
      const dir = input.directory || "./uploads";
      const files: { name: string; size: number; type: string }[] = [];
      
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile) {
          const stat = await Deno.stat(`${dir}/${entry.name}`);
          const ext = entry.name.split('.').pop()?.toLowerCase() || '';
          files.push({
            name: entry.name,
            size: stat.size,
            type: ext,
          });
        }
      }
      
      if (files.length === 0) {
        return JSON.stringify({
          count: 0,
          files: [],
          message: "📁 No files found in uploads folder. Please add CSV, Excel, or PDF files to analyze.",
        });
      }
      
      return JSON.stringify({
        count: files.length,
        files: files.map(f => ({
          name: f.name,
          size: `${(f.size / 1024).toFixed(2)} KB`,
          type: f.type.toUpperCase(),
        })),
        message: `📁 Found ${files.length} file(s) in uploads folder`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: true,
        message: `❌ Error listing files: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
};

// Tool 3: Extract PDF Data - Enhanced to handle full text
export const extractPDFTool = {
  name: "extract_pdf",
  description: "Extract complete text and tables from a PDF file of any size. IMPORTANT: Use check_file tool first to verify the file exists.",
  input_schema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the PDF file to extract data from",
      },
    },
    required: ["file_path"],
  },
  execute: async (input: { file_path: string }) => {
    try {
      try {
        await Deno.stat(input.file_path);
      } catch {
        return JSON.stringify({
          error: true,
          message: `❌ File not found: ${input.file_path}. Please verify the file exists using the check_file tool first.`,
        });
      }

      const pdfData = await pdfProcessor.extractText(input.file_path);
      const tables = pdfProcessor.extractTables(pdfData.text);
      
      const result = {
        success: true,
        file_path: input.file_path,
        text: pdfData.fullText,
        numPages: pdfData.numPages,
        tables: tables,
        metadata: pdfData.metadata,
        textLength: pdfData.fullText.length,
      };

      await storage.saveExtractedData("pdf_data", result);
      
      return JSON.stringify({
        success: true,
        file_path: input.file_path,
        numPages: pdfData.numPages,
        tablesFound: tables.length,
        textLength: pdfData.fullText.length,
        message: `✅ Successfully extracted complete data from PDF (${pdfData.numPages} pages, ${tables.length} tables found, ${pdfData.fullText.length} characters)`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: true,
        message: `❌ Error extracting PDF: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
};

// Tool 4: Process CSV/Excel - Processes complete files without limits
export const processTableTool = {
  name: "process_table",
  description: "Process CSV or Excel file and extract ALL structured data. No row limits - processes entire file regardless of size. IMPORTANT: Use check_file tool first to verify the file exists.",
  input_schema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the CSV or Excel file",
      },
      file_type: {
        type: "string",
        enum: ["csv", "excel"],
        description: "Type of file to process",
      },
    },
    required: ["file_path", "file_type"],
  },
  execute: async (input: { file_path: string; file_type: string }) => {
    try {
      try {
        await Deno.stat(input.file_path);
      } catch {
        return JSON.stringify({
          error: true,
          message: `❌ File not found: ${input.file_path}. Please verify the file exists using the check_file tool first.`,
        });
      }

      let tableData;
      if (input.file_type === "csv") {
        tableData = await tableProcessor.processCSV(input.file_path);
      } else {
        tableData = await tableProcessor.processExcel(input.file_path);
      }

      await storage.saveExtractedData("table_data", tableData);

      return JSON.stringify({
        success: true,
        file_path: input.file_path,
        headers: tableData.headers,
        rowCount: tableData.rowCount,
        sample_rows: tableData.rows.slice(0, 5),
        message: `✅ Successfully processed ${input.file_type.toUpperCase()} file: ${tableData.rowCount.toLocaleString()} rows, ${tableData.headers.length} columns. All data loaded for accurate querying.`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: true,
        message: `❌ Error processing table: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
};

// Tool 5: Extract Table Insights - Generates comprehensive data science analysis
export const extractInsightsTool = {
  name: "extract_insights",
  description: "Generate comprehensive data science analysis for table data (CSV/Excel). Analyzes ALL rows and columns with technical statistical insights, ML recommendations, and preprocessing guidance.",
  input_schema: {
    type: "object",
    properties: {},
  },
  execute: async () => {
    try {
      const tableData = await storage.getLatestFile("table_data");

      if (!tableData) {
        return JSON.stringify({
          error: true,
          message: "❌ No table data found. Please process a CSV or Excel file first.",
        });
      }

      const insights = tableProcessor.generateInsights(tableData);

      return JSON.stringify({
        success: true,
        insights,
        rowCount: tableData.rowCount,
        columnCount: tableData.headers.length,
        message: `✅ Successfully generated analysis for dataset with ${tableData.rowCount.toLocaleString()} rows and ${tableData.headers.length} columns.`,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: true,
        message: `❌ Error generating insights: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
};

// Tool 6: List Available Data
export const listDataTool = {
  name: "list_saved_data",
  description: "List all previously extracted and saved data files",
  input_schema: {
    type: "object",
    properties: {},
  },
  execute: async () => {
    try {
      const files = await storage.listSavedData();
      return JSON.stringify({
        saved_files: files,
        count: files.length,
        message: files.length > 0
          ? `📁 Found ${files.length} previously processed file(s)`
          : "📁 No previously processed data found",
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: true,
        message: `❌ Error listing data: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
};

