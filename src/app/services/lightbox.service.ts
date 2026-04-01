import { Injectable, computed, signal } from '@angular/core';
import { Photo } from '../models/portfolio.models';

interface LightboxState {
  photos: Photo[];
  index: number;
}

@Injectable({ providedIn: 'root' })
export class LightboxService {
  private readonly state = signal<LightboxState | null>(null);

  readonly isOpen = computed(() => this.state() !== null);

  readonly current = computed(() => {
    const s = this.state();
    if (!s?.photos.length) return null;
    return s.photos[s.index] ?? null;
  });

  readonly index = computed(() => this.state()?.index ?? 0);

  readonly total = computed(() => this.state()?.photos.length ?? 0);

  open(photos: Photo[], index: number): void {
    if (!photos.length) return;
    const i = Math.max(0, Math.min(index, photos.length - 1));
    this.state.set({ photos, index: i });
  }

  close(): void {
    this.state.set(null);
  }

  next(): void {
    const s = this.state();
    if (!s?.photos.length) return;
    const next = (s.index + 1) % s.photos.length;
    this.state.set({ ...s, index: next });
  }

  prev(): void {
    const s = this.state();
    if (!s?.photos.length) return;
    const prev = (s.index - 1 + s.photos.length) % s.photos.length;
    this.state.set({ ...s, index: prev });
  }
}
