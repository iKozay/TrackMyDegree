import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from "vitest";
import ImageCarousel from '../../components/ImageCarousel';

vi.mock('../../images/courselistpage.png', () => ({
  default: 'pic1.png',
}));
vi.mock('../../images/uploadAcceptanceletter.png', () => ({
  default: 'pic2.png',
}));
vi.mock('../../images/timelinepage.png', () => ({
  default: 'pic4.png',
}));

vi.mock('react-bootstrap', async () => {
  const Carousel = ({ children, pause, className, ...props }: any) => (
    <div
      data-testid="carousel"
      data-pause={String(pause)}
      data-class={className}
      {...props}
    >
      {children}
    </div>
  );

  Carousel.Item = ({ children }: any) => (
    <div data-testid="carousel-item">{children}</div>
  );

  return { Carousel };
});

describe('ImageCarousel', () => {
  it('renders the Carousel with correct props', () => {
    render(<ImageCarousel />);

    const carousel = screen.getByTestId('carousel');

    expect(carousel).toBeInTheDocument();
    expect(carousel).toHaveAttribute('data-pause', 'false');
    expect(carousel).toHaveAttribute('data-class', 'carousel-surround');
    expect(carousel).toHaveAttribute('data-bs-theme', 'dark');
  });

  it('renders all images with correct src and alt', () => {
    render(<ImageCarousel />);

    const images = screen.getAllByRole('img');

    expect(images).toHaveLength(3);

    expect(images[0]).toHaveAttribute('src', 'pic1.png');
    expect(images[0]).toHaveAttribute('alt', 'Slide 1');

    expect(images[1]).toHaveAttribute('src', 'pic2.png');
    expect(images[1]).toHaveAttribute('alt', 'Slide 2');

    expect(images[2]).toHaveAttribute('src', 'pic4.png');
    expect(images[2]).toHaveAttribute('alt', 'Slide 3');
  });

  it('renders correct number of Carousel.Item components', () => {
    render(<ImageCarousel />);

    const items = screen.getAllByTestId('carousel-item');
    expect(items).toHaveLength(3);
  });
});
