#Requires -Version 5.1
<#
.SYNOPSIS
  Pull from Shopify without losing local work.

.DESCRIPTION
  1. Stashes any uncommitted local changes
  2. Pulls remote theme into the working tree
  3. Shows a diff of what Shopify changed vs your local state
  4. Lets you choose: accept all, reject all, or review file-by-file

.EXAMPLE
  .\bin\safe-pull.ps1                                    # pull entire theme
  .\bin\safe-pull.ps1 -Only "sections/header.liquid"     # pull specific files
  .\bin\safe-pull.ps1 -DryRun                            # preview what would change
#>

param(
    [switch]$DryRun,
    [string[]]$Only,
    [string[]]$ExtraArgs
)

$ErrorActionPreference = "Stop"

$ThemeDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location $ThemeDir

$ThemeId = "147874775176"
$Store = "scentsbysara-dev.myshopify.com"

Write-Host "=== Safe Shopify Theme Pull ===" -ForegroundColor Cyan
Write-Host ""

# Build pull args
$pullArgs = @("theme", "pull", "--theme", $ThemeId, "--store", $Store)
foreach ($file in $Only) {
    $pullArgs += "--only"
    $pullArgs += $file
}
if ($ExtraArgs) { $pullArgs += $ExtraArgs }

# Step 1: Check for uncommitted changes
$hasChanges = $false
$diffCheck = git diff --quiet 2>&1; $unstaged = $LASTEXITCODE -ne 0
$cachedCheck = git diff --cached --quiet 2>&1; $staged = $LASTEXITCODE -ne 0

if ($unstaged -or $staged) {
    $hasChanges = $true
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH:mm:ss"
    Write-Host "[1/4] Stashing local changes..." -ForegroundColor Yellow
    git stash push -m "safe-pull: auto-stash $timestamp"
    Write-Host "      Stashed successfully."
} else {
    Write-Host "[1/4] No uncommitted changes - nothing to stash."
}
Write-Host ""

# Step 2: Dry run or real pull
if ($DryRun) {
    Write-Host "[2/4] DRY RUN - pulling to temp directory to preview changes..." -ForegroundColor Yellow
    $tempDir = Join-Path $env:TEMP "safe-pull-$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    try {
        # Copy current theme to temp (exclude .git)
        Get-ChildItem -Path . -Exclude ".git", "bin", "node_modules" | Copy-Item -Destination $tempDir -Recurse -Force

        $dryPullArgs = $pullArgs + @("--path", $tempDir)
        & shopify @dryPullArgs 2>&1 | Write-Host

        Write-Host ""
        Write-Host "[3/4] Files that differ from Shopify:" -ForegroundColor Yellow
        Write-Host "--------------------------------------"

        $diffs = 0
        Get-ChildItem -Path $tempDir -Recurse -File | ForEach-Object {
            $relativePath = $_.FullName.Substring($tempDir.Length + 1)
            $localFile = Join-Path $ThemeDir $relativePath
            if (Test-Path $localFile) {
                $tempHash = (Get-FileHash $_.FullName -Algorithm MD5).Hash
                $localHash = (Get-FileHash $localFile -Algorithm MD5).Hash
                if ($tempHash -ne $localHash) {
                    Write-Host "  CHANGED: $relativePath" -ForegroundColor Red
                    $diffs++
                }
            } else {
                Write-Host "  NEW:     $relativePath" -ForegroundColor Green
                $diffs++
            }
        }
        if ($diffs -eq 0) { Write-Host "  (no differences)" }

        Write-Host ""
        Write-Host "[4/4] Dry run complete. No files were modified." -ForegroundColor Green
    } finally {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    if ($hasChanges) {
        git stash pop --quiet
        Write-Host "      Local stash restored."
    }
    Pop-Location
    return
}

Write-Host "[2/4] Pulling from Shopify (theme $ThemeId)..." -ForegroundColor Yellow
& shopify @pullArgs 2>&1 | Write-Host
Write-Host ""

# Step 3: Show what changed
Write-Host "[3/4] Changes from Shopify pull:" -ForegroundColor Yellow
Write-Host "--------------------------------"
$diffStat = git diff --stat

if (-not $diffStat) {
    Write-Host "  No changes from remote."
    Write-Host ""
    if ($hasChanges) {
        Write-Host "[4/4] Restoring your local changes..." -ForegroundColor Yellow
        git stash pop
        Write-Host "      Done. Your local changes are intact."
    } else {
        Write-Host "[4/4] Nothing to do."
    }
    Pop-Location
    return
}

$diffStat | Write-Host
Write-Host ""

# Step 4: Let user decide
Write-Host "[4/4] What do you want to do?" -ForegroundColor Cyan
Write-Host ""
Write-Host "  a) Accept ALL Shopify changes (keep pull result)"
Write-Host "  r) Reject ALL Shopify changes (restore pre-pull state)"
Write-Host "  f) Review file-by-file (choose per file)"
Write-Host "  d) Show full diff first, then decide"
Write-Host ""
$choice = Read-Host "Choice [a/r/f/d]"

switch ($choice.ToLower()) {
    "a" {
        Write-Host ""
        Write-Host "Accepting all Shopify changes..."
        git add -A
        $date = Get-Date -Format "yyyy-MM-dd"
        git commit -m "chore: pull from Shopify $date"
        if ($hasChanges) {
            Write-Host "Restoring your local changes on top..."
            git stash pop
            if ($LASTEXITCODE -ne 0) {
                Write-Host ""
                Write-Host "WARNING: Merge conflict when restoring local changes." -ForegroundColor Red
                Write-Host "Run 'git stash show -p' to see your stashed changes."
                Write-Host "Resolve manually, then 'git stash drop'."
            }
        }
        Write-Host "Done." -ForegroundColor Green
    }
    "r" {
        Write-Host ""
        Write-Host "Rejecting all Shopify changes..."
        git checkout -- .
        git clean -fd --quiet
        if ($hasChanges) { git stash pop }
        Write-Host "Done. Local state restored." -ForegroundColor Green
    }
    "f" {
        Write-Host ""
        $changedFiles = (git diff --name-only) -split "`n" | Where-Object { $_ }
        foreach ($file in $changedFiles) {
            Write-Host "--- $file ---" -ForegroundColor Yellow
            git diff -- $file | Select-Object -First 30 | Write-Host
            Write-Host ""
            $fileChoice = Read-Host "  Keep Shopify version? [y/n/s(kip)]"
            switch ($fileChoice.ToLower()) {
                "y" { Write-Host "  Keeping Shopify version of $file" -ForegroundColor Green }
                "n" { git checkout -- $file; Write-Host "  Restored local version of $file" -ForegroundColor Yellow }
                default { Write-Host "  Skipped (Shopify version kept in working tree)" }
            }
            Write-Host ""
        }
        $stillChanged = git diff --name-only
        if ($stillChanged) {
            git add -A
            $date = Get-Date -Format "yyyy-MM-dd"
            git commit -m "chore: selective pull from Shopify $date"
        }
        if ($hasChanges) {
            Write-Host "Restoring your local changes on top..."
            git stash pop
            if ($LASTEXITCODE -ne 0) { Write-Host "WARNING: Merge conflict. Resolve manually." -ForegroundColor Red }
        }
        Write-Host "Done." -ForegroundColor Green
    }
    "d" {
        Write-Host ""
        git diff
        Write-Host ""
        $final = Read-Host "Accept these changes? [y/n]"
        if ($final.ToLower() -eq "y") {
            git add -A
            $date = Get-Date -Format "yyyy-MM-dd"
            git commit -m "chore: pull from Shopify $date"
            if ($hasChanges) {
                git stash pop
                if ($LASTEXITCODE -ne 0) { Write-Host "WARNING: Merge conflict. Resolve manually." -ForegroundColor Red }
            }
        } else {
            git checkout -- .
            git clean -fd --quiet
            if ($hasChanges) { git stash pop }
            Write-Host "Rejected. Local state restored." -ForegroundColor Green
        }
    }
    default {
        Write-Host "Unknown choice. Leaving working tree as-is."
        Write-Host "Your stashed changes (if any) are still in 'git stash list'."
    }
}

Pop-Location
