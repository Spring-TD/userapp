'use client'

import React, { useEffect, useState } from 'react'
import { MapPin, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MortgageSheet, MORTGAGE_PRIMARY } from '@/components/mobile-v2/mortgage/MortgageSheet'
import {
  geocodeAddress,
  googleMapsUrl,
  isDirectVideoMediaUrl,
  openStreetMapEmbedUrl,
  type PropertyTourData,
} from '@/lib/mortgagePropertyTour'
import { cn } from '@/lib/utils'

function withAutoplay(embedUrl: string): string {
  try {
    const url = new URL(embedUrl)
    url.searchParams.set('autoplay', '1')
    url.searchParams.set('playsinline', '1')
    return url.toString()
  } catch {
    return `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1&playsinline=1`
  }
}

type VirtualTourPhase = 'location' | 'video' | 'property'

type VirtualTourSheetProps = {
  open: boolean
  onClose: () => void
  tour: PropertyTourData
  onComplete: () => void
  /** Optional opt-out from the mortgage application (e.g. no longer interested). */
  onCancelApplication?: (reason?: string) => void | Promise<void>
}

const PHASES: { id: VirtualTourPhase; label: string }[] = [
  { id: 'location', label: 'Location' },
  { id: 'video', label: 'Video Tour' },
  { id: 'property', label: 'Property' },
]

export function VirtualTourSheet({
  open,
  onClose,
  tour,
  onComplete,
  onCancelApplication,
}: VirtualTourSheetProps) {
  const [phase, setPhase] = useState<VirtualTourPhase>('location')
  const [imageIndex, setImageIndex] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const query = tour.hasConfiguredAddress ? tour.address : decodeURIComponent(tour.mapQuery || '')

    setMapLoading(true)
    setMapError(false)
    setMapEmbedUrl(null)

    void (async () => {
      const geo = await geocodeAddress(query)
      if (cancelled) return
      if (!geo) {
        setMapError(true)
        setMapLoading(false)
        return
      }
      setMapEmbedUrl(openStreetMapEmbedUrl(geo.lat, geo.lon))
      setMapLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, tour.address, tour.hasConfiguredAddress, tour.mapQuery])

  const resetTourUi = () => {
    setPhase('location')
    setImageIndex(0)
    setVideoPlaying(false)
    setCancelOpen(false)
    setCancelReason('')
    setCancelling(false)
  }

  const handleClose = () => {
    resetTourUi()
    onClose()
  }

  const goNext = () => {
    if (phase === 'location') {
      setPhase('video')
      return
    }
    if (phase === 'video') {
      setPhase('property')
      return
    }
    handleClose()
    onComplete()
  }

  const goBack = () => {
    if (phase === 'video') {
      setPhase('location')
      return
    }
    if (phase === 'property') {
      setPhase('video')
      return
    }
    handleClose()
  }

  const confirmCancel = async () => {
    if (!onCancelApplication) return
    setCancelling(true)
    try {
      await onCancelApplication(cancelReason.trim() || undefined)
      resetTourUi()
      onClose()
    } finally {
      setCancelling(false)
    }
  }

  return (
    <MortgageSheet open={open} onClose={handleClose} maxHeightClassName="max-h-[92vh] overflow-y-auto no-scrollbar">
      <div className="px-1 pb-2 pt-1">
        <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Virtual Tour</h2>

        <div className="mt-5 flex gap-2 rounded-full bg-gray-100 p-1">
          {PHASES.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setPhase(tab.id)
                setVideoPlaying(false)
                setCancelOpen(false)
              }}
              className={cn(
                'flex-1 rounded-full px-2 py-2 text-[11px] font-semibold transition',
                phase === tab.id ? 'bg-white text-[var(--sf-ink,#1E293B)] shadow-sm' : 'text-gray-500',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {phase === 'location' ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-[var(--sf-ink,#1E293B)]">Address Navigation</p>
            <div className="relative mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              {mapEmbedUrl ? (
                <iframe
                  title="Property location map"
                  src={mapEmbedUrl}
                  className="h-44 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-44 flex-col items-center justify-center gap-2 px-6 text-center">
                  <MapPin className="h-8 w-8 text-[var(--sf-button,#1E40AF)]" />
                  <p className="text-xs text-gray-500">
                    {mapLoading
                      ? 'Loading map…'
                      : mapError
                        ? 'Could not embed the map for this address.'
                        : 'Map preview unavailable.'}
                  </p>
                </div>
              )}
              <a
                href={googleMapsUrl(tour.mapQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 left-3 rounded-full bg-[var(--sf-button,#1E40AF)] px-3 py-1.5 text-[10px] font-semibold text-white shadow-md"
              >
                View on Google Map
              </a>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-gray-600">{tour.address}</p>
            {!tour.hasConfiguredAddress ? (
              <p className="mt-2 text-[11px] text-amber-700">
                Map uses the best available location text from the product. Ask your provider to set a full
                property address if this looks wrong.
              </p>
            ) : null}
          </div>
        ) : null}

        {phase === 'video' ? (
          <div className="mt-6">
            <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-gray-200">
              {tour.videoUrl && videoPlaying && isDirectVideoMediaUrl(tour.videoSourceUrl || tour.videoUrl) ? (
                <video
                  key={tour.videoUrl}
                  className="h-full w-full object-contain bg-black"
                  src={tour.videoUrl}
                  controls
                  playsInline
                  autoPlay
                  preload="metadata"
                />
              ) : tour.videoUrl && videoPlaying ? (
                <iframe
                  title="Property video tour"
                  src={withAutoplay(tour.videoUrl)}
                  className="h-full w-full border-0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                  allowFullScreen
                />
              ) : tour.videoUrl ? (
                <button
                  type="button"
                  onClick={() => setVideoPlaying(true)}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg"
                  aria-label="Play video tour"
                >
                  <Play className="ml-1 h-6 w-6 fill-white" />
                </button>
              ) : (
                <p className="px-6 text-center text-xs text-gray-500">
                  No property video was configured for this mortgage product.
                </p>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">
              {!tour.videoUrl
                ? 'Ask your provider to add a property video URL in product configuration.'
                : videoPlaying
                  ? 'Video tour in progress'
                  : 'Tap play to watch the property video tour'}
            </p>
            {tour.videoSourceUrl && !isDirectVideoMediaUrl(tour.videoSourceUrl) ? (
              <a
                href={tour.videoSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-center text-[11px] font-medium text-[var(--sf-button,#1E40AF)] underline-offset-2 hover:underline"
              >
                Open video on YouTube
              </a>
            ) : null}
          </div>
        ) : null}

        {phase === 'property' ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-[var(--sf-ink,#1E293B)]">{tour.propertyName}</p>
            <p className="mt-1 text-xs text-gray-500">Main building</p>
            {tour.images.length > 0 ? (
              <>
                <div className="relative mt-3 h-52 overflow-hidden rounded-2xl bg-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tour.images[imageIndex] ?? tour.images[0]}
                    alt={`${tour.propertyName} photo ${imageIndex + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-4 flex justify-center gap-2">
                  {tour.images.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setImageIndex(index)}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        index === imageIndex ? 'w-6 bg-[var(--sf-ink,#1E293B)]' : 'w-2 bg-gray-300',
                      )}
                      aria-label={`View photo ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-3 flex h-52 items-center justify-center rounded-2xl bg-gray-100 px-6 text-center text-xs text-gray-500">
                No property photos were configured for this mortgage product.
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          {cancelOpen ? (
            <div className="space-y-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-4">
              <p className="text-sm font-semibold text-[var(--sf-ink,#1E293B)]">Cancel application?</p>
              <p className="text-xs text-gray-600">
                Tell us why you&apos;re opting out (optional). You can start a new application later if you
                change your mind.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Reason for cancelling (optional)"
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[var(--sf-ink,#1E293B)] outline-none focus:border-[var(--sf-button,#1E40AF)]"
              />
              <Button
                type="button"
                disabled={cancelling || !onCancelApplication}
                onClick={() => void confirmCancel()}
                className="h-12 w-full rounded-full bg-red-600 text-sm font-semibold text-white hover:bg-red-700"
              >
                {cancelling ? 'Cancelling…' : 'Confirm cancel'}
              </Button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => {
                  setCancelOpen(false)
                  setCancelReason('')
                }}
                className="w-full py-1 text-center text-xs font-medium text-gray-500"
              >
                Keep application
              </button>
            </div>
          ) : (
            <>
              {phase === 'property' ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className={cn('h-12 w-full rounded-full text-sm font-bold shadow-sm', MORTGAGE_PRIMARY)}
                >
                  Continue Application
                </Button>
              ) : (
                <Button
                  type="button"
                  className={cn('h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                  onClick={goNext}
                >
                  Next
                </Button>
              )}

              {onCancelApplication ? (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="w-full py-2 text-center text-sm font-normal text-red-600 underline-offset-2 hover:underline"
                >
                  Cancel application
                </button>
              ) : null}

              {phase !== 'property' ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="w-full py-1 text-center text-xs font-medium text-gray-500"
                >
                  No. Go back
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </MortgageSheet>
  )
}
