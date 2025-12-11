const fs = require('fs');
const path = require('path');
const glob = require('glob');

const iconMap = {
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ChevronLeft': '‹',
    'ChevronRight': '›',
    'ChevronDown': '▼',
    'Users': '👥',
    'User2': '👤',
    'UserPlus': '➕👤',
    'UserCheck': '✓👤',
    'UserX': '✕👤',
    'UserMinus': '➖👤',
    'School': '🏫',
    'Calendar': '📅',
    'Clock': '🕐',
    'Mail': '📧',
    'Check': '✓',
    'CheckCircle': '✅',
    'X': '✕',
    'Plus': '+',
    'Edit': '✎',
    'FileText': '📄',
    'Copy': '📋',
    'AlertCircle': '⚠️',
    'AlertTriangle': '⚠️',
    'Loader2': '⟳',
    'RefreshCw': '↻',
    'LogOut': '🚪',
    'Settings': '⚙️',
    'BookOpen': '📖',
    'Upload': '⬆️',
    'Link': '🔗',
    'Info': 'ℹ️',
    'Filter': '🔍',
    'Search': '🔎'
};

// Find all .tsx files
const files = glob.sync('review-app/src/**/*.tsx');

let processedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Skip if no lucide-react import
    if (!content.includes("from 'lucide-react'")) {
        return;
    }

    console.log(`Processing: ${file}`);

    // Remove lucide-react import line
    content = content.replace(/import\s+\{[^}]+\}\s+from\s+'lucide-react';?\r?\n/g, '');

    // Replace each icon
    Object.keys(iconMap).forEach(icon => {
        const emoji = iconMap[icon];
        // Replace <Icon ... />
        const regex1 = new RegExp(`<${icon}\\s+[^/]*/>`, 'g');
        const regex2 = new RegExp(`<${icon}\\s*/>`, 'g');
        content = content.replace(regex1, `<span>${emoji}</span>`);
        content = content.replace(regex2, `<span>${emoji}</span>`);
    });

    fs.writeFileSync(file, content, 'utf8');
    processedCount++;
});

console.log(`\nDone! Processed ${processedCount} files`);
