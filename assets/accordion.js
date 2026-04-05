const selector = '[data-accordion][data-accordion-group]';

function closeOthers(activeDetails) {
  const groupName = activeDetails.dataset.accordionGroup;

  if (!groupName || !activeDetails.open) {
    return;
  }

  document.querySelectorAll(`${selector}[data-accordion-group="${groupName}"]`).forEach((details) => {
    if (details !== activeDetails && details.dataset.accordionPersistent !== 'true') {
      details.open = false;
    }
  });
}

function initAccordion(details) {
  if (details.dataset.accordionInitialized === 'true') {
    return;
  }

  details.dataset.accordionInitialized = 'true';
  details.addEventListener('toggle', () => closeOthers(details));
}

document.querySelectorAll(selector).forEach(initAccordion);

export {};
