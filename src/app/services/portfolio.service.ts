import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import {
  Category,
  Photo,
  PortfolioContent,
  ProfileContent,
  ProfileSocialItem,
  Subcategory,
} from '../models/portfolio.models';

interface ExternalSection {
  id?: string;
  title?: string;
  name?: string;
  subtitle?: string;
  caption?: string;
  photos?: ExternalPhoto[];
  subcategories?: ExternalSection[];
  subsections?: ExternalSection[];
}

interface ExternalPhoto {
  id?: string;
  path?: string;
  src?: string;
  srcFull?: string;
  title?: string;
  alt?: string;
  metadata?: {
    iso?: string | number;
    aperture?: string;
    shutterSpeed?: string;
    exposureTime?: string;
    focalLength?: string;
    lens?: string;
    lensName?: string;
    camera?: string;
    cameraModel?: string;
  };
}

interface ExternalProfileJson {
  profile?: {
    name?: string;
    age?: string | number;
    bio?: string | string[];
    photographyExperience?: string;
    experience?: string;
    specializations?: string[];
    profileImagePath?: string;
    heroImagePath?: string;
    backgroundImagePath?: string;
    heading?: string;
    socialLine?: string;
    social?: Record<string, string>;
    socialWebsite?: string;
  };
}

interface ExternalSectionsJson {
  sections?: ExternalSection[];
}

const DEFAULT_PROFILE_IMAGE = 'assets/portfolio/default-profile.svg';
const DEFAULT_HERO_IMAGE = 'assets/portfolio/default-hero.svg';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<PortfolioContent>({
    profile: null,
    categories: [],
  });
  readonly loadError = signal<string | null>(null);

  readonly profile = computed(() => this.state().profile);
  readonly categoriesReadonly = computed(() => this.state().categories);

  /** Exhibition order: categories top-to-bottom, photos left-to-right within each. */
  readonly photosInOrder = computed(() =>
    this.categoriesReadonly().flatMap((c) =>
      c.subcategories?.length
        ? c.subcategories.flatMap((s) => s.photos)
        : c.photos,
    ),
  );

  constructor() {
    this.load();
    // Keep UI in sync with JSON edits while app is open.
    window.setInterval(() => this.load(), 2500);
  }

  load(): void {
    this.loadProfile();
    this.loadSections();
  }

  private loadProfile(): void {
    const url = `assets/portfolio.config.json?t=${Date.now()}`;
    this.http
      .get<ExternalProfileJson>(url)
      .pipe(
        catchError(() => {
          this.loadError.set('Profile JSON unavailable.');
          return of<ExternalProfileJson>({});
        }),
      )
      .subscribe((data) => {
        this.loadError.set(null);
        const profile = this.normalizeProfile(data?.profile);
        this.state.update((s) => ({ ...s, profile }));
      });
  }

  private loadSections(): void {
    const url = `assets/portfolio.sections.json?t=${Date.now()}`;
    this.http
      .get<ExternalSectionsJson>(url)
      .pipe(
        catchError(() => {
          this.loadError.set('Sections JSON unavailable.');
          return of<ExternalSectionsJson>({});
        }),
      )
      .subscribe((data) => {
        this.loadError.set(null);
        const categories = this.normalizeSections(data?.sections);
        this.state.update((s) => ({ ...s, categories }));
      });
  }

  private normalizeProfile(
    profile: ExternalProfileJson['profile'],
  ): ProfileContent | null {
    if (!profile) return null;
    const name = (profile.name ?? '').toString().trim();
    if (!name) return null;
    const socialNormalized = this.normalizeSocialObject(profile.social);
    const socialWebsite = (profile.socialWebsite ?? socialNormalized.website ?? '').toString();
    const profileImagePath = this.normalizeAssetPath(profile.profileImagePath, DEFAULT_PROFILE_IMAGE);
    const heroImagePath = this.normalizeAssetPath(
      profile.heroImagePath ?? profile.backgroundImagePath,
      DEFAULT_HERO_IMAGE,
    );
    return {
      name,
      age: (profile.age ?? '').toString(),
      bio: profile.bio ?? '',
      experience: (profile.photographyExperience ?? profile.experience ?? '').toString(),
      specializations: Array.isArray(profile.specializations)
        ? profile.specializations
        : [],
      profileImagePath,
      heroImagePath,
      backgroundImagePath: heroImagePath,
      heading: (profile.heading ?? '').toString(),
      socialLine: (profile.socialLine ?? socialNormalized.line ?? '').toString(),
      socialWebsite,
      socialItems: socialNormalized.items,
    };
  }

  private normalizeAssetPath(value: unknown, fallback: string): string {
    const path = (value ?? '').toString().trim();
    return path || fallback;
  }

  private normalizeSocialObject(
    social: Record<string, string> | undefined,
  ): { line: string; website: string; items: ProfileSocialItem[] } {
    if (!social || typeof social !== 'object') return { line: '', website: '', items: [] };
    const entries = Object.entries(social as Record<string, string>)
      .map(([key, value]) => [key, (value ?? '').toString().trim()] as const)
      .filter(([, value]) => value.length > 0);
    if (!entries.length) return { line: '', website: '', items: [] };
    const website = entries.find(([key]) => key.toLowerCase() === 'website')?.[1] ?? '';
    const items = entries.map(([key, value]) => {
      const normalized = key.toLowerCase();
      return {
        key: normalized,
        label: this.prettySocialKey(normalized),
        value,
        href: this.toHref(value),
        brandClass: `profile-card__social-brand--${normalized}`,
      } satisfies ProfileSocialItem;
    });
    const line = entries
      .filter(([key]) => key.toLowerCase() !== 'website')
      .map(([key, value]) => `${this.prettySocialKey(key)}: ${value}`)
      .join(' · ');
    return { line, website, items };
  }

  private toHref(value: string): string | undefined {
    const v = value.trim();
    if (!v) return undefined;
    if (v.startsWith('https://')) return v;
    return undefined;
  }

  private prettySocialKey(key: string): string {
    const lower = key.toLowerCase();
    if (lower === 'website') return 'Website';
    if (lower === 'instagram') return 'Instagram';
    if (lower === 'twitter') return 'Twitter';
    if (lower === 'behance') return 'Behance';
    if (lower === 'linkedin') return 'LinkedIn';
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  private normalizeSections(sections: ExternalSection[] | undefined): Category[] {
    if (!Array.isArray(sections)) return [];
    return sections.map((section, i) => this.mapSection(section, i)).filter((c): c is Category => !!c);
  }

  private mapSection(section: ExternalSection, index: number): Category | null {
    const id = (section.id ?? `section-${index}`).toString();
    const title = (section.title ?? section.name ?? '').toString().trim() || `Section ${index + 1}`;
    const subtitle = (section.subtitle ?? section.caption ?? '').toString().trim();
    const photos = this.mapPhotos(section.photos, id);
    const subsRaw = Array.isArray(section.subsections) ? section.subsections : section.subcategories;
    const subcategories = Array.isArray(subsRaw)
      ? subsRaw
          .map((sub, subIndex) => this.mapSubsection(sub, id, subIndex))
          .filter((s): s is Subcategory => !!s)
      : [];
    return {
      id,
      title,
      subtitle: subtitle || undefined,
      photos,
      subcategories: subcategories.length ? subcategories : undefined,
    };
  }

  private mapSubsection(
    subsection: ExternalSection,
    sectionId: string,
    subIndex: number,
  ): Subcategory | null {
    const id = (subsection.id ?? `${sectionId}-sub-${subIndex}`).toString();
    const title =
      (subsection.title ?? subsection.name ?? '').toString().trim() || `Subsection ${subIndex + 1}`;
    const subtitle = (subsection.subtitle ?? subsection.caption ?? '').toString().trim();
    return {
      id,
      title,
      subtitle: subtitle || undefined,
      photos: this.mapPhotos(subsection.photos, id),
    };
  }

  private mapPhotos(photos: ExternalPhoto[] | undefined, categoryId: string): Photo[] {
    if (!Array.isArray(photos)) return [];
    return photos
      .map((photo, idx) => {
        const src = (photo.path ?? photo.src ?? '').toString().trim();
        if (!src) return null;
        const metadata = photo.metadata ?? {};
        const alt = (photo.alt ?? photo.title ?? `${categoryId} photo ${idx + 1}`).toString().trim();
        const mapped: Photo = {
          id: (photo.id ?? `${categoryId}-photo-${idx}`).toString(),
          src,
          srcFull: photo.srcFull ? photo.srcFull.toString().trim() : undefined,
          title: photo.title?.toString().trim() || undefined,
          categoryId,
          iso: this.toMetaString(metadata.iso),
          aperture: this.toMetaString(metadata.aperture),
          shutterSpeed: this.toMetaString(metadata.shutterSpeed ?? metadata.exposureTime),
          focalLength: this.toMetaString(metadata.focalLength),
          lensName: this.toMetaString(metadata.lensName ?? metadata.lens),
          cameraModel: this.toMetaString(metadata.cameraModel ?? metadata.camera),
          alt,
        };
        return mapped;
      })
      .filter((p): p is Photo => !!p);
  }

  private toMetaString(value: unknown): string | undefined {
    const text = value == null ? '' : String(value).trim();
    return text || undefined;
  }

  patchCategory(id: string, partial: Partial<Omit<Category, 'id'>>): void {
    this.state.update((s) => ({
      ...s,
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, ...partial, id: c.id } : c,
      ),
    }));
  }

  indexInExhibition(photo: Photo): number {
    return this.photosInOrder().findIndex((p) => p.id === photo.id);
  }
}
