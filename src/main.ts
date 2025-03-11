/**
 * YSFLIGHT Web - Main Entry Point
 *
 * This is the main entry point for the YSFLIGHT web-based flight simulator.
 * It initializes the core modules and starts the application.
 */

import { initializeGraphics } from "./graphics/renderer.ts";
import { initializeDynamics } from "./dynamics/physics.ts";
import { initializeGUI } from "./gui/interface.ts";
import { initializeAutopilot } from "./autopilot/controller.ts";
import { initializeInput } from "./input/handler.ts";

/**
 * Main application class
 */
class YSFlightWeb {
  private isRunning: boolean = false;

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    console.log("Initializing YSFLIGHT Web...");

    try {
      // Initialize core modules
      await initializeGraphics();
      await initializeDynamics();
      await initializeGUI();
      await initializeAutopilot();
      await initializeInput();

      console.log("Initialization complete.");
    } catch (error) {
      console.error("Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Start the application
   */
  public start(): void {
    if (this.isRunning) {
      console.warn("Application is already running.");
      return;
    }

    console.log("Starting YSFLIGHT Web...");
    this.isRunning = true;

    // Start the main loop
    this.mainLoop();
  }

  /**
   * Stop the application
   */
  public stop(): void {
    if (!this.isRunning) {
      console.warn("Application is not running.");
      return;
    }

    console.log("Stopping YSFLIGHT Web...");
    this.isRunning = false;
  }

  /**
   * Main application loop
   */
  private mainLoop(): void {
    if (!this.isRunning) {
      return;
    }

    // Request next frame
    requestAnimationFrame(() => this.mainLoop());

    // Update logic will be implemented here
  }
}

/**
 * Application entry point
 */
async function main() {
  const app = new YSFlightWeb();

  try {
    await app.initialize();
    app.start();
  } catch (error) {
    console.error("Failed to start application:", error);
  }
}

// Start the application when the DOM is loaded
if (typeof window !== "undefined") {
  globalThis.addEventListener("DOMContentLoaded", main);
} else {
  console.warn(
    "Running in a non-browser environment. Some features may not work.",
  );
  main();
}
