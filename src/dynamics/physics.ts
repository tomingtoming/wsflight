/**
 * Physics Simulation Module
 *
 * This module is responsible for simulating the physics of the flight simulator.
 * It handles aircraft dynamics, collision detection, and environmental factors.
 */

import * as THREE from "three";

// Constants
const GRAVITY = 9.81; // m/s²
const AIR_DENSITY = 1.225; // kg/m³ at sea level

// Aircraft physical properties interface
interface AircraftProperties {
  mass: number; // kg
  wingspan: number; // m
  wingArea: number; // m²
  dragCoefficient: number;
  liftCoefficient: number;
  maxThrust: number; // N
  momentOfInertia: THREE.Vector3; // kg·m²
}

// State vector for aircraft
interface AircraftState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  rotation: THREE.Euler;
  angularVelocity: THREE.Vector3;
  angularAcceleration: THREE.Vector3;
  throttle: number; // 0.0 to 1.0
  controlInputs: {
    elevator: number; // -1.0 to 1.0
    aileron: number; // -1.0 to 1.0
    rudder: number; // -1.0 to 1.0
    flaps: number; // 0.0 to 1.0
  };
}

// Main physics engine class
class PhysicsEngine {
  private aircrafts: Map<
    string,
    { properties: AircraftProperties; state: AircraftState }
  >;
  private lastTimestamp: number;
  private isRunning: boolean;
  private animationFrameId: number | null = null;
  private timeoutId: number | null = null;
  private isTestMode: boolean = false;

  constructor() {
    this.aircrafts = new Map();
    this.lastTimestamp = 0;
    this.isRunning = false;
  }

  /**
   * Register an aircraft with the physics engine
   */
  public registerAircraft(
    id: string,
    properties: AircraftProperties,
    initialState: Partial<AircraftState> = {},
  ): void {
    // Create default state
    const defaultState: AircraftState = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      acceleration: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0, "YXZ"),
      angularVelocity: new THREE.Vector3(0, 0, 0),
      angularAcceleration: new THREE.Vector3(0, 0, 0),
      throttle: 0,
      controlInputs: {
        elevator: 0,
        aileron: 0,
        rudder: 0,
        flaps: 0,
      },
    };

    // Merge with initial state if provided
    const state: AircraftState = {
      ...defaultState,
      ...initialState,
      position: initialState.position || defaultState.position,
      velocity: initialState.velocity || defaultState.velocity,
      acceleration: initialState.acceleration || defaultState.acceleration,
      rotation: initialState.rotation || defaultState.rotation,
      angularVelocity: initialState.angularVelocity ||
        defaultState.angularVelocity,
      angularAcceleration: initialState.angularAcceleration ||
        defaultState.angularAcceleration,
      controlInputs: {
        ...defaultState.controlInputs,
        ...(initialState.controlInputs || {}),
      },
    };

    // Register the aircraft
    this.aircrafts.set(id, { properties, state });
  }

  /**
   * Remove an aircraft from the physics engine
   */
  public removeAircraft(id: string): boolean {
    return this.aircrafts.delete(id);
  }

  /**
   * Get the state of an aircraft
   */
  public getAircraftState(id: string): AircraftState | null {
    const aircraft = this.aircrafts.get(id);
    return aircraft ? aircraft.state : null;
  }

  /**
   * Update the control inputs for an aircraft
   */
  public updateControlInputs(
    id: string,
    controlInputs: Partial<AircraftState["controlInputs"]>,
  ): void {
    const aircraft = this.aircrafts.get(id);
    if (aircraft) {
      aircraft.state.controlInputs = {
        ...aircraft.state.controlInputs,
        ...controlInputs,
      };
    }
  }

  /**
   * Set the throttle for an aircraft
   */
  public setThrottle(id: string, throttle: number): void {
    const aircraft = this.aircrafts.get(id);
    if (aircraft) {
      aircraft.state.throttle = Math.max(0, Math.min(1, throttle));
    }
  }

  /**
   * Start the physics simulation
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.update();
  }

  /**
   * Stop the physics simulation
   */
  public stop(): void {
    this.isRunning = false;

    // Clear any pending animation frames or timeouts
    if (
      this.animationFrameId !== null &&
      typeof cancelAnimationFrame !== "undefined"
    ) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Enable test mode - prevents animation frame scheduling
   * This is useful for testing where we want to manually control updates
   */
  public enableTestMode(enabled: boolean = true): void {
    this.isTestMode = enabled;
  }

  /**
   * Perform a single physics update step
   * This is useful for testing where we want to manually control updates
   * @param deltaTime Time step in seconds
   */
  public updateStep(deltaTime: number = 1 / 60): void {
    // Update each aircraft
    this.aircrafts.forEach((aircraft) => {
      this.updateAircraft(aircraft, deltaTime);
    });
  }

  /**
   * Update the physics simulation
   */
  private update(): void {
    if (!this.isRunning) {
      return;
    }

    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTimestamp) / 1000; // Convert to seconds
    this.lastTimestamp = currentTime;

    // Update each aircraft
    this.aircrafts.forEach((aircraft) => {
      this.updateAircraft(aircraft, deltaTime);
    });

    // Skip scheduling next update if in test mode
    if (this.isTestMode) {
      return;
    }

    // Request next update
    if (typeof requestAnimationFrame !== "undefined") {
      // Browser environment
      this.animationFrameId = requestAnimationFrame(() => this.update());
    } else {
      // Node/Deno environment
      this.timeoutId = setTimeout(() => this.update(), 16) as unknown as number; // ~60fps
    }
  }

  /**
   * Update the physics for a single aircraft
   */
  private updateAircraft(
    aircraft: { properties: AircraftProperties; state: AircraftState },
    deltaTime: number,
  ): void {
    const { properties, state } = aircraft;

    // Calculate forces
    const gravityForce = new THREE.Vector3(0, -GRAVITY * properties.mass, 0);
    const thrustForce = this.calculateThrust(properties, state);
    const aerodynamicForces = this.calculateAerodynamicForces(
      properties,
      state,
    );

    // Sum all forces
    const totalForce = new THREE.Vector3()
      .add(gravityForce)
      .add(thrustForce)
      .add(aerodynamicForces.lift)
      .add(aerodynamicForces.drag)
      .add(aerodynamicForces.sideForce);

    // Calculate acceleration (F = ma)
    state.acceleration.copy(totalForce.divideScalar(properties.mass));

    // Update velocity (v = v0 + at)
    state.velocity.add(state.acceleration.clone().multiplyScalar(deltaTime));

    // Update position (p = p0 + vt)
    state.position.add(state.velocity.clone().multiplyScalar(deltaTime));

    // Calculate moments (torques)
    const moments = this.calculateMoments(properties, state, aerodynamicForces);

    // Calculate angular acceleration
    state.angularAcceleration.set(
      moments.x / properties.momentOfInertia.x,
      moments.y / properties.momentOfInertia.y,
      moments.z / properties.momentOfInertia.z,
    );

    // Update angular velocity
    state.angularVelocity.add(
      state.angularAcceleration.clone().multiplyScalar(deltaTime),
    );

    // Update rotation
    state.rotation.x += state.angularVelocity.x * deltaTime;
    state.rotation.y += state.angularVelocity.y * deltaTime;
    state.rotation.z += state.angularVelocity.z * deltaTime;

    // Ground collision detection (simple)
    if (state.position.y < 0) {
      state.position.y = 0;
      state.velocity.y = 0;
      // Apply ground friction
      state.velocity.x *= 0.95;
      state.velocity.z *= 0.95;
    }
  }

  /**
   * Calculate thrust force based on throttle setting
   */
  private calculateThrust(
    properties: AircraftProperties,
    state: AircraftState,
  ): THREE.Vector3 {
    // Calculate thrust magnitude
    const thrustMagnitude = properties.maxThrust * state.throttle;

    // Convert aircraft's rotation to direction vector
    const direction = new THREE.Vector3(0, 0, 1).applyEuler(state.rotation);

    // Return thrust vector
    return direction.multiplyScalar(thrustMagnitude);
  }

  /**
   * Calculate aerodynamic forces (lift, drag, side force)
   */
  private calculateAerodynamicForces(
    properties: AircraftProperties,
    state: AircraftState,
  ): {
    lift: THREE.Vector3;
    drag: THREE.Vector3;
    sideForce: THREE.Vector3;
  } {
    // Get airspeed (magnitude of velocity)
    const airspeed = state.velocity.length();

    // If airspeed is negligible, no aerodynamic forces
    if (airspeed < 0.1) {
      return {
        lift: new THREE.Vector3(),
        drag: new THREE.Vector3(),
        sideForce: new THREE.Vector3(),
      };
    }

    // Get normalized velocity vector
    const velocityDirection = state.velocity.clone().normalize();

    // Get aircraft's up vector (for lift direction)
    const upVector = new THREE.Vector3(0, 1, 0).applyEuler(state.rotation);

    // Get aircraft's right vector (for side force direction)
    const forwardVector = new THREE.Vector3(0, 0, 1).applyEuler(state.rotation);
    const rightVector = new THREE.Vector3().crossVectors(
      forwardVector,
      upVector,
    ).normalize();

    // Calculate angle of attack (simplified)
    const angleOfAttack = Math.acos(forwardVector.dot(velocityDirection)) -
      Math.PI / 2;

    // Calculate lift coefficient (simplified)
    const effectiveLiftCoef = properties.liftCoefficient *
      (1 + 5 * angleOfAttack + state.controlInputs.elevator * 0.5 +
        state.controlInputs.flaps * 0.8);

    // Calculate drag coefficient (simplified)
    const effectiveDragCoef = properties.dragCoefficient *
      (1 + angleOfAttack * angleOfAttack * 10 +
        state.controlInputs.flaps * 0.5);

    // Calculate side force coefficient (simplified)
    const sideForceFactor = state.controlInputs.rudder * 0.5;

    // Calculate dynamic pressure
    const dynamicPressure = 0.5 * AIR_DENSITY * airspeed * airspeed;

    // Calculate force magnitudes
    const liftMagnitude = dynamicPressure * properties.wingArea *
      effectiveLiftCoef;
    const dragMagnitude = dynamicPressure * properties.wingArea *
      effectiveDragCoef;
    const sideForceMagnitude = dynamicPressure * properties.wingArea *
      sideForceFactor;

    // Calculate force vectors
    const lift = upVector.multiplyScalar(liftMagnitude);
    const drag = velocityDirection.multiplyScalar(-dragMagnitude);
    const sideForce = rightVector.multiplyScalar(sideForceMagnitude);

    return { lift, drag, sideForce };
  }

  /**
   * Calculate moments (torques) acting on the aircraft
   */
  private calculateMoments(
    properties: AircraftProperties,
    state: AircraftState,
    forces: {
      lift: THREE.Vector3;
      drag: THREE.Vector3;
      sideForce: THREE.Vector3;
    },
  ): THREE.Vector3 {
    // Calculate roll moment (from aileron)
    const rollMoment = properties.wingspan * 0.5 * state.controlInputs.aileron *
      forces.lift.length() * 0.1;

    // Calculate pitch moment (from elevator)
    const pitchMoment = state.controlInputs.elevator * forces.lift.length() *
      0.2;

    // Calculate yaw moment (from rudder)
    const yawMoment = state.controlInputs.rudder * forces.drag.length() * 0.2;

    // Add damping moments (proportional to angular velocity)
    const rollDamping = -state.angularVelocity.x * 0.5;
    const pitchDamping = -state.angularVelocity.y * 0.5;
    const yawDamping = -state.angularVelocity.z * 0.5;

    return new THREE.Vector3(
      rollMoment + rollDamping,
      pitchMoment + pitchDamping,
      yawMoment + yawDamping,
    );
  }
}

// Singleton instance
let physicsEngineInstance: PhysicsEngine | null = null;

/**
 * Initialize the physics engine
 */
export function initializeDynamics(): PhysicsEngine {
  if (!physicsEngineInstance) {
    physicsEngineInstance = new PhysicsEngine();
    console.log("Physics engine initialized");
  }
  return physicsEngineInstance;
}

/**
 * Get the physics engine instance
 */
export function getPhysicsEngine(): PhysicsEngine | null {
  return physicsEngineInstance;
}
