# Guía para Construir APK Local - Turismo App

## 🔍 Problema Identificado

El error que estás viendo:
```
Cannot run Project.afterEvaluate(Closure) when the project is already evaluated.
```

Ocurre porque tu directorio `android/` está desactualizado o corrupto. El archivo `build.gradle` correcto generado por Expo solo tiene 25 líneas, pero tu error menciona la línea 27.

## ✅ Solución: Regenerar el Directorio Android

### Paso 1: Limpiar el directorio Android actual

En tu terminal de Windows (PowerShell o CMD), ejecuta:

```powershell
# Elimina el directorio android existente
Remove-Item -Recurse -Force android

# O si prefieres hacerlo desde Git Bash:
# rm -rf android
```

### Paso 2: Regenerar con Expo Prebuild

```powershell
npx expo prebuild --clean --platform android
```

Este comando:
- 🔧 Genera un nuevo directorio `android/` limpio
- ✅ Configura correctamente la Nueva Arquitectura de React Native
- 🎯 Aplica los plugins de Expo (react-viro, splash-screen, etc.)

### Paso 3: Construir el APK

```powershell
cd android
.\gradlew assembleDebug
```

## 📦 Ubicación del APK Generado

Una vez que el build termine exitosamente, encontrarás tu APK en:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

## 🚀 Métodos Alternativos para Construir APK

### Método 1: Usando Expo CLI (Recomendado)
```powershell
npx expo run:android --variant debug
```

### Método 2: Usando EAS Build Local
```powershell
# Instalar EAS CLI si no lo tienes
npm install -g eas-cli

# Construir localmente
eas build --platform android --profile preview-apk --local
```

### Método 3: Gradle directo (más control)
```powershell
cd android

# APK de Debug (más rápido, para testing)
.\gradlew assembleDebug

# APK de Release (optimizado, para distribución)
.\gradlew assembleRelease

# Ver todas las tareas disponibles
.\gradlew tasks
```

## 🔧 Configuración Importante

Tu proyecto ya tiene configurado:

### ✅ Nueva Arquitectura Habilitada
```properties
# En android/gradle.properties
newArchEnabled=true
```

### ✅ Configuración de React Viro
El plugin `@reactvision/react-viro` requiere la Nueva Arquitectura, que ya está habilitada.

### ✅ Permisos de Android
```json
{
  "permissions": [
    "CAMERA",
    "android.permission.INTERNET"
  ]
}
```

## ⚠️ Problemas Comunes y Soluciones

### Error: "SDK location not found"
**Solución:** Crea el archivo `android/local.properties` con:
```properties
sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
```

### Error: "Execution failed for task ':app:mergeDebugNativeLibs'"
**Solución:** Limpia el build:
```powershell
cd android
.\gradlew clean
.\gradlew assembleDebug
```

### Error: "Out of memory"
**Solución:** Aumenta la memoria de Gradle en `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### APK muy grande
**Solución:** Construye solo para arquitecturas específicas:
```powershell
.\gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
```

## 📱 Instalar el APK en un Dispositivo

### Opción 1: ADB (Android Debug Bridge)
```powershell
# Conecta tu dispositivo por USB y habilita USB debugging

# Verifica que el dispositivo esté conectado
adb devices

# Instala el APK
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Opción 2: Transferencia Manual
1. Copia el archivo `app-debug.apk` a tu teléfono
2. Abre el archivo en el teléfono
3. Permite instalación de fuentes desconocidas si te lo pide
4. Instala

## 🎯 Verificación del Build

Después de regenerar el directorio android, verifica que:

1. **El archivo `android/build.gradle` tiene 25 líneas**
2. **No hay errores de sintaxis**
3. **La configuración de gradle.properties es correcta**

Puedes verificar el contenido del build.gradle:
```powershell
cat android\build.gradle
```

Debe verse así:
```gradle
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
  }
}

allprojects {
  repositories {
    google()
    mavenCentral()
    maven { url 'https://www.jitpack.io' }
  }
}

apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
```

## 🔄 Actualizar el Repositorio

Una vez que hayas verificado que todo funciona, actualiza el repositorio:

```powershell
# El directorio android/ debería estar en .gitignore
# Verifica:
cat .gitignore

# Si android/ NO está en .gitignore y quieres commitearlo:
git add android/
git commit -m "chore: regenerate android directory with correct configuration"
git push
```

**Nota:** Generalmente se recomienda NO commitear el directorio `android/` en proyectos Expo managed, pero si usas desarrollo bare, entonces sí debes commitearlo.

## 📚 Recursos Adicionales

- [Expo Prebuild](https://docs.expo.dev/workflow/prebuild/)
- [React Native Nueva Arquitectura](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [React Viro Docs](https://github.com/NativeVision/viro)
- [Gradle Build](https://developer.android.com/build)

---

**¿Necesitas ayuda?** Si encuentras algún error después de seguir estos pasos, proporciona el mensaje de error completo y el contenido de `android/build.gradle`.
