import { describe, expect, it } from 'vitest';
import { h, render as preactRender } from 'preact';
import { App } from './App';

describe('App', () => {
  it('renders the Tollab heading', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    preactRender(h(App, null), container);

    expect(container.querySelector('h1')?.textContent).toBe('Tollab');

    preactRender(null, container);
    document.body.removeChild(container);
  });
});
