import { FaArrowRight, FaBookOpen, FaGraduationCap, FaUserTie } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import heroImage from '../../../assets/hero.svg';
import './hero.css';


export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero__glow hero__glow--top" aria-hidden="true" />
      <div className="hero__glow hero__glow--bottom" aria-hidden="true" />

      <div className="hero__container">
        <div className="hero__grid">
          <div className="hero__content">
            <h1 id="hero-heading" className="hero__heading">
              Learn without limits. <span>Grow with purpose.</span>
            </h1>
            <p className="hero__description">
              Flexible, expert-led learning that helps you build skills, meet your goals, and make an impact.
            </p>

            <div className="hero__actions">
              <Link to="/register" className="hero__button hero__button--primary">
                Start learning <FaArrowRight aria-hidden="true" />
              </Link>
              <Link to="/student/courses" className="hero__button hero__button--secondary">
                Explore courses
              </Link>
            </div>
          </div>

          <div className="hero__visual">
            <div className="hero__image-frame">
              <img
                className="hero__image"
                src={heroImage}
                alt="Illustration of students learning online"
              />
            </div>
            <div className="hero__achievement">
              <span className="hero__achievement-icon" aria-hidden="true">
                <FaGraduationCap />
              </span>
              <span>
                <strong>Learn your way</strong>
                <small>Anywhere, anytime</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
