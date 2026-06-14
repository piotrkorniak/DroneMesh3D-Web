import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UploadUrlItem {
  fileName: string;
  uploadUrl: string;
  objectKey: string;
}

export interface UploadUrlsResponse {
  urls: UploadUrlItem[];
}

export interface ConfirmUploadResponse {
  batchId: string;
  photoCount: number;
  totalSizeBytes: number;
}

export interface FileUploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly basePath = '/api/photos';
  private readonly maxConcurrent = 4;
  private readonly maxRetries = 3;

  async getUploadUrls(flightPlanId: string, fileNames: string[]): Promise<UploadUrlsResponse> {
    return firstValueFrom(this.http.post<UploadUrlsResponse>(`${this.basePath}/upload-urls`, { flightPlanId, fileNames }));
  }

  async confirmUpload(flightPlanId: string, objectKeys: string[]): Promise<ConfirmUploadResponse> {
    return firstValueFrom(this.http.post<ConfirmUploadResponse>(`${this.basePath}/confirm`, { flightPlanId, objectKeys }));
  }

  async uploadFiles(files: File[], urls: UploadUrlItem[], onProgress: (progresses: FileUploadProgress[]) => void): Promise<void> {
    const progresses: FileUploadProgress[] = files.map((f) => ({
      fileName: f.name,
      progress: 0,
      status: 'pending',
    }));

    const urlMap = new Map(urls.map((u) => [u.fileName, u]));
    let nextIndex = 0;

    const uploadOne = async (index: number): Promise<void> => {
      const file = files[index];
      const urlItem = urlMap.get(file.name);
      if (!urlItem) return;

      progresses[index].status = 'uploading';
      onProgress([...progresses]);

      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          await this.putFile(urlItem.uploadUrl, file, (pct) => {
            progresses[index].progress = pct;
            onProgress([...progresses]);
          });
          progresses[index].status = 'done';
          progresses[index].progress = 100;
          onProgress([...progresses]);
          return;
        } catch (err) {
          if (attempt === this.maxRetries - 1) {
            progresses[index].status = 'error';
            progresses[index].error = err instanceof Error ? err.message : 'Upload failed';
            onProgress([...progresses]);
          }
        }
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < this.maxConcurrent; i++) {
      workers.push(
        (async () => {
          while (nextIndex < files.length) {
            const idx = nextIndex++;
            await uploadOne(idx);
          }
        })(),
      );
    }

    await Promise.all(workers);
  }

  private putFile(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`HTTP ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(file);
    });
  }
}
