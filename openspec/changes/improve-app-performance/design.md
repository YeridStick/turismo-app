# Design

## Overview

El cambio se ejecutara en capas pequenas. Primero se protegeran contratos y se mediran los flujos criticos. Luego se estabilizaran datos y requests. Despues se reduciran renders de listas, cards, mapas y modales. Finalmente se ajustaran estados de carga/error/vacio y se validaran flujos.

No se agregan librerias nuevas. Las mejoras usan React, React Native, Axios y helpers locales.

## Arquitectura propuesta

### 1. Request keys y deduplicacion local

Agregar un helper pequeno para construir claves deterministicas de request:

- Metodo HTTP.
- Endpoint resuelto.
- Params serializados con orden estable.
- Scope opcional de cuenta (`user.email`) cuando los datos sean dependientes del usuario.

Usar un registro en memoria con `useRef` en hooks de pantalla o un helper compartido acotado. La primera implementacion debe ser simple:

- `getOrStartRequest(key, factory)`: si la clave existe en vuelo, retorna la promesa existente.
- Al finalizar, limpia la clave.
- Para datos que toleran stale cache corto, permitir TTL en memoria solo dentro de la sesion de pantalla.

Aplicacion prioritaria:

- `useHomeData`: catalogo, popular, top, best rated, packages, agencies, categories, nearby, nearby context.
- `useNotifications`: `loadNotifications`.
- `AgencyDashboardScreen`: dashboard y conteos por agencia.
- `MyReservationsScreen` y `AgencyReservationsScreen`: detalle y mensajes.

Las mutaciones siguen protegidas con estados `loading` y botones `disabled`; no se deduplican globalmente.

### 2. Home data

`useHomeData` se mantiene como hook principal, pero se divide internamente en helpers pequenos.

Cambios propuestos:

- Reutilizar resultado de `loadAll(0)` para alimentar `popular` cuando hoy se consulta el mismo `PLACES_SEARCH` con `mode: ALL` y `size: 10`.
- Mantener `loadPopular()` como fallback solo cuando se necesite cargar popular sin catalogo fresco.
- Hacer que `handleRefresh()` coordine resultados con `Promise.allSettled` para no fallar todo por una seccion.
- Guardar request keys por `page`, `offset`, `agencyId`, `searchText`, `categoryId`, `radius` y coordenadas redondeadas.
- Evitar que `performSearch()` dispare `loadNearby()` si ya existe una request nearby equivalente en vuelo o cache valida.
- Normalizar respuestas con helpers compartidos para reducir duplicacion.

El objetivo es conservar el contrato publico del hook para que `HomeScreen` cambie poco.

### 3. Props estables en Home

`HomeScreen` hoy concentra muchos callbacks inline. Se propone:

- Memoizar `searchSuggestions`.
- Crear handlers estables para abrir detalle, AR, agencia, filtro, perfil, nearby y recarga.
- Memoizar `renderItem` y footers de `FlatList`.
- Pasar a cards datos derivados estables y no funciones nuevas por item cuando sea evitable.
- Crear `placesById` una vez por cambio de `places`, y reutilizarlo para paquetes y modales.

Esto permite que `React.memo` en `PlaceCard`, `PackageCard`, `NearbyMapBlock`, `AgencyModal`, `FilterModal` y `ReservationModal` sea efectivo.

### 4. PackageCard y PackageDetailModal

La derivacion de paquete debe salir del render directo:

- Helper `buildPackagePresentation(pkg, placesById)` o hook `usePackagePresentation`.
- Calcular includes, tags de ciudad, imagen, gradiente, descripcion, route places y visible route places.
- Usar el mismo helper en `PackageCard` y `PackageDetailModal`.
- Si `PackageDetailModal.visible=false`, retornar `null` antes de calcular contenido pesado, aun cuando `pkg` exista.

Esto reduce trabajo duplicado y evita calculos de modales ocultos.

### 5. NearbyMapBlock y WebViewMap

`NearbyMapBlock`:

- Memoizar `center`, `delta`, `initialRegion`, `nearbyMarkers` y `userLocation`.
- Memoizar `renderItem` de nearby cards.
- Recibir handlers estables desde Home.

`WebViewMap`:

- Memoizar `calculateZoomLevel` o moverlo fuera del componente.
- Memoizar `mapHTML` por region inicial efectiva.
- Enviar `postMessage` solo cuando cambie una firma de markers/userLocation/circle.
- Mantener `pauseUpdates` para no saturar el WebView durante paneles o gestos.
- No cambiar Leaflet ni OpenStreetMap.

### 6. MapScreen

`MapScreen` debe mantener su endpoint y comportamiento, pero mover calculos fuera del render:

- Memoizar `filteredPlaces`.
- Memoizar `mapRegion`.
- Memoizar `markers`.
- Convertir helpers de distancia/filtro a `useCallback` o funciones puras.
- Proteger `fetchPlaces()` con request key y loading guard.

### 7. Dashboard y reservas

`AgencyDashboardScreen`:

- Deduplicar `loadData()`, `loadAgencyDashboard()` y `loadAgencyReservationCounts()`.
- Cachear conteos por agencia durante la sesion de pantalla y refrescarlos solo en pull-to-refresh o cambio de cuenta.
- Evitar que cambiar rapidamente de agencia deje respuestas viejas sobreescribiendo la agencia activa.

Reservas:

- Evitar doble apertura de detalle con una request en vuelo para el mismo id.
- Reutilizar detalle/mensajes si se acaba de cargar y no hubo mutacion.
- Despues de enviar mensaje o cambiar estado, refrescar solo lo necesario y mantener datos visibles mientras carga.

### 8. Servicio API y token

`src/services/api.js` lee `AsyncStorage.getItem('token')` en cada request. Se propone una mejora conservadora:

- Introducir cache en memoria del token en el servicio.
- Sincronizarlo con login/logout/AuthContext donde ya se escribe o elimina token.
- Mantener fallback a `AsyncStorage` si la cache esta vacia.
- No cambiar headers publicos ni manejo 401.

Esta tarea debe ejecutarse despues de tener cobertura suficiente de auth porque toca una ruta transversal.

### 9. Estados de UI

Los estados de carga/error/vacio deben ser por seccion:

- Home catalogo: loading inicial, loading more, error catalogo, empty por filtro.
- Nearby: loading nearby, permiso/ubicacion, sin sitios, retry radio/recargar.
- Paquetes/agencias: loading independiente, filtro sin resultados, backend error, retry local.
- Dashboard: loading global solo para primera carga; switching agency usa loading de dashboard sin borrar lista de agencias.
- Reservas: lista, detalle y mensajes con estados separados.

## Riesgos y mitigaciones

- Riesgo: cache deja datos obsoletos despues de una mutacion.
  - Mitigacion: invalidar claves afectadas despues de crear reserva, editar paquete/agencia, marcar notificacion, actualizar estado o enviar mensaje.

- Riesgo: memoizacion oculta cambios porque una dependencia falta.
  - Mitigacion: helpers puros con tests y dependencia explicita por ids/firma.

- Riesgo: cambios en `api.js` afectan auth.
  - Mitigacion: dejar token cache para una tarea aislada al final, con pruebas manuales de login/logout/cambio de cuenta.

- Riesgo: convertir listas puede alterar scroll/nesting.
  - Mitigacion: cambios por lista, con validacion manual en Home y pantallas de gestion.

## Validacion manual minima

- Abrir Home sin sesion y con sesion.
- Pull-to-refresh en Home.
- Buscar texto y aplicar categoria/radio.
- Interactuar con nearby map, bloquear/desbloquear gestos, abrir detalle y AR.
- Cargar mas lugares, agencias y paquetes.
- Abrir/cerrar `PackageDetailModal`, reservar, cancelar y enviar reserva.
- Abrir notificaciones y marcar leidas.
- Abrir MapScreen con y sin lugar seleccionado.
- Abrir PlaceDetail, reviews, visita, feedback y galeria.
- Cambiar agencias en dashboard y abrir reservas.
- Enviar mensaje o cambiar estado de reserva.
