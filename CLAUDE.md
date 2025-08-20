# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vault AI is a single-page web application that analyzes retro video game collections using Google's Gemini AI. Users can upload CSV/XLSX files or manually input their collection data to receive strategic recommendations on what to sell, keep, or buy based on market analysis.

## Development Commands

- **Development server**: `npm run dev` - Starts Vite dev server with hot reload
- **Build production**: `npm run build` - Creates optimized production build in `dist/`
- **Preview build**: `npm run preview` - Serves production build locally for testing

## Environment Setup

The application requires a `GEMINI_API_KEY` environment variable:
- Create `.env.local` file in root directory
- Add: `GEMINI_API_KEY=your_api_key_here`
- The Vite config automatically maps this to `process.env.API_KEY` in the client

## Architecture & Key Components

### Technology Stack
- **Frontend**: Vanilla TypeScript with Vite bundler
- **AI Integration**: Google Gemini 2.5 Flash model via `@google/genai` library
- **File Processing**: SheetJS (XLSX) library loaded via CDN for Excel/CSV parsing
- **Styling**: Custom CSS with CSS custom properties (dark theme)

### File Structure & Responsibilities

- `index.html` - Main HTML structure with embedded XLSX library and import maps
- `index.tsx` - Core TypeScript application logic (despite .tsx extension, no React used)
- `index.css` - Complete styling with CSS custom properties and responsive design
- `vite.config.ts` - Vite configuration with environment variable injection
- `metadata.json` - App metadata (likely for AI Studio integration)

### Core Application Flow

1. **Data Input**: Two input methods via tabbed interface
   - File upload: Drag & drop or click to select CSV/XLSX files
   - Manual entry: Text area for CSV-formatted collection data

2. **AI Processing**: 
   - Collection data formatted as CSV and sent to Gemini API
   - Structured JSON schema enforced for consistent response format
   - Progress tracking with loading states and error handling

3. **Results Dashboard**: 
   - Collection summary (total games, estimated value, predominant decade)
   - Platform distribution chart with horizontal bars
   - Console focus recommendations with future value games
   - Tabbed recommendations: Sell/Keep/Buy with pricing estimates

### TypeScript Interfaces

The application defines comprehensive TypeScript interfaces for the AI response structure:
- `AnalysisResponse` - Main response container
- `Recommendation` types for sell/keep/buy actions with platform-specific pricing
- `PlatformDistribution` for collection breakdown analytics
- `ConsoleFocus` for strategic investment guidance

### State Management

Uses simple vanilla JavaScript state management:
- `filesToUpload` global variable for file handling
- DOM manipulation for UI state transitions
- Tab switching and form validation through event listeners

## Development Notes

- The app uses ES modules with Vite's import resolution
- External dependencies loaded via CDN (XLSX) and ES module imports (@google/genai)
- No build-time linting or testing scripts configured - manual code review recommended
- Responsive design with CSS Grid and Flexbox
- Error handling includes user-friendly Spanish messages
- All monetary values displayed in Euros with proper formatting

## API Integration

The Gemini integration uses structured generation with JSON schema validation to ensure consistent response format. Key configuration:
- Model: `gemini-2.5-flash`
- Response format: `application/json`
- Schema enforcement for reliable data structure
- Spanish language prompts and error messages