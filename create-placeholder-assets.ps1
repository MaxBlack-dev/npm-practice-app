# PowerShell script to create simple placeholder PNG assets
# This creates basic colored rectangles as temporary assets

Write-Host "Creating placeholder asset images..." -ForegroundColor Cyan

# Check if we have ImageMagick or use .NET approach
$useNet = $true

if ($useNet) {
    Write-Host "Using .NET Graphics to create placeholder images..." -ForegroundColor Yellow
    
    Add-Type -AssemblyName System.Drawing
    
    # Function to create a simple PNG with text
    function Create-PlaceholderImage {
        param(
            [string]$FilePath,
            [int]$Width,
            [int]$Height,
            [string]$Text
        )
        
        # Create bitmap
        $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Set background color (npm red: #CB3837)
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(203, 56, 55))
        $graphics.FillRectangle($bgBrush, 0, 0, $Width, $Height)
        
        # Draw text
        $font = New-Object System.Drawing.Font("Arial", ($Width / 10), [System.Drawing.FontStyle]::Bold)
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        $rect = New-Object System.Drawing.RectangleF(0, 0, $Width, $Height)
        
        $graphics.DrawString($Text, $font, $textBrush, $rect, $format)
        
        # Save
        $bitmap.Save($FilePath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Cleanup
        $graphics.Dispose()
        $bitmap.Dispose()
        $bgBrush.Dispose()
        $textBrush.Dispose()
        $font.Dispose()
        
        Write-Host "  Created: $FilePath" -ForegroundColor Green
    }
    
    # Create assets directory if it doesn't exist
    $assetsDir = Join-Path $PSScriptRoot "assets"
    if (-not (Test-Path $assetsDir)) {
        New-Item -ItemType Directory -Path $assetsDir | Out-Null
    }
    
    # Remove old .txt placeholders
    Get-ChildItem -Path $assetsDir -Filter "*.txt" | Remove-Item -Force
    Write-Host "  Removed old .txt placeholder files" -ForegroundColor Yellow
    
    # Create the assets
    Create-PlaceholderImage -FilePath (Join-Path $assetsDir "icon.png") -Width 1024 -Height 1024 -Text "npm"
    Create-PlaceholderImage -FilePath (Join-Path $assetsDir "adaptive-icon.png") -Width 1024 -Height 1024 -Text "npm"
    Create-PlaceholderImage -FilePath (Join-Path $assetsDir "splash.png") -Width 1284 -Height 2778 -Text "NPM Practice"
    Create-PlaceholderImage -FilePath (Join-Path $assetsDir "favicon.png") -Width 48 -Height 48 -Text "npm"
    
    Write-Host "`nPlaceholder assets created successfully!" -ForegroundColor Green
    Write-Host "These are basic placeholders. For production, create professional assets." -ForegroundColor Yellow
    Write-Host "See ASSETS-GUIDE.md for more information." -ForegroundColor Cyan
    
} else {
    Write-Host "Error: This script requires .NET Framework with System.Drawing" -ForegroundColor Red
    Write-Host "Please create assets manually. See ASSETS-GUIDE.md for instructions." -ForegroundColor Yellow
}
