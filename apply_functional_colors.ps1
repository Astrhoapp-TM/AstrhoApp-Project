$files = Get-ChildItem -Path "src\features", "src\shared" -Recurse -Include '*.tsx'

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $original = $content

    # 1. Eliminar textos Activo / Inactivo de los Switches
    # Se reemplaza la etiqueta span o el bloque completo si contiene Activo/Inactivo
    $content = [regex]::Replace($content, '\{[^}]+\?.*[''"]Activo[''"].*:.*[''"]Inactivo[''"].*\}', '')
    $content = [regex]::Replace($content, '\{[^}]+\?.*[''"]Estado Activo[''"].*:.*[''"]Estado Inactivo[''"].*\}', '')
    $content = [regex]::Replace($content, '\{[^}]+\?.*[''"]Rol Activo[''"].*:.*[''"]Rol Inactivo[''"].*\}', '')
    $content = [regex]::Replace($content, '\{[^}]+\?.*[''"]Servicio Activo[''"].*:.*[''"]Servicio Inactivo[''"].*\}', '')
    $content = [regex]::Replace($content, '<span>\s*</span>', '')
    $content = [regex]::Replace($content, '<span[^>]*>\s*</span>', '')

    # 2. Reemplazar opacidades en hover backgrounds
    # Elimina cualquier hover:bg-brand-*/10, hover:bg-brand-*/20 y los reemplaza por hover:bg-gray-100
    $content = [regex]::Replace($content, 'hover:bg-brand-[a-z]+/\d+', 'hover:bg-gray-100')
    $content = [regex]::Replace($content, 'bg-brand-[a-z]+/\d+', 'bg-gray-50')
    $content = [regex]::Replace($content, 'border-brand-[a-z]+/\d+', 'border-gray-200')

    # 3. Mapeo funcional de iconos y botones
    # Cancelar, Eliminar (Trash, X) -> brand-pink (#F279DE)
    # Por defecto, shadcn y lucide usan text-red-500 o text-red-600 para destructivo
    $content = $content -replace 'text-red-500', 'text-brand-pink'
    $content = $content -replace 'text-red-600', 'text-brand-pink'
    $content = $content -replace 'text-red-700', 'text-brand-pink'
    $content = $content -replace 'hover:text-red-600', 'hover:text-brand-pink'
    $content = $content -replace 'hover:text-red-700', 'hover:text-brand-pink'
    $content = $content -replace 'bg-red-50', 'bg-gray-50'
    $content = $content -replace 'bg-red-100', 'bg-gray-100'

    # Editar (Pencil, Edit) -> brand-violet (#BF84D9)
    # Se usaba text-brand-indigo o blue/indigo
    $content = [regex]::Replace($content, '<Edit\b[^>]*className="[^"]*text-brand-indigo[^"]*"', { param($m) $m.Value -replace 'text-brand-indigo', 'text-brand-violet' })
    $content = [regex]::Replace($content, '<Pencil\b[^>]*className="[^"]*text-brand-indigo[^"]*"', { param($m) $m.Value -replace 'text-brand-indigo', 'text-brand-violet' })
    $content = [regex]::Replace($content, '<Edit\b[^>]*className="[^"]*text-blue-500[^"]*"', { param($m) $m.Value -replace 'text-blue-500', 'text-brand-violet' })
    $content = [regex]::Replace($content, '<Pencil\b[^>]*className="[^"]*text-blue-500[^"]*"', { param($m) $m.Value -replace 'text-blue-500', 'text-brand-violet' })
    
    # Reemplazo general de brand-indigo a brand-violet en botones de editar
    $content = [regex]::Replace($content, '(?i)(<button[^>]*>.*?<Edit[^>]*>.*?editar.*?</button>)', { param($m) $m.Value -replace 'text-brand-indigo', 'text-brand-violet' })

    # Ver / Visualizar (Eye, FileText) -> brand-periwinkle (#B5B3F2)
    # Se usaba text-brand-indigo o gray/blue
    $content = [regex]::Replace($content, '<Eye\b[^>]*className="[^"]*text-brand-indigo[^"]*"', { param($m) $m.Value -replace 'text-brand-indigo', 'text-brand-periwinkle' })
    $content = [regex]::Replace($content, '<Eye\b[^>]*className="[^"]*text-blue-500[^"]*"', { param($m) $m.Value -replace 'text-blue-500', 'text-brand-periwinkle' })
    $content = [regex]::Replace($content, '<Eye\b[^>]*className="[^"]*text-gray-500[^"]*"', { param($m) $m.Value -replace 'text-gray-500', 'text-brand-periwinkle' })

    # PDF / Descargar (FileDown, Printer) -> brand-indigo (#8477D9)
    $content = [regex]::Replace($content, '<FileDown\b[^>]*className="[^"]*text-brand-pink[^"]*"', { param($m) $m.Value -replace 'text-brand-pink', 'text-brand-indigo' })
    $content = [regex]::Replace($content, '<FileDown\b[^>]*className="[^"]*text-red-500[^"]*"', { param($m) $m.Value -replace 'text-red-500', 'text-brand-indigo' })
    $content = [regex]::Replace($content, '<Printer\b[^>]*className="[^"]*text-brand-[a-z]+[^"]*"', { param($m) $m.Value -replace 'text-brand-[a-z]+', 'text-brand-indigo' })

    # 4. Asegurarse de que no haya variaciones text-brand-*/... (opacidad en texto)
    $content = [regex]::Replace($content, 'text-brand-[a-z]+/\d+', { param($m) $m.Value.Split('/')[0] })

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.Name)"
    }
}
Write-Host "Done."
