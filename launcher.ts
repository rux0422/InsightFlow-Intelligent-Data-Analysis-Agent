import { load } from "@std/dotenv";

// Load environment variables
const env = await load();

console.log("\n" + "=".repeat(70));
console.log("           🚀 InsightFlow");
console.log("           Your Intelligent Data Analysis Agent.");
console.log("           From Files to Insights, Instantly. (supports .pdf, .csv and Excel files)");
console.log("=".repeat(70));
console.log("");
console.log("   Select your preferred mode:");
console.log("");
console.log("   1. 🖥️  CLI Mode - Command-line interface for terminal users");
console.log("   2. 🌐 Web Server Mode - Visual web interface");
console.log("");
console.log("=".repeat(70));
console.log("");

const decoder = new TextDecoder();
const buf = new Uint8Array(4096);

async function writeToStdout(text: string) {
  const encoder = new TextEncoder();
  await Deno.stdout.write(encoder.encode(text));
}

while (true) {
  await writeToStdout("Enter your choice (1 or 2): ");

  const n = await Deno.stdin.read(buf);
  if (n === null) {
    console.log("\n👋 Goodbye!\n");
    Deno.exit(0);
  }

  const input = decoder.decode(buf.subarray(0, n)).trim();

  if (input === "1") {
    console.log("\n✅ Starting CLI Mode...\n");
    console.log("=".repeat(70));

    // Import and run CLI mode
    const cliModule = await import("./main.ts");
    break;
  } else if (input === "2") {
    console.log("\n✅ Starting Web Server Mode...\n");
    console.log("=".repeat(70));

    // Import and run Web Server mode
    const webModule = await import("./webServer.ts");
    break;
  } else {
    console.log("❌ Invalid choice. Please enter 1 or 2.\n");
  }
}
