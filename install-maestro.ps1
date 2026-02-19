# Maestro Installation Script for Windows
# Run this script in PowerShell (may require Administrator privileges)

Write-Host "Installing Maestro CLI..." -ForegroundColor Green

# Check Java
Write-Host "Checking Java installation..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Java not found. Please install Java 17+ first." -ForegroundColor Red
    exit 1
}

# Create maestro directory in user's home
$maestroDir = "$env:USERPROFILE\maestro"
$maestroBin = "$maestroDir\bin"

if (-not (Test-Path $maestroDir)) {
    New-Item -ItemType Directory -Path $maestroDir | Out-Null
    Write-Host "Created directory: $maestroDir" -ForegroundColor Green
}

# Get latest release info
Write-Host "Fetching latest Maestro release..." -ForegroundColor Yellow
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/mobile-dev-inc/maestro/releases/latest"
    Write-Host "Latest version: $($release.tag_name)" -ForegroundColor Green
    
    # Find Windows asset
    $windowsAsset = $release.assets | Where-Object { 
        $_.name -match "windows" -and $_.name -match "\.zip"
    } | Select-Object -First 1
    
    if (-not $windowsAsset) {
        Write-Host "ERROR: Windows zip not found in latest release." -ForegroundColor Red
        Write-Host "Please download manually from: https://github.com/mobile-dev-inc/maestro/releases" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Downloading: $($windowsAsset.name)..." -ForegroundColor Yellow
    $zipPath = "$env:TEMP\maestro.zip"
    Invoke-WebRequest -Uri $windowsAsset.browser_download_url -OutFile $zipPath
    
    Write-Host "Extracting to $maestroDir..." -ForegroundColor Yellow
    Expand-Archive -Path $zipPath -DestinationPath $maestroDir -Force
    
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    Remove-Item $zipPath
    
    Write-Host "Maestro installed successfully!" -ForegroundColor Green
    Write-Host "Installation directory: $maestroDir" -ForegroundColor Cyan
    
    # Add to PATH
    Write-Host "Adding to PATH..." -ForegroundColor Yellow
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$maestroBin*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$maestroBin", "User")
        Write-Host "Added $maestroBin to PATH" -ForegroundColor Green
        Write-Host "Please restart PowerShell for PATH changes to take effect." -ForegroundColor Yellow
    } else {
        Write-Host "Already in PATH" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "To verify installation, restart PowerShell and run:" -ForegroundColor Cyan
    Write-Host "  maestro --version" -ForegroundColor White
    
} catch {
    Write-Host "ERROR: Failed to install Maestro" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual installation:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/mobile-dev-inc/maestro/releases" -ForegroundColor White
    Write-Host "2. Extract to: $maestroDir" -ForegroundColor White
    Write-Host "3. Add $maestroBin to your PATH" -ForegroundColor White
    exit 1
}
