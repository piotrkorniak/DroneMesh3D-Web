import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { MapComponent } from './components/map/map.component';
import { SidePanelComponent } from './components/side-panel/side-panel.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { LoginComponent } from './components/login/login.component';
import { PanelStateService } from './services/panel-state.service';
import { SelectionStateService } from './services/selection-state.service';
import { LiveAnnouncerService } from './services/live-announcer.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [MapComponent, SidePanelComponent, ToastContainerComponent, LoginComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'dronemesh3d-web';
  panelState = inject(PanelStateService);
  readonly auth = inject(AuthService);
  private readonly selectionState = inject(SelectionStateService);
  private readonly liveAnnouncer = inject(LiveAnnouncerService);

  /** Reactive viewport width — updates on window resize */
  private readonly viewportWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);

  @HostListener('window:resize')
  onResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  ngOnInit(): void {
    this.auth.checkAuth();
  }

  /** Whether a modal overlay is currently open (export dialog or mobile side panel) */
  readonly isModalOpen = computed(() => {
    return this.viewportWidth() < 768 && this.panelState.isExpanded();
  });

  /** Live announcement text for aria-live region */
  readonly liveAnnouncement = computed(() => this.liveAnnouncer.announcement());
}
