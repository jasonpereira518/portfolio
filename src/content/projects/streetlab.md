---
title: StreetLab
short: StreetLab
tagline: Self-driving simulator
kind: flagship
group: flagship
order: 3
role: Solo build
dates: Aug 2026–present
status: Cycles 1–5 built; still active
summary: "Point it at any real address and a simulated car drives the actual streets, obeying signals and reacting to traffic."
proof:
  - 1,100+ automated tests
  - 30–60 FPS in WebGPU
  - Built in 5 cycles
stack:
  - Rust
  - Tauri 2
  - TypeScript
  - React
  - Three.js over WebGPU
  - Python
  - FastAPI WebSockets
  - ONNX Runtime
  - OpenStreetMap
links:
  - label: Repo
    href: https://github.com/jasonpereira518/streetlab
cover: streetlab.png
coverAlt: "StreetLab running its Nob Hill Loop scenario. A simulated car yields at a junction with traffic signals while a cut-in vehicle is boxed in orange, with the scenario list on the left, the parameter panel on the right and speed, lane, radar and steering gauges below."
problem: "I wanted to go deep on real-time graphics, deterministic simulation and applied ML as a system rather than a notebook, and to treat every performance claim as something to measure. It is a portfolio and learning project, not a production AV system."
result: "1,100+ automated tests, all green (910 backend, 205 frontend, 12 end-to-end). 30–60 FPS in the WebGPU viewport. Built in five cycles, each added without touching the earlier ones."
---

A native desktop app that geocodes any real address, pulls actual street and building geometry from OpenStreetMap, and drives a simulated car through it, obeying traffic lights and stop signs and reacting to other traffic.

Every message between the simulation and the UI is validated against one schema on both sides.
