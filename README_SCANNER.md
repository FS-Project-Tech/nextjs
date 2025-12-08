# 🚀 Quick Start: Unused Code Scanner

## Installation

### Windows (PowerShell)
```powershell
npm run scan:setup
```

### Mac/Linux (Bash)
```bash
npm run scan:setup
```

Or install manually:
```bash
npm install --save-dev purgecss @fullhuman/postcss-purgecss unimported depcheck
```

## Usage

### Run Complete Scan
```bash
npm run scan:unused
```

### Auto-fix ESLint Issues
```bash
npm run scan:unused:fix
```

### Run Individual Scans

**PurgeCSS (Unused CSS):**
```bash
npm run scan:purgecss
```

**unimported (Unused Imports):**
```bash
npm run scan:unimported
```

**depcheck (Unused Dependencies):**
```bash
npm run scan:depcheck
```

## What Gets Scanned

- ✅ **CSS Classes** - Finds unused classes in `app/globals.css`
- ✅ **JS/TS Imports** - Finds unused imports and files
- ✅ **Dependencies** - Finds unused npm packages
- ✅ **Code Quality** - Auto-fixes ESLint issues

## Output

The scanner will show:
- Unused CSS classes
- Unused component files
- Unused imports
- Unused dependencies
- ESLint issues (with auto-fix option)

## Configuration

- **PurgeCSS**: `purgecss.config.js`
- **unimported**: `unimported.config.js`
- **ESLint**: `eslint.config.mjs`

## Full Documentation

See [docs/UNUSED_CODE_SCANNER.md](./docs/UNUSED_CODE_SCANNER.md) for detailed instructions.

## Example Output

```
🔍 Unused Code Scanner
Scanning for unused CSS, JS imports, and dependencies...

============================================================
1️⃣ PurgeCSS - Scanning for unused CSS
============================================================

✓ PurgeCSS scan completed

============================================================
2️⃣ unimported - Scanning for unused imports
============================================================

✓ unimported scan completed

============================================================
3️⃣ depcheck - Scanning for unused dependencies
============================================================

✓ depcheck scan completed

============================================================
4️⃣ ESLint - Checking and fixing code issues
============================================================

✓ ESLint check completed

✨ Scan completed!
```

## Troubleshooting

**Windows users:** Use PowerShell or Git Bash for best results.

**Permission errors:** Run with administrator privileges if needed.

**Tool not found:** Make sure Node.js and npm are installed and in PATH.

## Next Steps

1. Review the scan output
2. Remove unused code manually
3. Test your application
4. Commit changes

---

For detailed documentation, see [docs/UNUSED_CODE_SCANNER.md](./docs/UNUSED_CODE_SCANNER.md)

