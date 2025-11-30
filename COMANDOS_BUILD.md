# 🚀 Comandos para Generar APK Local

## Método Rápido (Recomendado)

### Windows - PowerShell:
```powershell
# Usar el script automatizado
.\build-apk.ps1 debug

# O para release:
.\build-apk.ps1 release
```

### Linux/Mac - Terminal:
```bash
# Dar permisos de ejecución (solo primera vez)
chmod +x build-apk.sh

# Ejecutar el script
./build-apk.sh debug

# O para release:
./build-apk.sh release
```

---

## Método Manual (Paso a Paso)

### 1️⃣ Primera vez o si no existe el directorio `android/`:

```powershell
# Instalar dependencias
npm install

# Generar directorio android
npx expo prebuild --platform android
```

### 2️⃣ Construir el APK:

**Windows:**
```powershell
cd android
.\gradlew.bat assembleDebug
```

**Linux/Mac:**
```bash
cd android
./gradlew assembleDebug
```

### 3️⃣ Encontrar tu APK:

```
📁 android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 📋 Variantes de Build

| Comando | Tipo | Uso | Tamaño |
|---------|------|-----|--------|
| `assembleDebug` | Debug | Testing rápido | ~80-100 MB |
| `assembleRelease` | Release | Distribución | ~40-50 MB (optimizado) |

---

## 🔥 Comandos Útiles Adicionales

### Limpiar build anterior:
```powershell
cd android
.\gradlew.bat clean
```

### Build solo para una arquitectura (APK más pequeño):
```powershell
.\gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a
```

### Ver todas las tareas disponibles:
```powershell
.\gradlew.bat tasks
```

### Build con logs detallados:
```powershell
.\gradlew.bat assembleDebug --info
```

---

## 📱 Instalar APK en Dispositivo

### Método 1: USB con ADB
```powershell
# Verificar conexión
adb devices

# Instalar
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Método 2: Transferencia Manual
1. Copia `app-debug.apk` a tu teléfono
2. Abre el archivo en el teléfono
3. Permite instalación de fuentes desconocidas
4. Instala

---

## ⚠️ Solución de Problemas Rápida

### Error: "Cannot run Project.afterEvaluate"
```powershell
# Regenerar directorio android
Remove-Item -Recurse -Force android
npx expo prebuild --clean --platform android
```

### Error: "SDK location not found"
Crear archivo `android/local.properties`:
```properties
sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
```

### Error: "Out of memory"
Editar `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

---

## 🎯 Resumen de un Solo Comando

**Para la mayoría de casos (Debug APK):**

```powershell
# Windows - Todo en uno
npx expo prebuild --platform android && cd android && .\gradlew.bat assembleDebug
```

```bash
# Linux/Mac - Todo en uno
npx expo prebuild --platform android && cd android && ./gradlew assembleDebug
```

**Tu APK estará en:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

📚 Para más detalles, consulta [BUILD_LOCAL_APK.md](BUILD_LOCAL_APK.md)
