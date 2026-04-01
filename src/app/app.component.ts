import { DOCUMENT } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ProfileSectionComponent } from './components/profile-section/profile-section.component';
import { PortfolioSectionComponent } from './components/portfolio-section/portfolio-section.component';
import { LightboxComponent } from './components/lightbox/lightbox.component';
import { PortfolioService } from './services/portfolio.service';
import { PhotoGridComponent } from './components/photo-grid/photo-grid.component';

type ViewAction = 'grid' | 'rails';
interface NavItem {
  id: string;
  label: string;
  isSub?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [ProfileSectionComponent, PhotoGridComponent, PortfolioSectionComponent, LightboxComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly doc = inject(DOCUMENT);
  private scrollTicking = false;

  readonly categories = this.portfolio.categoriesReadonly;
  readonly allPhotos = this.portfolio.photosInOrder;
  activeAction: ViewAction = 'rails';
  readonly menuOpen = signal(false);
  readonly menuSticky = signal(false);
  readonly navItems = computed<NavItem[]>(() => [
    { id: 'page-top', label: 'Profile' },
    ...this.categories().flatMap((c) => {
      const section: NavItem = { id: `collection-${c.id}`, label: c.title };
      const subs =
        c.subcategories?.map((s) => ({
          id: `subcollection-${c.id}-${s.id}`,
          label: s.title,
          isSub: true,
        })) ?? [];
      return [section, ...subs];
    }),
  ]);

  setAction(action: ViewAction): void {
    this.activeAction = action;
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  navigateTo(targetId: string): void {
    this.menuOpen.set(false);
    const shouldSwitch = this.activeAction !== 'rails';
    if (shouldSwitch) this.activeAction = 'rails';
    window.setTimeout(() => {
      const el = this.doc.getElementById(targetId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.setAttribute('tabindex', '-1');
      (el as HTMLElement).focus({ preventScroll: true });
    }, shouldSwitch ? 120 : 0);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.scrollTicking) return;
    this.scrollTicking = true;
    window.requestAnimationFrame(() => {
      const sentinel = this.doc.getElementById('section-menu-sentinel');
      if (!sentinel) {
        this.scrollTicking = false;
        return;
      }
      const nextSticky = sentinel.getBoundingClientRect().top <= 12;
      if (nextSticky !== this.menuSticky()) {
        this.menuSticky.set(nextSticky);
      }
      this.scrollTicking = false;
    });
  }
}
