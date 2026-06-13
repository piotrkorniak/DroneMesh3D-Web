import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { MapComponent } from './components/map/map.component';
import { SidePanelComponent } from './components/side-panel/side-panel.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { PanelStateService } from './services/panel-state.service';
import { SelectionStateService } from './services/selection-state.service';
import { LiveAnnouncerService } from './services/live-announcer.service';

@Component({
  selector: 'app-root',
  imports: [MapComponent, SidePanelComponent, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'dronemesh3d-web';
  panelState = inject(PanelStateService);
  private readonly selectionState = inject(SelectionStateService);
  private readonly liveAnnouncer = inject(LiveAnnouncerService);

  /** Reactive viewport width — updates on window resize */
  private readonly viewportWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);

  @HostListener('window:resize')
  onResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  /** Whether a modal overlay is currently open (export dialog or mobile side panel) */
  readonly isModalOpen = computed(() => {
    return this.viewportWidth() < 768 && this.panelState.isExpanded();
  });

  /** Live announcement text for aria-live region */
  readonly liveAnnouncement = computed(() => this.liveAnnouncer.announcement());
}
