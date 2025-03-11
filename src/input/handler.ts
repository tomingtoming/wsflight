/**
 * Input Handler Module
 *
 * This module is responsible for handling keyboard and mouse input for the flight simulator.
 * It provides key remapping capabilities and abstracts the input handling logic.
 */

import { getPhysicsEngine } from "../dynamics/physics.ts";
import {
  AutopilotMode,
  getAutopilotController,
} from "../autopilot/controller.ts";
import { getGUIManager } from "../gui/interface.ts";

// Key state interface
interface KeyState {
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
}

// Mouse state interface
interface MouseState {
  x: number;
  y: number;
  buttons: {
    left: KeyState;
    middle: KeyState;
    right: KeyState;
  };
  movement: {
    x: number;
    y: number;
  };
}

// Input mapping interface
interface InputMapping {
  [action: string]: {
    keys: string[];
    description: string;
  };
}

// Default key mappings
const DEFAULT_MAPPINGS: InputMapping = {
  // Aircraft control
  "pitch_up": {
    keys: ["ArrowDown", "s"],
    description: "Pitch aircraft nose down",
  },
  "pitch_down": {
    keys: ["ArrowUp", "w"],
    description: "Pitch aircraft nose up",
  },
  "roll_left": {
    keys: ["ArrowLeft", "a"],
    description: "Roll aircraft left",
  },
  "roll_right": {
    keys: ["ArrowRight", "d"],
    description: "Roll aircraft right",
  },
  "yaw_left": {
    keys: ["q", "z"],
    description: "Yaw aircraft left",
  },
  "yaw_right": {
    keys: ["e", "x"],
    description: "Yaw aircraft right",
  },
  "throttle_up": {
    keys: ["=", "+"],
    description: "Increase throttle",
  },
  "throttle_down": {
    keys: ["-", "_"],
    description: "Decrease throttle",
  },
  "throttle_max": {
    keys: ["Backspace"],
    description: "Set throttle to maximum",
  },
  "throttle_idle": {
    keys: ["End"],
    description: "Set throttle to idle",
  },
  "flaps_up": {
    keys: ["["],
    description: "Retract flaps",
  },
  "flaps_down": {
    keys: ["]"],
    description: "Extend flaps",
  },
  "gear_toggle": {
    keys: ["g"],
    description: "Toggle landing gear",
  },
  "brake": {
    keys: ["b"],
    description: "Apply brakes",
  },

  // View control
  "view_cockpit": {
    keys: ["1"],
    description: "Cockpit view",
  },
  "view_external": {
    keys: ["2"],
    description: "External view",
  },
  "view_tower": {
    keys: ["3"],
    description: "Tower view",
  },
  "view_flyby": {
    keys: ["4"],
    description: "Flyby view",
  },
  "view_next": {
    keys: ["v"],
    description: "Next view",
  },
  "view_prev": {
    keys: ["c"],
    description: "Previous view",
  },

  // Autopilot
  "autopilot_toggle": {
    keys: ["p"],
    description: "Toggle autopilot",
  },
  "autopilot_heading": {
    keys: ["h"],
    description: "Toggle heading hold",
  },
  "autopilot_altitude": {
    keys: ["t"],
    description: "Toggle altitude hold",
  },

  // Weapons
  "weapon_fire": {
    keys: ["Space"],
    description: "Fire selected weapon",
  },
  "weapon_next": {
    keys: ["n"],
    description: "Select next weapon",
  },

  // UI control
  "pause": {
    keys: ["Escape"],
    description: "Pause/Menu",
  },
  "screenshot": {
    keys: ["F12"],
    description: "Take screenshot",
  },
};

// Main input handler class
class InputHandler {
  private keyStates: Map<string, KeyState> = new Map();
  private mouseState: MouseState;
  private mappings: InputMapping;
  private aircraftId: string | null = null;
  private throttle: number = 0;
  private flaps: number = 0;
  private isPaused: boolean = false;

  constructor() {
    // Initialize mouse state
    this.mouseState = {
      x: 0,
      y: 0,
      buttons: {
        left: { pressed: false, justPressed: false, justReleased: false },
        middle: { pressed: false, justPressed: false, justReleased: false },
        right: { pressed: false, justPressed: false, justReleased: false },
      },
      movement: {
        x: 0,
        y: 0,
      },
    };

    // Use default mappings
    this.mappings = DEFAULT_MAPPINGS;

    // Initialize key states
    this.initializeKeyStates();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize key states for all mapped keys
   */
  private initializeKeyStates(): void {
    // Create key states for all keys in mappings
    Object.values(this.mappings).forEach((mapping) => {
      mapping.keys.forEach((key) => {
        if (!this.keyStates.has(key)) {
          this.keyStates.set(key, {
            pressed: false,
            justPressed: false,
            justReleased: false,
          });
        }
      });
    });
  }

  /**
   * Set up event listeners for keyboard and mouse
   */
  private setupEventListeners(): void {
    // Keyboard events
    globalThis.addEventListener(
      "keydown",
      (event) => this.handleKeyDown(event),
    );
    globalThis.addEventListener("keyup", (event) => this.handleKeyUp(event));

    // Mouse events
    globalThis.addEventListener(
      "mousemove",
      (event) => this.handleMouseMove(event),
    );
    globalThis.addEventListener(
      "mousedown",
      (event) => this.handleMouseDown(event),
    );
    globalThis.addEventListener(
      "mouseup",
      (event) => this.handleMouseUp(event),
    );

    // Prevent context menu on right click
    globalThis.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      return false;
    });

    // Handle pointer lock change
    document.addEventListener(
      "pointerlockchange",
      () => this.handlePointerLockChange(),
    );
  }

  /**
   * Handle key down events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Skip if key is not mapped
    if (!this.keyStates.has(event.key)) {
      return;
    }

    // Prevent default for mapped keys
    event.preventDefault();

    const keyState = this.keyStates.get(event.key);
    if (keyState && !keyState.pressed) {
      keyState.pressed = true;
      keyState.justPressed = true;
    }
  }

  /**
   * Handle key up events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    // Skip if key is not mapped
    if (!this.keyStates.has(event.key)) {
      return;
    }

    // Prevent default for mapped keys
    event.preventDefault();

    const keyState = this.keyStates.get(event.key);
    if (keyState && keyState.pressed) {
      keyState.pressed = false;
      keyState.justReleased = true;
    }
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    this.mouseState.x = event.clientX;
    this.mouseState.y = event.clientY;

    // Handle mouse movement for pointer lock
    if (document.pointerLockElement) {
      this.mouseState.movement.x = event.movementX;
      this.mouseState.movement.y = event.movementY;
    } else {
      this.mouseState.movement.x = 0;
      this.mouseState.movement.y = 0;
    }
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();

    switch (event.button) {
      case 0: // Left button
        this.mouseState.buttons.left.pressed = true;
        this.mouseState.buttons.left.justPressed = true;
        break;
      case 1: // Middle button
        this.mouseState.buttons.middle.pressed = true;
        this.mouseState.buttons.middle.justPressed = true;
        break;
      case 2: // Right button
        this.mouseState.buttons.right.pressed = true;
        this.mouseState.buttons.right.justPressed = true;
        break;
    }

    // Request pointer lock on left click if not already locked
    if (event.button === 0 && !document.pointerLockElement) {
      document.body.requestPointerLock();
    }
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    event.preventDefault();

    switch (event.button) {
      case 0: // Left button
        this.mouseState.buttons.left.pressed = false;
        this.mouseState.buttons.left.justReleased = true;
        break;
      case 1: // Middle button
        this.mouseState.buttons.middle.pressed = false;
        this.mouseState.buttons.middle.justReleased = true;
        break;
      case 2: // Right button
        this.mouseState.buttons.right.pressed = false;
        this.mouseState.buttons.right.justReleased = true;
        break;
    }
  }

  /**
   * Handle pointer lock change
   */
  private handlePointerLockChange(): void {
    if (!document.pointerLockElement) {
      // Reset mouse movement when pointer lock is released
      this.mouseState.movement.x = 0;
      this.mouseState.movement.y = 0;
    }
  }

  /**
   * Set the aircraft to control
   */
  public setAircraft(id: string): void {
    this.aircraftId = id;
  }

  /**
   * Update input state and apply to aircraft
   */
  public update(): void {
    if (this.isPaused) {
      this.resetJustPressedStates();
      return;
    }

    // Handle pause toggle
    if (this.isActionJustPressed("pause")) {
      this.togglePause();
    }

    // Skip aircraft control if paused
    if (!this.isPaused) {
      this.updateAircraftControl();
      this.updateViewControl();
      this.updateAutopilotControl();
    }

    // Reset "just" states for next frame
    this.resetJustPressedStates();
  }

  /**
   * Reset just pressed/released states
   */
  private resetJustPressedStates(): void {
    // Reset key states
    this.keyStates.forEach((state) => {
      state.justPressed = false;
      state.justReleased = false;
    });

    // Reset mouse button states
    this.mouseState.buttons.left.justPressed = false;
    this.mouseState.buttons.left.justReleased = false;
    this.mouseState.buttons.middle.justPressed = false;
    this.mouseState.buttons.middle.justReleased = false;
    this.mouseState.buttons.right.justPressed = false;
    this.mouseState.buttons.right.justReleased = false;

    // Reset mouse movement
    this.mouseState.movement.x = 0;
    this.mouseState.movement.y = 0;
  }

  /**
   * Toggle pause state
   */
  private togglePause(): void {
    this.isPaused = !this.isPaused;

    // Show/hide menu based on pause state
    const guiManager = getGUIManager();
    if (guiManager) {
      if (this.isPaused) {
        guiManager.showMainMenu();
      } else {
        guiManager.hideMenu("main-menu");
        guiManager.hideMenu("options-menu");
      }
    }
  }

  /**
   * Update aircraft control based on input
   */
  private updateAircraftControl(): void {
    if (!this.aircraftId) {
      return;
    }

    const physicsEngine = getPhysicsEngine();
    if (!physicsEngine) {
      return;
    }

    // Calculate control inputs
    let aileronInput = 0;
    let elevatorInput = 0;
    let rudderInput = 0;

    // Roll (aileron) control
    if (this.isActionPressed("roll_left")) {
      aileronInput -= 1;
    }
    if (this.isActionPressed("roll_right")) {
      aileronInput += 1;
    }

    // Pitch (elevator) control
    if (this.isActionPressed("pitch_up")) {
      elevatorInput += 1;
    }
    if (this.isActionPressed("pitch_down")) {
      elevatorInput -= 1;
    }

    // Yaw (rudder) control
    if (this.isActionPressed("yaw_left")) {
      rudderInput -= 1;
    }
    if (this.isActionPressed("yaw_right")) {
      rudderInput += 1;
    }

    // Throttle control
    if (this.isActionPressed("throttle_up")) {
      this.throttle = Math.min(1, this.throttle + 0.01);
    }
    if (this.isActionPressed("throttle_down")) {
      this.throttle = Math.max(0, this.throttle - 0.01);
    }
    if (this.isActionJustPressed("throttle_max")) {
      this.throttle = 1;
    }
    if (this.isActionJustPressed("throttle_idle")) {
      this.throttle = 0;
    }

    // Flaps control
    if (this.isActionJustPressed("flaps_up")) {
      this.flaps = Math.max(0, this.flaps - 0.33);
    }
    if (this.isActionJustPressed("flaps_down")) {
      this.flaps = Math.min(1, this.flaps + 0.33);
    }

    // Apply control inputs to aircraft
    physicsEngine.updateControlInputs(this.aircraftId, {
      aileron: aileronInput,
      elevator: elevatorInput,
      rudder: rudderInput,
      flaps: this.flaps,
    });

    physicsEngine.setThrottle(this.aircraftId, this.throttle);
  }

  /**
   * Update view control based on input
   */
  private updateViewControl(): void {
    // View switching logic would go here
    // For now, just log view changes
    if (this.isActionJustPressed("view_cockpit")) {
      console.log("Switched to cockpit view");
    }
    if (this.isActionJustPressed("view_external")) {
      console.log("Switched to external view");
    }
    if (this.isActionJustPressed("view_tower")) {
      console.log("Switched to tower view");
    }
    if (this.isActionJustPressed("view_flyby")) {
      console.log("Switched to flyby view");
    }
    if (this.isActionJustPressed("view_next")) {
      console.log("Switched to next view");
    }
    if (this.isActionJustPressed("view_prev")) {
      console.log("Switched to previous view");
    }
  }

  /**
   * Update autopilot control based on input
   */
  private updateAutopilotControl(): void {
    const autopilot = getAutopilotController();
    if (!autopilot) {
      return;
    }

    // Toggle autopilot
    if (this.isActionJustPressed("autopilot_toggle")) {
      const currentMode = autopilot.getMode();
      if (currentMode === AutopilotMode.OFF) {
        autopilot.setMode(AutopilotMode.FULL);
      } else {
        autopilot.setMode(AutopilotMode.OFF);
      }
    }

    // Toggle heading hold
    if (this.isActionJustPressed("autopilot_heading")) {
      const currentMode = autopilot.getMode();
      if (currentMode === AutopilotMode.HEADING_HOLD) {
        autopilot.setMode(AutopilotMode.OFF);
      } else {
        autopilot.setMode(AutopilotMode.HEADING_HOLD);
      }
    }

    // Toggle altitude hold
    if (this.isActionJustPressed("autopilot_altitude")) {
      const currentMode = autopilot.getMode();
      if (currentMode === AutopilotMode.ALTITUDE_HOLD) {
        autopilot.setMode(AutopilotMode.OFF);
      } else {
        autopilot.setMode(AutopilotMode.ALTITUDE_HOLD);
      }
    }
  }

  /**
   * Check if an action is currently pressed
   */
  public isActionPressed(action: string): boolean {
    const mapping = this.mappings[action];
    if (!mapping) {
      return false;
    }

    return mapping.keys.some((key) => {
      const state = this.keyStates.get(key);
      return state ? state.pressed : false;
    });
  }

  /**
   * Check if an action was just pressed this frame
   */
  public isActionJustPressed(action: string): boolean {
    const mapping = this.mappings[action];
    if (!mapping) {
      return false;
    }

    return mapping.keys.some((key) => {
      const state = this.keyStates.get(key);
      return state ? state.justPressed : false;
    });
  }

  /**
   * Check if an action was just released this frame
   */
  public isActionJustReleased(action: string): boolean {
    const mapping = this.mappings[action];
    if (!mapping) {
      return false;
    }

    return mapping.keys.some((key) => {
      const state = this.keyStates.get(key);
      return state ? state.justReleased : false;
    });
  }

  /**
   * Remap a key for an action
   */
  public remapKey(action: string, oldKey: string, newKey: string): boolean {
    const mapping = this.mappings[action];
    if (!mapping) {
      return false;
    }

    const keyIndex = mapping.keys.indexOf(oldKey);
    if (keyIndex === -1) {
      return false;
    }

    // Update the key mapping
    mapping.keys[keyIndex] = newKey;

    // Initialize state for the new key if needed
    if (!this.keyStates.has(newKey)) {
      this.keyStates.set(newKey, {
        pressed: false,
        justPressed: false,
        justReleased: false,
      });
    }

    return true;
  }

  /**
   * Get the current key mappings
   */
  public getMappings(): InputMapping {
    return { ...this.mappings };
  }

  /**
   * Reset mappings to defaults
   */
  public resetMappings(): void {
    this.mappings = { ...DEFAULT_MAPPINGS };
    this.initializeKeyStates();
  }
}

// Singleton instance
let inputHandlerInstance: InputHandler | null = null;

/**
 * Initialize the input handler
 */
export function initializeInput(): InputHandler {
  if (!inputHandlerInstance) {
    inputHandlerInstance = new InputHandler();
    console.log("Input handler initialized");
  }
  return inputHandlerInstance;
}

/**
 * Get the input handler instance
 */
export function getInputHandler(): InputHandler | null {
  return inputHandlerInstance;
}
