/**
 * Autopilot Controller Module
 *
 * This module is responsible for implementing the autopilot functionality
 * of the flight simulator, including navigation, altitude hold, and heading hold.
 */

import * as THREE from "three";
import { getPhysicsEngine } from "../dynamics/physics.ts";

// Autopilot modes
export enum AutopilotMode {
  OFF = "OFF",
  HEADING_HOLD = "HEADING_HOLD",
  ALTITUDE_HOLD = "ALTITUDE_HOLD",
  NAVIGATION = "NAVIGATION",
  APPROACH = "APPROACH",
  FULL = "FULL",
}

// Autopilot settings
interface AutopilotSettings {
  targetHeading: number;
  targetAltitude: number;
  targetSpeed: number;
  targetWaypoint: THREE.Vector3 | null;
  approachGlideslope: number;
  maxBankAngle: number;
  maxPitchAngle: number;
}

// PID Controller for smooth control
class PIDController {
  private kP: number;
  private kI: number;
  private kD: number;
  private integral: number = 0;
  private previousError: number = 0;
  private outputMin: number;
  private outputMax: number;

  constructor(
    kP: number,
    kI: number,
    kD: number,
    outputMin: number = -1,
    outputMax: number = 1,
  ) {
    this.kP = kP;
    this.kI = kI;
    this.kD = kD;
    this.outputMin = outputMin;
    this.outputMax = outputMax;
  }

  /**
   * Compute control output based on error
   */
  public compute(error: number, deltaTime: number): number {
    // Proportional term
    const pTerm = this.kP * error;

    // Integral term
    this.integral += error * deltaTime;
    const iTerm = this.kI * this.integral;

    // Derivative term
    const derivative = (error - this.previousError) / deltaTime;
    const dTerm = this.kD * derivative;

    // Calculate output
    let output = pTerm + iTerm + dTerm;

    // Clamp output
    output = Math.max(this.outputMin, Math.min(this.outputMax, output));

    // Store error for next iteration
    this.previousError = error;

    return output;
  }

  /**
   * Reset the controller
   */
  public reset(): void {
    this.integral = 0;
    this.previousError = 0;
  }
}

// Main autopilot controller class
class AutopilotController {
  private mode: AutopilotMode = AutopilotMode.OFF;
  private settings: AutopilotSettings;
  private headingController: PIDController;
  private altitudeController: PIDController;
  private speedController: PIDController;
  private aircraftId: string | null = null;
  private lastUpdateTime: number = 0;

  constructor() {
    // Initialize default settings
    this.settings = {
      targetHeading: 0,
      targetAltitude: 1000, // feet
      targetSpeed: 120, // knots
      targetWaypoint: null,
      approachGlideslope: 3, // degrees
      maxBankAngle: 25, // degrees
      maxPitchAngle: 15, // degrees
    };

    // Initialize PID controllers
    this.headingController = new PIDController(0.01, 0.001, 0.05);
    this.altitudeController = new PIDController(0.01, 0.0005, 0.05);
    this.speedController = new PIDController(0.01, 0.001, 0.02);
  }

  /**
   * Set the aircraft to control
   */
  public setAircraft(id: string): void {
    this.aircraftId = id;
  }

  /**
   * Set the autopilot mode
   */
  public setMode(mode: AutopilotMode): void {
    if (this.mode !== mode) {
      console.log(`Autopilot mode changed: ${this.mode} -> ${mode}`);
      this.mode = mode;

      // Reset controllers when mode changes
      this.headingController.reset();
      this.altitudeController.reset();
      this.speedController.reset();
    }
  }

  /**
   * Get the current autopilot mode
   */
  public getMode(): AutopilotMode {
    return this.mode;
  }

  /**
   * Set target heading
   */
  public setTargetHeading(heading: number): void {
    // Normalize heading to 0-360 range
    heading = ((heading % 360) + 360) % 360;
    this.settings.targetHeading = heading;
  }

  /**
   * Set target altitude
   */
  public setTargetAltitude(altitude: number): void {
    this.settings.targetAltitude = Math.max(0, altitude);
  }

  /**
   * Set target speed
   */
  public setTargetSpeed(speed: number): void {
    this.settings.targetSpeed = Math.max(0, speed);
  }

  /**
   * Set target waypoint
   */
  public setTargetWaypoint(waypoint: THREE.Vector3 | null): void {
    this.settings.targetWaypoint = waypoint ? waypoint.clone() : null;
  }

  /**
   * Update the autopilot
   */
  public update(): void {
    if (this.mode === AutopilotMode.OFF || !this.aircraftId) {
      return;
    }

    const physicsEngine = getPhysicsEngine();
    if (!physicsEngine) {
      console.warn("Physics engine not available");
      return;
    }

    const aircraftState = physicsEngine.getAircraftState(this.aircraftId);
    if (!aircraftState) {
      console.warn(`Aircraft ${this.aircraftId} not found`);
      return;
    }

    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;

    if (deltaTime <= 0) {
      return; // Skip first update or invalid time delta
    }

    // Extract current state
    const { position, velocity, rotation } = aircraftState;

    // Calculate current heading (in degrees)
    const heading = (rotation.y * 180 / Math.PI + 360) % 360;

    // Calculate current altitude (in feet)
    const altitude = position.y * 3.28084; // Convert meters to feet

    // Calculate current speed (in knots)
    const speed = velocity.length() * 1.94384; // Convert m/s to knots

    // Control variables
    let aileronInput = 0;
    let elevatorInput = 0;
    const rudderInput = 0;
    let throttleInput = aircraftState.throttle;

    // Apply appropriate control based on mode
    if (
      this.mode === AutopilotMode.HEADING_HOLD ||
      this.mode === AutopilotMode.NAVIGATION ||
      this.mode === AutopilotMode.FULL
    ) {
      aileronInput = this.controlHeading(heading, deltaTime);
    }

    if (
      this.mode === AutopilotMode.ALTITUDE_HOLD ||
      this.mode === AutopilotMode.APPROACH ||
      this.mode === AutopilotMode.FULL
    ) {
      elevatorInput = this.controlAltitude(altitude, deltaTime);
    }

    if (this.mode === AutopilotMode.FULL) {
      throttleInput = this.controlSpeed(speed, deltaTime);
    }

    if (
      this.mode === AutopilotMode.NAVIGATION && this.settings.targetWaypoint
    ) {
      this.navigateToWaypoint(position, heading);
    }

    // Apply control inputs to aircraft
    physicsEngine.updateControlInputs(this.aircraftId, {
      aileron: aileronInput,
      elevator: elevatorInput,
      rudder: rudderInput,
    });

    physicsEngine.setThrottle(this.aircraftId, throttleInput);
  }

  /**
   * Control heading using PID controller
   */
  private controlHeading(currentHeading: number, deltaTime: number): number {
    // Calculate heading error, accounting for wrap-around
    let error = this.settings.targetHeading - currentHeading;
    if (error > 180) error -= 360;
    if (error < -180) error += 360;

    // Compute aileron input using PID controller
    return this.headingController.compute(error, deltaTime);
  }

  /**
   * Control altitude using PID controller
   */
  private controlAltitude(currentAltitude: number, deltaTime: number): number {
    // Calculate altitude error
    const error = this.settings.targetAltitude - currentAltitude;

    // Compute elevator input using PID controller
    return this.altitudeController.compute(error, deltaTime);
  }

  /**
   * Control speed using PID controller
   */
  private controlSpeed(currentSpeed: number, deltaTime: number): number {
    // Calculate speed error
    const error = this.settings.targetSpeed - currentSpeed;

    // Compute throttle input using PID controller
    // Map from -1,1 to 0,1 range for throttle
    const pidOutput = this.speedController.compute(error, deltaTime);
    return (pidOutput + 1) / 2;
  }

  /**
   * Navigate to waypoint by updating target heading
   */
  private navigateToWaypoint(
    position: THREE.Vector3,
    _currentHeading: number,
  ): void {
    if (!this.settings.targetWaypoint) {
      return;
    }

    // Calculate direction to waypoint
    const direction = new THREE.Vector3()
      .subVectors(this.settings.targetWaypoint, position)
      .normalize();

    // Calculate heading to waypoint (in degrees)
    const targetHeading =
      (Math.atan2(direction.x, direction.z) * 180 / Math.PI + 360) % 360;

    // Update target heading
    this.setTargetHeading(targetHeading);
  }
}

// Singleton instance
let autopilotControllerInstance: AutopilotController | null = null;

/**
 * Initialize the autopilot controller
 */
export function initializeAutopilot(): AutopilotController {
  if (!autopilotControllerInstance) {
    autopilotControllerInstance = new AutopilotController();
    console.log("Autopilot controller initialized");
  }
  return autopilotControllerInstance;
}

/**
 * Get the autopilot controller instance
 */
export function getAutopilotController(): AutopilotController | null {
  return autopilotControllerInstance;
}
