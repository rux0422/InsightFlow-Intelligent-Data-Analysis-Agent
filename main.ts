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

console.log("\n" + "=".repeat(70));
console.log("           🚀 DataQuery AI - Intelligent Data Analysis Agent");
console.log("=".repeat(70));

// Application state
let currentFile = "";
let fileType = "";
let isFileProcessed = false;
let tableData: any = null;
let pdfData: any = null;

// Step 1: List available files
async function listAvailableFiles() {
  console.log("\n📂 Checking for files in ./uploads folder...\n");
  
  try {
    const files: string[] = [];
    for await (const entry of Deno.readDir("./uploads")) {
      if (entry.isFile) {
        files.push(entry.name);
      }
    }
    
    if (files.length === 0) {
      console.log("⚠️  No files found in uploads folder.");
      console.log("   Please add CSV, Excel, or PDF files to ./uploads/\n");
      return [];
    }
    
    console.log("   Available files:");
    files.forEach((file, idx) => {
      const ext = file.split('.').pop()?.toUpperCase();
      const stat = Deno.statSync(`./uploads/${file}`);
      const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
      console.log(`   ${idx + 1}. ${file} (${ext}, ${sizeMB} MB)`);
    });
    console.log("");
    
    return files;
  } catch (error) {
    console.log("⚠️  Could not read uploads folder. Please create it.\n");
    return [];
  }
}

// Step 2: Process the selected file
async function processFile(filename: string) {
  console.log(`\n📄 Processing ${filename}...\n`);
  
  const filePath = `./uploads/${filename}`;
  try {
    await Deno.stat(filePath);
  } catch {
    console.log(`❌ File not found: ${filename}`);
    console.log("   Please make sure the file is in ./uploads/ folder\n");
    return false;
  }
  
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (ext === 'csv') {
    fileType = 'csv';
    return await processCSV(filePath);
  } else if (ext === 'xlsx' || ext === 'xls') {
    fileType = 'excel';
    return await processExcel(filePath);
  } else if (ext === 'pdf') {
    fileType = 'pdf';
    return await processPDF(filePath);
  } else {
    console.log(`❌ Unsupported file type: ${ext}`);
    console.log("   Supported: CSV, XLSX, XLS, PDF\n");
    return false;
  }
}

async function displayTableInsights() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("📊 GENERATING DATA SCIENCE ANALYSIS REPORT");
    console.log("=".repeat(70) + "\n");

    const result = await extractInsightsTool.execute({});
    const data = JSON.parse(result);

    if (data.error) {
      console.log(`❌ Error: ${data.message}\n`);
      return;
    }

    console.log(data.insights);
    console.log("\n" + "=".repeat(70));
    console.log(`✅ Analysis completed for ${data.rowCount.toLocaleString()} rows, ${data.columnCount} columns`);
    console.log("=".repeat(70) + "\n");

    // Offer PDF download
    console.log("💾 Would you like to save this report as PDF? (yes/no):");
    const savePDF = prompt("") || "";

    if (savePDF.toLowerCase().trim() === 'yes' || savePDF.toLowerCase().trim() === 'y') {
      await savePDFReport(data.insights);
    }
  } catch (error) {
    console.log(`❌ Error generating insights: ${error}\n`);
  }
}

async function savePDFReport(insights: string) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `Data_Science_Analysis_${timestamp}.pdf`;
    const filepath = `./${filename}`;

    const pdfContent = generatePDFFromText(insights, currentFile);
    await Deno.writeFile(filepath, pdfContent);

    console.log(`\n✅ PDF report saved successfully!`);
    console.log(`   Location: ${filepath}`);
    console.log(`   File: ${filename}\n`);
  } catch (error) {
    console.log(`❌ Error saving PDF: ${error}\n`);
  }
}

function generatePDFFromText(content: string, filename: string): Uint8Array {
  const lines = content.split('\n');
  const pdfLines: string[] = [];

  pdfLines.push('%PDF-1.4');
  pdfLines.push('1 0 obj');
  pdfLines.push('<< /Type /Catalog /Pages 2 0 R >>');
  pdfLines.push('endobj');

  const pageObjects: number[] = [];
  const contentObjects: number[] = [];
  let currentObj = 3;
  const linesPerPage = 55;
  const totalPages = Math.ceil(lines.length / linesPerPage);

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    pageObjects.push(currentObj);
    currentObj++;
    contentObjects.push(currentObj);
    currentObj++;
  }

  pdfLines.push('2 0 obj');
  pdfLines.push(`<< /Type /Pages /Kids [${pageObjects.map(o => `${o} 0 R`).join(' ')}] /Count ${totalPages} >>`);
  pdfLines.push('endobj');

  const resourcesObj = currentObj++;
  pdfLines.push(`${resourcesObj} 0 obj`);
  pdfLines.push('<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >> >> >>');
  pdfLines.push('endobj');

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const pageObj = pageObjects[pageNum];
    const contentObj = contentObjects[pageNum];

    pdfLines.push(`${pageObj} 0 obj`);
    pdfLines.push(`<< /Type /Page /Parent 2 0 R /Resources ${resourcesObj} 0 R /MediaBox [0 0 612 792] /Contents ${contentObj} 0 R >>`);
    pdfLines.push('endobj');

    const contentLines: string[] = [];
    contentLines.push('BT');
    contentLines.push('/F1 10 Tf');
    contentLines.push('50 750 Td');

    if (pageNum === 0) {
      contentLines.push('/F2 14 Tf');
      contentLines.push('(DATA SCIENCE ANALYSIS REPORT) Tj');
      contentLines.push('0 -18 Td');
      contentLines.push('/F1 9 Tf');
      contentLines.push(`(Dataset: ${filename.replace(/[()\\]/g, '').substring(0, 60)}) Tj`);
      contentLines.push('0 -12 Td');
      contentLines.push(`(Generated: ${new Date().toLocaleString()}) Tj`);
      contentLines.push('0 -20 Td');
    }

    const startLine = pageNum === 0 ? 0 : pageNum * linesPerPage;
    const endLine = Math.min(startLine + (pageNum === 0 ? linesPerPage - 5 : linesPerPage), lines.length);

    for (let i = startLine; i < endLine; i++) {
      const line = lines[i];

      if (line.trim().length === 0) {
        contentLines.push('0 -8 Td');
      } else if (line === line.toUpperCase() && line.trim().length > 0 && line.trim().length < 60 && !line.includes(':')) {
        contentLines.push('/F2 11 Tf');
        const cleanLine = line.trim().substring(0, 75).replace(/[()\\]/g, '');
        contentLines.push(`(${cleanLine}) Tj`);
        contentLines.push('0 -14 Td');
        contentLines.push('/F1 10 Tf');
      } else {
        const words = line.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          if (testLine.length <= 80) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              contentLines.push(`(${currentLine.replace(/[()\\]/g, '')}) Tj`);
              contentLines.push('0 -11 Td');
            }
            currentLine = word;
          }
        }

        if (currentLine) {
          contentLines.push(`(${currentLine.replace(/[()\\]/g, '')}) Tj`);
          contentLines.push('0 -11 Td');
        }
      }
    }

    contentLines.push('0 -15 Td');
    contentLines.push('/F1 8 Tf');
    contentLines.push(`(Page ${pageNum + 1} of ${totalPages}) Tj`);
    contentLines.push('ET');

    const streamContent = contentLines.join('\n');

    pdfLines.push(`${contentObj} 0 obj`);
    pdfLines.push(`<< /Length ${streamContent.length} >>`);
    pdfLines.push('stream');
    pdfLines.push(streamContent);
    pdfLines.push('endstream');
    pdfLines.push('endobj');
  }

  const pdfContent = pdfLines.join('\n');
  const xrefEntries: string[] = ['0000000000 65535 f '];

  let position = pdfContent.indexOf('1 0 obj');
  for (let i = 1; i < currentObj; i++) {
    const objString = `${i} 0 obj`;
    position = pdfContent.indexOf(objString);
    if (position !== -1) {
      xrefEntries.push(String(position).padStart(10, '0') + ' 00000 n ');
    }
  }

  pdfLines.push('xref');
  pdfLines.push(`0 ${currentObj}`);
  xrefEntries.forEach(entry => pdfLines.push(entry));
  pdfLines.push('trailer');
  pdfLines.push(`<< /Size ${currentObj} /Root 1 0 R >>`);
  pdfLines.push('startxref');
  pdfLines.push(String(pdfLines.join('\n').length - 200));
  pdfLines.push('%%EOF');

  const pdfString = pdfLines.join('\n');
  return new TextEncoder().encode(pdfString);
}

async function promptNextFile() {
  console.log("\n" + "=".repeat(70));
  console.log("📁 ANALYZE ANOTHER FILE");
  console.log("=".repeat(70));
  console.log("\nWhat would you like to do next?");
  console.log("   1. Select another file from uploads folder");
  console.log("   2. Upload a new file to analyze");
  console.log("   3. Exit");
  console.log("");

  const choice = prompt("Enter your choice (1-3): ") || "";

  if (choice === "1") {
    const newFiles = await listAvailableFiles();
    if (newFiles.length > 0) {
      console.log("🔍 Select a file to analyze (enter number or filename):\n");
    }
  } else if (choice === "2") {
    console.log("\n📤 Upload New File");
    console.log("   Please enter the full path to the file you want to analyze:");
    console.log("   Example: C:\\Users\\YourName\\Documents\\data.csv\n");

    const filePath = prompt("File path: ") || "";

    if (filePath) {
      try {
        const stat = await Deno.stat(filePath);

        if (stat.isFile) {
          const filename = filePath.split(/[/\\]/).pop() || "uploaded_file";
          const destPath = `./uploads/${filename}`;

          await Deno.copyFile(filePath, destPath);

          console.log(`\n✅ File uploaded successfully!`);
          console.log(`   Location: ./uploads/${filename}`);
          console.log(`   Processing file...\n`);

          const success = await processFile(filename);

          if (success && (fileType === 'csv' || fileType === 'excel')) {
            await promptNextFile();
          }
        } else {
          console.log(`\n❌ Path is not a file. Please provide a valid file path.\n`);
        }
      } catch (error) {
        console.log(`\n❌ Error uploading file: ${error instanceof Error ? error.message : String(error)}`);
        console.log(`   Please check the file path and try again.\n`);
      }
    }
  } else if (choice === "3" || choice.toLowerCase() === "exit") {
    console.log("\n👋 Thank you for using InsightFlow!\n");
    await cleanupExtractedData();
    Deno.exit(0);
  } else {
    console.log("\n⚠️  Invalid choice. Returning to file selection.\n");
  }
}


async function processCSV(filePath: string) {
  try {
    const result = await processTableTool.execute({
      file_path: filePath,
      file_type: 'csv'
    });

    const parsed = JSON.parse(result);

    if (parsed.error) {
      console.log(`❌ Error: ${parsed.message}\n`);
      return false;
    }

    console.log(`✅ Successfully processed CSV file!`);
    console.log(`   Rows: ${parsed.rowCount.toLocaleString()}`);
    console.log(`   Columns: ${parsed.headers.join(", ")}\n`);

    tableData = {
      headers: parsed.headers,
      rowCount: parsed.rowCount,
      rows: parsed.sample_rows
    };
    pdfData = null;

    // Automatically generate and display insights
    await displayTableInsights();

    return true;
  } catch (error) {
    console.log(`❌ Error processing CSV: ${error}\n`);
    return false;
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
      console.log(`❌ Error: ${parsed.message}\n`);
      return false;
    }

    console.log(`✅ Successfully processed Excel file!`);
    console.log(`   Rows: ${parsed.rowCount.toLocaleString()}`);
    console.log(`   Columns: ${parsed.headers.join(", ")}\n`);

    tableData = {
      headers: parsed.headers,
      rowCount: parsed.rowCount,
      rows: parsed.sample_rows
    };
    pdfData = null;

    // Automatically generate and display insights
    await displayTableInsights();

    return true;
  } catch (error) {
    console.log(`❌ Error processing Excel: ${error}\n`);
    return false;
  }
}

async function processPDF(filePath: string) {
  try {
    const result = await extractPDFTool.execute({
      file_path: filePath
    });
    
    const parsed = JSON.parse(result);
    
    if (parsed.error) {
      console.log(`❌ Error: ${parsed.message}\n`);
      return false;
    }
    
    console.log(`✅ Successfully processed PDF file!`);
    console.log(`   Pages: ${parsed.numPages}`);
    console.log(`   Tables found: ${parsed.tablesFound || 0}`);
    console.log(`   Text length: ${(parsed.textLength / 1000).toFixed(1)}K characters\n`);
    
    // Load the full PDF data from storage
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
        const fullData = JSON.parse(fs);
        
        pdfData = {
          text: fullData.text,
          numPages: fullData.numPages,
          tables: fullData.tables || [],
          metadata: fullData.metadata,
          textLength: fullData.textLength
        };
      }
    } catch (error) {
      console.log(`⚠️  Could not load full PDF data: ${error}`);
    }
    
    tableData = null;
    
    return true;
  } catch (error) {
    console.log(`❌ Error processing PDF: ${error}\n`);
    return false;
  }
}

async function writeToStdout(text: string) {
  const encoder = new TextEncoder();
  await Deno.stdout.write(encoder.encode(text));
}

// Step 3: Answer questions using AI agent for PDF files only
async function answerQuestion(question: string) {
  // Handle PDF questions with AI
  if (pdfData && !tableData) {
    console.log("\n🤔 Analyzing PDF content with AI...\n");

    try {
      // Chunk the text for better processing
      const chunks = chunkText(pdfData.text, 15000);

      let prompt = `You are analyzing a PDF document with ${pdfData.numPages} pages and ${pdfData.textLength} characters.

User question: "${question}"

PDF Content (complete text in chunks):

`;

      // Add all chunks
      chunks.forEach((chunk, idx) => {
        prompt += `\n--- Chunk ${idx + 1}/${chunks.length} ---\n${chunk}\n`;
      });

      if (pdfData.tables.length > 0) {
        prompt += `\n\nTables found in PDF (first 5):\n`;
        pdfData.tables.slice(0, 5).forEach((t: string[], i: number) => {
          prompt += `\nTable ${i + 1}:\n${t.join('\n')}\n`;
        });
      }

      prompt += `\n\nPlease answer the user's question based on the complete PDF content above. Be accurate, specific, and cite relevant information from the document. If you need to quote something, use the exact text from the PDF.`;

      const event$ = agent.runTask(prompt, "claude-sonnet-4-20250514");

      for await (const event of eachValueFrom(event$)) {
        if (event.type === "text") {
          const text = (event as any).content || "";
          await writeToStdout(text);
        }
      }

      console.log("\n");
      return;
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
      return;
    }
  }

  // No PDF loaded
  console.log("❌ No PDF loaded. Please process a PDF file to ask questions.\n");
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

// Cleanup function to clear extracted data
async function cleanupExtractedData() {
  try {
    console.log("🧹 Cleaning up extracted data...");

    for await (const entry of Deno.readDir("./extracted_data")) {
      if (entry.isFile) {
        await Deno.remove(`./extracted_data/${entry.name}`);
      }
    }

    console.log("✅ Extracted data cleaned successfully");
  } catch (error) {
    // Directory might be empty or not exist, that's okay
  }
}

// Main interactive loop
async function main() {
  const files = await listAvailableFiles();

  if (files.length === 0) {
    console.log("👋 Add files to ./uploads/ and restart the agent.\n");
    return;
  }

  console.log("🔍 Which file would you like to analyze?");
  console.log("   (Type the filename or number, or 'exit' to quit)\n");

  const decoder = new TextDecoder();
  const buf = new Uint8Array(4096);

  while (true) {
    await writeToStdout("> ");

    const n = await Deno.stdin.read(buf);
    if (n === null) break;

    const input = decoder.decode(buf.subarray(0, n)).trim();

    if (!input) continue;

    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      console.log("\n👋 Goodbye!\n");
      await cleanupExtractedData();
      break;
    }
    
    if (!isFileProcessed) {
      let selectedFile = "";
      
      const num = parseInt(input);
      if (!isNaN(num) && num > 0 && num <= files.length) {
        selectedFile = files[num - 1];
      } else {
        selectedFile = files.find(f => f.toLowerCase() === input.toLowerCase()) || input;
      }
      
      const success = await processFile(selectedFile);
      
      if (success) {
        currentFile = selectedFile;
        isFileProcessed = true;

        if (fileType === 'pdf') {
          console.log("✅ PDF loaded! You can now ask questions about the document.");
          console.log("   Examples:");
          console.log("   - Summarize this document");
          console.log("   - What are the main topics?");
          console.log("   - Extract key findings");
          console.log("   - What does it say about [specific topic]?");
          console.log("\n   Type 'new file' to analyze a different file, or 'exit' to quit.\n");
        } else {
          // For table files, automatically prompt for next file
          await promptNextFile();
          isFileProcessed = false;
          currentFile = "";
          tableData = null;
          continue;
        }
      }
      continue;
    }
    
    if (input.toLowerCase() === "new file" || input.toLowerCase() === "switch file") {
      isFileProcessed = false;
      currentFile = "";
      tableData = null;
      pdfData = null;
      console.log("\n📂 Available files:");
      files.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file}`);
      });
      console.log("\n🔍 Which file would you like to analyze?\n");
      continue;
    }
    
    await answerQuestion(input);
  }
}

// Register signal handlers for cleanup on exit
Deno.addSignalListener("SIGINT", async () => {
  console.log("\n\n📡 Received interrupt signal...");
  await cleanupExtractedData();
  Deno.exit(0);
});

// SIGTERM is only available on Unix-like systems
if (Deno.build.os !== "windows") {
  Deno.addSignalListener("SIGTERM", async () => {
    console.log("\n\n📡 Received termination signal...");
    await cleanupExtractedData();
    Deno.exit(0);
  });
}

// Windows-specific: Handle Ctrl+Break
if (Deno.build.os === "windows") {
  Deno.addSignalListener("SIGBREAK", async () => {
    console.log("\n\n📡 Received break signal...");
    await cleanupExtractedData();
    Deno.exit(0);
  });
}

await main();