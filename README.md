# NaviLens - Screen Capture & Crop

NaviLens is a powerful, privacy-focused Chrome Extension for capturing, cropping, and saving screenshots of any web page.

## Features

-   **📸 Smart Capture**:
    -   **Full Page**: Capture entire scrolling webpages flawlessly.
    -   **Viewport**: Snap exactly what you see on screen.
    -   **Interactive Crop**: Use `Alt+Shift+Q` to draw a box and capture any region instantly.
-   **📋 Clipboard Ready**:
    -   All captures can be automatically copied to your clipboard for easy pasting into documents, chats, or design tools.
-   **🎨 Modern UI**:
    -   Clean, professional interface built with React and Tailwind CSS.
    -   Drawing tools to annotate your screenshots before sharing.
-   **🔒 Privacy Focused**:
    -   All processing happens locally on your device.
    -   No data is sent to external servers.

## Keyboard Shortcuts

-   `Alt+Shift+D` : Capture Full Page
-   `Alt+Shift+S` : Capture Visible Area
-   `Alt+Shift+Q` : Interactive Crop & Copy
*(Use `Command+Shift` on Mac)*

## Tech Stack

-   **Frontend**: React 18, TypeScript, Vite
-   **Styling**: Tailwind CSS
-   **Extension Platform**: Manifest V3

## Installation

1.  Clone the repository.
2.  Run `pnpm install` to install dependencies.
3.  Run `pnpm build` to build the extension.
4.  Load the `dist` directory as an unpacked extension in Chrome Developer Mode.
