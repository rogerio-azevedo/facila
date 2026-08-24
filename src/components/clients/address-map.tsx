"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type AddressMapProps = {
  latitude: number;
  longitude: number;
  flyTarget?: { lat: number; lng: number } | null;
  onMapClick: (coords: { lat: number; lng: number }) => void;
};

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

export function AddressMap({ latitude, longitude, flyTarget, onMapClick }: AddressMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (flyTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyTarget.lng, flyTarget.lat],
        zoom: 16,
        duration: 1200,
      });
    }
  }, [flyTarget]);

  if (!mapboxToken) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Configure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN para exibir o mapa.
      </div>
    );
  }

  return (
    <div className="h-64 overflow-hidden rounded-lg border">
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          latitude,
          longitude,
          zoom: 15,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
        onLoad={() => setMapLoaded(true)}
        onClick={(event) => {
          onMapClick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        }}
      >
        {mapLoaded ? (
          <Marker latitude={latitude} longitude={longitude} anchor="bottom" />
        ) : null}
      </Map>
    </div>
  );
}
