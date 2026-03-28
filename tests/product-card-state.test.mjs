import assert from 'node:assert/strict';
import {
  resolveVariantForSelectionChange,
  variantMatchesSelection,
} from '../assets/product-card-state.mjs';

const variants = [
  {
    id: 1,
    url: '/products/test?variant=1',
    options: ['Slim', 'Ivory', 'Amber'],
    optionNames: ['Shape', 'Colour', 'Scent'],
  },
  {
    id: 2,
    url: '/products/test?variant=2',
    options: ['Curvy', 'Ivory', 'Amber'],
    optionNames: ['Shape', 'Colour', 'Scent'],
  },
  {
    id: 3,
    url: '/products/test?variant=3',
    options: ['Curvy', 'Mocha', 'Amber'],
    optionNames: ['Shape', 'Colour', 'Scent'],
  },
];

{
  const nextVariant = resolveVariantForSelectionChange({
    variants,
    selectedOptions: { shape: 'slim', colour: 'ivory', scent: 'amber' },
    changedOptionName: 'shape',
    changedOptionValue: 'curvy',
  });

  assert.equal(nextVariant?.id, 2, 'changing shape should preserve the active colour when possible');
}

{
  const nextVariant = resolveVariantForSelectionChange({
    variants,
    selectedOptions: { shape: 'slim', colour: 'caramel', scent: 'amber' },
    changedOptionName: 'shape',
    changedOptionValue: 'curvy',
  });

  assert.equal(nextVariant?.id, 2, 'when the active colour is unavailable, fall back to a matching shape variant');
}

{
  const doesMatch = variantMatchesSelection(
    variants[2],
    { shape: 'curvy', colour: 'mocha', scent: 'amber' },
  );

  assert.equal(doesMatch, true, 'variant matching should use named options rather than positional assumptions in the caller');
}

console.log('product-card-state tests passed');
