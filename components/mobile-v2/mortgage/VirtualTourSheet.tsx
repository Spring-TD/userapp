'use client'

import React, { useState } from 'react'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MortgageSheet, MORTGAGE_PRIMARY } from '@/components/mobile-v2/mortgage/MortgageSheet'
import {
  googleMapsEmbedUrl,
  googleMapsUrl,
  type PropertyTourData,
} from '@/lib/mortgagePropertyTour'
import { cn } from '@/lib/utils'

type VirtualTourPhase = 'location' | 'video' | 'property'

type VirtualTourSheetProps = {
  open: boolean
  onClose: () => void
  tour: PropertyTourData
  onComplete: () => void
}

const PHASES: { id: VirtualTourPhase; label: string }[] = [
  { id: 'location', label: 'Location' },
  { id: 'video', label: 'Video Tour' },
  { id: 'property', label: 'Property' },
]

export function VirtualTourSheet({ open, onClose, tour, onComplete }: VirtualTourSheetProps) {
  const [phase, setPhase] = useState<VirtualTourPhase>('location')
  const [imageIndex, setImageIndex] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)

  const handleClose = () => {
    setPhase('location')
    setImageIndex(0)
    setVideoPlaying(false)
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
              <iframe
                title="Property location map"
                src={googleMapsEmbedUrl(tour.mapQuery)}
                className="h-44 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
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
          </div>
        ) : null}

        {phase === 'video' ? (
          <div className="mt-6">
            <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-gray-200">
              {tour.videoUrl && videoPlaying ? (
                <iframe
                  title="Property video tour"
                  src={tour.videoUrl}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setVideoPlaying(true)}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg"
                  aria-label="Play video tour"
                >
                  <Play className="ml-1 h-6 w-6 fill-white" />
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">
              {videoPlaying ? 'Video tour in progress' : 'Tap play to watch the property video tour'}
            </p>
          </div>
        ) : null}

        {phase === 'property' ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-[var(--sf-ink,#1E293B)]">{tour.propertyName}</p>
            <p className="mt-1 text-xs text-gray-500">Main building</p>
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
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          {phase === 'property' ? (
            <button
              type="button"
              onClick={goNext}
              className="w-full py-2 text-center text-sm font-semibold text-[var(--sf-button,#1E40AF)]"
            >
              Continue
            </button>
          ) : (
            <Button className={cn('h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)} onClick={goNext}>
              Next
            </Button>
          )}
          {phase !== 'property' ? (
            <button
              type="button"
              onClick={goBack}
              className="w-full py-1 text-center text-xs font-medium text-gray-500"
            >
              No. Go back
            </button>
          ) : null}
        </div>
      </div>
    </MortgageSheet>
  )
}
