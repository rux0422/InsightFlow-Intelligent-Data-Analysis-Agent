#!/usr/bin/env -S deno run --allow-run --allow-net

/**
 * Helper script to find and kill processes using ports 8000-8003
 * Run this if you need to clean up stuck server processes
 */

const PORTS_TO_CHECK = [8000, 8001, 8002, 8003, 8080, 8888, 3000];

async function isPortInUse(port: number): Promise<boolean> {
  try {
    const listener = Deno.listen({ port });
    listener.close();
    return false;
  } catch {
    return true;
  }
}

async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    if (Deno.build.os === "windows") {
      // Find process using the port
      const findCmd = new Deno.Command("cmd", {
        args: ["/c", "netstat", "-ano", "|", "findstr", `:${port}`],
        stdout: "piped",
        stderr: "piped",
      });

      const findOutput = await findCmd.output();
      const output = new TextDecoder().decode(findOutput.stdout);

      if (!output.trim()) {
        return false;
      }

      // Extract PID from netstat output
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) {
          const pid = match[1];
          console.log(`  🎯 Found process ${pid} on port ${port}`);

          // Kill the process
          const killCmd = new Deno.Command("taskkill", {
            args: ["/F", "/PID", pid],
            stdout: "piped",
            stderr: "piped",
          });

          await killCmd.output();
          console.log(`  ✅ Killed process ${pid}`);
          return true;
        }
      }
    } else {
      // Unix-like systems (macOS, Linux)
      const findCmd = new Deno.Command("lsof", {
        args: ["-ti", `:${port}`],
        stdout: "piped",
        stderr: "piped",
      });

      const findOutput = await findCmd.output();
      const pid = new TextDecoder().decode(findOutput.stdout).trim();

      if (!pid) {
        return false;
      }

      console.log(`  🎯 Found process ${pid} on port ${port}`);

      // Kill the process
      const killCmd = new Deno.Command("kill", {
        args: ["-9", pid],
        stdout: "piped",
        stderr: "piped",
      });

      await killCmd.output();
      console.log(`  ✅ Killed process ${pid}`);
      return true;
    }
  } catch (error) {
    console.error(`  ❌ Error killing process on port ${port}:`, error);
  }

  return false;
}

async function main() {
  console.log("🔍 Checking for processes on common ports...\n");

  let foundAny = false;

  for (const port of PORTS_TO_CHECK) {
    const inUse = await isPortInUse(port);

    if (inUse) {
      console.log(`⚠️  Port ${port} is in use`);
      foundAny = true;
      await killProcessOnPort(port);
    } else {
      console.log(`✅ Port ${port} is available`);
    }
  }

  if (!foundAny) {
    console.log("\n🎉 All ports are available! You can start the server now.");
  } else {
    console.log("\n✅ Cleanup complete. Try starting the server again.");
  }
}

main();
