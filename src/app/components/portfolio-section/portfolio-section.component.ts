import { Component, input, signal } from '@angular/core';
import { Category } from '../../models/portfolio.models';
import { PhotoGridComponent } from '../photo-grid/photo-grid.component';
import { RevealOnScrollDirective } from '../../directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-portfolio-section',
  standalone: true,
  imports: [PhotoGridComponent, RevealOnScrollDirective],
  templateUrl: './portfolio-section.component.html',
  styleUrl: './portfolio-section.component.scss',
})
export class PortfolioSectionComponent {
  readonly category = input.required<Category>();
  readonly horizontal = input(false);
  readonly sectionCollapsed = signal(false);
  readonly collapsedSubIds = signal<Record<string, boolean>>({});

  hasSubcategories(): boolean {
    return !!this.category().subcategories?.length;
  }

  toggleSection(): void {
    this.sectionCollapsed.update((v) => !v);
  }

  isSectionOpen(): boolean {
    return !this.sectionCollapsed();
  }

  toggleSub(id: string): void {
    this.collapsedSubIds.update((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  isSubOpen(id: string): boolean {
    return !this.collapsedSubIds()[id];
  }
}
