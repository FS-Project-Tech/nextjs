# ✅ Unused Code Scanner Setup Complete

## 📦 What Was Created

### Scripts
1. **`scripts/scan-unused.js`** - Main scanner script (runs all tools)
2. **`scripts/setup-scan-tools.sh`** - Bash setup script (Mac/Linux)
3. **`scripts/setup-scan-tools.ps1`** - PowerShell setup script (Windows)

### Configuration Files
1. **`purgecss.config.js`** - PurgeCSS configuration
2. **`unimported.config.js`** - unimported configuration

### Documentation
1. **`docs/UNUSED_CODE_SCANNER.md`** - Complete guide
2. **`README_SCANNER.md`** - Quick start guide

### Package.json Scripts Added
- `scan:setup` - Install all tools
- `scan:unused` - Run complete scan
- `scan:unused:fix` - Run scan with auto-fix
- `scan:purgecss` - Run PurgeCSS only
- `scan:unimported` - Run unimported only
- `scan:depcheck` - Run depcheck only

## 🚀 Quick Start

### Step 1: Install Tools
```bash
npm run scan:setup
```

### Step 2: Run Scanner
```bash
npm run scan:unused
```

### Step 3: Auto-fix Issues
```bash
npm run scan:unused:fix
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run scan:setup` | Install all scanning tools |
| `npm run scan:unused` | Run complete scan |
| `npm run scan:unused:fix` | Run scan + auto-fix ESLint |
| `npm run scan:purgecss` | Scan for unused CSS only |
| `npm run scan:unimported` | Scan for unused imports only |
| `npm run scan:depcheck` | Scan for unused dependencies only |

## 🔧 Tools Installed

1. **PurgeCSS** - Finds unused CSS classes
2. **unimported** - Finds unused JS/TS imports and files
3. **depcheck** - Finds unused npm dependencies
4. **ESLint** - Already configured (auto-fixes code issues)

## 📁 Files Scanned

- `app/**/*.{js,jsx,ts,tsx}` - All app files
- `components/**/*.{js,jsx,ts,tsx}` - All components
- `lib/**/*.{js,jsx,ts,tsx}` - All utilities
- `hooks/**/*.{js,jsx,ts,tsx}` - All hooks
- `app/globals.css` - Global CSS file

## ⚙️ Configuration

### PurgeCSS Safelist
The following patterns are always kept (not removed):
- Tailwind utility classes (`bg-*`, `text-*`, etc.)
- Swiper classes (`swiper-*`)
- Next.js classes (`__next`)
- Dynamic classes (`animate-*`, `line-clamp-*`)
- WooCommerce classes (`woocommerce-*`, `wc-*`)

### unimported Ignore List
The following are ignored:
- Type definitions (`*.d.ts`)
- Config files (`*.config.*`)
- Test files (`*.test.*`, `*.spec.*`)
- Next.js auto-imported files (`layout.tsx`, `page.tsx`, `route.ts`)
- Build outputs (`.next/`, `out/`, `dist/`)

### depcheck Ignore List
The following dependencies are ignored:
- Type definitions (`@types/*`)
- Build tools (`eslint*`, `prettier`, `rimraf`)
- Next.js plugins (`@next/*`, `@tailwindcss/*`)
- PostCSS plugins (`postcss*`, `autoprefixer`)

## 📊 Expected Output

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

📊 Scan Summary
Results:
  PurgeCSS:     ✓
  unimported:   ✓
  depcheck:     ✓
  ESLint:       ✓

✨ Scan completed!
```

## 🎯 Next Steps

1. **Run the scanner**: `npm run scan:unused`
2. **Review output**: Check for unused code
3. **Remove unused code**: Manually remove unused files/imports
4. **Test application**: Ensure nothing broke
5. **Commit changes**: Save your cleanup work

## 📚 Documentation

- **Quick Start**: See `README_SCANNER.md`
- **Full Guide**: See `docs/UNUSED_CODE_SCANNER.md`
- **Tool Docs**:
  - [PurgeCSS](https://purgecss.com/)
  - [unimported](https://github.com/smeijer/unimported)
  - [depcheck](https://github.com/depcheck/depcheck)

## ⚠️ Important Notes

1. **Always test after cleanup** - Removing code can break things
2. **Review false positives** - Some tools may report false positives
3. **Use Git** - Commit before cleanup so you can revert
4. **Update safelists** - Add dynamic classes to safelist if needed
5. **Run regularly** - Add to CI/CD or run weekly

## 🐛 Troubleshooting

### Windows Issues
- Use PowerShell or Git Bash
- Run as administrator if permission errors occur

### Tool Not Found
- Make sure Node.js and npm are installed
- Run `npm run scan:setup` again

### False Positives
- Check safelist/ignore configurations
- Verify dynamic imports are detected
- Review tool documentation

## ✨ Benefits

- **Smaller bundle size** - Remove unused code
- **Faster builds** - Less code to process
- **Better maintainability** - Cleaner codebase
- **Improved performance** - Less JavaScript/CSS to load

---

**Setup Date**: $(date)
**Status**: ✅ Ready to use

Run `npm run scan:unused` to get started!

