interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export async function getFastLocation(options: LocationOptions = {}): Promise<GeolocationPosition> {
  const { enableHighAccuracy = true, timeout = 10000, maximumAge = 5000 } = options;

  return new Promise((resolve, reject) => {
    // 1. Try to get a high accuracy position with a shorter timeout
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => {
        // 2. If high accuracy fails or times out, try low accuracy immediately
        console.warn("High accuracy location failed, falling back to low accuracy:", err.message);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err2) => reject(err2),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy, timeout: 4000, maximumAge } // Wait only 4s for high accuracy
    );
  });
}
