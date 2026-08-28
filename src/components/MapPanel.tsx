import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, googleMapsUrl } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

export type MapPoint = {
  id?: string;
  label: string;
  latitude: number;
  longitude: number;
  markerColor?: string;
  markerLabel?: string;
};

type MapPanelProps = {
  points: MapPoint[];
  className?: string;
  connectPoints?: boolean;
  fullscreenControl?: boolean;
  routeMode?: "straight" | "driving";
};

type RoutePathPoint = google.maps.LatLngLiteral | google.maps.LatLng;

type RoutesApiResponse = {
  routes?: Array<{
    polyline?: {
      encodedPolyline?: string;
    };
  }>;
};

let googleMapsPromise: Promise<void> | null = null;

const loadGoogleMaps = (apiKey: string) => {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps no cargo."));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

const computeDrivingRoute = async ({
  apiKey,
  destination,
  origin,
}: {
  apiKey: string;
  destination: google.maps.LatLngLiteral;
  origin: google.maps.LatLngLiteral;
}) => {
  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng,
            },
          },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        polylineQuality: "HIGH_QUALITY",
        polylineEncoding: "ENCODED_POLYLINE",
        languageCode: "es-MX",
        units: "METRIC",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Routes API respondio ${response.status}.`);
  }

  const data = (await response.json()) as RoutesApiResponse;
  const encodedPolyline = data.routes?.[0]?.polyline?.encodedPolyline;

  if (!encodedPolyline) {
    throw new Error("Routes API no devolvio una polilinea.");
  }

  const geometryLibrary = (await window.google?.maps.importLibrary(
    "geometry",
  )) as google.maps.GeometryLibrary | undefined;

  if (!geometryLibrary) {
    throw new Error("Google Maps Geometry no esta disponible.");
  }

  return geometryLibrary.encoding.decodePath(encodedPolyline);
};

export const MapPanel = ({
  points,
  className,
  connectPoints = true,
  fullscreenControl = false,
  routeMode = "straight",
}: MapPanelProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const hasAutoFitRef = useRef(false);
  const hasUserMovedMapRef = useRef(false);
  const isProgrammaticMoveRef = useRef(false);
  const routeRequestKeyRef = useRef<string | null>(null);
  const routeRequestGenerationRef = useRef(0);
  const [mapError, setMapError] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const validPoints = useMemo(
    () =>
      points.filter(
        (point) =>
          Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
      ),
    [points],
  );

  useEffect(() => {
    if (!apiKey || validPoints.length === 0 || !mapRef.current) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(async () => {
        if (cancelled || !mapRef.current || !window.google?.maps) {
          return;
        }

        const [firstPoint] = validPoints;
        let map = googleMapRef.current;

        if (!map) {
          map = new window.google.maps.Map(mapRef.current, {
            center: { lat: firstPoint.latitude, lng: firstPoint.longitude },
            zoom: validPoints.length > 1 ? 13 : 16,
            mapTypeControl: false,
            fullscreenControl,
            streetViewControl: false,
          });
          googleMapRef.current = map;

          map.addListener("dragstart", () => {
            hasUserMovedMapRef.current = true;
          });
          map.addListener("zoom_changed", () => {
            if (!isProgrammaticMoveRef.current) {
              hasUserMovedMapRef.current = true;
            }
          });
        }

        const bounds = new window.google.maps.LatLngBounds();
        const activeKeys = new Set<string>();

        validPoints.forEach((point, index) => {
          const key = point.id || point.label;
          const position = {
            lat: point.latitude,
            lng: point.longitude,
          };
          const icon = point.markerColor
            ? {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: point.markerColor,
                fillOpacity: 1,
                scale: 9,
                strokeColor: "#ffffff",
                strokeOpacity: 1,
                strokeWeight: 2,
              }
            : undefined;

          activeKeys.add(key);
          bounds.extend(position);

          const existingMarker = markersRef.current.get(key);

          if (existingMarker) {
            existingMarker.setPosition(position);
            existingMarker.setIcon(icon ?? null);
            existingMarker.setLabel(point.markerLabel || String(index + 1));
            existingMarker.setTitle(point.label);
            return;
          }

          markersRef.current.set(
            key,
            new window.google.maps.Marker({
              map,
              position,
              icon,
              label: point.markerLabel || String(index + 1),
              title: point.label,
            }),
          );
        });

        markersRef.current.forEach((marker, key) => {
          if (!activeKeys.has(key)) {
            marker.setMap(null);
            markersRef.current.delete(key);
          }
        });

        if (connectPoints && validPoints.length > 1) {
          const straightPath = validPoints.map((point) => ({
            lat: point.latitude,
            lng: point.longitude,
          }));

          let path: RoutePathPoint[] | null = straightPath;

          if (routeMode === "driving") {
            const origin = straightPath[0];
            const destination = straightPath[straightPath.length - 1];
            const requestKey = [
              origin.lat.toFixed(6),
              origin.lng.toFixed(6),
              destination.lat.toFixed(6),
              destination.lng.toFixed(6),
            ].join(":");

            if (routeRequestKeyRef.current !== requestKey) {
              routeRequestKeyRef.current = requestKey;
              const requestGeneration = ++routeRequestGenerationRef.current;

              try {
                const routePath = await computeDrivingRoute({
                  apiKey,
                  origin,
                  destination,
                });

                if (
                  cancelled ||
                  requestGeneration !== routeRequestGenerationRef.current
                ) {
                  return;
                }

                path = routePath;
                setRouteError(false);
              } catch (error) {
                if (
                  cancelled ||
                  requestGeneration !== routeRequestGenerationRef.current
                ) {
                  return;
                }

                routeRequestKeyRef.current = null;
                setRouteError(true);
                console.warn("Google Maps no pudo calcular la ruta.", error);
                path = polylineRef.current?.getPath().getArray() ?? null;
              }
            } else if (polylineRef.current) {
              path = polylineRef.current.getPath().getArray();
            } else {
              path = null;
            }
          } else {
            setRouteError(false);
          }

          path?.forEach((point) => bounds.extend(point));

          if (path && polylineRef.current) {
            polylineRef.current.setPath(path);
          } else if (path) {
            polylineRef.current = new window.google.maps.Polyline({
              map,
              path,
              strokeColor: "#0f766e",
              strokeOpacity: 0.9,
              strokeWeight: 4,
            });
          }

          if (!hasAutoFitRef.current && !hasUserMovedMapRef.current) {
            isProgrammaticMoveRef.current = true;
            map.fitBounds(bounds, 64);
            window.setTimeout(() => {
              isProgrammaticMoveRef.current = false;
            }, 0);
            hasAutoFitRef.current = true;
          }
        } else if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }
      })
      .catch(() => setMapError(true));

    return () => {
      cancelled = true;
    };
  }, [apiKey, connectPoints, fullscreenControl, routeMode, validPoints]);

  if (!apiKey || mapError || validPoints.length === 0) {
    return (
      <div className={cn("grid min-h-80 gap-3 rounded-lg border bg-muted/40 p-4", className)}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          Ubicaciones
        </div>
        <div className="grid gap-2">
          {validPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin coordenadas.</p>
          ) : (
            validPoints.map((point) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white p-3"
                key={`${point.label}-${point.latitude}-${point.longitude}`}
              >
                <div>
                  <p className="text-sm font-medium">{point.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={googleMapsUrl(point.latitude, point.longitude)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </a>
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const map = (
    <div className={cn("h-80 rounded-lg border", className)} ref={mapRef} />
  );

  if (routeMode !== "driving") {
    return map;
  }

  return (
    <div className="grid gap-2">
      {map}
      {routeError ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No fue posible calcular la ruta. Mostramos las ubicaciones.</span>
        </div>
      ) : null}
    </div>
  );
};
