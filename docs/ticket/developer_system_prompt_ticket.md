# Developer-oriented System Prompt Ticket

This document provides the system prompt to guide developers during the migration process from the legacy C++ YSFLIGHT simulator to the new web-based simulator using TypeScript, deno, and three.js.

---

## Overview

The system prompt is intended for AI engineers and developers who will be implementing the migration. It outlines the high-level migration guidelines, translation strategies, and technical considerations to ensure consistency and quality throughout the process.

---

## 1. Migration Guidelines

- **Source Code Translation:**  
  - Translate C++ constructs to TypeScript idioms while preserving functionality.
  - Ensure that design patterns and architectural decisions from the legacy code are maintained where applicable.
  - Document any deviations from legacy behavior and provide rationale.

- **Resource and Asset Handling:**  
  - Static files (e.g., images, configuration files) must be copied as-is unless optimization or format conversion is required for browser compatibility.
  - The new project structure must organize these assets into a clear, accessible directory (e.g., `public/assets/`).

- **Input Handling:**  
  - Recreate native keyboard and mouse input behavior using browser APIs.
  - Provide key remapping options, particularly for keys like TAB that are unsuitable for web use.
  - Ensure that input event handling is both responsive and consistent with legacy functionality.

---

## 2. Translation Strategies

- **Language Transition:**  
  - Use modern TypeScript (ES6+) constructs to replace C++ paradigms.
  - Emphasize immutability and asynchronous programming paradigms where appropriate.
  
- **Module Separation:**  
  - Maintain the modular structure of the legacy system by clearly separating graphics, dynamics, GUI, autopilot, and input handling.
  - Use native ECMAScript modules for clean and maintainable code.

- **Testing:**  
  - All migrated modules must include comprehensive unit tests written with Deno’s testing framework.
  - Integration tests should simulate realistic usage scenarios.
  - Commits must only be pushed after all tests pass.

---

## 3. three.js Usage

- **Rendering Pipeline:**  
  - Adapt graphics code to utilize three.js for rendering reconstructed scenes.
  - Map legacy rendering logic to corresponding three.js functionalities (e.g., scene management, camera handling, and material application).

- **Scene Management:**  
  - Leverage three.js features to handle animations, lighting, and object interactions.
  - Compare performance and visual fidelity against the legacy implementation.

- **Documentation:**  
  - Provide inline comments and separate documentation for any three.js-specific implementation details.
  - Document any newly introduced abstractions translating legacy graphics calls to three.js methods.

---

## 4. Testing Procedures

- **Unit Tests:**  
  - Write detailed tests for each module.
  - Ensure edge cases and boundary conditions are adequately handled.

- **Integration Tests:**  
  - Develop tests that validate the interaction between modules (e.g., input triggering graphics updates or autopilot actions).
  - Utilize simulated DOM events for testing input behavior in the browser.

- **Continuous Integration:**  
  - Integrate testing into the CI/CD pipeline to automatically run tests on each commit.
  - Establish clear commit protocols requiring all tests to pass before merging.

---

## 5. Developer Reminders

- **Documentation:**  
  - Maintain extensive documentation in English detailing all migration steps, translation decisions, and test results.
  - Keep the system prompt updated as new guidelines or challenges arise during migration.

- **Collaboration:**  
  - Regularly review progress with the team and adapt guidelines based on shared experiences.
  - Keep the codebase modular to allow for independent testing and easy maintenance.

---

*End of Document*