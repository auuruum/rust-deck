# Rust Deck

A Stream Deck plugin for Rust game servers, providing real-time server information and controls directly on your Stream Deck.

## Features

### 🕒 Time Display
- Shows current server time
- Updates every minute
- Customizable display format

### 📊 Server Info
- Real-time player count
- Server status monitoring
- Updates every 30 seconds

### 🌅 Phase of Day
- Current day/night cycle status
- Visual indicators for time of day
- Automatic updates

### 🏠 Smart Devices
- Monitor and control in-game smart devices
- Real-time device status
- Quick access controls

### 🔗 Join Server
- Quick server connection
- One-click join functionality
- Server favorites management

## Installation

### From Releases
1. Download the latest `com.aurum.rust-deck.streamDeckPlugin` file from [Releases](../../releases)
2. Double-click the file to install it in Stream Deck
3. The plugin will appear in your Stream Deck actions library

### Manual Installation
1. Clone this repository
2. Build the plugin (see Development section)
3. Install the generated `.streamDeckPlugin` file

## Development

### Prerequisites
- Node.js 20 or higher
- npm
- Stream Deck software
- Stream Deck CLI (`npm install -g @elgato/cli`)

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/rust-deck.git
cd rust-deck

# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes during development
npm run watch
```

### Project Structure
```
rust-deck/
├── src/                          # TypeScript source code
│   ├── actions/                  # Action implementations
│   │   ├── time-display.ts
│   │   ├── server-info.ts
│   │   ├── phase-of-day.ts
│   │   ├── smart-devices.ts
│   │   ├── join-server.ts
│   │   └── profile-action.ts
│   ├── plugin.ts                 # Main plugin entry point
│   ├── settings.ts               # Plugin settings
│   └── websocket.ts              # WebSocket communication
├── com.aurum.rust-deck.sdPlugin/ # Plugin assets
│   ├── imgs/                     # Icons and images
│   ├── ui/                       # Property inspector HTML
│   └── manifest.json             # Plugin manifest
├── docs/                         # Documentation
└── .github/workflows/            # CI/CD workflows
```

### Building

#### Development Build
```bash
npm run build
```

#### Production Package
```bash
# Validate the plugin
streamdeck validate com.aurum.rust-deck.sdPlugin

# Package for distribution
streamdeck pack com.aurum.rust-deck.sdPlugin
```

### Testing

1. Build the plugin using `npm run build`
2. The plugin will be automatically installed in Stream Deck during development
3. Use `npm run watch` for automatic rebuilding during development
4. Test actions on your Stream Deck device

## Configuration

### Server Connection
1. Add the plugin actions to your Stream Deck
2. Configure server connection details in the property inspector:
   - **Base URL**: The API endpoint (e.g., `http://localhost:8074`)
   - **API Password**: Authentication key for secure API access (optional)
3. Test the connection

#### API Authentication
The plugin supports API authentication using the `X-API-Key` header. When an API Password is configured in the global settings, it will be automatically included in all API requests for secure access to your RustPlusPlus API endpoints.

### Action Setup
Each action can be configured through its property inspector:
- **Server Details**: IP address, port, and authentication
- **Update Intervals**: Customize refresh rates
- **Display Options**: Customize appearance and formatting
- **Device Controls**: Configure smart device mappings