import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/preact';
import { App } from './App';

describe('App', () => {
  it('renders the Tollab heading', () => {
    const { getByText } = render(<App />);
    expect(getByText('Tollab')).toBeInTheDocument();
  });
});
