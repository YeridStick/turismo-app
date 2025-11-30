# ⚠️ SOLUCION RAPIDA - Error "Cannot run Project.afterEvaluate"

## 🚨 SI TIENES ESTE ERROR:

```
FAILURE: Build failed with an exception.
* Where:
Build file 'C:\...\android\build.gradle' line: 27
* What went wrong:
> Cannot run Project.afterEvaluate(Closure) when the project is already evaluated.
```

---

## ✅ SOLUCION EN 1 SOLO PASO

Abre PowerShell en la raíz del proyecto y ejecuta:

```powershell
.\fix-android-build.ps1
```

**ESO ES TODO!** El script automáticamente:
- ✅ Diagnostica el problema
- ✅ Elimina el directorio android/ corrupto
- ✅ Regenera android/ con la configuración correcta
- ✅ Verifica que build.gradle sea correcto (25 líneas)
- ✅ Intenta construir el APK automáticamente

---

## 🛠️ SOLUCION MANUAL (Si prefieres hacerlo paso a paso)

### Paso 1: Eliminar el directorio android corrupto
```powershell
Remove-Item -Recurse -Force android
```

### Paso 2: Regenerar el directorio android limpio
```powershell
npx expo prebuild --clean --platform android
```

### Paso 3: Construir el APK
```powershell
cd android
.\gradlew.bat assembleDebug
```

### Paso 4: Encontrar tu APK
```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## ❓ ¿Por qué pasa esto?

Tu directorio `android/` está **desactualizado o corrupto**.

**Archivo correcto:**
- `android/build.gradle` debe tener **exactamente 25 líneas**
- No debe tener `afterEvaluate` fuera de los lugares correctos

**Tu archivo actual:**
- Tiene más de 25 líneas (probablemente de una versión anterior de Expo)
- El error menciona la **línea 27** (que no debería existir)

**Por qué necesitas regenerar:**
- Tu proyecto usa **React Native New Architecture** (`newArchEnabled: true`)
- Tu proyecto usa **React Viro** (AR/VR)
- Estas configuraciones requieren un setup específico de Gradle
- `expo prebuild` genera la configuración correcta automáticamente

---

## 📋 Verificación Rápida

Para verificar si tu `build.gradle` está correcto:

```powershell
# Ver número de líneas
(Get-Content android\build.gradle).Count
```

**Resultado esperado:** `25`

Si ves **más de 25**, tu archivo está corrupto. Usa el script de solución.

---

## 🎯 TL;DR (Demasiado largo, no leí)

**Un solo comando que lo arregla todo:**

```powershell
.\fix-android-build.ps1
```

**O si el script no funciona:**

```powershell
Remove-Item -Recurse -Force android; npx expo prebuild --clean --platform android; cd android; .\gradlew.bat assembleDebug
```

---

## 🆘 ¿Sigues teniendo problemas?

1. **Asegúrate de eliminar completamente el directorio android/**
   - Verifica que no exista: `Test-Path android` → debería ser `False`

2. **Cierra Android Studio** si lo tienes abierto
   - Puede estar bloqueando archivos del directorio android/

3. **Ejecuta el script de solución:**
   ```powershell
   .\fix-android-build.ps1
   ```

4. **Si el script falla**, comparte:
   - El error completo
   - Número de líneas de tu build.gradle: `(Get-Content android\build.gradle).Count`
   - Las primeras 30 líneas: `Get-Content android\build.gradle | Select-Object -First 30`

---

## 📚 Más Información

- **Guía completa de build:** [BUILD_LOCAL_APK.md](BUILD_LOCAL_APK.md)
- **Comandos de referencia rápida:** [COMANDOS_BUILD.md](COMANDOS_BUILD.md)
- **Scripts automatizados:** `build-apk.ps1`, `fix-android-build.ps1`

---

**Última actualización:** 2025-11-30
