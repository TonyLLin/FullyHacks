import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";;

function MapController({ polyline }) {
  const map = useMap();
  if (polyline.length > 1) {
    map.fitBounds(polyline, { padding: [40, 40] });
  }
  return null;
}

function Map({ polyline, waypoints }) {
  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <MapController polyline={polyline} />
      {polyline.length > 0 && <Polyline positions={polyline} color="#f5a623" weight={3} />}
      {waypoints.map((pos, i) => <Marker key={i} position={pos} />)}
    </MapContainer>
  );
}

export default Map;