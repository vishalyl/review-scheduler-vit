$iconMap = @{
    'ArrowLeft' = '←'
    'ArrowRight' = '→'
    'ChevronLeft' = '‹'
    'ChevronRight' = '›'
    'ChevronDown' = '▼'
    'Users' = '👥'
    'User2' = '👤'
    'UserPlus' = '➕👤'
    'UserCheck' = '✓👤'
    'UserX' = '✕👤'
    'UserMinus' = '➖👤'
    'School' = '🏫'
    'Calendar' = '📅'
    'Clock' = '🕐'
    'Mail' = '📧'
    'Check' = '✓'
    'CheckCircle' = '✅'
    'X' = '✕'
    'Plus' = '+'
    'Edit' = '✎'
    'FileText' = '📄'
    'Copy' = '📋'
    'AlertCircle' = '⚠️'
    'AlertTriangle' = '⚠️'
    'Loader2' = '⟳'
    'RefreshCw' = '↻'
    'LogOut' = '🚪'
    'Settings' = '⚙️'
    'BookOpen' = '📖'
    'Upload' = '⬆️'
    'Link' = '🔗'
    'Info' = 'ℹ️'
    'Filter' = '🔍'
    'Search' = '🔎'
}

$files = Get-ChildItem -Path "review-app/src" -Recurse -Filter "*.tsx" | Where-Object { 
    (Get-Content $_.FullName -Raw) -match "from 'lucide-react'"
}

Write-Host "Found $($files.Count) files with lucide-react imports"

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)"
    $content = Get-Content $file.FullName -Raw
    
    # Remove the lucide-react import line
    $content = $content -replace "import\s+\{[^}]+\}\s+from\s+'lucide-react';\r?\n", ""
    
    # Replace icon components with text/emojis
    foreach ($icon in $iconMap.Keys) {
        $emoji = $iconMap[$icon]
        # Replace self-closing tags: <IconName ... />
        $content = $content -replace "<$icon\s+[^/]*/>", "<span>$emoji</span>"
        $content = $content -replace "<$icon\s*/>", "<span>$emoji</span>"
        # Replace with className: <IconName className="..." />
        $content = $content -replace "<$icon\s+className=""([^""]*)""\s*/>", "<span className=`"`$1`">$emoji</span>"
        # Replace with size: <IconName size={...} />
        $content = $content -replace "<$icon\s+size=\{[^\}]+\}\s*/>", "<span>$emoji</span>"
    }
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Done! Processed $($files.Count) files"
