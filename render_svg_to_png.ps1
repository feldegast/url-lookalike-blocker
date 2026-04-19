Add-Type -AssemblyName System.Drawing
$size = 128
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(183,28,28), 14)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawEllipse($pen, 7, 7, 114, 114)
$g.DrawLine($pen, 35, 35, 93, 93)
try {
  $font = New-Object System.Drawing.Font('Segoe UI Black', 54, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
} catch {
  $font = New-Object System.Drawing.Font('Arial Black', 54, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
}
$blackBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(211,47,47))
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$spacing = -3
$uWidth = $g.MeasureString('U', $font).Width
$rWidth = $g.MeasureString('Ր', $font).Width
$lWidth = $g.MeasureString('L', $font).Width
$totalWidth = $uWidth + $rWidth + $lWidth + 2 * $spacing
$originX = 64 - $totalWidth / 2
$uX = $originX + $uWidth / 2
$rX = $originX + $uWidth + $spacing + $rWidth / 2
$lX = $originX + $uWidth + $spacing + $rWidth + $spacing + $lWidth / 2
$y = 82
$g.DrawString('U', $font, $blackBrush, [System.Drawing.PointF]::new($uX, $y), $fmt)
$g.DrawString('Ր', $font, $redBrush, [System.Drawing.PointF]::new($rX, $y), $fmt)
$g.DrawString('L', $font, $blackBrush, [System.Drawing.PointF]::new($lX, $y), $fmt)
$bmp.Save((Join-Path $PSScriptRoot 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$blackBrush.Dispose()
$redBrush.Dispose()
$font.Dispose()
$g.Dispose()
$bmp.Dispose()
Write-Output 'rendered icon.png'