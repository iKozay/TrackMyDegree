import React from 'react';
import { Carousel } from 'react-bootstrap';
import '../css/Carousel.css';
import pic1 from '../images/courseListExample.png';
import pic2 from '../images/TimelineExample2.png';
import pic3 from '../images/uploadTranscriptExample.png';
import pic4 from '../images/TimelineInitialExample.png';

const images = [pic1, pic2, pic3, pic4];

const ImageCarousel = () => {
  return (
    <Carousel data-bs-theme="dark" className="carousel-surround">
      {images.map((image, index) => (
        <Carousel.Item key={index}>
          <img
            className="carousel-img"
            src={image}
            alt={`Slide ${index + 1}`}
          />
        </Carousel.Item>
      ))}
    </Carousel>
  );
};

export default ImageCarousel;
