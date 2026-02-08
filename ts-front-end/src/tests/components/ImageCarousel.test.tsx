import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from '@testing-library/react';
import ImageCarousel from '../../components/ImageCarousel';

vi.mock('../../images/courselistpage.png', () => 'mock-pic1.jpg');
vi.mock('../../images/uploadAcceptanceletter.png', () => 'mock-pic2.jpg');
vi.mock('../../images/timelinepage.png', () => 'mock-pic4.jpg');

vi.mock('react-bootstrap', () => ({
  Carousel: ({ children, ...props }: any) => (
    <div data-testid="carousel" {...props}>
      {children}
    </div>
  ),
  CarouselItem: ({ children, ...props }: any) => (
    <div data-testid="carousel-item" {...props}>
      {children}
    </div>
  ),
}));

describe('ImageCarousel', () => {
  const mockImages = ['mock-pic1.jpg', 'mock-pic2.jpg', 'mock-pic4.jpg'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Carousel with correct props', () => {
    render(<ImageCarousel />);
    
    const carousel = screen.getByTestId('carousel');
    expect(carousel).toHaveAttribute('pause', 'false');
    expect(carousel).toHaveAttribute('data-bs-theme', 'dark');
    expect(carousel).toHaveClass('carousel-surround');
  });

  it('renders exactly 3 Carousel.Item components', () => {
    render(<ImageCarousel />);
    
    const items = screen.getAllByTestId('carousel-item');
    expect(items).toHaveLength(3);
  });

  it('renders images array with correct number of elements (3)', () => {
    render(<ImageCarousel />);
    
    const items = screen.getAllByTestId('carousel-item');
    expect(items).toHaveLength(3);
  });

  it.each([0, 1, 2])('renders Carousel.Item %i with correct key and img', (index) => {
    render(<ImageCarousel />);
    
    const items = screen.getAllByTestId('carousel-item');
    const item = items[index];
    
    expect(item).toHaveAttribute('key', index.toString());
    
    const img = item.querySelector('img.carousel-img');
    expect(img).toHaveAttribute('src', mockImages[index]);
    expect(img).toHaveAttribute('alt', `Slide ${index + 1}`);
    expect(img).toHaveClass('carousel-img');
  });

  it('maps over images array correctly', () => {
    render(<ImageCarousel />);
    
    const items = screen.getAllByTestId('carousel-item');
    expect(items).toHaveLength(mockImages.length);
    
    items.forEach((item, index) => {
      const img = item.querySelector('img');
      expect(img).toHaveAttribute('alt', `Slide ${index + 1}`);
    });
  });

  it('component renders without crashing', () => {
    expect(() => render(<ImageCarousel />)).not.toThrow();
  });
});
