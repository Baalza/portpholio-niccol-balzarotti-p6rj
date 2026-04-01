import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { Photo } from '../../models/portfolio.models';
import { LightboxService } from '../../services/lightbox.service';
import { PortfolioService } from '../../services/portfolio.service';
import { RevealOnScrollDirective } from '../../directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-photo-card',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './photo-card.component.html',
  styleUrl: './photo-card.component.scss',
})
export class PhotoCardComponent {
  readonly photo = input.required<Photo>();
  readonly staggerMs = input(0, { alias: 'appStaggerMs' });
  readonly infoVisible = signal(false);

  private readonly lightbox = inject(LightboxService);
  private readonly portfolio = inject(PortfolioService);
  private readonly host = inject(ElementRef<HTMLElement>);

  onCardClick(e: MouseEvent): void {
    if (!this.isTouchLikeDevice()) {
      this.open();
      return;
    }

    if (!this.infoVisible()) {
      e.preventDefault();
      this.infoVisible.set(true);
      return;
    }

    this.open();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(e: PointerEvent): void {
    if (!this.infoVisible()) return;
    const target = e.target as Node | null;
    if (!target) return;
    if (!this.host.nativeElement.contains(target)) {
      this.infoVisible.set(false);
    }
  }

  private open(): void {
    const order = this.portfolio.photosInOrder();
    const i = this.portfolio.indexInExhibition(this.photo());
    if (i >= 0) this.lightbox.open(order, i);
  }

  private isTouchLikeDevice(): boolean {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  }
}
