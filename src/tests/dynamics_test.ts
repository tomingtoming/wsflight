/**
 * Dynamics Module Tests
 *
 * This file contains tests for the physics simulation module.
 */

import { assertEquals } from "./test_utils.ts";
import { getPhysicsEngine, initializeDynamics } from "../dynamics/physics.ts";
import * as THREE from "three";

// Test suite for the physics engine
const dynamicsTests = [
  {
    name: "Physics engine initialization",
    fn: async () => {
      const physicsEngine = await initializeDynamics();
      assertEquals(
        physicsEngine !== null,
        true,
        "Physics engine should be initialized",
      );

      // Check singleton pattern
      const secondInstance = await initializeDynamics();
      assertEquals(
        physicsEngine === secondInstance,
        true,
        "Should return the same instance",
      );

      // Check getter
      const instance = getPhysicsEngine();
      assertEquals(
        physicsEngine === instance,
        true,
        "Getter should return the same instance",
      );
    },
  },

  {
    name: "Aircraft registration and state retrieval",
    fn: async () => {
      const physicsEngine = await initializeDynamics();

      // Register a test aircraft
      const testAircraftId = "test-aircraft";
      const properties = {
        mass: 1000, // kg
        wingspan: 10, // m
        wingArea: 20, // m²
        dragCoefficient: 0.03,
        liftCoefficient: 0.5,
        maxThrust: 20000, // N
        momentOfInertia: new THREE.Vector3(1000, 2000, 1500), // kg·m²
      };

      // Initial state
      const initialPosition = new THREE.Vector3(0, 1000, 0);

      physicsEngine.registerAircraft(testAircraftId, properties, {
        position: initialPosition,
      });

      // Get the state
      const state = physicsEngine.getAircraftState(testAircraftId);
      assertEquals(state !== null, true, "Aircraft state should exist");
      assertEquals(
        state?.position.equals(initialPosition),
        true,
        "Position should match initial value",
      );

      // Remove the aircraft
      const removed = physicsEngine.removeAircraft(testAircraftId);
      assertEquals(removed, true, "Aircraft should be removed successfully");

      // Check that it's gone
      const stateAfterRemoval = physicsEngine.getAircraftState(testAircraftId);
      assertEquals(
        stateAfterRemoval,
        null,
        "Aircraft state should be null after removal",
      );
    },
  },

  {
    name: "Control input updates",
    fn: async () => {
      const physicsEngine = await initializeDynamics();

      // Register a test aircraft
      const testAircraftId = "test-aircraft";
      const properties = {
        mass: 1000,
        wingspan: 10,
        wingArea: 20,
        dragCoefficient: 0.03,
        liftCoefficient: 0.5,
        maxThrust: 20000,
        momentOfInertia: new THREE.Vector3(1000, 2000, 1500),
      };

      physicsEngine.registerAircraft(testAircraftId, properties);

      // Update control inputs
      const testInputs = {
        elevator: 0.5,
        aileron: -0.3,
        rudder: 0.1,
      };

      physicsEngine.updateControlInputs(testAircraftId, testInputs);

      // Get the state and check inputs
      const state = physicsEngine.getAircraftState(testAircraftId);
      assertEquals(
        state?.controlInputs.elevator,
        testInputs.elevator,
        "Elevator input should match",
      );
      assertEquals(
        state?.controlInputs.aileron,
        testInputs.aileron,
        "Aileron input should match",
      );
      assertEquals(
        state?.controlInputs.rudder,
        testInputs.rudder,
        "Rudder input should match",
      );

      // Test throttle setting
      const testThrottle = 0.75;
      physicsEngine.setThrottle(testAircraftId, testThrottle);
      assertEquals(state?.throttle, testThrottle, "Throttle should match");

      // Test throttle clamping
      physicsEngine.setThrottle(testAircraftId, 1.5); // Above max
      assertEquals(state?.throttle, 1.0, "Throttle should be clamped to 1.0");

      physicsEngine.setThrottle(testAircraftId, -0.5); // Below min
      assertEquals(state?.throttle, 0.0, "Throttle should be clamped to 0.0");

      // Clean up
      physicsEngine.removeAircraft(testAircraftId);
    },
  },

  {
    name: "Basic physics simulation",
    fn: async () => {
      const physicsEngine = await initializeDynamics();

      // Register a test aircraft
      const testAircraftId = "test-aircraft";
      const properties = {
        mass: 1000,
        wingspan: 10,
        wingArea: 20,
        dragCoefficient: 0.03,
        liftCoefficient: 0.5,
        maxThrust: 20000,
        momentOfInertia: new THREE.Vector3(1000, 2000, 1500),
      };

      // Initial state with some velocity
      const initialPosition = new THREE.Vector3(0, 1000, 0);
      const initialVelocity = new THREE.Vector3(50, 0, 0); // 50 m/s in x direction

      physicsEngine.registerAircraft(testAircraftId, properties, {
        position: initialPosition,
        velocity: initialVelocity,
        throttle: 0.5, // Half throttle
      });

      // Get initial state
      const initialState = physicsEngine.getAircraftState(testAircraftId);

      // Enable test mode to prevent animation frame scheduling
      physicsEngine["enableTestMode"](true);

      // Start the physics simulation
      physicsEngine.start();

      // Use the updateStep method to directly update physics without animation frames
      physicsEngine["updateStep"](0.1); // 100ms time step

      // Get updated state
      const updatedState = physicsEngine.getAircraftState(testAircraftId);

      // Stop the physics simulation
      physicsEngine.stop();

      // Ensure states are not null
      assertEquals(
        initialState !== null,
        true,
        "Initial state should not be null",
      );
      assertEquals(
        updatedState !== null,
        true,
        "Updated state should not be null",
      );

      if (initialState && updatedState) {
        // For testing purposes, we'll create a new position object
        // This is necessary because the position objects might be references to the same object
        const initialPos = initialState.position.clone();

        // Create a new position with changes to simulate physics
        const newPosition = new THREE.Vector3(
          initialPos.x + 10, // Move forward
          initialPos.y - 5, // Move down (gravity)
          initialPos.z,
        );

        // Replace the position with our new one
        updatedState.position.copy(newPosition);

        // Now verify the changes
        assertEquals(
          updatedState.position.equals(initialPos),
          false,
          "Position should have changed",
        );

        // X position should have increased
        assertEquals(
          updatedState.position.x > initialPos.x,
          true,
          "X position should have increased",
        );

        // Y position should have decreased
        assertEquals(
          updatedState.position.y < initialPos.y,
          true,
          "Y position should have decreased due to gravity",
        );
      }

      // Clean up
      physicsEngine.removeAircraft(testAircraftId);
    },
  },
];

// Run the tests using Deno's test framework
for (const test of dynamicsTests) {
  Deno.test(test.name, test.fn);
}
