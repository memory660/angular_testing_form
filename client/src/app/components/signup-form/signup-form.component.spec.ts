import { DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ErrorMessageDirective } from 'src/app/directives/error-message.directive';
import { PasswordStrength, SignupService } from 'src/app/services/signup.service';
import {
  click,
  dispatchFakeEvent,
  expectText,
  findEl,
  checkField,
  setFieldValue,
} from 'src/app/spec-helpers/element.spec-helper';
import {
  addressLine1,
  addressLine2,
  city,
  country,
  email,
  name,
  password,
  postcode,
  region,
  signupData,
  username,
} from 'src/app/spec-helpers/signup-data.spec-helper';

import { ControlErrorsComponent } from '../control-errors/control-errors.component';
import { SignupFormComponent } from './signup-form.component';

const requiredFields = [
  'username',
  'email',
  'name',
  'addressLine2',
  'city',
  'postcode',
  'country',
  'tos',
];

const weakPassword: PasswordStrength = {
  score: 2,
  warning: 'too short',
  suggestions: ['try a longer password'],
};

const strongPassword: PasswordStrength = {
  score: 4,
  warning: '',
  suggestions: [],
};

describe('SignupFormComponent', () => {
  let fixture: ComponentFixture<SignupFormComponent>;
  let signupService: jasmine.SpyObj<SignupService>;

  /*
  La fonction setup nous permet d'écraser le faux comportement. Elle accepte un objet avec les valeurs de retour de la méthode SignupService.
  */
  const setup = async (
    signupServiceReturnValues?: jasmine.SpyObjMethodNames<SignupService>,
  ) => {
    signupService = jasmine.createSpyObj<SignupService>('SignupService', {
      // Successful responses per default
      isUsernameTaken: of(false),
      isEmailTaken: of(false),
      getPasswordStrength: of(strongPassword),
      signup: of({ success: true }),
      // Overwrite with given return values
      ...signupServiceReturnValues,
    });

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [SignupFormComponent, ControlErrorsComponent, ErrorMessageDirective],
      providers: [{ provide: SignupService, useValue: signupService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupFormComponent);
    fixture.detectChanges();
  };

  const fillForm = () => {
    setFieldValue(fixture, 'username', username);
    setFieldValue(fixture, 'email', email);
    setFieldValue(fixture, 'password', password);
    setFieldValue(fixture, 'name', name);
    setFieldValue(fixture, 'addressLine1', addressLine1);
    setFieldValue(fixture, 'addressLine2', addressLine2);
    setFieldValue(fixture, 'city', city);
    setFieldValue(fixture, 'postcode', postcode);
    setFieldValue(fixture, 'region', region);
    setFieldValue(fixture, 'country', country);
    checkField(fixture, 'tos', true);
  };

  /*
    Marquer comme touché
    si un champ est focalisé et perd à nouveau le focus, Angular le considère comme touché.
    Sous le capot, Angular écoute l'événement blur.
  */
  const markFieldAsTouched = (element: DebugElement) => {
    dispatchFakeEvent(element.nativeElement, 'blur');
  };

  // Enveloppe une fonction à exécuter dans la zone fakeAsync
  /*
  La fonction Angular fakeAsync permet de contrôler l'"Event Loop" et le "Timer" 🎉.
  Elle utilise également une "Zone" (Cf. Zone.JS) mais contrairement à la fonction async, celle-ci n'attend pas la fin d'exécution des traitements asynchrones
  mais déclenche des erreurs à la fin de la "spec" si des traitements sont encore en attente.

  tick() & flush() : La fonction fakeAsync est accompagnée des deux fonctions tick et flush qui permettent de contrôler la "Fake Event Loop" créée par la fonction fakeAsync.
  - tick() : La fonction tick permet de déclencher le prochain traitement en attente dans la "queue" de l'"Event Loop" :
  - tick(ms) : La fonction tick permet également de simuler l'attente en lui donnant en paramètre le nombre de millisecondes à simuler.
  */

  // Successful submission
  it('submits the form successfully', fakeAsync(async () => {
    await setup(); // fake signupService qui sera utilisé edans : signup-form.component

    fillForm(); // (1) rempli le formulbmaire
    fixture.detectChanges();

    expect(findEl(fixture, 'submit').properties.disabled).toBe(true); // submit est desactivé

    //
    // le process de validation est en cours pour savoir si le formulaire est ok ou pas !
    //
    // Wait for async validators
    tick(1000);
    // Pour déclencher la détection de changement
    fixture.detectChanges();

    expect(findEl(fixture, 'submit').properties.disabled).toBe(false); // submit est activé

    findEl(fixture, 'form').triggerEventHandler('submit', {}); // clic sur submit
    fixture.detectChanges();

    // HTML
    // data-testid="status"
    // contenu de la balise = 'Sign-up successful!'
    expectText(fixture, 'status', 'Sign-up successful!');

    // .toHaveBeenCalledWith pour vous assurer qu'une fonction fictive a été appelée avec des arguments spécifiques.
    expect(signupService.isUsernameTaken).toHaveBeenCalledWith(username);
    expect(signupService.isEmailTaken).toHaveBeenCalledWith(email);
    expect(signupService.getPasswordStrength).toHaveBeenCalledWith(password);
    expect(signupService.signup).toHaveBeenCalledWith(signupData);
  }));

  // do not submit the invalid form
  it('does not submit an invalid form', fakeAsync(async () => {
    await setup();

    // Wait for async validators
    tick(1000);

    findEl(fixture, 'form').triggerEventHandler('submit', {});

    expect(signupService.isUsernameTaken).not.toHaveBeenCalled();
    expect(signupService.isEmailTaken).not.toHaveBeenCalled();
    expect(signupService.getPasswordStrength).not.toHaveBeenCalled();
    expect(signupService.signup).not.toHaveBeenCalled();
  }));

  // Submission failure
  it('handles signup failure', fakeAsync(async () => {
    await setup({
      // Let the API report a failure
      signup: throwError(new Error('Validation failed')),
    });

    fillForm();

    // Wait for async validators
    tick(1000);

    findEl(fixture, 'form').triggerEventHandler('submit', {});
    fixture.detectChanges();

    expectText(fixture, 'status', 'Sign-up error');

    expect(signupService.isUsernameTaken).toHaveBeenCalledWith(username);
    expect(signupService.getPasswordStrength).toHaveBeenCalledWith(password);
    expect(signupService.signup).toHaveBeenCalledWith(signupData);
  }));

  it('marks fields as required', async () => {
    await setup();

    // Mark required fields as touched
    requiredFields.forEach((testId) => {
      markFieldAsTouched(findEl(fixture, testId));
    });
    fixture.detectChanges();

    requiredFields.forEach((testId) => {
      const el = findEl(fixture, testId);

      // Check aria-required attribute
      expect(el.attributes['aria-required']).toBe(
        'true',
        `${testId} must be marked as aria-required`,
      );

      // Check aria-errormessage attribute
      const errormessageId = el.attributes['aria-errormessage'];
      if (!errormessageId) {
        throw new Error(`Error message id for ${testId} not present`);
      }
      // Check element with error message
      const errormessageEl = document.getElementById(errormessageId);
      if (!errormessageEl) {
        throw new Error(`Error message element for ${testId} not found`);
      }
      if (errormessageId === 'tos-errors') {
        expect(errormessageEl.textContent).toContain(
          'Please accept the Terms and Services',
        );
      } else {
        expect(errormessageEl.textContent).toContain('must be given');
      }
    });
  });

  it('fails if the username is taken', fakeAsync(async () => {
    await setup({
      // Let the API return that the username is taken
      isUsernameTaken: of(true),
    });

    fillForm();

    // Wait for async validators
    tick(1000);
    fixture.detectChanges();

    expect(findEl(fixture, 'submit').properties.disabled).toBe(true);

    findEl(fixture, 'form').triggerEventHandler('submit', {});

    expect(signupService.isUsernameTaken).toHaveBeenCalledWith(username);
    expect(signupService.isEmailTaken).toHaveBeenCalledWith(email);
    expect(signupService.getPasswordStrength).toHaveBeenCalledWith(password);
    expect(signupService.signup).not.toHaveBeenCalled();
  }));

  it('fails if the email is taken', fakeAsync(async () => {
    await setup({
      // Let the API return that the email is taken
      isEmailTaken: of(true),
    });

    fillForm();

    // Wait for async validators
    tick(1000);
    fixture.detectChanges();

    expect(findEl(fixture, 'submit').properties.disabled).toBe(true);

    findEl(fixture, 'form').triggerEventHandler('submit', {});

    expect(signupService.isUsernameTaken).toHaveBeenCalledWith(username);
    expect(signupService.isEmailTaken).toHaveBeenCalledWith(email);
    expect(signupService.getPasswordStrength).toHaveBeenCalledWith(password);
    expect(signupService.signup).not.toHaveBeenCalled();
  }));

  it('fails if the password is too weak', fakeAsync(async () => {
    await setup({
      // Let the API return that the password is weak
      getPasswordStrength: of(weakPassword),
    });

    fillForm();

    // Wait for async validators
    tick(1000);
    fixture.detectChanges();

    expect(findEl(fixture, 'submit').properties.disabled).toBe(true);

    findEl(fixture, 'form').triggerEventHandler('submit', {});

    expect(signupService.isUsernameTaken).toHaveBeenCalledWith(username);
    expect(signupService.isEmailTaken).toHaveBeenCalledWith(email);
    expect(signupService.getPasswordStrength).toHaveBeenCalledWith(password);
    expect(signupService.signup).not.toHaveBeenCalled();
  }));

  it('requires address line 1 for business and non-profit plans', async () => {
    await setup();

    // Initial state (personal plan)
    const addressLine1El = findEl(fixture, 'addressLine1');
    expect('ng-invalid' in addressLine1El.classes).toBe(false);
    expect('aria-required' in addressLine1El.attributes).toBe(false);

    // Change plan to business
    checkField(fixture, 'plan-business', true);
    fixture.detectChanges();

    expect(addressLine1El.attributes['aria-required']).toBe('true');
    expect(addressLine1El.classes['ng-invalid']).toBe(true);

    // Change plan to non-profit
    checkField(fixture, 'plan-non-profit', true);
    fixture.detectChanges();

    expect(addressLine1El.attributes['aria-required']).toBe('true');
    expect(addressLine1El.classes['ng-invalid']).toBe(true);
  });

  it('toggles the password display', async () => {
    await setup();

    setFieldValue(fixture, 'password', 'top secret');
    const passwordEl = findEl(fixture, 'password');
    expect(passwordEl.attributes.type).toBe('password');

    click(fixture, 'show-password');
    fixture.detectChanges();

    expect(passwordEl.attributes.type).toBe('text');

    click(fixture, 'show-password');
    fixture.detectChanges();

    expect(passwordEl.attributes.type).toBe('password');
  });
});
