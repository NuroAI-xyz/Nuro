import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GpuInfo } from "../types.js";

const execFileAsync = promisify(execFile);

export async function detectGpu(): Promise<GpuInfo> {
  const nvidia = await detectNvidiaGpu();
  if (nvidia) return nvidia;

  const apple = await detectAppleGpu();
  if (apple) return apple;

  return {
    name: "Unknown GPU",
    vramMb: null,
    backend: "unknown",
  };
}

async function detectNvidiaGpu(): Promise<GpuInfo | null> {
  try {
    const { stdout } = await execFileAsync("nvidia-smi", [
      "--query-gpu=name,memory.total",
      "--format=csv,noheader,nounits",
    ]);
    const [firstLine] = stdout.trim().split("\n");
    if (!firstLine) return null;

    const [name, memory] = firstLine.split(",").map((part) => part.trim());
    return {
      name: name || "NVIDIA GPU",
      vramMb: memory ? Number.parseInt(memory, 10) : null,
      backend: "cuda",
    };
  } catch {
    return null;
  }
}

async function detectAppleGpu(): Promise<GpuInfo | null> {
  if (process.platform !== "darwin") return null;

  try {
    const { stdout } = await execFileAsync("system_profiler", [
      "SPDisplaysDataType",
      "-json",
    ]);
    const profile = JSON.parse(stdout) as {
      SPDisplaysDataType?: Array<{ sppci_model?: string; _name?: string }>;
    };
    const display = profile.SPDisplaysDataType?.[0];
    const name = display?.sppci_model ?? display?._name ?? "Apple GPU";

    return {
      name,
      vramMb: null,
      backend: "metal",
    };
  } catch {
    return {
      name: "Apple GPU",
      vramMb: null,
      backend: "metal",
    };
  }
}
