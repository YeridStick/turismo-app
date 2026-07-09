# Baseline de rendimiento

Change ID: `improve-app-performance`

Este baseline corresponde a tareas 1 y 2. No cambia comportamiento funcional, endpoints ni navegacion.

## Instrumentation temporal

Se agregaron utilidades dev-only en `src/utils/performanceInstrumentation.js`.

Activacion:

- Debe ejecutarse en runtime de desarrollo.
- Debe tener `EXPO_PUBLIC_PERF_INSTRUMENTATION=true`.
- En produccion no registra aunque el flag este presente.

Utilidades disponibles:

- `recordRequestInstrumentation(key, meta)` cuenta requests por key.
- `recordRenderInstrumentation(componentName, meta)` cuenta renders por componente.
- `getPerformanceInstrumentationSnapshot()` entrega snapshot de conteos y eventos.
- `resetPerformanceInstrumentation()` limpia el store global.

Estado actual:

- La instrumentation queda disponible y testeada.
- No se conecto todavia a `api.js`, pantallas ni componentes para evitar cambios funcionales o ruido.
- La conexion a flujos reales debe hacerse en fases posteriores, de forma puntual y removible.

## Mapa actual de requests por flujo

### Home mount

Origen principal: `src/screens/HomeScreen/hooks/useHomeData.js`.

- `handleRefresh()` dispara `loadAll()`.
  - `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=ALL`, `size=10`, `page=0`
- `handleRefresh()` dispara `loadPopular()`.
  - `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=ALL`, `size=10`
- `handleRefresh()` dispara `loadPackages()`.
  - `GET ENDPOINTS.PACKAGES` o `GET ENDPOINTS.AGENCY_PACKAGES(agency.id)`
  - Params: `limit=3`, `offset=0`
- `handleRefresh()` dispara `loadAgencies()`.
  - `GET ENDPOINTS.AGENCIES` o `GET ENDPOINTS.AGENCIES_SEARCH`
  - Params: `q`, `limit=3`, `offset=0`
- `handleRefresh()` dispara `loadTopPlaces()`.
  - `GET ENDPOINTS.PLACES_TOP`
  - Params: `limit=8`
  - Fallback posible: `GET ENDPOINTS.PLACES_SEARCH` con `mode=ALL`, `size=8`
- `handleRefresh()` dispara `loadBestRatedPlaces()`.
  - `GET ENDPOINTS.PLACES_TOP_RATED`
  - Params: `limit=8`
- `handleRefresh()` dispara `loadNearby()`.
  - Solicita ubicacion.
  - `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=NEARBY`, `lat`, `lng`, `radius`, `size=50`, `categoryId`
- `handleRefresh()` dispara `loadNearbyContext()`.
  - Solo si hay usuario.
  - Solicita ubicacion.
  - `GET ENDPOINTS.PLACES_NEARBY_CONTEXT`
  - Params: `lat`, `lng`, `radius=150`, `limit=5`
- `handleRefresh()` dispara `loadCategories()`.
  - `GET ENDPOINTS.CATEGORIES`

Riesgos observados:

- `loadAll()` y `loadPopular()` consultan datos equivalentes de `PLACES_SEARCH`.
- `loadTopPlaces()` puede caer a otro `PLACES_SEARCH`.
- `loadNearby()` y `loadNearbyContext()` pueden pedir ubicacion en la misma rafaga.

### Pull-to-refresh

Origen: `HomeScreen` `RefreshControl` llama `handleRefresh()`.

Requests esperados:

- Mismo conjunto que Home mount.

Riesgos observados:

- Pull-to-refresh repetido puede duplicar requests si la primera rafaga sigue en vuelo.
- Un fallo parcial no deberia borrar datos de otras secciones.

### Busqueda

Origen: `useHomeData.performSearch()`.

Requests esperados:

- `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `q`, `categoryId`, `lat`, `lng`, `radiusMeters`
- Si hay coordenadas, despues llama `loadNearby(finalDistance, finalCategory)`.
  - Posible `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=NEARBY`, `lat`, `lng`, `radius`, `size=50`, `categoryId`

Riesgos observados:

- Puede haber dos consultas cercanas a `PLACES_SEARCH` en una sola busqueda.
- Puede repetir solicitud de ubicacion si no hay coordenadas disponibles.

### Filtros

Origen: `FilterModal` aplica `performSearch()`.

Requests esperados:

- Igual que busqueda, con `categoryId` y `radiusMeters`.
- Posible nearby posterior.

Riesgos observados:

- Cambios rapidos de categoria/radio pueden dejar requests en vuelo.
- Se necesita invalidacion por categoria, radio y coordenadas.

### Nearby

Origen: `loadNearby()`, boton de recarga y aumento de radio.

Requests esperados:

- Solicitud de ubicacion con `ensureLocation()`.
- `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=NEARBY`, `lat`, `lng`, `radius`, `size=50`, `categoryId`

Cache actual:

- Existe cache local por radio, coordenadas, data y categoria.

Riesgos observados:

- Falta guard para request en vuelo por la misma clave.
- La clave debe considerar coordenadas redondeadas, radio y categoria.

### Paquetes/agencias

Origen: `loadPackages()`, `loadAgencies()`, search de agencia y filtros.

Requests esperados:

- `GET ENDPOINTS.PACKAGES`
  - Params: `limit=3`, `offset`
- `GET ENDPOINTS.AGENCY_PACKAGES(agency.id)`
  - Params: `limit=3`, `offset`
- `GET ENDPOINTS.AGENCIES`
  - Params: `limit=3`, `offset`
- `GET ENDPOINTS.AGENCIES_SEARCH`
  - Params: `q`, `limit=3`, `offset`

Riesgos observados:

- Search de agencia tiene debounce, pero no guard de request en vuelo.
- Cambiar agencia activa dispara reload de paquetes.
- Retry de seccion recarga paquetes y agencias a la vez.

### MapScreen

Origen: `src/screens/MapScreen.jsx`.

Requests esperados:

- Solicitud de permisos y ubicacion.
- `GET ENDPOINTS.PLACES_SEARCH`
  - Params: `mode=ALL`, `size=1000`

Riesgos observados:

- `size=1000` puede ser pesado.
- Filtros, region y markers se recalculan en render.

### PlaceDetail

Origen: `src/screens/PlaceDetailScreen.jsx`.

Requests esperados:

- `GET ENDPOINTS.PLACE_DETAIL(initialPlace.id)`
- `GET ENDPOINTS.PLACE_RATING(place.id)`
- `GET ENDPOINTS.PLACE_REVIEWS(place.id)`
- `GET ENDPOINTS.PLACES_NEARBY_CONTEXT`
  - Params: `lat`, `lng`, `radius=200`, `limit=5`
- Intervalo de nearby context cada 20s si hay usuario y place id.
- Mutaciones existentes:
  - `POST ENDPOINTS.PLACE_CHECKIN(place.id)`
  - `PATCH ENDPOINTS.VISIT_CONFIRM(pendingVisitId)`
  - `POST ENDPOINTS.PLACE_REVIEWS(place.id)`
  - `POST ENDPOINTS.PLACE_FEEDBACK(place.id)`
  - favoritos por `POST`/`DELETE`

Restriccion:

- La deduplicacion de fase posterior no debe aplicarse globalmente a mutaciones.

### Dashboard

Origen: `src/screens/AgencyDashboardScreen.jsx`.

Requests esperados:

- `GET ENDPOINTS.AGENCY_MY`
- `GET ENDPOINTS.AGENCY_DASHBOARD`
  - Params: `email`, `agencyId`, `from`, `to`
- Fallback si no hay paquetes:
  - `GET ENDPOINTS.AGENCY_PACKAGES(agency.id)`
- Conteos por agencia:
  - Para cada agencia y estado activo (`requested`, `contacted`, `awaiting_payment`):
  - `GET ENDPOINTS.AGENCY_SCOPED_RESERVATIONS(agencyId)` o endpoint equivalente via service
  - Params: `status`, `page=0`, `size=50`

Riesgos observados:

- Conteos escalan con `agencias * estados`.
- Cambio rapido de agencia puede dejar respuestas viejas.

### Reservas

Origen: `src/screens/MyReservationsScreen.jsx` y `src/screens/AgencyReservationsScreen.jsx`.

Requests esperados usuario:

- `GET ENDPOINTS.RESERVATIONS_ME`
  - Params: `page=0`, `size=20`
- Al abrir detalle:
  - `GET ENDPOINTS.RESERVATION_DETAIL(id)`
  - `GET ENDPOINTS.RESERVATION_MESSAGES(id)`
- Acciones:
  - `PATCH ENDPOINTS.RESERVATION_DETAIL(id)`
  - `DELETE ENDPOINTS.RESERVATION_DETAIL(id)`
  - `POST ENDPOINTS.RESERVATION_MESSAGES(id)`
  - `POST ENDPOINTS.RESERVATION_PAYMENT_CHECKOUT(id)`
  - `GET ENDPOINTS.RESERVATION_PAYMENT_STATUS(id)`

Requests esperados agencia:

- `GET ENDPOINTS.AGENCY_RESERVATIONS` o `GET ENDPOINTS.AGENCY_SCOPED_RESERVATIONS(agencyId)`
  - Params: `status`, `page=0`, `size=20`
- Al abrir detalle:
  - `GET` detalle de reserva de agencia.
  - `GET` mensajes de reserva de agencia.
- Acciones:
  - `PATCH` estado.
  - `POST` mensaje.

Restriccion:

- Mutaciones de reserva/mensaje/estado no deben deduplicarse globalmente.
- Deben protegerse por loading/disabled y refrescar solo datos afectados en fases posteriores.

## Matriz inicial de invalidacion de cache

- Filtros: invalidar claves de busqueda, catalogo filtrado y nearby cuando cambien `query`, `categoryId` o radio.
- Coordenadas: invalidar nearby y nearby context cuando cambie la coordenada efectiva.
- Usuario/cambio de cuenta: invalidar notificaciones, nearby context, reservas, dashboard, agencias propias y cualquier scope con email.
- Mutaciones de reserva: invalidar lista/detalle/mensajes de reservas y notificaciones relacionadas.
- Mutaciones de paquete/agencia: invalidar paquetes, agencias, dashboard y rutas dependientes.
- Favoritos/reviews/feedback/visitas: invalidar detalle, reviews/rating, favoritos y nearby context cuando aplique.

## Checklist manual base

- Home:
  - Abrir sin sesion.
  - Abrir con sesion.
  - Pull-to-refresh.
  - Ver catalogo, top, mejores valorados, paquetes y agencias.
- Busqueda/filtros:
  - Buscar por texto.
  - Aplicar categoria.
  - Cambiar radio.
  - Limpiar filtro de agencia.
- Nearby/mapa:
  - Permitir ubicacion.
  - Denegar ubicacion.
  - Aumentar radio.
  - Recargar nearby.
  - Bloquear/desbloquear gesto de mapa.
  - Abrir detalle desde nearby.
- MapScreen:
  - Abrir mapa general.
  - Abrir mapa con lugar seleccionado.
  - Cambiar filtros `nearby`, `selected` y `all`.
- Paquetes/agencias:
  - Buscar agencia.
  - Cargar mas agencias.
  - Filtrar paquetes por agencia.
  - Cargar mas paquetes.
  - Abrir detalle de paquete.
  - Abrir modal de agencia.
- Reservas:
  - Abrir modal de reserva.
  - Validar usuario no autenticado.
  - Validar correo no verificado.
  - Enviar reserva autenticada.
  - Abrir Mis reservas.
  - Abrir detalle y mensajes.
- Dashboard:
  - Abrir dashboard con una agencia.
  - Abrir dashboard con varias agencias.
  - Cambiar agencia activa.
  - Pull-to-refresh.
  - Abrir solicitudes de reserva.
- Notificaciones:
  - Abrir panel.
  - Refrescar notificaciones.
  - Marcar una como leida.
  - Marcar todas como leidas.
  - Abrir reservas desde notificacion.
- Login/logout:
  - Iniciar sesion.
  - Cerrar sesion.
  - Cambiar cuenta guardada si aplica.
  - Verificar que datos scoped por usuario no se mezclan.

## Guardrails para fases posteriores

- No cambiar endpoints ni parametros existentes sin una propuesta separada.
- No cambiar nombres de pantallas ni parametros de navegacion.
- No deduplicar globalmente `POST`, `PATCH` ni `DELETE`.
- No activar instrumentation por defecto.
- No dejar logs permanentes en produccion.
- Mantener cache en memoria acotada y con invalidacion por filtros, coordenadas, usuario, mutaciones y cambio de cuenta.

## Nota de ejecucion tarea 3

Fecha: posterior a tareas 1 y 2.

Cambios aplicados:

- `useHomeData` usa request keys estables y deduper en memoria para cargas `GET` de Home.
- La deduplicacion se aplico solo a lecturas:
  - `loadAll`
  - `loadTopPlaces`
  - `loadBestRatedPlaces`
  - `loadPackages`
  - `loadAgencies`
  - `loadCategories`
  - `loadNearby`
  - `loadNearbyContext`
  - `performSearch`
- No se deduplicaron mutaciones `POST`, `PATCH` ni `DELETE`.
- `loadAll(0)` alimenta `popular` con los mismos datos del catalogo inicial.
- `loadPopular()` queda como fallback cuando el catalogo inicial no entrega datos.
- `handleRefresh()` ahora coordina cargas con `Promise.allSettled`.
- `loadNearby()` reutiliza cache existente por coordenadas/categoria/radio y usa request key con coordenadas redondeadas solo para deduplicacion.
- `performSearch()` evita disparar nearby si ya hay cache valida o una request nearby equivalente en vuelo.
- La ubicacion en Home se reutiliza durante una rafaga corta mediante cache en memoria de 15 segundos.

Hallazgos esperados antes/despues:

- Home mount: se evita la llamada duplicada innecesaria a popular cuando `loadAll(0)` ya trae datos.
- Pull-to-refresh: rafagas equivalentes reutilizan requests en vuelo por key.
- Busqueda/filtros: la busqueda reutiliza request equivalente en vuelo y evita doble nearby cuando corresponde.
- Nearby: requests equivalentes por coordenadas redondeadas, radio y categoria se reutilizan mientras estan en vuelo.
- Paquetes/agencias: requests equivalentes de paginacion se reutilizan; si una llamada append esta duplicada, no aplica el append dos veces.
- Categorias: requests equivalentes se reutilizan mientras estan en vuelo.

Validacion ejecutada:

- `npm test -- --runInBand`
- Resultado: 3 suites passing, 72 tests passing.

Limitaciones:

- No se hizo medicion runtime con la app abierta en dispositivo/emulador durante esta fase.
- La instrumentation dev-only ya puede contar requests reales si se activa con `EXPO_PUBLIC_PERF_INSTRUMENTATION=true`, pero permanece desactivada por defecto.

## Nota de ejecucion tareas 4 y 5

Fecha: posterior a tarea 3.

Renders y props estabilizados:

- `HomeScreen` memoiza `searchSuggestions`, `placesById`, `nearbyDisplayPlace`, footer del catalogo, render de catalogo y render de paquetes.
- `HomeHeader`, `NearbyMapBlock`, catalogo, paquetes, `SidePanel` y modales principales reciben handlers estables en lugar de callbacks inline evitables.
- `NearbyMapBlock` usa `renderItem` y `keyExtractor` estables para el carrusel nearby, con `initialNumToRender`, `maxToRenderPerBatch`, `windowSize` y `removeClippedSubviews` solo en Android.
- El catalogo horizontal usa `renderItem` y `keyExtractor` estables, mas configuracion de render inicial y ventana.
- `PackageCard` y `PackageDetailModal` comparten `getPackagePresentation()` para derivar includes, city tags, route places, imagen, gradiente y descripcion.
- `PackageDetailModal` retorna `null` cuando `visible=false` o no hay paquete, antes de montar el contenido con calculos pesados.
- La lista de paquetes se mantuvo como lista pequena/paginada dentro del `ScrollView` principal para evitar una `FlatList` vertical anidada con la misma orientacion. La estabilizacion se hizo con `PackageListItem` memoizado y `placesById`; una conversion estructural a lista virtualizada principal queda para una fase separada si el volumen crece.

Validacion ejecutada:

- `npm test -- --runInBand`
- Resultado: 4 suites passing, 76 tests passing.

Limitaciones:

- No se hizo medicion runtime con la app abierta en dispositivo/emulador durante esta fase.
- No se tocaron endpoints, navegacion, `api.js`, dashboard, reservas, notificaciones ni `WebViewMap`.

## Nota de ejecucion tarea 6

Fecha: posterior a tareas 4 y 5.

Mapa optimizado:

- `NearbyMapBlock` memoiza `userLocation`, `initialRegion`, `markers` y `circleRadius` antes de pasarlos a `WebViewMap`.
- `WebViewMap` mueve `calculateZoomLevel` fuera del componente y memoiza el HTML/source del WebView por region inicial efectiva.
- `WebViewMap` usa firmas estables para `markers`, `userLocation` y `circle`; si la firma ya fue enviada o esta en cola, no repite `postMessage`.
- `WebViewMap` conserva `pauseUpdates`; si el panel o un modal pausan el mapa, no marca la firma como enviada y reintenta con los datos vigentes al reanudarse.
- `MapScreen` memoiza `filteredPlaces`, `mapRegion` y `markers`, y protege `fetchPlaces()` con request key y deduper en vuelo usando los helpers existentes.
- No se cambio Leaflet, OpenStreetMap, URLs de tiles, endpoints, navegacion ni parametros de pantalla.

Validacion ejecutada:

- Sintaxis JSX validada con Babel parser para `WebViewMap`, `NearbyMapBlock` y `MapScreen`.
- `npm test -- --runInBand`
  - Resultado: 4 suites passing, 76 tests passing.
- `git diff --check`
  - Resultado: sin errores.

Limitaciones:

- No se hizo medicion runtime con la app abierta en dispositivo/emulador durante esta fase.
- La verificacion de no reinicializacion del mapa se hizo por estabilidad de props/source: abrir/cerrar paneles o modales cambia `pauseUpdates`, pero no cambia `mapHTML` si la region efectiva permanece igual.

## Nota de ejecucion tarea 7

Fecha: posterior a tarea 6.

Requests deduplicadas:

- Notificaciones: `loadNotifications` reutiliza requests GET equivalentes por `ENDPOINTS.NOTIFICATIONS`, params y `accountKey`; se conserva el stream y el polling fallback actual.
- Dashboard de agencia: `loadData`, `loadAgencyDashboard`, fallback de paquetes por agencia y conteos por estado/agencia usan request keys estables y deduper en vuelo.
- Reservas de usuario: lista, detalle y mensajes se deduplican por endpoint, params y scope de pantalla.
- Reservas de agencia: lista por filtro/agencia, detalle y mensajes se deduplican por endpoint, params y `agencyId`.

Invalidaciones aplicadas:

- Notificaciones invalida requests en vuelo locales al marcar una o todas como leidas para que respuestas antiguas no sobrescriban la UI optimista.
- Dashboard usa secuencias por carga general, dashboard activo y conteos; una respuesta vieja no reemplaza la agencia activa ni sus metricas.
- Reservas limpian solo keys afectadas tras mutaciones: lista, detalle y mensajes de la reserva tocada cuando aplica.
- Despues de editar, eliminar, iniciar pago, enviar mensaje o cambiar estado, se actualiza la reserva afectada y se evita recargar flujos no relacionados.
- Los errores parciales no vacian mensajes, listas ni dashboard previamente visibles.

Validacion ejecutada:

- Parseo JSX de `useNotifications`, `AgencyDashboardScreen`, `MyReservationsScreen` y `AgencyReservationsScreen`.
- `npm test -- --runInBand`
  - Resultado: 4 suites passing, 76 tests passing.

Limitaciones:

- No se hizo validacion runtime en dispositivo/emulador durante esta fase.
- Queda pendiente revisar manualmente: notificaciones, marcar leidas, dashboard de agencia, cambio rapido de agencias, conteos, reservas de usuario, doble apertura de detalle, mensajes, envio de mensaje y cambio de estado desde agencia.
- No se cambiaron endpoints, navegacion, parametros de pantalla, proveedor de datos ni `api.js`.

## Nota de ejecucion tarea 8

Fecha: posterior a tarea 9.

Cache de token:

- `src/services/api.js` mantiene una cache en memoria para el token activo.
- Si la cache esta vacia, `getAuthToken()` lee `AsyncStorage.getItem('token')` una vez y guarda el resultado en memoria.
- Si la cache ya tiene token o ausencia conocida de token, el interceptor evita nuevas lecturas repetidas a `AsyncStorage`.
- El interceptor conserva el header publico `Authorization: Bearer <token>` y no sobreescribe headers `Authorization`/`authorization` explicitos.
- El fallback a `AsyncStorage` se mantiene para arranque de app y compatibilidad con sesiones persistidas.

Sincronizacion:

- `AuthContext.activateSession()` actualiza la cache despues de persistir el token.
- Login TOTP/password precarga la cache con el token recien recibido cuando no esta expirado.
- `loadUser()` sincroniza la cache al restaurar o refrescar una sesion guardada.
- `logout()` limpia la cache junto con el estado local.
- El interceptor de respuesta limpia cache y storage ante `401`, respetando `skipAuthCleanup` en refresh.

Validacion ejecutada:

- Pruebas unitarias nuevas para cache vacia, cache cargada, headers explicitos, limpieza tipo logout y limpieza por `401`.
- Parseo de `api.js`, `AuthContext.js` y `api.test.js`.
- `npm test -- --runInBand`
  - Resultado: 5 suites passing, 81 tests passing.

Limitaciones:

- No se hizo validacion runtime en dispositivo/emulador durante esta fase.
- Queda pendiente revisar manualmente: login, requests autenticadas despues de login, logout, login con otra cuenta, request sin sesion, manejo de 401, Home despues de login/logout, reservas, notificaciones y dashboard despues de login.
- No se cambiaron endpoints, nombres de headers, navegacion, parametros de pantalla ni comportamiento visual.

## Nota de ejecucion tarea 9

Fecha: posterior a tarea 7.

Estados separados:

- Home separa estados de catalogo, nearby, paquetes, agencias y categorias.
- Catalogo muestra loading inicial, empty real, filtro sin resultados y error con retry propio.
- Nearby distingue sin ubicacion, error de backend y sin resultados por radio sin reiniciar el mapa.
- Paquetes y agencias mantienen retry separado para no recargar secciones no afectadas.
- El modal de filtros conserva categorias base si falla el backend y permite reintentar solo categorias.
- MapScreen separa carga inicial, recarga de sitios, error de ubicacion, error de backend, datos vacios y filtro sin resultados.
- AgencyDashboardScreen separa carga inicial, pull-to-refresh, actualizacion de metricas por agencia y error de dashboard.
- MyReservationsScreen y AgencyReservationsScreen separan lista vacia, error de lista, loading de detalle, error de detalle, loading de mensajes y error de mensajes.

Conservacion de datos previos:

- Los errores parciales de catalogo, nearby, paquetes, agencias, mapa, dashboard y reservas no limpian datos visibles ya cargados.
- Las recargas de mensajes muestran spinner/error inline si ya existe conversacion previa.
- Los errores de lista en reservas aparecen como banner cuando ya hay reservas visibles.

Validacion ejecutada:

- Parseo JSX de Home, NearbyMapBlock, FilterModal, MapScreen, Dashboard y Reservas.
- `npm test -- --runInBand`
  - Resultado: 4 suites passing, 76 tests passing.

Limitaciones:

- No se hizo validacion runtime en dispositivo/emulador durante esta fase.
- Queda pendiente revisar manualmente: Home carga inicial, pull-to-refresh, error parcial de paquetes/agencias, filtro sin resultados, nearby sin ubicacion/sin resultados/error, MapScreen con datos/sin datos/error, dashboard primera carga/refresh/cambio de agencia, reservas vacias/detalle/mensajes/error parcial y botones de retry/cargar mas sin doble ejecucion.
- No se cambiaron endpoints, navegacion, parametros de pantalla, contratos de respuesta, `api.js` ni cache de token.

## Nota de validacion final tarea 10

Fecha: cierre de tareas 1 a 9.

Validacion automatizada ejecutada:

- `npm test -- --runInBand`
  - Resultado: 5 suites passing, 81 tests passing.
- `git diff --check`
  - Resultado: sin errores de whitespace.
- `npm run lint`
  - Resultado: comando passing con 0 errores y 50 warnings existentes/no bloqueantes.

Correcciones menores realizadas durante validacion:

- `eslint.config.js` declara globals de Jest solo para archivos de prueba, para que `expo lint` valide tests sin falsos `no-undef`.
- `NearbyPlaceItem`, `CatalogPlaceItem` y `PackageListItem` tienen `displayName` explicito para mantener `React.memo` identificable por lint/devtools.

Confirmaciones de alcance:

- No hay cambios pendientes en `package.json` ni lockfiles; no se agregaron dependencias nuevas.
- No hay cambios pendientes en `src/config/api.config.js`; no se cambiaron endpoints de `ENDPOINTS`.
- No se cambiaron nombres de pantallas, navegacion ni parametros durante esta validacion final.
- No se agregaron optimizaciones nuevas ni refactors funcionales en esta fase.

Validacion runtime pendiente:

- Home carga inicial.
- Pull-to-refresh.
- Busqueda y filtros.
- Nearby y ubicacion.
- Mapa en Home.
- MapScreen.
- Paquetes y `PackageDetailModal`.
- Reservas y mensajes.
- Dashboard de agencia.
- Notificaciones.
- Login/logout/cambio de cuenta.
- Manejo de 401.

Riesgos conocidos:

- Las optimizaciones de render, mapa y deduplicacion ya estan cubiertas por pruebas unitarias y revision estatica, pero requieren validacion en dispositivo/emulador para confirmar conteos reales de requests, gestos del mapa y flujos visuales completos.
- `npm run lint` queda en verde, aunque persisten warnings no bloqueantes fuera del alcance de esta tarea.

## Nota de intento de validacion runtime tarea 10

Fecha: posterior a la validacion final automatizada.

Entorno runtime disponible:

- Dispositivo Android conectado por ADB: `bascaeqo7lu4bmpr`.
- Paquete validado: `com.yeridstick.turismoapp`.
- Version instalada: `1.0.0`.
- Build instalado con flag `DEBUGGABLE`.
- Permisos de ubicacion concedidos para usuario 0: `ACCESS_FINE_LOCATION` y `ACCESS_COARSE_LOCATION`.
- Permiso de notificaciones no concedido: `POST_NOTIFICATIONS`.

Validacion runtime completada:

- Cold start de `MainActivity` con `adb shell am start -W -n com.yeridstick.turismoapp/.MainActivity`.
  - Resultado: `Status: ok`, `LaunchState: COLD`, `TotalTime: 4044ms`.
- Home carga inicial:
  - Resultado: pantalla inicial visible con header, usuario activo, buscador, filtros y seccion `Cerca de ti`.
  - No se observaron crashes ni pantalla en blanco en la captura runtime.
- Nearby y permisos de ubicacion:
  - Resultado: la app arranca con permisos de ubicacion concedidos y muestra el mapa centrado con ubicacion del usuario.
- Mapa en Home:
  - Resultado: `WebViewMap` carga Leaflet/OpenStreetMap correctamente.
  - Logcat por PID muestra:
    - `Mapa OpenStreetMap cargado exitosamente`.
    - `Provider: OpenStreetMap`.
    - `UPDATE_USER_LOCATION`.
    - `UPDATE_CIRCLE`.
    - `UPDATE_MARKERS` con `1` marcador.
  - No se observaron errores JS en los logs filtrados por PID durante el cold start.

Hallazgos runtime:

- Durante cold start el mapa se inicializa primero con la region fallback y luego vuelve a inicializarse cuando llega la ubicacion real. Esto coincide con la logica actual de regenerar HTML cuando cambia la region inicial efectiva; no se pudo validar si abrir/cerrar paneles o modales evita reinicializaciones porque el dispositivo bloquea gestos ADB.
- `uiautomator dump` no logro estado idle en la pantalla de Home, probablemente por animaciones/WebView; la validacion visual se hizo con captura y logs.

Bloqueo para completar flujos interactivos:

- El dispositivo rechaza gestos por ADB:
  - Comando probado: `adb shell input swipe 500 1800 500 900 300`.
  - Resultado: `SecurityException: Injecting input events requires the caller ... to have the INJECT_EVENTS permission`.
- Por esta restriccion no se pudieron validar de forma remota:
  - Pull-to-refresh en Home.
  - Busqueda y filtros.
  - Apertura/cierre de paneles o modales.
  - MapScreen.
  - Paquetes y `PackageDetailModal`.
  - Reservas y mensajes.
  - Dashboard de agencia.
  - Notificaciones.
  - Login, logout y cambio de cuenta.
  - Manejo de sesion expirada o `401`.

Estado de tareas:

- `10.3` queda pendiente porque la revision manual completa de flujos no pudo terminarse sin interaccion.
- `10.4` queda pendiente porque no se pudieron ejecutar flujos interactivos ni activar instrumentation runtime para comparar conteos antes/despues.

Requisito para cerrar runtime completo:

- Usar un emulador/dispositivo que permita `adb shell input`, o habilitar en el dispositivo actual la opcion de desarrollador equivalente a `USB debugging (Security settings)`, o realizar las interacciones fisicamente mientras se capturan logs/capturas.
