# Requirements

## R1. Compatibilidad funcional

La optimizacion debe preservar el comportamiento funcional actual.

Acceptance criteria:

- No se cambian nombres de pantallas, parametros de navegacion ni endpoints de `ENDPOINTS`.
- Las pantallas Home, detalle de lugar, mapa, reservas, dashboard, gestion de lugares, gestion de paquetes y admin conservan sus acciones visibles.
- La app sigue aceptando las variantes de respuesta actuales: arreglo plano, `{ data: [] }`, `{ content: [] }` e `items` donde ya se soportan.

## R2. Deduplicacion de requests

Las cargas de datos deben evitar solicitudes simultaneas equivalentes.

Acceptance criteria:

- Existe una estrategia local de request key basada en endpoint, metodo y params normalizados.
- Si una peticion equivalente esta en vuelo, el segundo consumidor reutiliza la promesa o se ignora de forma segura segun el caso.
- La deduplicacion cubre, como minimo, Home data, nearby, paquetes, agencias, notificaciones, dashboard y detalle/mensajes de reservas.
- Las mutaciones (`POST`, `PATCH`, `DELETE`) no se deduplican salvo acciones idempotentes ya protegidas por loading/disabled.

## R3. Carga de datos en Home por seccion

Home debe cargar y refrescar datos sin bloquear toda la pantalla por una sola seccion.

Acceptance criteria:

- Catalogo, nearby, top places, best rated, paquetes, agencias, categorias y nearby context tienen estado de loading/error separado.
- `handleRefresh()` no dispara llamadas duplicadas a `PLACES_SEARCH` cuando puede reutilizar datos ya obtenidos en la misma rafaga.
- `loadPopular()` no repite el mismo catalogo inicial si `loadAll(0)` ya entrego datos equivalentes para la vista actual.
- Un fallo en paquetes o agencias no borra catalogo/nearby/top places ya visibles.

## R4. Ubicacion y nearby

Las operaciones basadas en ubicacion deben reutilizar coordenadas recientes y respetar cambios reales.

Acceptance criteria:

- `ensureLocation()` no solicita ubicacion repetidamente dentro de una misma rafaga si ya existe una coordenada valida reciente.
- `loadNearby()` conserva su cache por coordenadas, categoria y radio, y agrega guard para requests en vuelo con la misma clave.
- `performSearch()` no debe disparar una segunda llamada nearby si la clave nearby ya fue cubierta por la busqueda o por una llamada en vuelo.
- Cambios de categoria, radio o coordenadas invalidan solo la parte afectada.

## R5. Listas y cards

Las listas y cards deben tener props estables y calculos derivados memoizados.

Acceptance criteria:

- `renderItem`, `keyExtractor`, handlers de press y `ListFooterComponent` relevantes se memoizan donde se pasen a `FlatList`.
- `PackageCard` no reconstruye un lookup de todos los lugares por cada card en cada render.
- Los datos derivados de paquetes (includes, ciudades, rutas, imagen, gradiente, descripcion) se calculan con `useMemo` o helpers puros.
- Las listas que pueden crecer por paginacion usan `FlatList` o configuracion equivalente en lugar de `map` dentro de `ScrollView`, salvo listas deliberadamente pequenas.
- Los componentes memoizados no reciben callbacks inline evitables desde Home.

## R6. Modales

Los modales deben evitar trabajo pesado cuando no estan visibles.

Acceptance criteria:

- Modales con contenido pesado retornan `null` cuando `visible=false`, incluso si conservan data seleccionada por flujo.
- `PackageDetailModal` reutiliza la misma derivacion de rutas que `PackageCard` o recibe datos precomputados.
- Cerrar modal no debe borrar datos que otro flujo necesita, pero tampoco debe dejar calculos activos fuera de pantalla.
- Form state de reservas, verificacion y filtros conserva el comportamiento actual.

## R7. Mapa y WebView

El mapa debe minimizar reinicializaciones de WebView y actualizaciones innecesarias.

Acceptance criteria:

- `WebViewMap` memoiza el HTML base y solo lo regenera cuando cambia la region inicial efectiva.
- Markers, user location y circle updates usan props estables o firmas comparables para evitar `postMessage` repetidos.
- `NearbyMapBlock` memoiza markers y region antes de pasarlos al mapa.
- `MapScreen` memoiza lugares filtrados, region y markers.
- No se cambia el proveedor actual de Leaflet/OpenStreetMap ni la URL de tiles como parte de este cambio.

## R8. Separacion de logica pesada

La logica de normalizacion, derivacion y lookup debe vivir fuera de componentes visuales cuando se reutilice o sea costosa.

Acceptance criteria:

- Se extraen helpers puros para derivar rutas de paquetes, normalizar respuestas y construir keys de request cuando aplique.
- Los helpers tienen pruebas unitarias cuando cubren contratos de datos no triviales.
- Los componentes visuales quedan enfocados en render y reciben datos ya preparados donde sea razonable.

## R9. Loading, error y empty state

Los estados de UI deben ser informativos, especificos y no destructivos.

Acceptance criteria:

- Cada seccion con request propio tiene loading/error/empty state especifico.
- Los retry buttons invocan solo la carga de la seccion correspondiente cuando sea posible.
- Si una recarga falla, la UI puede conservar datos anteriores y mostrar un error discreto.
- Los estados vacios distinguen entre "sin datos", "filtro sin resultados" y "error de backend" donde ya existe informacion suficiente.

## R10. Validacion

Cada tarea debe poder verificarse sin depender de cambios de backend.

Acceptance criteria:

- Las pruebas existentes siguen pasando.
- Se agregan pruebas unitarias para helpers nuevos de requests y derivacion de paquetes/mapa.
- Se documenta una checklist manual para Home, filtros, nearby, mapa, paquete, reserva, dashboard y reservas.
- Se puede inspeccionar en logs de desarrollo que una interaccion no dispara requests duplicadas equivalentes.
