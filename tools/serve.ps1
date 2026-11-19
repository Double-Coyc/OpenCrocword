#requires -Version 5.1
param(
    [int]$Port = 8080,
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
    $listener.Start()
} catch {
    Write-Error "Не удалось запустить сервер на порту $Port. Порт занят?"
    exit 1
}

$types = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.mjs'  = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
}

Write-Host "OpenCrocword: http://127.0.0.1:$Port/"
Write-Host "Корень: $Root"
Write-Host "Ctrl+C — остановить."

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $rel = $ctx.Request.Url.LocalPath.TrimStart('/')

        if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }

        $file = Join-Path $Root $rel

        if (Test-Path -LiteralPath $file -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ext = [System.IO.Path]::GetExtension($file).ToLower()

            if ($types.ContainsKey($ext)) {
                $ctx.Response.ContentType = $types[$ext]
            }

            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $ctx.Response.StatusCode = 404
        }

        $ctx.Response.Close()
    } catch {
        # клиент отключился — сервер продолжает работу
    }
}
