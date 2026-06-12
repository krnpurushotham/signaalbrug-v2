/* SignaalBrug v2 — Leaflet map view (shared by portal + staff).
   F3 rendering checks: leaflet CSS imported (a), explicit container height (b),
   circle markers so no icon assets 404 on Pages (c), invalidateSize via
   ResizeObserver for hidden-tab mounts (d). */
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TYPE_META = {
  application_centre: { color: "#7a1f24", label: "Application centre" },
  reception: { color: "#1f4e79", label: "COA reception" },
  municipal: { color: "#8a5a14", label: "Municipal reception" },
  vwn_consultation: { color: "#1d6b2a", label: "VWN consultation point" },
};

export function MapView({ locations, height = 520, fly }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: true, tap: true }).setView([52.2, 5.3], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors", maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(ref.current);
    setTimeout(() => map.invalidateSize(), 60);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    locations.forEach((loc) => {
      const meta = TYPE_META[loc.type] || { color: "#444", label: loc.type };
      L.circleMarker([loc.lat, loc.lng], {
        radius: 9, color: "#ffffff", weight: 2.5, fillColor: meta.color, fillOpacity: 0.95,
      }).addTo(layer).bindPopup(
        '<strong style="font-size:14px">' + loc.name + "</strong><br>" +
        '<span style="color:#555">' + meta.label + "</span><br>" +
        '<span style="font-size:12.5px">' + (loc.note || "") + "</span>" +
        '<div style="font-size:11px;color:#999;margin-top:4px">Illustrative sample location</div>'
      );
    });
    if (fly && locations.length) {
      const b = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
      map.fitBounds(b.pad(0.25));
    }
  }, [locations, fly]);

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="map-box" style={{ height }} ref={ref}></div>
      <div className="row-wrap">
        {Object.entries(TYPE_META).map(([k, m]) => (
          <span className="chip" key={k}><span className="dot" style={{ background: m.color }}></span>{m.label}</span>
        ))}
        <span className="hint" style={{ marginLeft: "auto" }}>Sample locations for demo purposes</span>
      </div>
    </div>
  );
}
