import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FileUploadProgress, UploadService } from '../../services/upload.service';

@Component({
  selector: 'app-photo-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-upload.component.html',
  styleUrl: './photo-upload.component.scss',
})
export class PhotoUploadComponent {
  private readonly uploadService = inject(UploadService);

  readonly flightPlanId = input.required<string>();

  readonly state = signal<'idle' | 'uploading' | 'confirming' | 'done' | 'error'>('idle');
  readonly fileProgresses = signal<FileUploadProgress[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<{ photoCount: number; totalSizeBytes: number } | null>(null);

  readonly overallProgress = computed(() => {
    const progresses = this.fileProgresses();
    if (progresses.length === 0) return 0;
    const sum = progresses.reduce((acc, p) => acc + p.progress, 0);
    return Math.round(sum / progresses.length);
  });

  readonly selectedFileCount = signal(0);

  private selectedFiles: File[] = [];

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    this.selectedFiles = Array.from(files);
    this.selectedFileCount.set(this.selectedFiles.length);
    this.state.set('idle');
    this.errorMessage.set(null);
    this.result.set(null);
  }

  async startUpload(): Promise<void> {
    if (this.selectedFiles.length === 0) return;

    this.state.set('uploading');
    this.errorMessage.set(null);

    try {
      const fileNames = this.selectedFiles.map((f) => f.name);
      const { urls } = await this.uploadService.getUploadUrls(this.flightPlanId(), fileNames);

      await this.uploadService.uploadFiles(this.selectedFiles, urls, (progresses) => {
        this.fileProgresses.set(progresses);
      });

      const failed = this.fileProgresses().filter((p) => p.status === 'error');
      if (failed.length > 0) {
        this.state.set('error');
        this.errorMessage.set(`${failed.length} file(s) failed to upload.`);
        return;
      }

      this.state.set('confirming');
      const objectKeys = urls.map((u) => u.objectKey);
      const confirmation = await this.uploadService.confirmUpload(this.flightPlanId(), objectKeys);

      this.result.set({ photoCount: confirmation.photoCount, totalSizeBytes: confirmation.totalSizeBytes });
      this.state.set('done');
    } catch (err) {
      this.state.set('error');
      this.errorMessage.set(err instanceof Error ? err.message : 'Upload failed.');
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
