import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/** Registers tab: a card per register to mark what came (admin and librarian). Reports are on the Dashboard. */
@Component({
  selector: 'app-config',
  templateUrl: 'config.page.html',
  styleUrls: ['../reports/reports.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent],
})
export class ConfigPage {
  readonly cards = [
    { title: 'दैनिके', sub: 'Tick the newspapers that came today', link: '/tabs/config/periodicals/register', tone: 'daily', icon: 'sheet' },
    { title: 'साप्ताहिक', sub: 'Mark weekly magazine issues received', link: '/tabs/config/periodicals/magazines/WEEKLY', tone: 'weekly', icon: 'book' },
    { title: 'मासिक', sub: 'Mark monthly magazine issues received', link: '/tabs/config/periodicals/magazines/MONTHLY', tone: 'monthly', icon: 'book' },
  ];
}
