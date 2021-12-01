import { Directive, HostBinding, Input, OnInit, Optional } from '@angular/core';
import { AbstractControl, ControlContainer } from '@angular/forms';

import { findFormControl } from '../util/findFormControl';

/**
 * Directive that sets the `aria-invalid` and `aria-errormessage` attributes
 * when the form control is invalid and touched or dirty.
 *
 * https://w3c.github.io/aria/#aria-invalid
 * https://w3c.github.io/aria/#aria-errormessage
 *
 * Expects that the element either has a `formControl` or `formControlName` input.
 *
 * Expects the id of the element that contains the error messages.
 *
 * Usage examples:
 *
 *   <input [formControl]="usernameFormControl" appErrorMessage="username-errors">
 *   <input formControlName="username"  appErrorMessage="username-errors">
 *   <div id="username-errors">…</div>
 */
@Directive({
  selector: '[appErrorMessage]',
})
export class ErrorMessageDirective implements OnInit {
  /*
  aria-invalid marque le contrôle comme non valide pour les technologies d'assistance telles que les lecteurs d'écran.
  */
  @HostBinding('attr.aria-invalid') // met à jour : aria-invalid à true ou null
  get ariaInvalid(): true | null {
    return this.isActive() ? true : null;
  }

  /*
  aria-errormessage pointe vers un autre élément qui contient les messages d'erreur.
  */
  @HostBinding('attr.aria-errormessage')
  get ariaErrormessage(): string | null {
    return this.isActive() && this.appErrorMessage ? this.appErrorMessage : null;
  }

  @Input()
  public appErrorMessage?: string; // ex: "email-errors"

  @Input()
  public formControl?: AbstractControl;

  @Input()
  public formControlName?: string; // ex: email

  private control?: AbstractControl;

  constructor(@Optional() private controlContainer?: ControlContainer) {}

  public ngOnInit(): void {
    this.control = findFormControl(
      this.formControl,
      this.formControlName,
      this.controlContainer,
    );
  }

  /**
   * Whether link to the errors is established.
   */
  private isActive(): boolean {
    const { control } = this;
    return control !== undefined && control.invalid && (control.touched || control.dirty);
  }
}
