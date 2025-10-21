# ATS Resume Optimization & Best Practices

This document defines the rules implemented in StepUp's resume generation system to ensure maximum ATS (Applicant Tracking System) compatibility and interview success rates.

## Critical ATS-Friendly Formatting Rules

### 1. File Format & Structure
- ✅ **PDF format** (formatting preserved, universally compatible)
- ✅ **Single column layout** - ATS systems struggle with multi-column designs
- ✅ **Standard section headers**: "EXPERIENCE," "EDUCATION," "SKILLS" (not creative names)
- ✅ **No headers/footers** - ATS often can't read content in these areas
- ✅ **No text boxes or tables** - these confuse parsing algorithms
- ✅ **Standard fonts**: Arial, Calibri, Helvetica, Times New Roman (10-12pt)
- ❌ **Avoid images, logos, graphics, or photos**
- ❌ **Avoid special characters** (★, →, ✓) - use simple bullets (•, -, *)

### 2. One-Page Maximum Rule
**For 0-10 years experience: MUST be 1 page**
**For 10+ years experience: Maximum 2 pages**

#### Space-Saving Techniques:
- Margins: 0.5"-0.75" (minimum readable)
- Line spacing: 1.0 or 1.15
- Font size: 10pt body, 11-12pt headers
- Remove unnecessary white space
- Consolidate older roles into single lines
- Prioritize recent (last 5-7 years) and relevant experience

## Content Optimization for ATS

### 3. Keyword Matching Strategy
ATS systems scan for exact keyword matches from job descriptions

**Extract key terms from job posting:**
- Technical skills (Python, React, AWS, SQL)
- Soft skills (leadership, collaboration, project management)
- Certifications (PMP, AWS Certified, CPA)
- Industry terms (Agile, SDLC, ROI, KPIs)

**Strategic placement:**
- Skills section (most heavily weighted)
- Experience bullets (contextual proof)
- Summary/objective (if included)

**Use exact phrasing from job description:**
- JD says "JavaScript" → use "JavaScript" (not "JS")
- JD says "Bachelor's degree" → use "Bachelor's degree" (not "B.S.")
- Match capitalization and formatting

**Avoid keyword stuffing** - use naturally in context

### 4. Skills Section Format
```
SKILLS
Technical: Python, JavaScript, React, Node.js, PostgreSQL, AWS, Docker, Git
Tools: JIRA, Confluence, Figma, Postman, VS Code
Methodologies: Agile, Scrum, CI/CD, Test-Driven Development
```

- Use comma-separated lists (easiest for ATS to parse)
- Group by category for human readability
- Include skill proficiency levels if relevant (Expert, Proficient, Familiar)

### 5. Experience Section Best Practices

**Format:**
```
Job Title | Company Name | Location | Month YYYY - Month YYYY
• Action verb + task + result/impact (quantified when possible)
• Incorporated [keyword] to achieve [measurable outcome]
• Led [project] resulting in [specific metric: 25% increase, $50K savings]
```

**Key Rules:**
- **Start with action verbs**: Developed, Implemented, Led, Optimized, Managed, Designed, Analyzed
- **Quantify achievements**: Use numbers, percentages, dollar amounts
  - "Increased sales by 35%" vs "Increased sales"
  - "Managed team of 8 developers" vs "Managed team"
  - "Reduced load time from 5s to 1.2s" vs "Improved performance"
- **Include keywords naturally**: "Developed Python scripts using Django framework..."
- **Focus on impact, not duties**: Show what you achieved, not just what you did
- **Reverse chronological order**: Most recent first

**Space-Saving for One Page:**
- Limit to 3-5 bullets per role
- Older roles (5+ years ago): 2-3 bullets or consolidate
- Remove very old or irrelevant positions entirely

### 6. Education Section
```
Degree Title (Bachelor of Science in Computer Science) | University Name | Year
• Relevant coursework: Data Structures, Algorithms, Machine Learning
• GPA: 3.8/4.0 (only if 3.5+)
```

- Place after Experience (unless recent grad)
- Recent grads: Place before Experience
- Include graduation year (or "Expected [Month Year]")
- Omit high school once you have college degree

## ATS Parsing Technical Requirements

### 7. Date Formatting
- **Consistent format**: "Jan 2020 - Present" or "01/2020 - Present"
- Spell out months or use abbreviations (not numbers only)
- ✅ "June 2020 - March 2023"
- ✅ "06/2020 - 03/2023"
- ❌ "6/20 - 3/23" (too ambiguous)

### 8. Contact Information
**Standard placement (top of page):**
```
John Smith
john.smith@email.com | (555) 123-4567 | linkedin.com/in/johnsmith | github.com/johnsmith
City, State (optional)
```

- Use pipe separators (|) or simple bullets
- Include LinkedIn URL (customized, not default random string)
- GitHub/portfolio for technical roles
- Avoid fancy formatting or icons

### 9. Acronyms & Abbreviations
Always spell out first, then use acronym:
- ✅ "Customer Relationship Management (CRM)"
- ✅ "Search Engine Optimization (SEO)"
- Then can use "CRM" or "SEO" throughout rest of resume

**Exception**: Widely known acronyms in your field (SQL, API, AWS, PhD, MBA)

### 10. Job Titles
- Use standard, recognizable titles: "Software Engineer" not "Code Ninja"
- Match title from job description when possible
- If your official title was non-standard, use standard version:
  - Your title: "Member of Technical Staff II"
  - Resume: "Software Engineer II"

## StepUp Implementation

### LLM Prompt Instructions
The system enforces these constraints in `lib/llm/client.ts`:

**ONE-PAGE CONSTRAINT:**
- Maximum 800-850 words total
- Prioritize content by recency and relevance
- Remove content from oldest positions first if space limited
- Never exceed one page when rendered

**FORMATTING RULES:**
- Single column layout only
- Standard section headers (no creative names)
- Bullet points: use simple "•" character
- No tables, text boxes, columns, or graphics
- Font: 10-12pt, single standard font family
- Margins: 0.5-0.75 inches
- Line spacing: 1.0-1.15

**ATS OPTIMIZATION:**
- Extract exact keywords from job description
- Use keywords naturally in context (no stuffing)
- Include quantified achievements (numbers, %, $)
- Standard date format: "Month YYYY - Month YYYY"
- Spell out acronyms on first use
- Match job description terminology exactly

### Content Prioritization Algorithm
Claude prioritizes in this order:
1. Most recent 5-7 years (detailed bullets)
2. Roles matching job description (emphasize relevant projects)
3. Quantified achievements over generic duties
4. Keywords from JD naturally incorporated
5. Older experience (condensed or removed)

**If content exceeds one page:**
- Reduce bullets on roles older than 5 years
- Combine multiple old roles into one line
- Remove oldest education details (coursework, GPA if 5+ years out)
- Shorten summary/objective (or remove entirely)
- Reduce skill list to most relevant

### PDF Generation
The PDF generator (`lib/utils/pdf-generator.tsx`) follows ATS-compliant formatting:

- **Font**: Helvetica (ATS-safe alternative to Arial/Calibri)
- **Font sizes**: 10pt body, 11pt headers, 16pt name
- **Margins**: 0.5 inches (ATS-compliant)
- **Line spacing**: 1.15 (ATS-recommended)
- **Colors**: Black text only (#000000)
- **Bullets**: Simple • character
- **Layout**: Single column, left-aligned

## Word Count Targets by Section (One-Page Resume)

**Total: 800-850 words maximum**

- Summary: 50-75 words (2-3 lines) - Optional, can remove to save space
- Skills: 40-60 words (2-3 categories)
- Experience: 500-600 words (3-5 bullets × 3-4 roles)
- Education: 30-50 words
- Certifications: 20-30 words (if included)

**Character count estimate**: ~5,000-5,500 characters including spaces

## Common ATS Parsing Failures to Avoid

### ❌ These break ATS systems:
- Tables for layout (dates in columns)
- Headers/footers for contact info
- Multiple columns for experience/skills
- Text boxes for callouts or highlights
- Horizontal/vertical lines (except simple rules)
- Non-standard bullet characters (✓, ★, →)
- Images or logos (even small icons)
- Fancy fonts (script, decorative)
- Colored text (except maybe section headers)
- Hyperlinks embedded in text (show full URL)

### ✅ ATS-safe alternatives:
- Simple linear layout, top to bottom
- All contact info in document body
- Single column, left-aligned content
- Plain text for all content
- Standard bullet points (•, -, *)
- Arial, Calibri, Helvetica, Times New Roman
- Black text on white background
- LinkedIn URL written out: linkedin.com/in/username

## Pre-Submission Checklist

### ATS Compatibility:
- ☑ PDF format
- ☑ Single column layout
- ☑ Standard fonts (10-12pt)
- ☑ No headers/footers
- ☑ No images, graphics, or text boxes
- ☑ Simple bullets (•, -, *)
- ☑ Standard section headers

### Content Quality:
- ☑ Fits on ONE page
- ☑ 10-15+ keyword matches from job description
- ☑ All dates in consistent format
- ☑ 50%+ bullets have quantified achievements
- ☑ Contact information complete and correct
- ☑ No typos or grammatical errors
- ☑ Acronyms spelled out on first use
- ☑ Action verbs start all bullet points

### Optimization:
- ☑ Keywords appear in Skills section
- ☑ Keywords naturally integrated in Experience
- ☑ Job titles match industry standards
- ☑ Most recent/relevant experience emphasized
- ☑ Older experience condensed or removed
- ☑ Tailored specifically to target job posting

## References
- StepUp enforces these rules in all resume generation
- See `lib/llm/client.ts` for system prompt implementation
- See `lib/utils/pdf-generator.tsx` for PDF formatting
- All generated resumes are validated against these standards
