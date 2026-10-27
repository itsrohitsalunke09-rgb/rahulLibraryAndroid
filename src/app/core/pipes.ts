import { Pipe, PipeTransform } from '@angular/core';
import { dueText, formatDate, statusColor, statusLabel } from './dates';
import { BookIssue, Role, isMarathi, roleLabel } from './models';

/*
 * Pure pipes for list rows. Unlike a method call in a template, a pure pipe runs again only
 * when its input changes, not on every change detection, which keeps long lists smooth.
 * Rows are replaced (never mutated) when they change, so the pipes always see new values.
 */

/** "Due in 3 days", "Overdue by 2 days", "Returned 4 Oct 2026"… */
@Pipe({ name: 'dueText' })
export class DueTextPipe implements PipeTransform {
  transform(issue: BookIssue) {
    return dueText(issue);
  }
}

/** Ionic colour for an issue's state: success / warning / danger. */
@Pipe({ name: 'statusColor' })
export class StatusColorPipe implements PipeTransform {
  transform(issue: BookIssue) {
    return statusColor(issue);
  }
}

/** Word on an issue's status stamp. */
@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(issue: BookIssue) {
    return statusLabel(issue);
  }
}

/** ISO date as "4 Oct 2026" ("-" when missing). */
@Pipe({ name: 'shortDate' })
export class ShortDatePipe implements PipeTransform {
  transform(isoDate?: string) {
    return formatDate(isoDate);
  }
}

/** Whether a book category gets the Devanagari font. */
@Pipe({ name: 'marathi' })
export class MarathiPipe implements PipeTransform {
  transform(category?: string) {
    return isMarathi(category);
  }
}

@Pipe({ name: 'roleLabel' })
export class RoleLabelPipe implements PipeTransform {
  transform(role: Role) {
    return roleLabel(role);
  }
}

@Pipe({ name: 'roleColor' })
export class RoleColorPipe implements PipeTransform {
  transform(role: Role) {
    return role === 'ADMIN' ? 'primary' : role === 'LIBRARIAN' ? 'warning' : 'medium';
  }
}

/** Up to two initials for an avatar, e.g. "Asha Patil" → "AP". */
@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }
}

/** Soft hues for initials circles, spaced so neighbours in a list look different. */
const AVATAR_HUES = [0, 25, 45, 95, 145, 175, 200, 225, 265, 310];

/** A hue picked from the key (a username), so each person keeps their colour across visits. */
export function avatarHue(key: string): number {
  let hash = 0;
  for (const ch of key) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return AVATAR_HUES[hash % AVATAR_HUES.length];
}

@Pipe({ name: 'avatarHue' })
export class AvatarHuePipe implements PipeTransform {
  transform(key: string) {
    return avatarHue(key);
  }
}
