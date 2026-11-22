'use client'
import { useEffect, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'
import { MapPin } from 'lucide-react'

const defaultCenter: [number, number] = [23.7806, 90.407]
const pinIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48"><path d="M19 1C9.06 1 1 9.06 1 19c0 13 18 28 18 28s18-15 18-28C37 9.06 28.94 1 19 1Z" fill="#b04a28" stroke="#fff9ee" stroke-width="2"/><circle cx="19" cy="19" r="6" fill="#fff9ee"/></svg>'

export function VenuePicker({
  venue,
  latitude,
  longitude,
  onVenue,
  onCoordinates,
}: {
  venue: string
  latitude: number | null
  longitude: number | null
  onVenue: (value: string) => void
  onCoordinates: (latitude: number | null, longitude: number | null) => void
}) {
  const mapNode = useRef<HTMLDivElement>(null)
  const map = useRef<Leaflet.Map | null>(null)
  const marker = useRef<Leaflet.Marker | null>(null)
  const selected = useRef({ latitude, longitude, onCoordinates })
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState('')

  selected.current = { latitude, longitude, onCoordinates }

  useEffect(() => {
    let mounted = true
    let instance: Leaflet.Map | null = null
    let pin: Leaflet.Marker | null = null

    void import('leaflet')
      .then((L) => {
        if (!mounted || !mapNode.current) return
        const point: [number, number] =
          selected.current.latitude != null && selected.current.longitude != null
            ? [selected.current.latitude, selected.current.longitude]
            : defaultCenter
        instance = L.map(mapNode.current, {
          center: point,
          zoom: selected.current.latitude != null ? 17 : 13,
          zoomControl: true,
          scrollWheelZoom: true,
        })
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
        }).addTo(instance)
        L.control.scale({ imperial: false, metric: true }).addTo(instance)
        if (selected.current.latitude != null && selected.current.longitude != null) {
          pin = L.marker(point, {
            draggable: true,
            icon: L.divIcon({
              className: 'tidepool-map-pin',
              html: pinIcon,
              iconSize: [38, 48],
              iconAnchor: [19, 46],
            }),
            title: 'Drag to adjust the event location',
          }).addTo(instance)
        }

        const updateCoordinates = () => {
          const location = pin?.getLatLng()
          if (location) selected.current.onCoordinates(location.lat, location.lng)
        }
        pin?.on('dragend', updateCoordinates)
        const placePin = (location: Leaflet.LatLng) => {
          if (!pin) {
            pin = L.marker(location, {
              draggable: true,
              icon: L.divIcon({
                className: 'tidepool-map-pin',
                html: pinIcon,
                iconSize: [38, 48],
                iconAnchor: [19, 46],
              }),
              title: 'Drag to adjust the event location',
            }).addTo(instance!)
            pin.on('dragend', updateCoordinates)
          } else pin.addTo(instance!)
          pin.setLatLng(location)
          marker.current = pin
          selected.current.onCoordinates(location.lat, location.lng)
          setMapError('')
        }

        instance.on('click', (event: Leaflet.LeafletMouseEvent) => placePin(event.latlng))
        map.current = instance
        marker.current = pin
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setLoading(false)
        setMapError('The map could not load. Check your internet connection and try again.')
      })

    return () => {
      mounted = false
      instance?.remove()
      map.current = null
      marker.current = null
    }
  }, [])

  return (
    <fieldset className="venue-picker">
      <legend>Venue &amp; map pin</legend>
      <label>
        Venue name, room, or entrance
        <input
          required
          minLength={2}
          maxLength={120}
          value={venue}
          onChange={(event) => onVenue(event.target.value)}
          placeholder="e.g. Innovation Hall, North Campus"
        />
      </label>
      <p className="venue-map-hint" role="status">
        <MapPin size={15} />{' '}
        {mapError || 'Click the map to drop a pin. Drag it to fine-tune the entrance.'}
      </p>
      <div className="venue-map" aria-label="Map for selecting the event location">
        <div ref={mapNode} className="venue-map-canvas" />
        {loading && <div className="venue-map-loading">Loading map…</div>}
      </div>
      <small className="venue-map-attribution">© OpenStreetMap contributors</small>
      {latitude != null && longitude != null && (
        <p className="venue-coordinates" role="status">
          Pin saved at {latitude.toFixed(5)}, {longitude.toFixed(5)}
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              marker.current?.remove()
              marker.current = null
              onCoordinates(null, null)
            }}
          >
            Remove pin
          </button>
        </p>
      )}
      <small className="profile-note">
        The pin and venue name are saved when you save the event.
      </small>
    </fieldset>
  )
}
