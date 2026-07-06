# Flight Data Providers

## OpenSky provider

The MVP uses OpenSky through a provider adapter. It derives a bounding box from the configured radius, fetches state vectors, normalizes fields, then applies exact Haversine radius filtering server-side.

Required fields mapped by V1:

- ICAO ID
- callsign as flight number
- latitude and longitude
- barometric or geometric altitude
- velocity
- true track as heading
- vertical rate

Optional OAuth2 client credentials can be provided through `.env`.

## Mock provider

Set `SKYCEIL_PROVIDER=mock` to render deterministic synthetic traffic. This is useful for projector calibration, UI development, tests, and demos without network access.

## Future providers

The `FlightDataProvider` interface is ready for ADS-B Exchange, local readsb/dump1090 feeds, satellite tracking, ISS tracking, weather overlays, and constellation layers.
