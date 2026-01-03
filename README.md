# NaviLens - AI-Powered Screen Assistant Extension

NaviLens is a Chrome Extension that integrates Google's Gemini AI to analyze and provide suggestions for your web browsing experience. It allows users to capture screenshots of full pages or specific components and query the AI for design improvements, content updates, and code suggestions.

## Features

-   **📸 Smart Capture**:
    -   **Full Page Screenshot**: Capture the entire visible area of the current webpage.
    -   **Component Selection**: Interactively select specific UI elements (cards, headers, sections) to capture.
-   **🤖 Gemini AI Integration**:
    -   Securely store your Gemini API Key.
    -   Analyze captured screenshots with context-aware prompts.
    -   Get actionable suggestions for UI/UX improvements, code refactoring, and content generation.
-   **🎨 Modern UI**:
    -   Clean, professional interface built with React and Tailwind CSS.
    -   User-friendly "Refine" mode to iterate on AI suggestions.
-   **🔒 Privacy Focused**:
    -   API Keys are stored locally (`chrome.storage.local`).
    -   Data is sent directly to Google's Gemini API with no intermediate servers.

## Tech Stack

-   **Frontend**: React 18, TypeScript, Vite
-   **Styling**: Tailwind CSS
-   **Extension Platform**: Manifest V3
-   **AI**: Google Gemini API (Multimodal)

## Installation

1.  Clone the repository.
2.  Run `npm install` to install dependencies.
3.  Run `npm run build` to build the extension.
4.  Load the `dist` directory as an unpacked extension in Chrome Developer Mode.
