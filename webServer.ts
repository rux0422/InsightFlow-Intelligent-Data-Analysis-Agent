import { AnthropicModelProvider, ZypherAgent } from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";
import { load } from "@std/dotenv";
import {
  extractPDFTool,
  processTableTool,
  extractInsightsTool,
  listDataTool,
  listFilesTool,
  checkFileTool,
} from "./customTools.ts";
import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

// Load environment variables
const env = await load();

function getRequiredEnv(name: string): string {
  const value = env[name] || Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

const modelProvider = new AnthropicModelProvider({
  apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
});

const workingDirectory = Deno.cwd();
const zypherDir = `${workingDirectory}/.zypher`;
const workspaceDataDir = `${zypherDir}/workspace`;
const fileAttachmentCacheDir = `${zypherDir}/cache`;

try {
  await Deno.mkdir(zypherDir, { recursive: true });
  await Deno.mkdir(workspaceDataDir, { recursive: true });
  await Deno.mkdir(fileAttachmentCacheDir, { recursive: true });
  await Deno.mkdir("./uploads", { recursive: true });
  await Deno.mkdir("./extracted_data", { recursive: true });
  await Deno.mkdir("./web", { recursive: true });
} catch (error) {
  // Directories exist
}

const agent = new ZypherAgent(
  {
    workingDirectory,
    zypherDir,
    workspaceDataDir,
    fileAttachmentCacheDir,
  },
  modelProvider
);

(agent as any).tools = [
  checkFileTool,
  listFilesTool,
  extractPDFTool,
  processTableTool,
  extractInsightsTool,
  listDataTool,
];

// Application state
const sessions = new Map<string, {
  currentFile: string;
  fileType: string;
  isFileProcessed: boolean;
  tableData: any;
  pdfData: any;
}>();

// Helper functions from main.ts
async function processCSV(filePath: string) {
  try {
    const result = await processTableTool.execute({
      file_path: filePath,
      file_type: 'csv'
    });

    const parsed = JSON.parse(result);

    if (parsed.error) {
      return { error: true, message: parsed.message };
    }

    return {
      error: false,
      headers: parsed.headers,
      rowCount: parsed.rowCount,
      sampleRows: parsed.sample_rows
    };
  } catch (error) {
    return { error: true, message: String(error) };
  }
}

async function processExcel(filePath: string) {
  try {
    const result = await processTableTool.execute({
      file_path: filePath,
      file_type: 'excel'
    });

    const parsed = JSON.parse(result);

    if (parsed.error) {
      return { error: true, message: parsed.message };
    }

    return {
      error: false,
      headers: parsed.headers,
      rowCount: parsed.rowCount,
      sampleRows: parsed.sample_rows
    };
  } catch (error) {
    return { error: true, message: String(error) };
  }
}

async function processPDF(filePath: string) {
  try {
    const result = await extractPDFTool.execute({
      file_path: filePath
    });

    const parsed = JSON.parse(result);

    if (parsed.error) {
      return { error: true, message: parsed.message };
    }

    // Load the full PDF data from storage
    let fullData = null;
    try {
      const files = [];
      for await (const entry of Deno.readDir("./extracted_data")) {
        if (entry.name.startsWith("pdf_data")) {
          files.push(entry.name);
        }
      }
      files.sort((a, b) => b.localeCompare(a));

      if (files.length > 0) {
        const fs = await Deno.readTextFile(`./extracted_data/${files[0]}`);
        fullData = JSON.parse(fs);
      }
    } catch (error) {
      console.log(`⚠️  Could not load full PDF data: ${error}`);
    }

    return {
      error: false,
      numPages: parsed.numPages,
      tablesFound: parsed.tablesFound || 0,
      textLength: parsed.textLength,
      fullData: fullData
    };
  } catch (error) {
    return { error: true, message: String(error) };
  }
}

function chunkText(text: string, maxChunkSize: number): string[] {
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

function generateInsightsPDF(insights: string, filename: string): Uint8Array {
  const timestamp = new Date().toLocaleString();
  const title = `Data Science Analysis Report - ${filename}`;

  // PDF configuration
  const pageHeight = 792; // US Letter height in points
  const pageWidth = 612; // US Letter width in points
  const marginTop = 50;
  const marginBottom = 50;
  const marginLeft = 50;
  const marginRight = 50;
  const lineHeight = 15;
  const maxCharsPerLine = 85;
  const usableHeight = pageHeight - marginTop - marginBottom;
  const maxLinesPerPage = Math.floor(usableHeight / lineHeight);

  // Split insights into lines and wrap long lines
  const rawLines = insights.split('\n');
  const wrappedLines: string[] = [];

  for (const line of rawLines) {
    const escapedLine = line.replace(/[()\\]/g, '\\$&');
    if (escapedLine.length > maxCharsPerLine) {
      // Split long lines
      for (let i = 0; i < escapedLine.length; i += maxCharsPerLine) {
        wrappedLines.push(escapedLine.substring(i, i + maxCharsPerLine));
      }
    } else {
      wrappedLines.push(escapedLine);
    }
  }

  // Create pages - each page gets header + content
  const pages: string[] = [];
  const linesPerPageWithHeader = maxLinesPerPage - 4; // Reserve space for title and timestamp

  for (let i = 0; i < wrappedLines.length; i += linesPerPageWithHeader) {
    const pageLines = wrappedLines.slice(i, i + linesPerPageWithHeader);
    const isFirstPage = i === 0;

    let pageContent = `BT\n`;
    let yPos = pageHeight - marginTop;

    if (isFirstPage) {
      // Title and metadata on first page only
      pageContent += `/F1 16 Tf\n${marginLeft} ${yPos} Td\n(${title.replace(/[()\\]/g, '\\$&')}) Tj\n`;
      yPos -= 30;
      pageContent += `0 -30 Td\n/F1 10 Tf\n(Generated: ${timestamp.replace(/[()\\]/g, '\\$&')}) Tj\n`;
      yPos -= 40;
      pageContent += `0 -40 Td\n/F1 11 Tf\n`;
    } else {
      // Start content immediately on subsequent pages
      pageContent += `/F1 11 Tf\n${marginLeft} ${yPos} Td\n`;
    }

    // Add content lines
    for (let j = 0; j < pageLines.length; j++) {
      if (j === 0 && !isFirstPage) {
        pageContent += `(${pageLines[j]}) Tj\n`;
      } else {
        pageContent += `0 ${-lineHeight} Td\n(${pageLines[j]}) Tj\n`;
      }
    }

    pageContent += `ET\n`;
    pages.push(pageContent);
  }

  // Build PDF structure
  const pdfHeader = `%PDF-1.4\n%âãÏÓ\n`;

  // Object 1: Catalog
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  // Object 2: Pages (root of page tree)
  const pageRefs = pages.map((_, idx) => `${3 + idx} 0 R`).join(' ');
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>\nendobj\n`;

  // Object 3+: Font resources (shared across all pages)
  const fontObjNum = 3 + pages.length;
  const objFont = `${fontObjNum} 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>\nendobj\n`;

  // Objects for each page and its content stream
  const pageObjects: string[] = [];
  const contentObjects: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageObjNum = 3 + i;
    const contentObjNum = fontObjNum + 1 + i;

    // Page object
    const pageObj = `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources ${fontObjNum} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNum} 0 R >>\nendobj\n`;
    pageObjects.push(pageObj);

    // Content stream object
    const contentStream = pages[i];
    const contentObj = `${contentObjNum} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;
    contentObjects.push(contentObj);
  }

  // Combine all objects
  let pdfBody = obj1 + obj2;
  for (const pageObj of pageObjects) {
    pdfBody += pageObj;
  }
  pdfBody += objFont;
  for (const contentObj of contentObjects) {
    pdfBody += contentObj;
  }

  // Calculate byte offsets for xref table
  const offsets: number[] = [0]; // Object 0 is always null
  let currentOffset = pdfHeader.length;

  // Track offsets for all objects
  const allObjects = [obj1, obj2, ...pageObjects, objFont, ...contentObjects];
  for (let i = 0; i < allObjects.length; i++) {
    offsets.push(currentOffset);
    currentOffset += allObjects[i].length;
  }

  const totalObjects = offsets.length;

  // Build xref table
  let xref = `xref\n0 ${totalObjects}\n`;
  for (let i = 0; i < totalObjects; i++) {
    if (i === 0) {
      xref += `0000000000 65535 f \n`;
    } else {
      const offset = offsets[i].toString().padStart(10, '0');
      xref += `${offset} 00000 n \n`;
    }
  }

  const xrefStart = pdfHeader.length + pdfBody.length;
  const trailer = `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const fullPDF = pdfHeader + pdfBody + xref + trailer;
  return new TextEncoder().encode(fullPDF);
}

async function answerQuestionWithAI(question: string, sessionData: any): Promise<string> {
  let response = "";

  try {
    // Handle PDF questions
    if (sessionData.pdfData && !sessionData.tableData) {
      const chunks = chunkText(sessionData.pdfData.text, 15000);

      let prompt = `You are analyzing a PDF document with ${sessionData.pdfData.numPages} pages and ${sessionData.pdfData.textLength} characters.

User question: "${question}"

PDF Content (complete text in chunks):

`;

      chunks.forEach((chunk, idx) => {
        prompt += `\n--- Chunk ${idx + 1}/${chunks.length} ---\n${chunk}\n`;
      });

      if (sessionData.pdfData.tables && sessionData.pdfData.tables.length > 0) {
        prompt += `\n\nTables found in PDF (first 5):\n`;
        sessionData.pdfData.tables.slice(0, 5).forEach((t: string[], i: number) => {
          prompt += `\nTable ${i + 1}:\n${t.join('\n')}\n`;
        });
      }

      prompt += `\n\nPlease answer the user's question based on the complete PDF content above. Be accurate, specific, and cite relevant information from the document. If you need to quote something, use the exact text from the PDF.`;

      const event$ = agent.runTask(prompt, "claude-sonnet-4-20250514");

      for await (const event of eachValueFrom(event$)) {
        if (event.type === "text") {
          const text = (event as any).content || "";
          response += text;
        }
      }

      return response;
    }

    return "No data loaded. Please process a file first.";
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}


// HTTP Request Handler
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // API Endpoints
  if (pathname === "/api/files") {
    try {
      const files: Array<{ name: string; size: number; type: string }> = [];
      for await (const entry of Deno.readDir("./uploads")) {
        if (entry.isFile) {
          const stat = await Deno.stat(`./uploads/${entry.name}`);
          const ext = entry.name.split('.').pop()?.toUpperCase() || '';
          files.push({
            name: entry.name,
            size: stat.size,
            type: ext
          });
        }
      }
      return new Response(JSON.stringify({ files }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ files: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  if (pathname === "/api/process" && req.method === "POST") {
    try {
      const body = await req.json();
      const { filename, sessionId } = body;

      const filePath = `./uploads/${filename}`;
      const ext = filename.split('.').pop()?.toLowerCase();

      let result: any;
      let fileType = '';

      if (ext === 'csv') {
        fileType = 'csv';
        result = await processCSV(filePath);
      } else if (ext === 'xlsx' || ext === 'xls') {
        fileType = 'excel';
        result = await processExcel(filePath);
      } else if (ext === 'pdf') {
        fileType = 'pdf';
        result = await processPDF(filePath);
      } else {
        return new Response(JSON.stringify({ error: true, message: "Unsupported file type" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (result.error) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Update session
      let session = sessions.get(sessionId);
      if (!session) {
        session = {
          currentFile: '',
          fileType: '',
          isFileProcessed: false,
          tableData: null,
          pdfData: null
        };
      }

      session.currentFile = filename;
      session.fileType = fileType;
      session.isFileProcessed = true;

      if (fileType === 'pdf') {
        session.pdfData = result.fullData;
        session.tableData = null;
      } else {
        session.tableData = {
          headers: result.headers,
          rowCount: result.rowCount,
          rows: result.sampleRows
        };
        session.pdfData = null;
      }

      sessions.set(sessionId, session);

      return new Response(JSON.stringify({
        ...result,
        fileType,
        success: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: true,
        message: String(error)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  if (pathname === "/api/ask" && req.method === "POST") {
    try {
      const body = await req.json();
      const { question, sessionId } = body;

      const session = sessions.get(sessionId);
      if (!session || !session.isFileProcessed) {
        return new Response(JSON.stringify({
          error: true,
          message: "No file processed. Please process a file first."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Only allow PDF questions
      if (session.fileType !== 'pdf') {
        return new Response(JSON.stringify({
          error: true,
          message: "Q&A is only available for PDF files. For CSV/Excel files, please use the 'Extract Insights' feature."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const answer = await answerQuestionWithAI(question, session);

      return new Response(JSON.stringify({
        answer,
        success: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: true,
        message: String(error)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }


  if (pathname === "/api/insights" && req.method === "POST") {
    try {
      const body = await req.json();
      const { sessionId } = body;

      const session = sessions.get(sessionId);
      if (!session || !session.isFileProcessed) {
        return new Response(JSON.stringify({
          error: true,
          message: "No file processed. Please process a file first."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Only allow insights for table data
      if (session.fileType === 'pdf') {
        return new Response(JSON.stringify({
          error: true,
          message: "Insights extraction is only available for CSV/Excel files. For PDF files, please use the Q&A feature."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Generate insights
      const result = await extractInsightsTool.execute({});
      const data = JSON.parse(result);

      if (data.error) {
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        insights: data.insights,
        rowCount: data.rowCount,
        columnCount: data.columnCount
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: true,
        message: String(error)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  if (pathname === "/api/insights/pdf" && req.method === "POST") {
    try {
      const body = await req.json();
      const { sessionId } = body;

      const session = sessions.get(sessionId);
      if (!session || !session.isFileProcessed) {
        return new Response(JSON.stringify({
          error: true,
          message: "No file processed. Please process a file first."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Only allow insights for table data
      if (session.fileType === 'pdf') {
        return new Response(JSON.stringify({
          error: true,
          message: "Insights extraction is only available for CSV/Excel files."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Generate insights
      const result = await extractInsightsTool.execute({});
      const data = JSON.parse(result);

      if (data.error) {
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Generate PDF
      const pdfBuffer = generateInsightsPDF(data.insights, session.currentFile);

      return new Response(pdfBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="insights_${session.currentFile.replace(/\.[^.]+$/, '')}_${Date.now()}.pdf"`
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: true,
        message: String(error)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  if (pathname === "/api/upload" && req.method === "POST") {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return new Response(JSON.stringify({
          error: true,
          message: "No file provided"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const bytes = await file.arrayBuffer();
      const filename = file.name;
      await Deno.writeFile(`./uploads/${filename}`, new Uint8Array(bytes));

      return new Response(JSON.stringify({
        success: true,
        filename
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: true,
        message: String(error)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  if (pathname === "/api/delete" && req.method === "POST") {
    try {
      const body = await req.json();
      const { filename } = body;

      if (!filename) {
        return new Response(JSON.stringify({
          error: true,
          message: "No filename provided"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Delete the file from uploads directory
      try {
        await Deno.remove(`./uploads/${filename}`);
      } catch (error) {
        // File might not exist, continue anyway
        console.log(`Could not delete file: ${error}`);
      }

      // Clean up any sessions associated with this file
      for (const [sessionId, session] of sessions.entries()) {
        if (session.currentFile === filename) {
          sessions.delete(sessionId);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: "File deleted successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: true,
        message: String(error)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  // Serve uploaded files
  if (pathname.startsWith("/uploads/")) {
    try {
      const filename = pathname.substring(9); // Remove "/uploads/"
      const filePath = `./uploads/${filename}`;
      const fileContent = await Deno.readFile(filePath);

      let contentType = "application/octet-stream";
      if (filename.endsWith(".csv")) contentType = "text/csv";
      if (filename.endsWith(".xlsx")) contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      if (filename.endsWith(".xls")) contentType = "application/vnd.ms-excel";
      if (filename.endsWith(".pdf")) contentType = "application/pdf";

      return new Response(fileContent, {
        headers: { ...corsHeaders, "Content-Type": contentType }
      });
    } catch {
      return new Response("File not found", { status: 404 });
    }
  }

  // Serve static files
  if (pathname === "/" || pathname === "/index.html") {
    try {
      const html = await Deno.readTextFile("./web/index.html");
      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html" }
      });
    } catch {
      return new Response("File not found", { status: 404 });
    }
  }

  if (pathname.startsWith("/web/")) {
    try {
      const filePath = `.${pathname}`;
      const content = await Deno.readTextFile(filePath);

      let contentType = "text/plain";
      if (pathname.endsWith(".html")) contentType = "text/html";
      if (pathname.endsWith(".css")) contentType = "text/css";
      if (pathname.endsWith(".js")) contentType = "application/javascript";

      return new Response(content, {
        headers: { ...corsHeaders, "Content-Type": contentType }
      });
    } catch {
      return new Response("File not found", { status: 404 });
    }
  }

  return new Response("Not found", { status: 404 });
}

// Preferred port and fallback ports
const PREFERRED_PORT = 8000;
const FALLBACK_PORTS = [8001, 8002, 8003, 8080, 8888, 3000];

// Function to check if a port is available
async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const listener = Deno.listen({ port });
    listener.close();
    return true;
  } catch {
    return false;
  }
}

// Function to find an available port
async function findAvailablePort(): Promise<number> {
  // Try preferred port first
  if (await isPortAvailable(PREFERRED_PORT)) {
    return PREFERRED_PORT;
  }

  console.log(`⚠️  Port ${PREFERRED_PORT} is already in use.`);
  console.log(`🔍 Searching for available port...`);

  // Try fallback ports
  for (const port of FALLBACK_PORTS) {
    if (await isPortAvailable(port)) {
      console.log(`✅ Found available port: ${port}`);
      return port;
    }
  }

  throw new Error("No available ports found. Please close some applications and try again.");
}

// Function to open browser based on OS
async function openBrowser(url: string) {
  try {
    let command: string[];

    if (Deno.build.os === "windows") {
      command = ["cmd", "/c", "start", url];
    } else if (Deno.build.os === "darwin") {
      command = ["open", url];
    } else {
      command = ["xdg-open", url];
    }

    const process = new Deno.Command(command[0], {
      args: command.slice(1),
      stdout: "null",
      stderr: "null",
    });

    await process.output();
    console.log(`✅ Browser opened at ${url}\n`);
  } catch (error) {
    console.log(`⚠️  Could not auto-open browser. Please visit ${url} manually.\n`);
  }
}

// Graceful shutdown handler
let server: Deno.HttpServer | null = null;

async function cleanupFiles() {
  console.log("🧹 Cleaning up files...");

  try {
    // Delete all uploaded files
    try {
      for await (const entry of Deno.readDir("./uploads")) {
        if (entry.isFile) {
          await Deno.remove(`./uploads/${entry.name}`);
        }
      }
      await Deno.remove("./uploads", { recursive: true });
      console.log("✅ Uploaded files cleaned");
    } catch {
      // Directory might not exist or already empty
    }

    // Delete all extracted data
    try {
      for await (const entry of Deno.readDir("./extracted_data")) {
        if (entry.isFile) {
          await Deno.remove(`./extracted_data/${entry.name}`);
        }
      }
      await Deno.remove("./extracted_data", { recursive: true });
      console.log("✅ Extracted data cleaned");
    } catch {
      // Directory might not exist or already empty
    }
  } catch (error) {
    console.error("⚠️  Error during cleanup:", error);
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`\n\n📡 Received ${signal} signal. Shutting down gracefully...`);

  if (server) {
    try {
      await server.shutdown();
      console.log("✅ Server closed successfully");
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
    }
  }

  // Clean up files before exiting
  await cleanupFiles();

  Deno.exit(0);
}

// Register signal handlers for graceful shutdown
// Windows only supports SIGINT, SIGBREAK, and SIGHUP
Deno.addSignalListener("SIGINT", () => gracefulShutdown("SIGINT"));

// SIGTERM is only available on Unix-like systems
if (Deno.build.os !== "windows") {
  Deno.addSignalListener("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

// Windows-specific: Handle Ctrl+Break
if (Deno.build.os === "windows") {
  Deno.addSignalListener("SIGBREAK", () => gracefulShutdown("SIGBREAK"));
}

// Start server with error handling and port fallback
async function startServer() {
  try {
    const PORT = await findAvailablePort();
    const url = `http://localhost:${PORT}`;

    console.log(`\n🌐 Web Server starting on ${url}`);
    console.log(`\n📂 Upload files to ./uploads or use the web interface`);
    console.log(`\n✨ Opening browser automatically...`);
    console.log(`\n💡 Press Ctrl+C to stop the server\n`);

    // Start the server and store reference for graceful shutdown
    server = Deno.serve({
      port: PORT,
      onListen: ({ hostname, port }) => {
        console.log(`🚀 Server is listening on http://${hostname}:${port}`);
      }
    }, handleRequest);

    // Wait a moment for server to start, then open browser
    setTimeout(() => {
      openBrowser(url);
    }, 500);

    // Wait for server to finish
    await server.finished;
  } catch (error) {
    if (error instanceof Error && error.message.includes("AddrInUse")) {
      console.error("\n❌ Port conflict detected!");
      console.error("💡 Solution: Close the existing server or application using this port.");
      console.error("   You can also change the PREFERRED_PORT in webServer.ts");
    } else {
      console.error("\n❌ Failed to start server:", error);
    }
    Deno.exit(1);
  }
}

// Start the server
startServer();
