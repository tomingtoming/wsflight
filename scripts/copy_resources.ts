/**
 * Resource Copy Script
 *
 * This script copies static resources from the original YSFLIGHT directory
 * to the appropriate locations in the web project.
 */

// Use Deno built-in functions instead of importing from std
// to avoid issues with uncached remote URLs

// Source and destination directories
const YSFLIGHT_DIR = "./YSFLIGHT";
const ASSETS_DIR = "./public/assets";

// Resource directories to copy
const RESOURCE_DIRS = [
  { src: "bitmap", dest: "images" },
  { src: "runtime", dest: "runtime" },
  { src: "sceneryparts", dest: "scenery" },
  { src: "testscenery", dest: "scenery/test" },
];

// File extensions to include
const INCLUDE_EXTENSIONS = [
  // Images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tga",
  // 3D models
  ".srf",
  ".dnm",
  ".fld",
  // Configuration and data
  ".dat",
  ".txt",
  ".lst",
  ".stp",
  ".yfs",
  ".ist",
];

/**
 * Main function to copy resources
 */
async function copyResources() {
  console.log("Starting resource copy process...");

  // Ensure the assets directory exists
  await Deno.mkdir(ASSETS_DIR, { recursive: true });

  // Process each resource directory
  for (const dir of RESOURCE_DIRS) {
    const srcDir = `${YSFLIGHT_DIR}/${dir.src}`;
    const destDir = `${ASSETS_DIR}/${dir.dest}`;

    console.log(`Copying from ${srcDir} to ${destDir}...`);

    try {
      // Ensure the destination directory exists
      await Deno.mkdir(destDir, { recursive: true });

      // Copy the directory recursively with filter
      await copyDirectoryWithFilter(srcDir, destDir);

      console.log(`Successfully copied ${dir.src} to ${dir.dest}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Error copying ${dir.src}: ${errorMessage}`);
    }
  }

  console.log("Resource copy process completed!");
}

/**
 * Copy a directory recursively with file extension filtering
 */
async function copyDirectoryWithFilter(src: string, dest: string) {
  // Read the source directory
  try {
    for await (const entry of Deno.readDir(src)) {
      const srcPath = `${src}/${entry.name}`;
      const destPath = `${dest}/${entry.name}`;

      if (entry.isDirectory) {
        // Create the destination directory
        await Deno.mkdir(destPath, { recursive: true });

        // Recursively copy the subdirectory
        await copyDirectoryWithFilter(srcPath, destPath);
      } else if (entry.isFile) {
        // Check if the file has an allowed extension
        const ext = getFileExtension(entry.name).toLowerCase();
        if (INCLUDE_EXTENSIONS.includes(ext)) {
          // Copy the file
          await Deno.copyFile(srcPath, destPath);
          console.log(`Copied: ${srcPath}`);
        }
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error reading directory ${src}: ${errorMessage}`);
  }
}

/**
 * Get the file extension from a filename
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex !== -1 ? filename.slice(lastDotIndex) : "";
}

// Run the script
if (import.meta.main) {
  copyResources().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error in copy_resources.ts: ${errorMessage}`);
    Deno.exit(1);
  });
}
