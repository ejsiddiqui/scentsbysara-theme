const selector = '[data-accordion][data-accordion-group]';
const transitionDurationMs = 240;

function getAccordionParts(details) {
  const summary = details.querySelector(':scope > summary');
  const body = details.querySelector(':scope > .accordion-body');
  const bodyInner = body?.querySelector('.accordion-body__inner');

  return { summary, body, bodyInner };
}

function setExpandedState(details, isExpanded) {
  details.dataset.accordionExpanded = isExpanded ? 'true' : 'false';

  const { summary } = getAccordionParts(details);

  if (summary) {
    summary.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  }
}

function finishAnimation(details) {
  const { body } = getAccordionParts(details);

  if (!body) {
    return;
  }

  if (details.dataset.accordionExpanded === 'true') {
    body.style.height = 'auto';
    details.open = true;
  } else {
    body.style.height = '';
    details.open = false;
  }

  details.dataset.accordionAnimating = 'false';
}

function runAnimation(details, targetHeight, shouldStayOpen) {
  const { body } = getAccordionParts(details);

  if (!body) {
    return;
  }

  window.clearTimeout(Number(details.dataset.accordionTimer || 0));
  details.dataset.accordionAnimating = 'true';

  if (shouldStayOpen) {
    details.open = true;
  }

  requestAnimationFrame(() => {
    body.style.height = `${targetHeight}px`;
  });

  const timer = window.setTimeout(() => {
    finishAnimation(details);
  }, transitionDurationMs + 40);

  details.dataset.accordionTimer = String(timer);
}

function openAccordion(details) {
  const { body, bodyInner } = getAccordionParts(details);

  if (!body || !bodyInner) {
    details.open = true;
    setExpandedState(details, true);
    return;
  }

  details.open = true;
  body.style.height = '0px';
  setExpandedState(details, true);
  body.getBoundingClientRect();
  runAnimation(details, bodyInner.scrollHeight, true);
}

function closeAccordion(details) {
  const { body, bodyInner } = getAccordionParts(details);

  if (!body || !bodyInner) {
    details.open = false;
    setExpandedState(details, false);
    return;
  }

  const currentHeight = body.getBoundingClientRect().height || bodyInner.scrollHeight;

  details.open = true;
  body.style.height = `${currentHeight}px`;
  body.getBoundingClientRect();
  setExpandedState(details, false);
  runAnimation(details, 0, true);
}

function closeOthers(activeDetails) {
  const groupName = activeDetails.dataset.accordionGroup;

  if (!groupName) {
    return;
  }

  document.querySelectorAll(`${selector}[data-accordion-group="${groupName}"]`).forEach((details) => {
    const isPersistent = details.dataset.accordionPersistent === 'true';
    const isExpanded = details.dataset.accordionExpanded === 'true' || details.open;

    if (details !== activeDetails && !isPersistent && isExpanded) {
      closeAccordion(details);
    }
  });
}

function initAnimatedAccordion(details) {
  const { summary, body, bodyInner } = getAccordionParts(details);

  if (!summary || !body || !bodyInner) {
    setExpandedState(details, details.open);

    details.addEventListener('toggle', () => {
      setExpandedState(details, details.open);

      if (details.open) {
        closeOthers(details);
      }
    });
    return;
  }

  details.dataset.accordionEnhanced = 'true';

  const isPersistent = details.dataset.accordionPersistent === 'true';
  const isExpanded = isPersistent || details.open;

  setExpandedState(details, isExpanded);
  details.dataset.accordionAnimating = 'false';
  body.style.height = isExpanded ? 'auto' : '0px';
  details.open = isExpanded;

  if (isPersistent) {
    summary.setAttribute('aria-disabled', 'true');
    return;
  }

  summary.addEventListener('click', (event) => {
    event.preventDefault();

    if (details.dataset.accordionAnimating === 'true') {
      return;
    }

    const shouldOpen = details.dataset.accordionExpanded !== 'true';

    if (shouldOpen) {
      closeOthers(details);
      openAccordion(details);
      return;
    }

    closeAccordion(details);
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      if (details.dataset.accordionExpanded === 'true' && body.style.height !== 'auto') {
        body.style.height = `${bodyInner.scrollHeight}px`;
      }
    });

    observer.observe(bodyInner);
  }
}

function initAccordion(details) {
  if (details.dataset.accordionInitialized === 'true') {
    return;
  }

  details.dataset.accordionInitialized = 'true';
  initAnimatedAccordion(details);
}

document.querySelectorAll(selector).forEach(initAccordion);

export {};
