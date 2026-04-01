import { Component, input } from '@angular/core';
import { Photo } from '../../models/portfolio.models';
import { PhotoCardComponent } from '../photo-card/photo-card.component';

@Component({
  selector: 'app-photo-grid',
  standalone: true,
  imports: [PhotoCardComponent],
  templateUrl: './photo-grid.component.html',
  styleUrl: './photo-grid.component.scss',
})
export class PhotoGridComponent {
  readonly photos = input.required<Photo[]>();
  readonly mode = input<'grid' | 'rail'>('grid');
}
