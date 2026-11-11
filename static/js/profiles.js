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


// The answers this patient gave when registering.
// TODO(backend): read them from the database instead of this sample.
const SAVED_ANSWERS = {
  knee: 'right',
  painWithUse: 'yes',
  stiffnessDuration: 'le30',
  stairs: 'moderate',
  rising: 'mild',
  warnings: ['none'],
  height: 165,
  weight: 72,
  priorInjury: 'no'
};

// The two number fields of the height and weight question
const BODY_FIELDS = [
  { id: 'height', en: 'Height (cm)', ar: 'الطول (سم)' },
  { id: 'weight', en: 'Weight (kg)', ar: 'الوزن (كجم)' }
];


// The questionnaire is built first, so its fields are already on the
// page when the cards below are set up.
buildQuestionnaire();

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

  // Only the medical card holds the questionnaire
  const questionnaire = card.querySelector('#questionnaire');

  // The old values are kept here so Cancel can bring them back
  let oldValues = {};
  let oldAnswers = {};

  editButton.addEventListener('click', function () {
    oldValues = readValues(form);

    if (questionnaire) {
      oldAnswers = readAnswers(questionnaire);
    }

    openEditMode(card, form);
  });

  cancelButton.addEventListener('click', function () {
    writeValues(form, oldValues);

    if (questionnaire) {
      writeAnswers(questionnaire, oldAnswers);
    }

    clearErrors(form);
    closeEditMode(card, form);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault(); // stops the page from reloading

    // Both checks run, so the patient sees every problem at once
    const fieldsAreCorrect = checkFields(form);
    const answersAreCorrect = questionnaire ? checkAnswers(questionnaire) : true;

    // The card goes back to the view only if everything is correct
    if (fieldsAreCorrect && answersAreCorrect) {
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

  getChoices(form).forEach(function (choice) {
    choice.disabled = false;
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

  getChoices(form).forEach(function (choice) {
    choice.disabled = true;
  });

  const dateField = form.querySelector('[data-date-field]');
  if (dateField) {
    dateField.type = 'text';
  }
}


// The plain fields of one card. Locked fields like Health ID stay out,
// and so do the questionnaire choices, which are handled on their own.
function getFields(form) {
  return form.querySelectorAll(
    'input:not(.input-locked):not([type="radio"]):not([type="checkbox"]), select, textarea'
  );
}


// The answer buttons of the questionnaire
function getChoices(form) {
  return form.querySelectorAll('.q-option input');
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


/* ===== Medical questionnaire ===== */

// The questions are not written here. They come from
// static/js/questionnaire.js, the same file the registration form reads,
// so both pages always show exactly the same wording in both languages.

function buildQuestionnaire() {
  const root = document.getElementById('questionnaire');

  // Only the patient profile has a questionnaire
  if (!root || !window.MUFSAL_QUESTIONNAIRE) {
    return;
  }

  MUFSAL_QUESTIONNAIRE.sections.forEach(function (section) {
    const box = document.createElement('div');
    box.className = 'q-section';
    box.appendChild(dualText('h3', section));

    section.questions.forEach(function (question) {
      box.appendChild(buildQuestion(question));
    });

    root.appendChild(box);
  });

  writeAnswers(root, SAVED_ANSWERS);
}


function buildQuestion(question) {
  const item = document.createElement('div');
  item.className = 'q-item';
  item.dataset.qid = question.id;
  item.appendChild(dualText('p', question, 'q-question'));

  // Height and weight are two number fields, not a list of answers
  if (question.type === 'body') {
    item.appendChild(buildBodyFields());
    return item;
  }

  const options = document.createElement('div');
  options.className = 'q-options';

  question.options.forEach(function (option) {
    const label = document.createElement('label');
    label.className = 'q-option';

    const input = document.createElement('input');
    input.type = question.type === 'single' ? 'radio' : 'checkbox';
    input.name = question.id;
    input.value = option.v;
    input.disabled = true; // the page opens in view mode

    label.appendChild(input);
    label.appendChild(dualText('span', option));
    options.appendChild(label);
  });

  item.appendChild(options);

  const error = document.createElement('p');
  error.className = 'error-message';
  item.appendChild(error);

  // A box for anything the list of answers does not cover
  if (question.other) {
    item.appendChild(buildOtherField(question, options));
  }

  // A question with several answers needs two extra rules
  if (question.type === 'multi') {
    const notice = dualText('p', MUFSAL_QUESTIONNAIRE.warningNotice, 'notice');
    item.appendChild(notice);

    options.addEventListener('change', function (event) {
      applyExclusiveChoice(options, question, event.target);
      notice.classList.toggle('is-visible', hasUrgentChoice(options, question));
    });
  }

  return item;
}


// A free text box under a question, so the patient can describe
// something the ready-made answers do not cover
function buildOtherField(question, options) {
  const box = document.createElement('div');
  box.className = 'field q-other';

  const label = dualText('label', question.other.label);
  label.htmlFor = question.id + '-other';

  const text = document.createElement('textarea');
  text.id = question.id + '-other';
  text.rows = 2;
  text.disabled = true;
  text.placeholder = question.other.placeholder[currentLanguage()];

  // Writing something here means the answer is not "None of these"
  text.addEventListener('input', function () {
    if (text.value.trim() === '') {
      return;
    }

    const noneChoice = options.querySelector('input[value="' + question.exclusive + '"]');
    if (noneChoice) {
      noneChoice.checked = false;
    }
  });

  // Every .field needs this line, because showError and hideError
  // write the message into it
  const error = document.createElement('p');
  error.className = 'error-message';

  box.appendChild(label);
  box.appendChild(text);
  box.appendChild(error);

  return box;
}


// "None of these" cannot be chosen together with the other answers
function applyExclusiveChoice(options, question, changed) {
  if (!changed.checked) {
    return;
  }

  if (changed.value === question.exclusive) {
    options.querySelectorAll('input').forEach(function (input) {
      if (input !== changed) {
        input.checked = false;
      }
    });

    // "None of these" also clears anything typed in the other box
    const otherField = document.getElementById(question.id + '-other');
    if (otherField) {
      otherField.value = '';
    }
    return;
  }

  const noneChoice = options.querySelector('input[value="' + question.exclusive + '"]');
  if (noneChoice) {
    noneChoice.checked = false;
  }
}


// True when an answer that needs urgent care is ticked
function hasUrgentChoice(options, question) {
  if (!question.urgent) {
    return false;
  }

  return question.urgent.some(function (value) {
    const choice = options.querySelector('input[value="' + value + '"]');
    return choice && choice.checked;
  });
}


function buildBodyFields() {
  const row = document.createElement('div');
  row.className = 'bmi-row';

  BODY_FIELDS.forEach(function (bodyField) {
    const box = document.createElement('div');
    box.className = 'field';

    const label = dualText('label', bodyField);
    label.htmlFor = bodyField.id;

    const input = document.createElement('input');
    input.type = 'number';
    input.id = bodyField.id;
    input.inputMode = 'decimal';
    input.required = true;
    input.disabled = true;
    input.addEventListener('input', showBmi);

    const error = document.createElement('p');
    error.className = 'error-message';

    box.appendChild(label);
    box.appendChild(input);
    box.appendChild(error);
    row.appendChild(box);
  });

  const bmi = document.createElement('p');
  bmi.className = 'bmi-text';
  bmi.id = 'bmi-text';
  row.appendChild(bmi);

  return row;
}


// Shows the BMI under the height and weight fields
function showBmi() {
  const bmiText = document.getElementById('bmi-text');
  const height = Number(document.getElementById('height').value);
  const weight = Number(document.getElementById('weight').value);

  // Nothing is shown until both numbers make sense
  if (height < 50 || weight < 10) {
    bmiText.textContent = '';
    return;
  }

  const metres = height / 100;
  bmiText.textContent = 'BMI: ' + Math.round((weight / (metres * metres)) * 10) / 10;
}


/* ===== Reading and writing the answers ===== */

// Reads the answers as they are chosen right now, so Cancel can
// put them back afterwards
function readAnswers(root) {
  const answers = {};

  root.querySelectorAll('.q-item').forEach(function (item) {
    const chosen = item.querySelectorAll('.q-option input:checked');

    answers[item.dataset.qid] = Array.from(chosen).map(function (input) {
      return input.value;
    });
  });

  return answers;
}


function writeAnswers(root, answers) {
  root.querySelectorAll('.q-item').forEach(function (item) {
    const saved = answers[item.dataset.qid];

    // A question with one answer saves a single value,
    // a question with several saves a list
    let chosen = [];
    if (Array.isArray(saved)) {
      chosen = saved;
    } else if (saved) {
      chosen = [saved];
    }

    item.querySelectorAll('.q-option input').forEach(function (input) {
      input.checked = chosen.indexOf(input.value) !== -1;
    });
  });

  setBodyValue(root, 'height', answers.height);
  setBodyValue(root, 'weight', answers.weight);
  showBmi();
}


function setBodyValue(root, id, value) {
  const field = root.querySelector('#' + id);

  if (field && value !== undefined) {
    field.value = value;
  }
}


// Every question has to be answered before the card can be saved
function checkAnswers(root) {
  let allAnswered = true;

  root.querySelectorAll('.q-item').forEach(function (item) {
    // Height and weight are checked with the other plain fields
    if (item.querySelector('.bmi-row')) {
      return;
    }

    const error = item.querySelector('.error-message');

    // Describing other symptoms counts as an answer too
    const otherField = item.querySelector('.q-other textarea');
    const hasOther = otherField && otherField.value.trim() !== '';

    if (item.querySelector('.q-option input:checked') || hasOther) {
      item.classList.remove('has-error');
      error.textContent = '';
    } else {
      item.classList.add('has-error');
      error.textContent = 'Please choose an answer.';
      allAnswered = false;
    }
  });

  return allAnswered;
}


/* ===== Both languages ===== */

// Which language the site is showing, read the same way auth.js reads it
function currentLanguage() {
  try {
    return localStorage.getItem('mufsal-lang') === 'ar' ? 'ar' : 'en';
  } catch (e) {
    return 'en';
  }
}


// Builds an element that carries both languages, so the language
// switch can reach the questions later on
function dualText(tag, texts, className) {
  const element = document.createElement(tag);

  element.className = className ? className + ' i18n-dual' : 'i18n-dual';
  element.dataset.en = texts.en;
  element.dataset.ar = texts.ar;
  element.textContent = texts[currentLanguage()];

  return element;
}
