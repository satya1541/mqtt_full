import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Reading } from '@shared/schema';
import L from 'leaflet';

// Fix for default marker icon in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to handle map view updates
function MapController({ locations }: { locations: { lat: number; lon: number; lastSeen: Date }[] }) {
  const map = useMap();
  const hasCentered = React.useRef(false);

  useEffect(() => {
    if (locations.length > 0 && !hasCentered.current) {
      const activeDevice = locations.reduce((prev, current) =>
        (prev.lastSeen > current.lastSeen) ? prev : current
      );

      map.flyTo([activeDevice.lat, activeDevice.lon], 18, {
        animate: true,
        duration: 1.5
      });

      hasCentered.current = true;
    }
  }, [locations, map]);

  return null;
}

interface WorldMapProps {
  readings: Reading[];
  isLarge?: boolean;
}

const MapInner = ({ center, locations, isLarge = false }: { center: [number, number]; locations: { id: number; lat: number; lon: number; lastSeen: Date }[]; isLarge?: boolean }) => (
  <MapContainer
    center={center}
    zoom={isLarge ? 18 : 17}
    scrollWheelZoom={true}
    zoomControl={false}
    className="w-full h-full z-0"
    style={{ minHeight: '100%', background: '#1e1e1e' }}
  >
    <MapController locations={locations} />
    <TileLayer
      attribution='&copy; Google'
      url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
      subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
    />
    {locations.map(device => (
      <Marker key={device.id} position={[device.lat, device.lon]}>
        <Popup className="glass-popup">
          <div className="p-2 min-w-[150px]">
            <h4 className="font-bold text-sm mb-1">Device #{device.id}</h4>
            <p className="text-xs text-muted-foreground">Status: <span className="text-emerald-500">Active</span></p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {device.lat.toFixed(4)}, {device.lon.toFixed(4)}
            </p>
            <p className="text-[10px] text-muted-foreground italic mt-1">
              Last seen: {device.lastSeen.toLocaleTimeString()}
            </p>
          </div>
        </Popup>
      </Marker>
    ))}
  </MapContainer>
);

export const WorldMap = React.memo(({ readings, isLarge = false }: WorldMapProps) => {
  const deviceLocations = useMemo(() => {
    const locations = new Map<number, { lat?: number; lon?: number; lastSeen: Date }>();

    readings.forEach(r => {
      const type = r.type.toLowerCase();
      if (!locations.has(r.deviceId)) {
        locations.set(r.deviceId, { lastSeen: new Date(0) });
      }

      const loc = locations.get(r.deviceId)!;
      const ts = r.timestamp ? new Date(r.timestamp) : new Date(0);
      if (ts > loc.lastSeen) {
        loc.lastSeen = ts;
      }

      if (type === 'lat' || type === 'latitude') loc.lat = r.value;
      if (type === 'lon' || type === 'long' || type === 'longitude') loc.lon = r.value;
    });

    return Array.from(locations.entries())
      .map(([id, data]) => ({ id, ...data }))
      .filter(d => d.lat !== undefined && d.lon !== undefined) as { id: number; lat: number; lon: number; lastSeen: Date }[];
  }, [readings]);

  const center: [number, number] = deviceLocations.length > 0
    ? [deviceLocations[0].lat, deviceLocations[0].lon]
    : [20, 0];

  return (
    <div
      className="glass-card p-0 rounded-lg h-full flex flex-col relative overflow-hidden"
    >
      <MapInner center={center} locations={deviceLocations} isLarge={isLarge} />
      {deviceLocations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
          <p className="bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
            Waiting for GPS data...
          </p>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // Stabilize the map by only rerendering if the GPS data points actually changed
  if (prev.readings.length !== next.readings.length) return false;

  // Optional: Deep compare lat/lon values if length is same but updates happened
  const prevGps = prev.readings.filter(r => ['lat', 'lon', 'latitude', 'longitude'].includes(r.type.toLowerCase()));
  const nextGps = next.readings.filter(r => ['lat', 'lon', 'latitude', 'longitude'].includes(r.type.toLowerCase()));

  if (prevGps.length !== nextGps.length) return false;
  return prevGps.every((r, i) => r.value === nextGps[i].value && r.type === nextGps[i].type);
});
