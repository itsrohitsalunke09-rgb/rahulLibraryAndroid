import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/** The three registers as reports: daily newspapers by day, weekly and monthly magazines by period. */
@Component({
  selector: 'app-reports',
  templateUrl: 'reports.page.html',
  styleUrls: ['reports.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
})
export class ReportsPage {
  readonly cards = [
    { title: 'दैनिके', sub: 'Newspapers, day by day', link: '/tabs/config/periodicals/report', tone: 'daily', icon: 'sheet' },
    { title: 'साप्ताहिक', sub: 'Weekly magazines, week by week', link: '/tabs/reports/WEEKLY', tone: 'weekly', icon: 'book' },
    { title: 'मासिक', sub: 'Monthly magazines, month by month', link: '/tabs/reports/MONTHLY', tone: 'monthly', icon: 'book' },
  ];
}
