# Optimizar rendimiento de la app Turismo

Change ID: `improve-app-performance`

## Summary

Planificar una mejora progresiva de rendimiento para la app Expo/React Native sin cambiar endpoints, contratos de navegacion ni funcionalidades visibles. El cambio se enfocara en reducir renderizados innecesarios, estabilizar props de listas/cards/modales, deduplicar llamadas al backend y mejorar los estados de carga, error y vacio por seccion.

## Contexto revisado

La app actual usa Expo 54, React 19, React Native 0.81, Axios, React Navigation y componentes propios. La mayor superficie de rendimiento esta en:

- `src/screens/HomeScreen/index.js`: pantalla principal con `ScrollView`, listas horizontales, paquetes, agencias, modales, panel lateral, notificaciones y mapa.
- `src/screens/HomeScreen/hooks/useHomeData.js`: carga inicial con varias llamadas paralelas, filtros, paginacion, busqueda, nearby, agencias y paquetes.
- `src/components/WebViewMap.jsx`: WebView con Leaflet/OpenStreetMap, HTML generado dentro del render y actualizaciones por `postMessage`.
- `src/screens/HomeScreen/components/PackageCard.jsx` y `PackageDetailModal.jsx`: calculos de rutas, imagenes, gradientes, includes y lookup de lugares por item/modal.
- `src/screens/HomeScreen/components/NearbyMapBlock.jsx`: markers derivados y callbacks de cards dentro de una lista horizontal.
- `src/screens/MapScreen.jsx`: carga `PLACES_SEARCH` con `size: 1000`, recalcula filtros, region y markers durante render.
- `src/screens/PlaceDetailScreen.jsx`: detalle, reviews/rating, nearby context, intervalo de ubicacion cada 20s y flujos de visita.
- `src/screens/AgencyDashboardScreen.jsx`: conteos de reservas con multiples llamadas por agencia y fallback de paquetes.
- `src/screens/MyReservationsScreen.jsx` y `src/screens/AgencyReservationsScreen.jsx`: detalle + mensajes + recargas despues de acciones.
- `src/services/api.js`: interceptor lee token de `AsyncStorage` en cada request.

## Problemas observados

- `useHomeData.handleRefresh()` dispara hasta nueve operaciones en paralelo. Algunas consultan el mismo dominio de datos, por ejemplo catalogo y popular usan `PLACES_SEARCH`, y `loadTopPlaces()` puede caer a otro `PLACES_SEARCH`.
- `performSearch()` consulta lugares y luego llama `loadNearby()`, que puede volver a pedir ubicacion y consultar `PLACES_SEARCH` para una clave muy cercana al mismo filtro.
- Varias funciones de carga no tienen guard central por `endpoint + params`, por lo que doble toque, refresh, cambio de filtro o re-render pueden duplicar peticiones mientras una igual sigue en vuelo.
- `HomeScreen` pasa callbacks inline a componentes memoizados (`NearbyMapBlock`, `PlaceCard`, `PackageCard`, `SidePanel`, modales), reduciendo el beneficio de `React.memo`.
- `PackageCard` crea un `Map` de lugares y resuelve rutas dentro de cada render de cada card.
- `PackageDetailModal` puede conservar `pkg` cuando `visible=false`, por lo que todavia puede calcular lookup/rutas y armar contenido fuera de pantalla.
- `NearbyMapBlock` reconstruye markers y render callbacks de `FlatList` en cada render.
- `WebViewMap` genera un HTML grande dentro del render y recibe arrays nuevos de markers desde Home/Map.
- `MapScreen` recalcula distancias, lugares filtrados, region y markers en render.
- `AgencyDashboardScreen` consulta tres estados de reservas por cada agencia para calcular badges; esto escala linealmente con agencias y se repite en refresh.
- Hay loading globales que pueden bloquear secciones ya listas; los estados de error/vacio existen, pero no siempre estan separados por flujo o reutilizan datos previos.

## Goals

- Reducir renderizados innecesarios en Home, mapa, cards, modales, dashboard y reservas.
- Evitar llamadas duplicadas al backend por request key, refresh repetido, filtros y acciones de detalle.
- Mantener todos los endpoints actuales y las estructuras de respuesta soportadas.
- Mantener navegacion, props publicas, modales y funcionalidades existentes.
- Separar calculos pesados de componentes visuales en helpers/hooks pequenos y testeables.
- Mejorar loading, error y empty state por seccion, sin bloquear toda la pantalla cuando solo falla una parte.
- Entregar tareas pequenas, progresivas y verificables.

## Non-goals

- No agregar librerias nuevas salvo justificacion posterior con evidencia.
- No cambiar rutas de API ni contratos del backend.
- No eliminar funcionalidades, modales, filtros, mapas, AR, reservas, visitas, reviews ni notificaciones.
- No hacer una migracion grande de arquitectura o reemplazo de navegacion.
- No reescribir HomeScreen completo en una sola tarea.
- No introducir cache persistente de datos de negocio en esta fase.

## Constraints

- Usar herramientas existentes: `React.memo`, `useMemo`, `useCallback`, `useRef`, `FlatList`, helpers puros, Axios existente y estado local.
- Mantener compatibilidad con Android/iOS y comportamiento web actual donde el mapa no esta disponible.
- Mantener paginacion y tamanos de respuesta existentes salvo ajuste explicitamente validado.
- El cache propuesto debe ser en memoria, acotado por clave y con invalidacion clara por accion de usuario o cambio de cuenta/filtro.

## Success Criteria

- No hay peticiones duplicadas para la misma clave durante una misma interaccion mientras la primera sigue en vuelo.
- Home mantiene render estable al abrir/cerrar modales, mover paneles o escribir en busqueda.
- Cards y modales pesados no recalculan rutas/lookups cuando sus datos visibles no cambian.
- El WebView del mapa no se reinicializa por cambios de props que solo deberian actualizar markers/circulo/ubicacion.
- Las secciones de Home pueden mostrar loading/error/empty independiente sin borrar datos utiles de otras secciones.
- `npm test` y validaciones manuales principales siguen pasando.
