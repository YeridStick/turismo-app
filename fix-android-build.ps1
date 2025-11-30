# ========================================================================
# Script de Solucion AUTOMATICA para el Error de build.gradle
# ========================================================================
# Este script RESUELVE el error:
# "Cannot run Project.afterEvaluate(Closure) when the project is already evaluated"
#
# EJECUTA ESTE SCRIPT SI TIENES EL ERROR ARRIBA
# ========================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    SOLUCION AUTOMATICA - Error de build.gradle               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-Not (Test-Path "package.json")) {
    Write-Host "❌ Error: Ejecuta este script desde la raiz del proyecto" -ForegroundColor Red
    exit 1
}

# Paso 1: Diagnostico
Write-Host "🔍 PASO 1: Diagnosticando el problema..." -ForegroundColor Yellow
Write-Host ""

$buildGradlePath = "android\build.gradle"
$androidDirExists = Test-Path "android"

if ($androidDirExists) {
    Write-Host "   ✓ Directorio android/ encontrado" -ForegroundColor Green

    if (Test-Path $buildGradlePath) {
        $lineCount = (Get-Content $buildGradlePath).Count
        Write-Host "   ⚠  build.gradle tiene $lineCount lineas (deberia tener solo 25)" -ForegroundColor Yellow

        if ($lineCount -gt 25) {
            Write-Host "   ❌ CONFIRMADO: El archivo build.gradle esta CORRUPTO" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "   📋 Diagnostico: El directorio android/ esta desactualizado" -ForegroundColor Yellow
    Write-Host "   💡 Solucion: Necesitamos regenerarlo con expo prebuild" -ForegroundColor Cyan
} else {
    Write-Host "   ℹ  Directorio android/ no existe" -ForegroundColor Gray
    Write-Host "   💡 Lo generaremos con expo prebuild" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Paso 2: Solicitar confirmacion
Write-Host "🚀 PASO 2: Listo para solucionar el problema" -ForegroundColor Yellow
Write-Host ""

if ($androidDirExists) {
    Write-Host "   Este script va a:" -ForegroundColor White
    Write-Host "   1. ❌ ELIMINAR el directorio android/ corrupto" -ForegroundColor White
    Write-Host "   2. ✅ REGENERAR un directorio android/ limpio" -ForegroundColor White
    Write-Host "   3. 🔧 VERIFICAR que el build.gradle sea correcto" -ForegroundColor White
    Write-Host ""
}

$confirmation = Read-Host "   ¿Continuar? (S/N)"

if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host ""
    Write-Host "❌ Operacion cancelada" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Paso 3: Eliminar directorio android corrupto
if ($androidDirExists) {
    Write-Host "🗑️  PASO 3: Eliminando directorio android/ corrupto..." -ForegroundColor Yellow
    Write-Host ""

    try {
        Remove-Item -Path "android" -Recurse -Force
        Write-Host "   ✅ Directorio android/ eliminado exitosamente" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Error al eliminar: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "   💡 Intenta cerrar Android Studio o cualquier programa que este" -ForegroundColor Yellow
        Write-Host "      usando archivos del directorio android/" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "⏭️  PASO 3: Directorio android/ no existe, omitiendo eliminacion..." -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Paso 4: Verificar node_modules
Write-Host "📦 PASO 4: Verificando dependencias..." -ForegroundColor Yellow
Write-Host ""

if (-Not (Test-Path "node_modules")) {
    Write-Host "   ⚠  node_modules no encontrado, instalando..." -ForegroundColor Yellow
    npm install
    Write-Host "   ✅ Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "   ✅ node_modules ya existe" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Paso 5: Regenerar directorio android
Write-Host "🔨 PASO 5: Regenerando directorio android/ con configuracion correcta..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   ⏳ Esto puede tomar 1-2 minutos..." -ForegroundColor Gray
Write-Host ""

try {
    npx expo prebuild --clean --platform android
    Write-Host ""
    Write-Host "   ✅ Directorio android/ regenerado exitosamente" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "   ❌ Error durante expo prebuild: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Paso 6: Verificar que build.gradle sea correcto
Write-Host "🔍 PASO 6: Verificando que build.gradle sea correcto..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path $buildGradlePath) {
    $lineCount = (Get-Content $buildGradlePath).Count
    Write-Host "   📄 build.gradle tiene $lineCount lineas" -ForegroundColor Cyan

    if ($lineCount -eq 25) {
        Write-Host "   ✅ CORRECTO: El archivo tiene exactamente 25 lineas" -ForegroundColor Green
    } else {
        Write-Host "   ⚠  ADVERTENCIA: Se esperaban 25 lineas" -ForegroundColor Yellow
    }

    # Verificar que no contenga afterEvaluate en la linea 27
    $content = Get-Content $buildGradlePath -Raw
    if ($content -match "afterEvaluate") {
        Write-Host "   ⚠  ADVERTENCIA: Se encontro 'afterEvaluate' en el archivo" -ForegroundColor Yellow
        Write-Host "      Esto podria causar problemas" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ No se encontraron problemas conocidos" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Error: build.gradle no fue generado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Paso 7: Intentar construir el APK
Write-Host "🚀 PASO 7: Intentando construir el APK..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   ⏳ Esto puede tomar 3-5 minutos..." -ForegroundColor Gray
Write-Host ""

Set-Location android

try {
    .\gradlew.bat assembleDebug --warning-mode all

    Set-Location ..

    $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"

    if (Test-Path $apkPath) {
        $apkSize = (Get-Item $apkPath).Length / 1MB

        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║                    ✅ EXITO TOTAL!                            ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "   🎉 APK generado exitosamente!" -ForegroundColor Green
        Write-Host "   📍 Ubicacion: $apkPath" -ForegroundColor Cyan
        Write-Host "   📊 Tamaño: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   🎯 Para instalar en un dispositivo:" -ForegroundColor Yellow
        Write-Host "      adb install $apkPath" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "   ⚠  Build completo pero APK no encontrado en la ubicacion esperada" -ForegroundColor Yellow
    }

} catch {
    Set-Location ..

    Write-Host ""
    Write-Host "   ❌ Error durante el build: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "   💡 Posibles soluciones:" -ForegroundColor Yellow
    Write-Host "      1. Verifica que tienes Java JDK instalado" -ForegroundColor White
    Write-Host "      2. Verifica que ANDROID_HOME esta configurado" -ForegroundColor White
    Write-Host "      3. Ejecuta: .\gradlew.bat assembleDebug --stacktrace" -ForegroundColor White
    Write-Host "         (desde el directorio android/) para ver el error completo" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
