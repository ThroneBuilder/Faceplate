import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  onCameraSessionReady,
  onPhotoCaptured,
  onPhotoRetaken,
  onPhotoConfirmed,
  onCameraError,
} from '../../src/lib/app-state.js'
import type { AppState, CameraSession, CapturedPhoto, FaceImage } from '../../src/types/index.js'

function mockStream(): MediaStream {
  return { getTracks: () => [] } as unknown as MediaStream
}

function mockSession(overrides?: Partial<CameraSession>): CameraSession {
  return {
    stream: mockStream(),
    activeDeviceId: 'cam-0',
    availableDevices: [],
    permissionState: 'granted',
    ...overrides,
  }
}

function mockPhoto(): CapturedPhoto {
  return {
    blob: new Blob([''], { type: 'image/jpeg' }),
    widthPx: 1280,
    heightPx: 960,
    capturedAt: Date.now(),
  }
}

function mockFaceImage(): FaceImage {
  return {
    file: new File([''], 'capture.jpg', { type: 'image/jpeg' }),
    format: 'jpeg',
    widthPx: 1280,
    heightPx: 960,
    fileSizeBytes: 512000,
    objectUrl: 'blob:mock',
  }
}

describe('camera state transitions', () => {
  describe('onCameraSessionReady', () => {
    it('transitions to camera-viewfinder with the provided session', () => {
      const session = mockSession()
      const state = onCameraSessionReady({ phase: 'idle' }, session)
      expect(state.phase).toBe('camera-viewfinder')
      if (state.phase === 'camera-viewfinder') {
        expect(state.session).toBe(session)
      }
    })
  })

  describe('onPhotoCaptured', () => {
    it('transitions to camera-preview with photo and session', () => {
      const session = mockSession()
      const photo = mockPhoto()
      const state = onPhotoCaptured({ phase: 'camera-viewfinder', session }, photo)
      expect(state.phase).toBe('camera-preview')
      if (state.phase === 'camera-preview') {
        expect(state.photo).toBe(photo)
        expect(state.session).toBe(session)
      }
    })
  })

  describe('onPhotoRetaken', () => {
    it('returns to camera-viewfinder, preserving session', () => {
      const session = mockSession()
      const photo = mockPhoto()
      const state = onPhotoRetaken({ phase: 'camera-preview', photo, session })
      expect(state.phase).toBe('camera-viewfinder')
      if (state.phase === 'camera-viewfinder') {
        expect(state.session).toBe(session)
      }
    })
  })

  describe('onPhotoConfirmed', () => {
    it('transitions to preparing with the validated FaceImage', () => {
      const session = mockSession()
      const photo = mockPhoto()
      const image = mockFaceImage()
      const prevState = { phase: 'camera-preview' as const, photo, session }
      const state = onPhotoConfirmed(prevState, image)
      expect(state.phase).toBe('preparing')
      if (state.phase === 'preparing') {
        expect(state.image).toBe(image)
      }
    })
  })

  describe('onCameraError', () => {
    it('transitions to camera-error with the error message', () => {
      const state = onCameraError({ phase: 'idle' }, 'NotAllowedError')
      expect(state.phase).toBe('camera-error')
      if (state.phase === 'camera-error') {
        expect(state.error).toBe('NotAllowedError')
      }
    })

    it('transitions to camera-error from any state', () => {
      const session = mockSession()
      const from: AppState = { phase: 'camera-viewfinder', session }
      const state = onCameraError(from, 'NotFoundError')
      expect(state.phase).toBe('camera-error')
    })
  })
})
