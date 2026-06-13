import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapDrawingService } from '../../services/map-drawing.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-area-toolbar',
  standalone: true,
  templateUrl: './area-toolbar.component.html',
  styleUrl: './area-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaToolbarComponent {
  readonly drawingService = inject(MapDrawingService);
  private readonly toastService = inject(ToastService);

  onStartDrawing(): void {
    this.drawingService.startDrawing();
  }

  onCancelDrawing(): void {
    this.drawingService.cancelDrawing();
  }

  onClearPolygon(): void {
    this.drawingService.clearPolygon();
  }

  onSubmitArea(): void {
    this.drawingService.submitArea().subscribe({
      error: (err) => {
        const message = err?.error?.message || err?.message || 'Nie udało się zapisać obszaru';
        this.toastService.show('error', message);
      },
    });
  }
}
