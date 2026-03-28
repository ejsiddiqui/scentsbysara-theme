const normaliseOptionToken = (value) => String(value ?? '').trim().toLowerCase();

export function getVariantOptionMap(variant) {
  const optionNames = Array.isArray(variant?.optionNames) ? variant.optionNames : [];
  const optionValues = Array.isArray(variant?.options) ? variant.options : [];

  return optionNames.reduce((map, optionName, index) => {
    map[normaliseOptionToken(optionName)] = normaliseOptionToken(optionValues[index]);
    return map;
  }, {});
}

export function getVariantOptionValue(variant, optionName) {
  const optionNames = Array.isArray(variant?.optionNames) ? variant.optionNames : [];
  const optionValues = Array.isArray(variant?.options) ? variant.options : [];
  const targetName = normaliseOptionToken(optionName);
  const optionIndex = optionNames.findIndex((name) => normaliseOptionToken(name) === targetName);

  return optionIndex >= 0 ? optionValues[optionIndex] : '';
}

export function variantMatchesSelection(variant, selectedOptions) {
  const optionMap = getVariantOptionMap(variant);

  return Object.entries(selectedOptions ?? {}).every(([optionName, optionValue]) => {
    const normalisedValue = normaliseOptionToken(optionValue);
    if (!normalisedValue) return true;

    return optionMap[normaliseOptionToken(optionName)] === normalisedValue;
  });
}

export function resolveVariantForSelectionChange({
  variants,
  selectedOptions,
  changedOptionName,
  changedOptionValue,
}) {
  const nextSelections = {
    ...(selectedOptions ?? {}),
    [normaliseOptionToken(changedOptionName)]: normaliseOptionToken(changedOptionValue),
  };

  const exactMatch = variants.find((variant) => variantMatchesSelection(variant, nextSelections));
  if (exactMatch) {
    return exactMatch;
  }

  const changedOptionKey = normaliseOptionToken(changedOptionName);
  const changedOptionTarget = normaliseOptionToken(changedOptionValue);
  const candidates = variants.filter((variant) => {
    const optionMap = getVariantOptionMap(variant);
    return optionMap[changedOptionKey] === changedOptionTarget;
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates
    .map((variant) => {
      const optionMap = getVariantOptionMap(variant);
      const score = Object.entries(nextSelections).reduce((total, [optionName, optionValue]) => {
        const normalisedOptionName = normaliseOptionToken(optionName);
        const normalisedOptionValue = normaliseOptionToken(optionValue);

        if (!normalisedOptionValue || normalisedOptionName === changedOptionKey) {
          return total;
        }

        return total + (optionMap[normalisedOptionName] === normalisedOptionValue ? 1 : 0);
      }, 0);

      return { score, variant };
    })
    .sort((left, right) => right.score - left.score)[0]
    .variant;
}
