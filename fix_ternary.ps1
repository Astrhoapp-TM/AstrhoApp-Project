$files = Get-ChildItem -Path "src\features" -Recurse -Include '*.tsx'

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $original = $content

    # Fix empty ternary branches like:
    # ) : (
    #     
    # )}
    $content = [regex]::Replace($content, '\)\s*:\s*\(\s*\)', ') : null')

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Fixed: $($file.Name)"
    }
}
Write-Host "Done."
