# YSFLIGHT Web

[![CI](https://github.com/yourusername/wsflight/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/wsflight/actions/workflows/ci.yml)

A web-based port of the YSFLIGHT flight simulator using TypeScript, Deno, and
Three.js.

## Project Overview

This project aims to migrate the classic C++ YSFLIGHT flight simulator to a
modern web-based application. The original YSFLIGHT is a lightweight flight
simulator developed by Soji Yamakawa (Captain YS), which has been popular for
its accessibility and ease of use.

### Key Features

- **Web-based Implementation**: Run directly in modern browsers without plugins
- **TypeScript Codebase**: Type-safe code with modern JavaScript features
- **Three.js Rendering**: 3D graphics powered by WebGL through Three.js
- **Deno Runtime**: Modern JavaScript/TypeScript runtime for development and
  testing
- **Original Assets**: Uses original YSFLIGHT resources with web-optimized
  formats

## Project Structure

```
wsflight/
├── docs/                  # Documentation
│   ├── product_analysis.md    # Analysis of original YSFLIGHT
│   └── ticket/               # Task tickets for implementation
├── public/                # Public assets and HTML
│   ├── assets/            # Static resources (copied from YSFLIGHT)
│   └── index.html         # Main HTML entry point
├── scripts/               # Utility scripts
│   └── copy_resources.ts  # Script to copy resources from YSFLIGHT
├── src/                   # Source code
│   ├── autopilot/         # Autopilot and flight control systems
│   ├── dynamics/          # Physics simulation
│   ├── graphics/          # 3D rendering with Three.js
│   ├── gui/               # User interface components
│   ├── input/             # Input handling (keyboard, mouse)
│   ├── tests/             # Test files
│   └── main.ts            # Main application entry point
├── YSFLIGHT/              # Original YSFLIGHT source (reference only)
├── .clinerules            # Project rules and guidelines
├── deno.json              # Deno configuration
└── README.md              # This file
```

## Current Status

The project is in the initial development phase with the following components
implemented:

- ✅ Project structure and architecture
- ✅ Core module interfaces (graphics, dynamics, GUI, autopilot, input)
- ✅ Basic Three.js rendering setup
- ✅ Physics simulation framework
- ✅ GUI component system
- ✅ Input handling system
- ✅ Testing framework
- ✅ Resource management utilities

## Development Roadmap

1. **Product Analysis** (Completed)
   - Analysis of original YSFLIGHT architecture and components
   - Documentation of key systems and interactions

2. **Component Extraction** (In Progress)
   - Core module interfaces defined
   - Migration rules established
   - Detailed implementation tickets created

3. **Static Resource Organization** (In Progress)
   - Resource copying script implemented
   - Asset directory structure defined

4. **Input Handling** (In Progress)
   - Keyboard and mouse input system implemented
   - Key remapping for browser compatibility

5. **Testing Strategy** (In Progress)
   - Test utilities implemented
   - Initial tests for physics module created

6. **Implementation** (Upcoming)
   - Detailed implementation of each module
   - Integration of all components
   - Performance optimization

## Getting Started

### Prerequisites

- [Deno](https://deno.land/) (version 1.32.0 or higher)
- Modern web browser with WebGL support

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/wsflight.git
   cd wsflight
   ```

2. Copy resources from original YSFLIGHT:
   ```
   deno run --allow-read --allow-write scripts/copy_resources.ts
   ```

3. Run the development server:
   ```
   deno task dev
   ```

4. Open your browser and navigate to `http://localhost:8000`

### Running Tests

```
deno task test
```

## Contributing

Contributions are welcome! Please see the
[contributing guidelines](CONTRIBUTING.md) for more information.

## License

This project is licensed under the same terms as the original YSFLIGHT. Please
see the LICENSE file for details.

## Acknowledgements

- Captain YS (Soji Yamakawa) for creating the original YSFLIGHT
- The Three.js team for their excellent 3D library
- The Deno team for their modern JavaScript/TypeScript runtime
