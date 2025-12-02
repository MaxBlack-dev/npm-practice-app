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
            [string]$Text,
            [int]$FontDivisor = 4,
            [string]$Text2 = "",
            [int]$FontDivisor2 = 8
        )
        
        # Create bitmap
        $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Set background color to indigo/blue-purple (#6366F1 - rgb(99, 102, 241))
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(99, 102, 241))
        $graphics.FillRectangle($bgBrush, 0, 0, $Width, $Height)
        
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        
        if ($Text2 -ne "") {
            # Two-line text with different sizes
            $font1 = New-Object System.Drawing.Font("Arial", ($Width / $FontDivisor), [System.Drawing.FontStyle]::Bold)
            $font2 = New-Object System.Drawing.Font("Arial", ($Width / $FontDivisor2), [System.Drawing.FontStyle]::Bold)
            
            # Draw first line (upper half)
            $rect1 = New-Object System.Drawing.RectangleF(0, 0, $Width, $Height * 0.5)
            $graphics.DrawString($Text, $font1, $textBrush, $rect1, $format)
            
            # Draw second line (lower half)
            $rect2 = New-Object System.Drawing.RectangleF(0, $Height * 0.5, $Width, $Height * 0.5)
            $graphics.DrawString($Text2, $font2, $textBrush, $rect2, $format)
            
            $font2.Dispose()
            $font1.Dispose()
        } else {
            # Single line text
            $font = New-Object System.Drawing.Font("Arial", ($Width / $FontDivisor), [System.Drawing.FontStyle]::Bold)
            $rect = New-Object System.Drawing.RectangleF(0, 0, $Width, $Height)
            $graphics.DrawString($Text, $font, $textBrush, $rect, $format)
            $font.Dispose()
        }
        
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
    Create-PlaceholderImage -FilePath (Join-Path $assetsDir "icon.png") -Width 1024 -Height 1024 -Text "npm" -FontDivisor 4
    Create-PlaceholderImage -FilePath (Join-Path $assetsDir "adaptive-icon.png") -Width 1024 -Height 1024 -Text "npm" -FontDivisor 4
    
    # Splash screen with two-line text
    $splashPath = Join-Path $assetsDir "splash.png"
    $bitmap = New-Object System.Drawing.Bitmap(1284, 2778)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(99, 102, 241))
    $graphics.FillRectangle($bgBrush, 0, 0, 1284, 2778)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    # NPM - fits on one line
    $font1 = New-Object System.Drawing.Font("Arial", 330, [System.Drawing.FontStyle]::Bold)
    $rect1 = New-Object System.Drawing.RectangleF(0, 800, 1284, 400)
    $graphics.DrawString("NPM", $font1, $textBrush, $rect1, $format)
    # Practice - 180pt
    $font2 = New-Object System.Drawing.Font("Arial", 180, [System.Drawing.FontStyle]::Bold)
    $rect2 = New-Object System.Drawing.RectangleF(0, 1250, 1284, 300)
    $graphics.DrawString("Practice", $font2, $textBrush, $rect2, $format)
    $bitmap.Save($splashPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    $bgBrush.Dispose()
    $textBrush.Dispose()
    $font1.Dispose()
    $font2.Dispose()
    Write-Host "  Created: $splashPath" -ForegroundColor Green
    
    Create-PlaceholderImage -FilePath (Join-Path $assetsDir "favicon.png") -Width 48 -Height 48 -Text "npm" -FontDivisor 4
    
    Write-Host "`nPlaceholder assets created successfully!" -ForegroundColor Green
    Write-Host "These are basic placeholders. For production, create professional assets." -ForegroundColor Yellow
    Write-Host "See ASSETS-GUIDE.md for more information." -ForegroundColor Cyan
    
} else {
    Write-Host "Error: This script requires .NET Framework with System.Drawing" -ForegroundColor Red
    Write-Host "Please create assets manually. See ASSETS-GUIDE.md for instructions." -ForegroundColor Yellow
}
