import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageCarousel from '../../components/ImageCarousel';

// Mock images
jest.mock('../../images/courselistpage.png', () => 'pic1.png');
jest.mock('../../images/uploadAcceptanceletter.png', () => 'pic2.png');
jest.mock('../../images/timelinepage.png', () => 'pic4.png');

// Mock react-bootstrap Carousel
jest.mock('react-bootstrap', () => {
  const React = require('react');
  return {
    Carousel: ({ children, pause, className, ...props }: any) => (
      <div
        data-testid="carousel"
        data-pause={pause}
        data-class={className}
        {...props}
      >
        {children}
      </div>
    ),
  };
});

// Mock Carousel.Item
jest.mock('react-bootstrap', () => {
  const Carousel = ({ children, pause, className, ...props }: any) => (
    <div
      data-testid="carousel"
      data-pause={pause}
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
  it('renders the Carousel component with correct props', () => {
    render(<ImageCarousel />);

    const carousel = screen.getByTestId('carousel');
    expect(carousel).toBeInTheDocument();
    expect(carousel).toHaveAttribute('data-pause', 'false');
    expect(carousel).toHaveAttribute('data-class', 'carousel-surround');
    expect(carousel).toHaveAttribute('data-bs-theme', 'dark');
  });

  it('renders all images inside Carousel.Items', () => {
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
