/**
 * Test Utilities
 *
 * This module provides utility functions for testing the YSFLIGHT web application.
 */

/**
 * Assert that a condition is true
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Assert that two values are equal
 */
export function assertEquals<T>(
  actual: T,
  expected: T,
  message?: string,
): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected} but got ${actual}`,
    );
  }
}

/**
 * Assert that two numbers are approximately equal (within a tolerance)
 */
export function assertApproxEquals(
  actual: number,
  expected: number,
  tolerance: number = 0.0001,
  message?: string,
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      message || `Expected ${expected} (±${tolerance}) but got ${actual}`,
    );
  }
}

/**
 * Assert that a value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(
      message || `Expected value to be defined, but got ${value}`,
    );
  }
}

/**
 * Assert that a function throws an error
 */
export function assertThrows(
  fn: () => unknown,
  errorClass?: new (...args: unknown[]) => Error,
  msgIncludes?: string,
): Error {
  try {
    fn();
    throw new Error(
      `Expected function to throw${
        errorClass ? ` ${errorClass.name}` : ""
      }, but it did not throw`,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (errorClass && !(error instanceof errorClass)) {
        throw new Error(
          `Expected function to throw ${errorClass.name}, but it threw a different error`,
        );
      }
      if (msgIncludes && !error.message.includes(msgIncludes)) {
        throw new Error(
          `Expected error message to include "${msgIncludes}", but got "${error.message}"`,
        );
      }
      return error;
    }
    throw error; // Re-throw if it's not an Error instance
  }
}

/**
 * Run a test function and report the result
 */
export function runTest(
  name: string,
  testFn: () => void | Promise<void>,
): Promise<boolean> {
  console.log(`Running test: ${name}`);
  const startTime = performance.now();

  try {
    const result = testFn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          const duration = performance.now() - startTime;
          console.log(`✅ PASS: ${name} (${duration.toFixed(2)}ms)`);
          return true;
        })
        .catch((error) => {
          const duration = performance.now() - startTime;
          console.error(`❌ FAIL: ${name} (${duration.toFixed(2)}ms)`);
          console.error(`  Error: ${error.message}`);
          if (error.stack) {
            console.error(
              `  Stack: ${error.stack.split("\n").slice(1).join("\n")}`,
            );
          }
          return false;
        });
    } else {
      const duration = performance.now() - startTime;
      console.log(`✅ PASS: ${name} (${duration.toFixed(2)}ms)`);
      return Promise.resolve(true);
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ FAIL: ${name} (${duration.toFixed(2)}ms)`);
    if (error instanceof Error) {
      console.error(`  Error: ${error.message}`);
      if (error.stack) {
        console.error(
          `  Stack: ${error.stack.split("\n").slice(1).join("\n")}`,
        );
      }
    } else {
      console.error(`  Error: ${error}`);
    }
    return Promise.resolve(false);
  }
}

/**
 * Run a suite of tests
 */
export async function runTestSuite(
  suiteName: string,
  tests: Array<{ name: string; fn: () => void | Promise<void> }>,
): Promise<void> {
  console.log(`\n=== Test Suite: ${suiteName} ===\n`);

  const startTime = performance.now();
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await runTest(test.name, test.fn);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  const duration = performance.now() - startTime;
  console.log(`\n=== Test Suite Results: ${suiteName} ===`);
  console.log(`Total: ${tests.length}, Passed: ${passed}, Failed: ${failed}`);
  console.log(`Duration: ${duration.toFixed(2)}ms`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} test(s) failed.`);
    Deno.exit(1);
  } else {
    console.log(`\n✅ All tests passed!`);
  }
}

/**
 * Create a mock object with specified methods and properties
 */
export function createMock<T>(overrides: Partial<T> = {}): T {
  const target: Record<string | symbol, unknown> = {};
  const handler = {
    get: (obj: Record<string | symbol, unknown>, prop: string | symbol) => {
      if (prop in overrides) {
        return overrides[prop as keyof typeof overrides];
      }

      if (typeof prop === "string" && !obj[prop]) {
        // Create a mock function for methods
        obj[prop] = jest.fn();
      }

      return obj[prop];
    },
  };

  return new Proxy(target, handler) as unknown as T;
}

/**
 * Mock function implementation
 */
export const jest = {
  fn: <T extends (...args: unknown[]) => unknown>(implementation?: T) => {
    let mockImpl = implementation || ((_args: unknown) => undefined);
    const calls: unknown[][] = [];

    const wrappedFn = (...args: unknown[]) => {
      calls.push(args);
      // Apply arguments to the mock implementation
      // We need to cast to any here to avoid TypeScript spread argument error
      return (mockImpl as any)(...args);
    };

    wrappedFn.mock = {
      calls,
      instances: [],
      results: [],
      mockImplementation: (newImplementation: T) => {
        mockImpl = newImplementation;
        return wrappedFn;
      },
      mockReturnValue: (value: unknown) => {
        // Cast to any to avoid type errors
        mockImpl = (() => value) as any;
        return wrappedFn;
      },
      mockReset: () => {
        calls.length = 0;
        return wrappedFn;
      },
    };

    return wrappedFn;
  },
};
