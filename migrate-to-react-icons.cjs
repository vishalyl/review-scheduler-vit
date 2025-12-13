const fs = require('fs');
const path = require('path');

// Icon mapping from lucide-react to react-icons (Ionicons 5)
const iconMap = {
    'ArrowLeft': 'IoArrowBack',
    'ArrowRight': 'IoArrowForward',
    'ChevronLeft': 'IoChevronBack',
    'ChevronRight': 'IoChevronForward',
    'ChevronDown': 'IoChevronDown',
    'Users': 'IoPeople',
    'User2': 'IoPerson',
    'UserPlus': 'IoPersonAdd',
    'UserCheck': 'IoCheckmarkCircle',
    'UserX': 'IoCloseCircle',
    'UserMinus': 'IoRemoveCircle',
    'School': 'IoSchool',
    'Calendar': 'IoCalendar',
    'Clock': 'IoTime',
    'Mail': 'IoMail',
    'FileText': 'IoDocument',
    'Copy': 'IoCopy',
    'BookOpen': 'IoBook',
    'Upload': 'IoCloudUpload',
    'Link': 'IoLink',
    'Check': 'IoCheckmark',
    'CheckCircle': 'IoCheckmarkCircle',
    'X': 'IoClose',
    'Plus': 'IoAdd',
    'Edit': 'IoCreate',
    'Settings': 'IoSettings',
    'LogOut': 'IoLogOut',
    'RefreshCw': 'IoRefresh',
    'Loader2': 'IoSync',
    'AlertCircle': 'IoAlertCircle',
    'AlertTriangle': 'IoWarning',
    'Info': 'IoInformationCircle',
    'Filter': 'IoFunnel',
    'Search': 'IoSearch',
};

function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file uses lucide-react
    if (!content.includes("from 'lucide-react'")) {
        return false;
    }

    console.log(`Migrating: ${filePath}`);

    // Extract lucide icons from import
    const importMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+'lucide-react';?/);
    if (!importMatch) return false;

    const lucideIcons = importMatch[1]
        .split(',')
        .map(icon => icon.trim())
        .filter(icon => icon.length > 0);

    // Map to react-icons
    const reactIcons = [];
    const replacements = {};

    lucideIcons.forEach(lucideIcon => {
        const reactIcon = iconMap[lucideIcon];
        if (reactIcon) {
            reactIcons.push(reactIcon);
            replacements[lucideIcon] = reactIcon;
        } else {
            console.warn(`  Warning: No mapping for ${lucideIcon}`);
        }
    });

    if (reactIcons.length === 0) return false;

    // Replace import statement
    const newImport = `import { ${reactIcons.join(', ')} } from 'react-icons/io5';`;
    content = content.replace(/import\s+\{[^}]+\}\s+from\s+'lucide-react';?/, newImport);

    // Replace icon usages in JSX
    Object.keys(replacements).forEach(lucideIcon => {
        const reactIcon = replacements[lucideIcon];
        // Replace <IconName with <NewIconName
        const regex1 = new RegExp(`<${lucideIcon}([\\s/>])`, 'g');
        content = content.replace(regex1, `<${reactIcon}$1`);
        // Replace {IconName} with {NewIconName}  
        const regex2 = new RegExp(`\\{${lucideIcon}\\}`, 'g');
        content = content.replace(regex2, `{${reactIcon}}`);
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Migrated ${Object.keys(replacements).length} icons`);
    return true;
}

function findAndMigrateFiles(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let count = 0;

    files.forEach(file => {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            count += findAndMigrateFiles(fullPath);
        } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
            if (migrateFile(fullPath)) {
                count++;
            }
        }
    });

    return count;
}

// Run migration
const srcDir = path.join(__dirname, 'review-app', 'src');
console.log('Starting migration from lucide-react to react-icons...\n');
const migratedCount = findAndMigrateFiles(srcDir);
console.log(`\n✓ Migration complete! Updated ${migratedCount} files`);
