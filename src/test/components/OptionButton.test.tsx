import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OptionButton from '../../components/OptionButton';
import { LexicalWord } from '../../types/lexical';

const mockWord: LexicalWord = {
  id: 1,
  group_id: 1,
  word: 'prueba',
  learner_level: null,
  frequency: null,
  register: null,
  dialect: null,
  status: null,
  note: null,
};

describe('OptionButton', () => {
  it('renders the word text', () => {
    render(<OptionButton word={mockWord} onClick={() => {}} />);
    expect(screen.getByText('prueba')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<OptionButton word={mockWord} onClick={handleClick} />);

    await userEvent.click(screen.getByRole('option'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    render(<OptionButton word={mockWord} onClick={handleClick} disabled />);

    await userEvent.click(screen.getByRole('option'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has correct aria-label with status', () => {
    render(<OptionButton word={mockWord} onClick={() => {}} status="correct" />);
    expect(screen.getByLabelText(/prueba/i)).toBeInTheDocument();
  });

  it('has aria-selected when status is not neutral', () => {
    render(<OptionButton word={mockWord} onClick={() => {}} status="correct" />);
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  });

  it('handles keyboard Enter key', async () => {
    const handleClick = vi.fn();
    render(<OptionButton word={mockWord} onClick={handleClick} />);

    const button = screen.getByRole('option');
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalled();
  });

  it('handles keyboard Space key', async () => {
    const handleClick = vi.fn();
    render(<OptionButton word={mockWord} onClick={handleClick} />);

    const button = screen.getByRole('option');
    button.focus();
    await userEvent.keyboard(' ');
    expect(handleClick).toHaveBeenCalled();
  });
});