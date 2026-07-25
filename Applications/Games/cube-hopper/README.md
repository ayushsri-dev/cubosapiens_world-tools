# Cube Hopper

An isometric 3D arcade platformer game developed for the CuboSapiens browser tools & games ecosystem.

## Features

- Dynamic 3D isometric HTML5 Canvas render engine
- Procedural platform generation (Normal, Moving, Crumbling, Spring Boosters)
- Gems collection & combo score multipliers
- Customizable Cube Skins (Cyber Cyan, Neon Pink, Emerald Spark, Gold Master)
- Web Audio API procedural sound synthesizer
- LocalStorage persistence for high scores, statistics, theme, and audio settings
- Responsive design with touch D-Pad and Jump controls for mobile devices
- Full keyboard accessibility and high contrast Dark/Light themes

## Controls

### Desktop Keyboard

| Key | Action |
|---|---|
| `Space` / `W` / `Up` | Jump / Hop Forward |
| `A` / `Left` | Hop Left |
| `D` / `Right` | Hop Right |
| `P` | Pause / Resume Game |

### Mobile Touch Controls

- **D-Pad Left/Right**: Hop diagonally left or right
- **Jump Button**: Hop forward

## Platform Types

- **Normal**: Safe solid cubic platform
- **Moving**: Oscillating platform
- **Crumbling**: Falls away shortly after landing
- **Spring**: Boosts hop distance and height

## Tech Stack

- **HTML5 Canvas**: 2.5D Isometric rendering loop
- **Vanilla CSS**: CSS Custom Properties for theme switching, Glassmorphism UI
- **Vanilla JavaScript (ES6+)**: OOP Architecture, Web Audio API, LocalStorage API

## Folder Structure

```txt
Applications/Games/cube-hopper/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Running Locally

1. Open the project root directory.
2. Serve `index.html` via Live Server or open directly in any modern browser.
