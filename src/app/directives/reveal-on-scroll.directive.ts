import {
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  AfterViewInit,
  input,
  HostBinding,
} from '@angular/core';

@Directive({
  selector: '[appRevealOnScroll]',
  standalone: true,
  host: {
    class: 'reveal-on-scroll',
  },
})
export class RevealOnScrollDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly delayMs = input(0, { alias: 'appRevealDelay' });

  @HostBinding('style.--reveal-delay')
  get revealDelay(): string {
    return `${this.delayMs()}ms`;
  }

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const node = this.el.nativeElement;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-on-scroll--visible');
            this.observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -6% 0px' },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
