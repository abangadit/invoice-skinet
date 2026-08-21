"use client";

import { useState, useCallback } from "react";

interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeofenceState {
  userLocation: GeolocationCoords | null;
  distance: number | null; // distance in meters
  inRange: boolean;
  error: string | null;
  loading: boolean;
}

// Haversine formula to calculate distance in meters between two points
export function getHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

export function useGeofence() {
  const [state, setState] = useState<GeofenceState>({
    userLocation: null,
    distance: null,
    inRange: false,
    error: null,
    loading: false,
  });

  const checkLocation = useCallback(
    (targetLat: number | null, targetLon: number | null, radiusMeters: number = 100) => {
      if (!navigator.geolocation) {
        setState((prev) => ({
          ...prev,
          error: "Geolokasi tidak didukung oleh browser Anda.",
          loading: false,
        }));
        return;
      }

      if (targetLat === null || targetLon === null) {
        setState((prev) => ({
          ...prev,
          error: "Koordinat target kantor belum dikonfigurasi.",
          loading: false,
        }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          const distance = getHaversineDistanceMeters(
            latitude,
            longitude,
            targetLat,
            targetLon
          );

          setState({
            userLocation: { latitude, longitude, accuracy },
            distance,
            inRange: distance <= radiusMeters,
            error: null,
            loading: false,
          });
        },
        (error) => {
          let errorMsg = "Gagal mendapatkan lokasi GPS.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = "Izin akses lokasi GPS ditolak oleh pengguna.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "Informasi lokasi GPS tidak tersedia.";
              break;
            case error.TIMEOUT:
              errorMsg = "Waktu permintaan lokasi GPS habis.";
              break;
          }
          setState((prev) => ({
            ...prev,
            error: errorMsg,
            loading: false,
          }));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    },
    []
  );

  return {
    ...state,
    checkLocation,
  };
}
