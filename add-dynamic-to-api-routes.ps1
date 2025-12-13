$apiRoutes = @(
    "auth\callback\route.ts",
    "auth\create-user\route.ts",
    "classrooms\[id]\data\route.ts",
    "classrooms\[id]\students\route.ts",
    "classrooms\[id]\teams\route.ts",
    "classrooms\create\route.ts",
    "classrooms\join\route.ts",
    "faculty\get-faculty-name\route.ts",
    "faculty\slots\route.ts",
    "faculty\submissions\route.ts",
    "slots\available\[classroomId]\route.ts",
    "slots\book\route.ts",
    "slots\delete\route.ts",
    "slots\publish\route.ts",
    "student\slots\route.ts"
)

$basePath = "o:\Downloads\Review Scheduling Website\reviewscheduling\review-scheduler-vit\review-app\src\app\api"
$exportLine = "`r`nexport const dynamic = 'force-dynamic';`r`n"

foreach ($route in $apiRoutes) {
    $filePath = Join-Path $basePath $route
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Check if already has the export
        if ($content -notmatch "export const dynamic") {
            # Find the end of imports (first empty line after imports)
            $lines = $content -split "`r`n"
            $insertIndex = 0
            
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import " -or $lines[$i] -match "^from ") {
                    $insertIndex = $i + 1
                }
                elseif ($insertIndex -gt 0 -and $lines[$i] -match "^\s*$") {
                    $insertIndex = $i
                    break
                }
            }
            
            # Insert the export after imports
            $lines = @($lines[0..($insertIndex - 1)]) + $exportLine.Trim() + @($lines[$insertIndex..($lines.Count - 1)])
            $newContent = $lines -join "`r`n"
            
            Set-Content -Path $filePath -Value $newContent -NoNewline
            Write-Host "✓ Added dynamic export to: $route"
        }
        else {
            Write-Host "- Already has dynamic export: $route"
        }
    }
    else {
        Write-Host "✗ File not found: $route"
    }
}

Write-Host "`nDone! Added dynamic export to all API routes."
