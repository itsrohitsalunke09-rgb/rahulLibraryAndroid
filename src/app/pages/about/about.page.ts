import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logoInstagram, mailOutline } from 'ionicons/icons';

/** About the library (from the 2022 silver-jubilee souvenir "प्रगती स्मरणिका"), in the login screen's look. */
@Component({
  selector: 'app-about',
  templateUrl: 'about.page.html',
  styleUrls: ['../login/login.page.scss', 'about.page.scss'],
  imports: [IonContent, IonIcon],
})
export class AboutPage {
  private router = inject(Router);

  readonly email = 'rahul.library@gmail.com';
  readonly instagram = 'https://www.instagram.com/rahul_public_library';

  readonly timeline = [
    { year: '१९९४', text: 'वाचनालयाची स्थापना' },
    { year: '१९९५–९६', text: "'ड' वर्ग शासनमान्यता" },
    { year: '२००२–०३', text: "'क' वर्ग शासनमान्यता" },
    { year: '२००५', text: 'आमदार बबनराव शिंदे यांच्या स्थानिक विकास निधीतून नवीन इमारत' },
    { year: '२००६–०७', text: "'ब' वर्ग शासनमान्यता" },
    { year: '२०२०', text: 'रौप्य महोत्सव – २५ वर्षांची वाटचाल' },
  ];

  constructor() {
    addIcons({ logoInstagram, mailOutline });
  }

  back() {
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
