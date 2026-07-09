# Tasks

## 1. Baseline y guardrails

- [x] 1.1 Registrar mapa actual de requests por flujo: Home mount, pull-to-refresh, busqueda, filtros, nearby, paquetes/agencias, MapScreen, PlaceDetail, dashboard y reservas.
- [x] 1.2 Agregar instrumentation temporal de desarrollo para contar requests por key y renders de componentes criticos, sin dejar ruido permanente en produccion.
- [x] 1.3 Confirmar pruebas existentes con `npm test`.
- [x] 1.4 Documentar checklist manual base antes de tocar comportamiento.

## 2. Helpers de datos y requests

- [x] 2.1 Crear helper puro para serializar params y construir request keys estables.
- [x] 2.2 Crear helper/hook ligero para deduplicar requests en vuelo.
- [x] 2.3 Agregar pruebas unitarias para serializacion de keys y limpieza de requests en vuelo.
- [x] 2.4 Extraer helpers comunes para leer arrays desde respuestas (`data`, `content`, `items`, arreglo plano).

## 3. Home data sin duplicados

- [x] 3.1 Aplicar deduplicacion a `loadAll`, `loadTopPlaces`, `loadBestRatedPlaces`, `loadPackages`, `loadAgencies`, `loadCategories`, `loadNearby` y `loadNearbyContext`.
- [x] 3.2 Reutilizar `loadAll(0)` para poblar `popular` cuando aplique, dejando `loadPopular` como fallback aislado.
- [x] 3.3 Cambiar `handleRefresh` a coordinacion por seccion con `Promise.allSettled` y sin borrar datos validos por errores parciales.
- [x] 3.4 Evitar doble request de nearby desde `performSearch` cuando haya cache o request equivalente en vuelo.
- [x] 3.5 Verificar que filtros, busqueda, carga mas y pull-to-refresh no duplican endpoints equivalentes.

## 4. Home render y props estables

- [x] 4.1 Memoizar `searchSuggestions`, footers de listas y handlers principales en `HomeScreen`.
- [x] 4.2 Crear `placesById` memoizado y pasarlo donde se resuelven rutas de paquetes.
- [x] 4.3 Reemplazar callbacks inline evitables en `NearbyMapBlock`, catalogo, paquetes, `SidePanel` y modales.
- [x] 4.4 Confirmar que `React.memo` evita renders de cards/modales cuando sus datos no cambian.

## 5. Cards, listas y modales

- [x] 5.1 Extraer helper de presentacion de paquete usado por `PackageCard` y `PackageDetailModal`.
- [x] 5.2 Mover derivaciones de includes, city tags, route places, imagen y gradiente a `useMemo` o helper puro.
- [x] 5.3 Hacer que `PackageDetailModal` retorne `null` cuando `visible=false` antes de calcular contenido pesado.
- [x] 5.4 Convertir la lista creciente de paquetes en Home a `FlatList` o agregar una tarea previa de limite/configuracion si se decide mantenerla pequena.
- [x] 5.5 Ajustar `FlatList` de nearby/catalogo con `renderItem`, `keyExtractor`, `initialNumToRender`, `windowSize` y `removeClippedSubviews` donde sea seguro.

## 6. Mapa

- [x] 6.1 Memoizar markers, user location e initial region en `NearbyMapBlock`.
- [x] 6.2 Memoizar `mapHTML` en `WebViewMap` y mover `calculateZoomLevel` fuera del render.
- [x] 6.3 Evitar `postMessage` repetidos con firmas estables de markers, userLocation y circle.
- [x] 6.4 Memoizar `filteredPlaces`, `mapRegion` y `markers` en `MapScreen`.
- [x] 6.5 Verificar que el mapa no se reinicializa al abrir/cerrar paneles, modales o cambiar estados no relacionados.

## 7. Dashboard, reservas y notificaciones

- [ ] 7.1 Deduplicar `loadNotifications` y conservar fallback de polling/stream actual.
- [ ] 7.2 Deduplicar `AgencyDashboardScreen.loadData`, `loadAgencyDashboard` y conteos por agencia.
- [ ] 7.3 Evitar respuestas obsoletas al cambiar rapido de agencia.
- [ ] 7.4 Deduplicar apertura de detalle y mensajes en `MyReservationsScreen` y `AgencyReservationsScreen`.
- [ ] 7.5 Tras mutaciones de reserva/mensaje/estado, refrescar solo datos afectados y conservar UI previa mientras carga.

## 8. Servicio API y token

- [ ] 8.1 Disenar cache en memoria del token con fallback a `AsyncStorage`.
- [ ] 8.2 Sincronizar cache con login, logout, cambio de cuenta y limpieza 401.
- [ ] 8.3 Validar login, logout, cambio de cuenta y requests autenticadas antes de dejar esta mejora activa.

## 9. Loading, error y empty state

- [ ] 9.1 Revisar estados por seccion en Home y separar retry por catalogo, nearby, paquetes y agencias.
- [ ] 9.2 Mantener datos previos visibles cuando una recarga parcial falla.
- [ ] 9.3 Ajustar estados de MapScreen, Dashboard y Reservas para diferenciar loading inicial, refresh, detalle y empty.
- [ ] 9.4 Verificar textos y disabled states en botones de retry/carga mas para evitar doble toque.

## 10. Validacion final

- [ ] 10.1 Ejecutar `npm test`.
- [ ] 10.2 Ejecutar lint si el proyecto lo permite con `npm run lint`.
- [ ] 10.3 Revisar manualmente los flujos definidos en `design.md`.
- [ ] 10.4 Comparar conteo de requests antes/despues en los flujos criticos.
- [ ] 10.5 Confirmar que no se agregaron dependencias nuevas ni se cambiaron endpoints.
