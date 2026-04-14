import { describe, it, expect} from 'vitest';
import { render, screen } from '@testing-library/react';
import JourneySection from '../../../src/pages/LandingPage';

describe('JourneySection', () => {
  it('renders the section with header and steps', () => {
    render(<JourneySection />);

    expect(screen.getByText('Your Degree Journey')).toBeInTheDocument();
    expect(
      screen.getByText('From exploration to graduation, we guide you every step of the way')
    ).toBeInTheDocument();

    expect(screen.getByText('Explore Courses')).toBeInTheDocument();
    expect(screen.getByText('Upload Transcript')).toBeInTheDocument();
    expect(screen.getByText('Build Timeline')).toBeInTheDocument();
    expect(screen.getByText('Graduate!')).toBeInTheDocument();

    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('04')).toBeInTheDocument();
  });
});
