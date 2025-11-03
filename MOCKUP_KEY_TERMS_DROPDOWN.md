# ATS Key Terms Dropdown Mockup

This document describes the new dropdown feature for displaying ATS key terms.

## Overview

The new dropdown replaces the circular badge display and shows:
- **Fraction format**: "14/18 Key Terms" instead of just "14 Key Terms Matched"
- **Clickable dropdown**: Shows all terms with checkmarks for matched ones
- **Visual feedback**: Green checkmarks for matched terms, empty circles for unmatched

---

## Visual Mockup

### Collapsed State (Default)
```
┌──────────────────────────────────────────────┐
│                                              │
│  14/18      Key Terms                    ▼  │
│                                              │
└──────────────────────────────────────────────┘
```

### Expanded State (When Clicked)
```
┌──────────────────────────────────────────────┐
│                                              │
│  14/18      Key Terms                    ▲  │
│                                              │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  ✓  Python                                   │ ← Green bg (matched)
│  ✓  JavaScript                               │ ← Green bg (matched)
│  ✓  React                                    │ ← Green bg (matched)
│  ○  TypeScript                               │ ← Gray bg (not matched)
│  ✓  Node.js                                  │ ← Green bg (matched)
│  ○  MongoDB                                  │ ← Gray bg (not matched)
│  ✓  Express                                  │ ← Green bg (matched)
│  ✓  REST API                                 │ ← Green bg (matched)
│  ○  GraphQL                                  │ ← Gray bg (not matched)
│  ✓  Git                                      │ ← Green bg (matched)
│  ✓  Docker                                   │ ← Green bg (matched)
│  ✓  AWS                                      │ ← Green bg (matched)
│  ○  Azure                                    │ ← Gray bg (not matched)
│  ✓  CI/CD                                    │ ← Green bg (matched)
│  ✓  Agile                                    │ ← Green bg (matched)
│  ✓  SQL                                      │ ← Green bg (matched)
│  ✓  PostgreSQL                               │ ← Green bg (matched)
│  ○  Redis                                    │ ← Gray bg (not matched)
└──────────────────────────────────────────────┘
```

---

## Implementation Details

### New Component: `ATSKeyTermsDropdown`

**File**: `components/ATSKeyTermsDropdown.tsx`

**Props**:
- `allTerms: string[]` - All ATS terms extracted from job description
- `matchedTerms: string[]` - Terms that appear in the generated resume/cover letter

**Features**:
1. **Collapsible**: Click to toggle between collapsed/expanded states
2. **Visual indicators**:
   - Green checkmark (✓) for matched terms
   - Empty circle (○) for unmatched terms
   - Green background for matched rows
   - Gray background for unmatched rows
3. **Scrollable**: Max height with scroll if too many terms
4. **Responsive**: Works on mobile and desktop

---

## Changes Made

### 1. Created New Component
**File**: `components/ATSKeyTermsDropdown.tsx`
- Dropdown component with toggle functionality
- Visual indicators for matched/unmatched terms
- Responsive design with gold accent colors

### 2. Updated Utility Functions
**File**: `lib/utils/validation.ts`
- Added `getMatchedTermsFromResume()` - Returns array of matched terms
- Added `getMatchedTermsFromCoverLetter()` - Returns array of matched terms

### 3. Updated Resume Page
**File**: `app/resume/ResumeClient.tsx`
- Fetches `terms` from session data
- Replaced circular badge with `ATSKeyTermsDropdown`
- Shows "X/Y Key Terms" format

### 4. Updated Cover Letter Page
**File**: `app/cover-letter/page.tsx`
- Fetches `terms` from session data
- Replaced circular badge with `ATSKeyTermsDropdown`
- Shows "X/Y Key Terms" format

---

## User Experience

### Before (Old Design)
- Shows only: "15" in a circular badge
- Label: "Key Terms Matched"
- No visibility into which terms are matched
- No visibility into total terms available

### After (New Design)
- Shows: "14/18 Key Terms" with dropdown arrow
- Click to see full list of all terms
- Green checkmarks show which terms are matched
- Easy to see which terms are missing
- Helps users understand ATS alignment better

---

## Example Flow

1. User generates resume for a job posting
2. System extracts 18 ATS terms from job description
3. Resume includes 14 of those terms
4. User sees: **"14/18 Key Terms"** with down arrow ▼
5. User clicks to expand
6. Dropdown shows all 18 terms with checkmarks next to the 14 matched ones
7. User can quickly see which terms are missing (TypeScript, MongoDB, GraphQL, Azure, Redis)
8. User can edit resume to include missing terms if desired

---

## Testing

To test this feature:
1. Run `npm run dev`
2. Generate a resume or cover letter
3. Navigate to the resume/cover letter page
4. Look for the "X/Y Key Terms" dropdown in the ATS Alignment section
5. Click to expand and see all terms with checkmarks

---

## Design Notes

- **Colors**: Uses existing gold/beige theme
- **Icons**: SVG checkmarks and circles
- **Accessibility**: Clickable with keyboard navigation
- **Mobile**: Responsive, works on small screens
- **Performance**: Minimal re-renders, state managed efficiently
