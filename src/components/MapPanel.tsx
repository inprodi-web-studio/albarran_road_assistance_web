import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { googleMapsUrl } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

type MapPoint = {
  label: string;
  latitude: number;
  longitude: number;
};

type MapPanelProps = {
  points: MapPoint[];
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

export const MapPanel = ({ points }: MapPanelProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const mapRef = useRef<HTMLDivElement | null>(null);
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
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: firstPoint.latitude, lng: firstPoint.longitude },
          zoom: validPoints.length > 1 ? 13 : 16,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });
        const bounds = new window.google.maps.LatLngBounds();

        validPoints.forEach((point, index) => {
          const position = {
            lat: point.latitude,
            lng: point.longitude,
          };

          bounds.extend(position);
          new window.google.maps.Marker({
            map,
            position,
            label: String(index + 1),
            title: point.label,
          });
        });

        if (validPoints.length > 1) {
          new window.google.maps.Polyline({
            map,
            path: validPoints.map((point) => ({
              lat: point.latitude,
              lng: point.longitude,
            })),
            strokeColor: "#0f766e",
            strokeOpacity: 0.9,
            strokeWeight: 4,
          });
          map.fitBounds(bounds, 64);
        }
      })
      .catch(() => setMapError(true));

    return () => {
      cancelled = true;
    };
  }, [apiKey, validPoints]);

  if (!apiKey || mapError || validPoints.length === 0) {
    return (
      <div className="grid min-h-80 gap-3 rounded-lg border bg-muted/40 p-4">
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

  return <div className="h-80 rounded-lg border" ref={mapRef} />;
};
