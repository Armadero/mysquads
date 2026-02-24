# MySquads UI Standards (Modern SaaS Style)

This document defines the new visual language for the MySquads application, replacing the previous brutalist style. The goal is to create a professional, clean, and intuitive corporate interface.

## 🖌️ Color Palette

| Category | Color | HEX | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | Soft Blue | `#4A90E2` | Main buttons, links, active states, key branding. |
| **Secondary** | Off White | `#F5F7FA` | Section backgrounds, card backgrounds. |
| **Background** | Pure White | `#FFFFFF` | Main page background, primary content area. |
| **Text (Dark)** | Navy Gray | `#2D3E50` | Primary titles and high-emphasis text. |
| **Text (Body)** | Steel Gray | `#4A5568` | Paragraphs and primary body content. |
| **Text (Muted)** | Slate Gray | `#718096` | Labels, helper text, and placeholders. |
| **Borders** | Soft Gray | `#E2E8F0` | Dividers, input borders, card outlines. |
| **Success** | Emerald | `#48BB78` | Success messages, confirmed states. |
| **Danger** | Coral | `#F56565` | Alerts, error messages, destructive actions. |

## 📐 Layout & Spacing

*   **Grid:** Standard responsive grid with 16px (mobile) or 24px (desktop) margins.
*   **Border Radius:**
    *   **Cards/Buttons:** `6px`
    *   **Inputs:** `4px`
*   **Shadows:** `0 2px 8px rgba(0,0,0,0.05)` (Soft, subtle depth).
*   **Sidebar:** Fixed left, 240px width. Background `#F9FAFB`, right border `1px solid #E2E8F0`.

## 🔤 Typography

*   **Font Family:** `Inter`, `Roboto`, or `system-ui` (Sans-serif).
*   **Scale:**
    *   **Page Title:** `24px` / `700 (Bold)`
    *   **Subtitles:** `18px` / `600 (Semi-bold)`
    *   **Body:** `14px` / `400 (Regular)`
    *   **Labels:** `12px` / `500 (Medium)`
    *   **Metrics:** `32px` / `700 (Bold)`

## 🧩 Component Specifications

### Buttons
*   **Primary:** Background `#4A90E2`, Text White. Hover: darker blue.
*   **Secondary:** Background White, Border `#E2E8F0`, Text Gray.
*   **Destructive:** Red background or red text on white.

### Inputs
*   **Border:** `1px solid #E2E8F0`.
*   **Focus:** Border `#4A90E2` with a subtle glow shadow.
*   **Labels:** Positioned above the field.

### Tables
*   **Header:** Background `#F1F5F9`, Text Bold (`600`), 14px.
*   **Rows:** Height 48px, subtle bottom border `#EDF2F7`, hover highlight.

### Cards
*   **Background:** White.
*   **Depth:** Subtle shadow or thin light border.
*   **Padding:** `20px` to `24px`.

## 🎨 Visual Philosophy

*   **Negative Space:** Prefer breathing room over density.
*   **Subtlety:** No aggressive colors. Use tints and shades of blue and gray.
*   **Consistency:** All inputs, buttons, and spacing must strictly follow these values.
