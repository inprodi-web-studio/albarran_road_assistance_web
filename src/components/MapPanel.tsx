import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
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

export const MapPanel = ({
  points,
  className,
  connectPoints = true,
  fullscreenControl = false,
}: MapPanelProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const hasAutoFitRef = useRef(false);
  const hasUserMovedMapRef = useRef(false);
  const isProgrammaticMoveRef = useRef(false);
  const [mapError, setMapError] = useState(false);
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
      .then(() => {
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
          const path = validPoints.map((point) => ({
              lat: point.latitude,
              lng: point.longitude,
          }));

          if (polylineRef.current) {
            polylineRef.current.setPath(path);
          } else {
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
  }, [apiKey, connectPoints, fullscreenControl, validPoints]);

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

  return <div className={cn("h-80 rounded-lg border", className)} ref={mapRef} />;
};
