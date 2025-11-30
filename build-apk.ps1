# Script para construir APK local - Turismo App (Windows PowerShell)
# Uso: .\build-apk.ps1 [debug|release]

param(
    [string]$BuildType = "debug"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando build de APK ($BuildType)..." -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar que estamos en el directorio correcto
if (-Not (Test-Path "package.json")) {
    Write-Host "❌ Error: Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Paso 2: Verificar node_modules
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ Dependencias ya instaladas" -ForegroundColor Green
}

# Paso 3: Verificar/generar directorio android
if (-Not (Test-Path "android")) {
    Write-Host "📱 Generando directorio android..." -ForegroundColor Yellow
    npx expo prebuild --platform android
} else {
    Write-Host "✅ Directorio android existe" -ForegroundColor Green
}

# Paso 4: Navegar a android y construir
Set-Location android

Write-Host ""
Write-Host "🔨 Construyendo APK de $BuildType..." -ForegroundColor Cyan
Write-Host "⏳ Esto puede tomar varios minutos..." -ForegroundColor Yellow
Write-Host ""

try {
    if ($BuildType -eq "release") {
        .\gradlew.bat assembleRelease --warning-mode all
        $ApkPath = "app\build\outputs\apk\release\app-release.apk"
    } else {
        .\gradlew.bat assembleDebug --warning-mode all
        $ApkPath = "app\build\outputs\apk\debug\app-debug.apk"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error durante el build: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Paso 5: Verificar que el APK se generó
$FullApkPath = "android\$ApkPath"
if (Test-Path $FullApkPath) {
    $ApkSize = (Get-Item $FullApkPath).Length / 1MB
    Write-Host ""
    Write-Host "✅ ¡APK generado exitosamente!" -ForegroundColor Green
    Write-Host "📍 Ubicación: $FullApkPath" -ForegroundColor Cyan
    Write-Host "📊 Tamaño: $([math]::Round($ApkSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎯 Para instalar en un dispositivo:" -ForegroundColor Yellow
    Write-Host "   adb install $FullApkPath" -ForegroundColor White
    Write-Host ""
    Write-Host "📱 O copia el archivo a tu teléfono y ábrelo para instalarlo" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Error: No se pudo generar el APK" -ForegroundColor Red
    exit 1
}
