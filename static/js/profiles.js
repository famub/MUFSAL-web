// Script for the profile pages.
//
// Every card on the page behaves the same way:
//   1. It starts as a read-only view, because all its fields are disabled.
//   2. The Edit button turns the fields back on.
//   3. Save checks every field before closing the card.
//   4. Cancel puts back the values the card had before editing started.
//
// Note: there is no database yet, so the values only stay on the page.
// The real saving will be added later with Flask.


// Set up every card on the page
const profileCards = document.querySelectorAll('.profile-card');
profileCards.forEach(setupCard);


function setupCard(card) {
  const form = card.querySelector('form');
  const editButton = card.querySelector('.btn-edit');
  const cancelButton = card.querySelector('.btn-secondary');

  // Some cards are read-only and have no Edit button, like the doctor's
  // verified credentials. There is nothing to set up on those.
  if (!form || !editButton) {
    return;
  }

  // The old values are kept here so Cancel can bring them back
  let oldValues = {};

  editButton.addEventListener('click', function () {
    oldValues = readValues(form);
    openEditMode(card, form);
  });

  cancelButton.addEventListener('click', function () {
    writeValues(form, oldValues);
    clearErrors(form);
    closeEditMode(card, form);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault(); // stops the page from reloading

    // The card goes back to the view only if every field is correct
    if (checkFields(form)) {
      stampUpdatedDate(card);
      closeEditMode(card, form);
    }
  });
}


/* ===== Date of the last save ===== */

// Writes today's date under the card title after a successful save,
// so the doctor can see how old the answers are.
// With Flask this date will come from the database instead.
function stampUpdatedDate(card) {
  const dateText = card.querySelector('.last-updated-date');

  // Not every card shows a date, so there is nothing to do here
  if (!dateText) {
    return;
  }

  // Built from the local date parts on purpose: toISOString() would
  // use UTC and could show yesterday's date late at night.
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  dateText.textContent = year + '-' + month + '-' + day;
}


/* ===== Edit mode ===== */

function openEditMode(card, form) {
  card.classList.add('is-editing');

  getFields(form).forEach(function (field) {
    field.disabled = false;
  });

  // Date of birth is a plain text box in the view, so it turns into
  // a real date picker only while the patient is editing.
  const dateField = form.querySelector('[data-date-field]');
  if (dateField) {
    dateField.type = 'date';
  }
}


function closeEditMode(card, form) {
  card.classList.remove('is-editing');

  getFields(form).forEach(function (field) {
    field.disabled = true;
  });

  const dateField = form.querySelector('[data-date-field]');
  if (dateField) {
    dateField.type = 'text';
  }
}


// All the fields of one card, except the locked ones like Health ID
function getFields(form) {
  return form.querySelectorAll('input:not(.input-locked), select, textarea');
}


/* ===== Checking the fields ===== */

// Goes through the fields of one card and shows an error under each
// wrong one. Returns true only when the whole card is correct.
function checkFields(form) {
  let cardIsCorrect = true;

  getFields(form).forEach(function (field) {
    const message = getErrorMessage(field);

    if (message === '') {
      hideError(field);
    } else {
      showError(field, message);
      cardIsCorrect = false;
    }
  });

  return cardIsCorrect;
}


// Checks one field and gives back the error message to show.
// An empty message means the field is fine.
function getErrorMessage(field) {
  const value = field.value.trim();

  // A required field cannot be left empty
  if (field.hasAttribute('required') && value === '') {
    return 'This field is required.';
  }

  // An empty field that is not required needs no more checking
  if (value === '') {
    return '';
  }

  // Every field says in the HTML which check it needs, with data-check
  const check = field.getAttribute('data-check');

  // Email: English letters only, and it must look like name@example.com
  if (check === 'email') {
    if (hasArabicLetters(value)) {
      return 'Please write the email in English letters.';
    }

    const emailShape = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailShape.test(value)) {
      return 'Please enter a valid email address, for example name@example.com';
    }
  }

  // Phone: a complete Saudi mobile number, with or without the country code
  if (check === 'phone') {
    // Only the digits matter, so spaces and the + sign are removed first
    const digits = value.replace(/[^0-9]/g, '');

    const localNumber = /^05[0-9]{8}$/;             // 05XXXXXXXX
    const numberWithCountryCode = /^9665[0-9]{8}$/; // +966 5XXXXXXXX

    if (!localNumber.test(digits) && !numberWithCountryCode.test(digits)) {
      return 'Please enter a complete mobile number, for example 0512345678';
    }
  }

  // Date of birth: the patient has to be old enough to use MUFSAL.
  // The smallest age is read from data-min-age in the HTML.
  if (field.hasAttribute('data-min-age')) {
    const age = getAge(value);
    const minimumAge = Number(field.getAttribute('data-min-age'));

    if (age < 0) {
      return 'Please enter a valid date of birth.';
    }

    if (age < minimumAge) {
      return 'You must be at least ' + minimumAge + ' years old to use MUFSAL.';
    }
  }

  return '';
}


// True when the text has any Arabic letter in it
function hasArabicLetters(text) {
  const arabicLetters = /[؀-ۿ]/;
  return arabicLetters.test(text);
}


// Works out the age in years from a date written as YYYY-MM-DD
function getAge(dateOfBirth) {
  const birthday = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthday.getFullYear();

  // One year is taken off when this year's birthday has not come yet
  const birthdayPassed =
    today.getMonth() > birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() && today.getDate() >= birthday.getDate());

  if (!birthdayPassed) {
    age = age - 1;
  }

  return age;
}


/* ===== Error messages ===== */

function showError(field, message) {
  const fieldBox = field.closest('.field');
  fieldBox.classList.add('has-error');
  fieldBox.querySelector('.error-message').textContent = message;
}


function hideError(field) {
  const fieldBox = field.closest('.field');
  fieldBox.classList.remove('has-error');
  fieldBox.querySelector('.error-message').textContent = '';
}


function clearErrors(form) {
  getFields(form).forEach(function (field) {
    hideError(field);
  });
}


/* ===== Keeping the old values for the Cancel button ===== */

function readValues(form) {
  const values = {};

  getFields(form).forEach(function (field) {
    values[field.id] = field.value;
  });

  return values;
}


function writeValues(form, values) {
  getFields(form).forEach(function (field) {
    field.value = values[field.id];
  });
}
