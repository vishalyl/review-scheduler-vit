const fs = require('fs');
const path = require('path');

function findDuplicateImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Find react-icons import
    const importMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+'react-icons\/io5';/);
    if (!importMatch) return null;

    const imports = importMatch[1]
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

    // Check for duplicates
    const seen = new Set();
    const duplicates = [];

    imports.forEach(imp => {
        if (seen.has(imp)) {
            duplicates.push(imp);
        }
        seen.add(imp);
    });

    if (duplicates.length > 0) {
        return { imports, duplicates, seen: Array.from(seen) };
    }

    return null;
}

function fixDuplicateImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    const importMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+'react-icons\/io5';/);
    if (!importMatch) return false;

    const imports = importMatch[1]
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

    // Remove duplicates
    const uniqueImports = Array.from(new Set(imports));

    if (uniqueImports.length < imports.length) {
        const newImport = `import { ${uniqueImports.join(', ')} } from 'react-icons/io5';`;
        const newContent = content.replace(/import\s+\{[^}]+\}\s+from\s+'react-icons\/io5';/, newImport);

        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✓ Fixed ${filePath}`);
        console.log(`  Removed ${imports.length - uniqueImports.length} duplicate(s)`);
        return true;
    }

    return false;
}

function scanAndFix(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let fixedCount = 0;

    files.forEach(file => {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            fixedCount += scanAndFix(fullPath);
        } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
            if (fixDuplicateImports(fullPath)) {
                fixedCount++;
            }
        }
    });

    return fixedCount;
}

const srcDir = path.join(__dirname, 'review-app', 'src');
console.log('Scanning for duplicate react-icons imports...\n');
const fixedCount = scanAndFix(srcDir);
console.log(`\n✓ Fixed ${fixedCount} file(s) with duplicate imports`);
