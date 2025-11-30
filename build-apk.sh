#!/bin/bash
# Script para construir APK local - Turismo App
# Uso: ./build-apk.sh [debug|release]

set -e  # Detener en caso de error

BUILD_TYPE=${1:-debug}  # Por defecto: debug

echo "🚀 Iniciando build de APK ($BUILD_TYPE)..."
echo ""

# Paso 1: Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Paso 2: Verificar node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
else
    echo "✅ Dependencias ya instaladas"
fi

# Paso 3: Verificar/generar directorio android
if [ ! -d "android" ]; then
    echo "📱 Generando directorio android..."
    npx expo prebuild --platform android
else
    echo "✅ Directorio android existe"
fi

# Paso 4: Navegar a android y construir
cd android

echo ""
echo "🔨 Construyendo APK de $BUILD_TYPE..."
echo "⏳ Esto puede tomar varios minutos..."
echo ""

if [ "$BUILD_TYPE" = "release" ]; then
    ./gradlew assembleRelease --warning-mode all
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
    ./gradlew assembleDebug --warning-mode all
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

# Paso 5: Verificar que el APK se generó
if [ -f "android/$APK_PATH" ]; then
    APK_SIZE=$(du -h "android/$APK_PATH" | cut -f1)
    echo ""
    echo "✅ ¡APK generado exitosamente!"
    echo "📍 Ubicación: android/$APK_PATH"
    echo "📊 Tamaño: $APK_SIZE"
    echo ""
    echo "🎯 Para instalar en un dispositivo:"
    echo "   adb install android/$APK_PATH"
else
    echo ""
    echo "❌ Error: No se pudo generar el APK"
    exit 1
fi
