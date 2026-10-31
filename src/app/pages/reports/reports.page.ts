import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/** The registers as reports: daily newspapers by day, magazines by period, and books given and returned. */
@Component({
  selector: 'app-reports',
  templateUrl: 'reports.page.html',
  styleUrls: ['reports.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
})
export class ReportsPage {
  readonly cards = [
    { title: 'दैनिके', sub: 'Newspapers, day by day', link: '/tabs/dashboard/reports/DAILY', tone: 'daily', icon: 'sheet' },
    { title: 'साप्ताहिक', sub: 'Weekly magazines, week by week', link: '/tabs/dashboard/reports/WEEKLY', tone: 'weekly', icon: 'book' },
    { title: 'पाक्षिक', sub: 'Fortnightly magazines, fortnight by fortnight', link: '/tabs/dashboard/reports/FORTNIGHTLY', tone: 'fortnightly', icon: 'book' },
    { title: 'मासिक', sub: 'Monthly magazines, month by month', link: '/tabs/dashboard/reports/MONTHLY', tone: 'monthly', icon: 'book' },
    { title: 'पुस्तकांची देवाण घेवाण', sub: 'Books given and returned, day by day', link: '/tabs/dashboard/reports/BOOKS', tone: 'books', icon: 'tab-issues' },
  ];
}
