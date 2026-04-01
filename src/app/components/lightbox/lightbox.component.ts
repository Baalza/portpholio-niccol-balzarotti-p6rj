import {
  Component,
  HostListener,
  inject,
  effect,
  signal,
  computed,
  DOCUMENT,
  ElementRef,
  viewChild,
} from '@angular/core';

import { LightboxService } from '../../services/lightbox.service';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  templateUrl: './lightbox.component.html',
  styleUrl: './lightbox.component.scss',
})
export class LightboxComponent {
  readonly lightbox = inject(LightboxService);
  private readonly doc = inject(DOCUMENT);
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly imgRef = viewChild<ElementRef<HTMLImageElement>>('img');

  readonly imgReady = signal(false);
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly isPanning = signal(false);
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private startPanX = 0;
  private startPanY = 0;

  readonly src = computed(() => {
    const p = this.lightbox.current();
    return p ? (p.srcFull ?? p.src) : '';
  });

  constructor() {
    effect(() => {
      this.lightbox.current();
      this.lightbox.index();
      this.imgReady.set(false);
      this.zoom.set(1);
      this.resetPan();
    });

    effect(() => {
      this.doc.body.style.overflow = this.lightbox.isOpen() ? 'hidden' : '';
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.lightbox.isOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.lightbox.close();
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.lightbox.next();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.lightbox.prev();
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      this.zoomIn();
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      this.zoomOut();
    }
  }

  onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.lightbox.close();
  }

  onImgLoad(): void {
    this.imgReady.set(true);
  }

  stopNavClick(e: MouseEvent): void {
    e.stopPropagation();
  }

  preventControlDoubleTap(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  zoomIn(): void {
    this.zoom.update((z) => Math.min(3, +(z + 0.25).toFixed(2)));
    this.clampPan();
  }

  zoomOut(): void {
    this.zoom.update((z) => Math.max(1, +(z - 0.25).toFixed(2)));
    this.clampPan();
  }

  resetZoom(): void {
    this.zoom.set(1);
    this.resetPan();
  }

  onWheel(e: WheelEvent): void {
    if (!this.lightbox.isOpen()) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  onPanStart(e: PointerEvent): void {
    if (this.zoom() <= 1) return;
    const stage = this.stageRef()?.nativeElement;
    if (!stage) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.isPanning.set(true);
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startPanX = this.panX();
    this.startPanY = this.panY();
    stage.setPointerCapture(e.pointerId);
  }

  onPanMove(e: PointerEvent): void {
    if (!this.isPanning() || this.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.panX.set(this.startPanX + dx);
    this.panY.set(this.startPanY + dy);
    this.clampPan();
  }

  onPanEnd(e: PointerEvent): void {
    if (this.pointerId !== e.pointerId) return;
    const stage = this.stageRef()?.nativeElement;
    if (stage?.hasPointerCapture(e.pointerId)) {
      stage.releasePointerCapture(e.pointerId);
    }
    this.pointerId = null;
    this.isPanning.set(false);
  }

  private resetPan(): void {
    this.panX.set(0);
    this.panY.set(0);
  }

  private clampPan(): void {
    if (this.zoom() <= 1) {
      this.resetPan();
      return;
    }
    const stage = this.stageRef()?.nativeElement;
    const img = this.imgRef()?.nativeElement;
    if (!stage || !img) return;
    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;
    const baseW = img.clientWidth;
    const baseH = img.clientHeight;
    const scaledW = baseW * this.zoom();
    const scaledH = baseH * this.zoom();
    const maxX = Math.max(0, (scaledW - stageW) / 2);
    const maxY = Math.max(0, (scaledH - stageH) / 2);
    this.panX.set(Math.max(-maxX, Math.min(maxX, this.panX())));
    this.panY.set(Math.max(-maxY, Math.min(maxY, this.panY())));
  }
}
