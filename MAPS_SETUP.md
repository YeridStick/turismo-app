# 🗺️ Configuración de Google Maps para Turismo App

Esta guía te ayudará a configurar correctamente Google Maps API Key para que los mapas funcionen en tu aplicación de turismo.

## 📋 Tabla de Contenidos

- [Prerequisitos](#prerequisitos)
- [Obtener Google Maps API Key](#obtener-google-maps-api-key)
- [Configurar API Key en la App](#configurar-api-key-en-la-app)
- [Crear Build de la App](#crear-build-de-la-app)
- [Solución de Problemas](#solución-de-problemas)

## ✅ Prerequisitos

- Cuenta de Google/Gmail
- Tarjeta de crédito/débito (Google requiere esto, pero tiene capa gratuita generosa)
- Proyecto Expo configurado (ya lo tienes)

## 🗝️ Obtener Google Maps API Key

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Haz clic en el selector de proyectos (arriba a la izquierda)
3. Clic en **"Nuevo Proyecto"**
4. Nombre del proyecto: `Turismo App` (o el que prefieras)
5. Clic en **"Crear"**

### Paso 2: Habilitar APIs Necesarias

1. En el menú lateral, ve a **APIs y Servicios > Biblioteca**
2. Busca y habilita las siguientes APIs:

   ✅ **Maps SDK for Android**
   - Clic en "Habilitar"

   ✅ **Maps SDK for iOS**
   - Clic en "Habilitar"

   (Opcional pero recomendado):
   - **Directions API** - Para rutas entre lugares
   - **Places API** - Para búsqueda de lugares
   - **Geocoding API** - Para convertir direcciones a coordenadas

### Paso 3: Crear Credenciales (API Key)

1. Ve a **APIs y Servicios > Credenciales**
2. Clic en **+ CREAR CREDENCIALES** > **Clave de API**
3. Se generará tu API Key (algo como: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
4. **¡COPIA ESTA CLAVE!** La necesitarás pronto

### Paso 4: Restringir la API Key (MUY IMPORTANTE)

Para evitar uso no autorizado:

#### Para Android:

1. En la API Key creada, clic en **"Editar API Key"**
2. En **"Restricciones de aplicación"**, selecciona **"Aplicaciones de Android"**
3. Clic en **"Agregar nombre del paquete y huella digital"**
4. **Nombre del paquete**: `com.yeridstick.turismoapp` (está en tu app.json)
5. **Huella digital SHA-1**: Obtenerla ejecutando:

```bash
# Para development
eas credentials

# O manualmente con keytool (si tienes el keystore)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### Para iOS:

1. En **"Restricciones de aplicación"**, selecciona **"Aplicaciones de iOS"**
2. **Bundle ID**: El que configuraste en app.json para iOS

#### Restricciones de API:

1. En **"Restricciones de API"**, selecciona **"Restringir clave"**
2. Selecciona solo las APIs que habilitaste:
   - Maps SDK for Android
   - Maps SDK for iOS
   - (Y las opcionales si las habilitaste)
3. Clic en **"Guardar"**

## 🔧 Configurar API Key en la App

### Actualizar app.json

Abre el archivo `app.json` y reemplaza `YOUR_GOOGLE_MAPS_API_KEY_HERE` con tu API Key real:

```json
{
  "expo": {
    "name": "turismo-app",
    "slug": "turismo-app",
    "ios": {
      "config": {
        "googleMapsApiKey": "AIzaSy_TU_API_KEY_AQUI"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "AIzaSy_TU_API_KEY_AQUI"
        }
      }
    }
  }
}
```

**⚠️ IMPORTANTE**:
- NO compartas esta API Key públicamente
- NO la subas a GitHub si es un repositorio público
- Considera usar variables de entorno para producción

### Variables de Entorno (Opcional pero Recomendado)

Crear archivo `.env`:

```bash
GOOGLE_MAPS_API_KEY=AIzaSy_TU_API_KEY_AQUI
```

Y en `app.config.js` (renombrar app.json a app.config.js):

```javascript
export default {
  expo: {
    // ... otras configuraciones
    ios: {
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    }
  }
};
```

## 📱 Crear Build de la App

**IMPORTANTE**: Los mapas nativos NO funcionan en Expo Go. Debes crear un build de desarrollo o producción.

### Opción 1: Build de Desarrollo (Recomendado para Testing)

```bash
# Instalar EAS CLI si no lo tienes
npm install -g eas-cli

# Iniciar sesión en Expo
eas login

# Configurar EAS Build (solo primera vez)
eas build:configure

# Crear build de desarrollo para Android
eas build --profile development --platform android

# Crear build de desarrollo para iOS (requiere Mac)
eas build --profile development --platform ios
```

### Opción 2: Build de Preview (APK para compartir)

```bash
# Android APK (puedes instalar en cualquier Android)
eas build --profile preview --platform android
```

### Opción 3: Build de Producción

```bash
# Android (AAB para Google Play Store)
eas build --profile production --platform android

# iOS (para App Store)
eas build --profile production --platform ios
```

## 🧪 Probar la App

1. Descarga e instala el build en tu dispositivo
2. Abre la app
3. Otorga permisos de ubicación cuando se solicite
4. Navega a la pantalla de **"Mapa"**
5. Deberías ver:
   - ✅ Tu ubicación actual (punto azul)
   - ✅ Marcadores de sitios turísticos
   - ✅ Mapa de Google (Android) o Apple Maps (iOS)

## 🐛 Solución de Problemas Comunes

### El mapa no se muestra (pantalla en blanco)

**Causa**: API Key no configurada o inválida

**Solución**:
1. Verifica que copiaste correctamente la API Key en `app.json`
2. Verifica que habilitaste las APIs correctas en Google Cloud Console
3. Verifica que la API Key no esté restringida incorrectamente
4. Crea un nuevo build (los cambios en app.json requieren rebuild)

### "Map failed to load" en Android

**Causa**: API Key no autorizada para este package name

**Solución**:
1. Verifica el package name en app.json: `com.yeridstick.turismoapp`
2. En Google Cloud Console, verifica que agregaste este package exacto
3. Si usas restricción por SHA-1, verifica que sea la correcta
4. Temporalmente, puedes quitar las restricciones para probar

### Permisos de ubicación denegados

**Solución**:
- Android: Configuración > Apps > Turismo App > Permisos > Ubicación > Permitir
- iOS: Configuración > Privacidad > Servicios de ubicación > Turismo App > Permitir

### Los mapas funcionan en iOS pero no en Android

**Causa**: Configuración diferente entre plataformas

**Solución**:
- Android requiere API Key obligatoria
- iOS puede usar Apple Maps sin API Key
- Verifica configuración específica de Android en app.json

### Errores de build

```bash
# Limpiar caché
npm start -- --clear

# Reinstalar dependencias
rm -rf node_modules
npm install

# Limpiar builds anteriores
eas build:list
```

## 💰 Costos y Límites

Google Maps tiene una **capa gratuita generosa**:

- **$200 USD de crédito gratis por mes**
- Maps SDK: ~28,000 cargas de mapa gratis/mes
- Es muy difícil superar esto en desarrollo/pequeñas apps

**Monitoreo**:
- Ve a Google Cloud Console > Facturación
- Configura alertas de presupuesto

## 📚 Recursos Adicionales

- [Documentación de react-native-maps](https://github.com/react-native-maps/react-native-maps)
- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [Google Maps Platform](https://developers.google.com/maps)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## 🚀 Próximos Pasos

Una vez que los mapas funcionen:

1. ✅ Implementar rutas entre lugares (react-native-maps-directions)
2. ✅ Agregar búsqueda de lugares
3. ✅ Integrar con Realidad Aumentada
4. ✅ Modo offline con caché de mapas
5. ✅ Navegación turn-by-turn

---

**¿Necesitas ayuda?**
Si tienes problemas, revisa los logs:
```bash
# Ver logs en tiempo real durante el build
eas build --profile development --platform android --local

# Ver logs de la app
npx react-native log-android
npx react-native log-ios
```
