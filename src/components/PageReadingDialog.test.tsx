import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { PageReadingDialog } from './PageReadingDialog';

afterEach(cleanup);

/** Mirrors the reader: the menu asks for a page, the reader shows it back. */
const open = (start: number) => {
  const onGoToPage = vi.fn();
  const Harness = () => {
    const [page, setPage] = useState(start);
    return (
      <PageReadingDialog
        open
        onOpenChange={vi.fn()}
        page={page}
        pageStart={1}
        pageEnd={5}
        maxVerse={286}
        onPlay={vi.fn()}
        onGoToPage={(p) => {
          onGoToPage(p);
          setPage(p);
        }}
        onGoToSurah={vi.fn()}
      />
    );
  };
  render(<Harness />);
  return onGoToPage;
};

describe('Reading menu page stepper', () => {
  it('shows the page number without a keyboard field, so no numeric keypad pops up', () => {
    open(2);
    const display = screen.getByLabelText('Numéro de page');
    expect(display.tagName).not.toBe('INPUT');
    expect(display.textContent).toBe('2');
    // Opening the menu must not focus a text field (that is what raised the keypad).
    expect(document.activeElement?.tagName).not.toBe('INPUT');
  });

  it('moves to the next page with the left arrow and to the previous page with the right arrow', () => {
    const onGoToPage = open(2);
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    expect(onGoToPage).toHaveBeenLastCalledWith(3);
    expect(screen.getByLabelText('Numéro de page').textContent).toBe('3');
    fireEvent.click(screen.getByRole('button', { name: 'Page précédente' }));
    expect(onGoToPage).toHaveBeenLastCalledWith(2);
    expect(screen.getByLabelText('Numéro de page').textContent).toBe('2');
  });

  it('never leaves the Mushaf: page 1 stays on 1, page 604 stays on 604', () => {
    const first = open(1);
    fireEvent.click(screen.getByRole('button', { name: 'Page précédente' }));
    expect(first).toHaveBeenLastCalledWith(1);
    expect(screen.getByLabelText('Numéro de page').textContent).toBe('1');
    cleanup();
    const last = open(604);
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    expect(last).toHaveBeenLastCalledWith(604);
    expect(screen.getByLabelText('Numéro de page').textContent).toBe('604');
  });
});
