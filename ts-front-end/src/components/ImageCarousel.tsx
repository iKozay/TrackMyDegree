import { Carousel } from 'react-bootstrap';
import "../styles/LandingPage.css";
import pic1 from '../images/courselistpage.png';
import pic2 from '../images/uploadAcceptanceletter.png';
import pic4 from '../images/timelinepage.png';

const images = [pic1, pic2, pic4];

const ImageCarousel = () => {
  return (
    <Carousel pause={false} data-bs-theme="dark" className="carousel-surround">
      {images.map((image, index) => (
        <Carousel.Item key={image}>
            <img className="carousel-img" src={image} alt={`Slide ${index + 1}`} />
        </Carousel.Item>
      ))}
    </Carousel>
  );
};

export default ImageCarousel;
