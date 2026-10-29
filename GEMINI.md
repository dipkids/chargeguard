# ChargeGuard Project Instructions

## Project Overview
ChargeGuard is a Multi-Edge IoT Charging Guardian & Battery Estimator built with Web APIs (Battery Status, DeviceMotion, WakeLock, Web Audio) and MQTT over WebSockets.

### Core Modules:
- `node1.html`: Edge Guard (HP 1) running on a mobile browser. Detects cable disconnections, measures physical motion via Signal Magnitude Vector (SMV), and triggers alarm sirens.
- `node2.html`: Remote Watcher Node (HP 2). Receives instant theft alerts, vibrates, displays real-time battery graphs, and provides remote disarm commands.
- `dashboard.html`: Command Center on PC/Laptop. Visualizes time-series battery charging data with Linear Regression ($Y = mX + c$) to predict full charge ETA, real-time accelerometer streams, and audit logs.
- `shared.js`: Centralized configurations, SirenSynthesizer, WakeLockManager, and regression math.
- `server.js`: Zero-dependency Node.js HTTP server.
