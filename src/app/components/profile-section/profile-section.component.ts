import { Component, computed, inject } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { ProfileSocialItem } from '../../models/portfolio.models';

@Component({
  selector: 'app-profile-section',
  standalone: true,
  templateUrl: './profile-section.component.html',
  styleUrl: './profile-section.component.scss',
})
export class ProfileSectionComponent {
  private readonly portfolio = inject(PortfolioService);

  readonly profile = this.portfolio.profile;
  readonly hasProfile = computed(() => this.profile() !== null);
  readonly bioLines = computed(() => {
    const p = this.profile();
    if (!p) return [];
    return Array.isArray(p.bio) ? p.bio : [p.bio];
  });
  readonly socialItems = computed(() => this.profile()?.socialItems ?? []);

  socialWebsiteHref(url: string | undefined): string {
    const value = (url ?? '').trim();
    if (!value.startsWith('https://')) return '';
    return value;
  }

  socialTrackBy(_: number, item: ProfileSocialItem): string {
    return `${item.key}-${item.value}`;
  }
}
