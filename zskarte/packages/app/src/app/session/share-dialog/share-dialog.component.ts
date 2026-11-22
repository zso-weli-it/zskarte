import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import QRCode from 'qrcode';
import { I18NService } from 'src/app/state/i18n.service';
import { DialogHeaderComponent, DialogBodyComponent } from '../../ui/dialog-layout';

@Component({
  selector: 'app-share-dialog',
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss'],
  imports: [AsyncPipe, DialogHeaderComponent, DialogBodyComponent],
})
export class ShareDialogComponent {
  joinCode = inject(MAT_DIALOG_DATA);
  private _snackBar = inject(MatSnackBar);
  i18n = inject(I18NService);

  public qrCodeDataUrl!: Promise<string>;
  public get joinLink(): string {
    return `${window.location.origin}/share/${this.joinCode}`;
  }
  public showJoinCode: boolean;

  constructor() {
    const joinCode = this.joinCode;

    this.qrCodeDataUrl = this.generateQrCodeDataUrl();
    this.copyJoinLink();
    // Only show join code if access has an user friendly join code (six digits long).
    this.showJoinCode = joinCode.length === 6;
  }

  async copyJoinLink() {
    if (await this.copyToClipboard(this.joinLink)) {
      this._snackBar.open(this.i18n.get('copiedToClipboard'), this.i18n.get('ok'), { duration: 2000 });
    }
  }

  // navigator.clipboard only exists on https and localhost; on http (e.g. an IP address) fall back to a hidden textarea
  private async copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // not allowed in this context, use the fallback below
      }
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }

  private generateQrCodeDataUrl(): Promise<string> {
    return QRCode.toDataURL(this.joinLink, {
      width: 420,
    }).catch((err) => {
      console.error(`Error generating QR Code for ${this.joinLink}:`, err);
      return '';
    });
  }
}
