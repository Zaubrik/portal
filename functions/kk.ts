import { walk } from "https://deno.land/std/fs/mod.ts";

async function calculateDirectorySize(directoryPath: string): Promise<number> {
  let totalSize = 0;

  // Iterate through each entry in the directory
  for await (
    const entry of walk(directoryPath, {
      includeFiles: true,
      includeDirs: false,
    })
  ) {
    const fileInfo = await Deno.stat(entry.path);
    totalSize += fileInfo.size;
  }

  return totalSize;
}

const directoryPath = "./"; // Replace with your directory path
calculateDirectorySize(directoryPath).then((size) => {
  console.log(`Total size of '${directoryPath}' is ${size} bytes.`);
});
