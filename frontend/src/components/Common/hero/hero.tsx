import { GiSchoolBag } from "react-icons/gi";
import './hero.css'
import "../button/button.css"
import image from '../../assets/hero.jpg'
import { MdWork } from "react-icons/md";
import Boxs from "../boxs/box";
import { FaGraduationCap } from "react-icons/fa";
import { Link } from "react-router-dom";




const hero = () => {
  const boxData = [
    { icon: <MdWork />, heading: 'Professionals', body: 'Advance your career.' },
  { icon: <GiSchoolBag />, heading: 'Students', body: 'Achieve your academic goals.' },
  { icon: <FaGraduationCap />, heading: 'Teachers', body: 'Enhance your teaching skills.' },
];


  return (
    <div className=" block block--linear block--skewed--left hero">
    <div className="container grid grid--1x2 hero__grid">
      <header className="block__header hero__content">
        <h1 className="block__heading">Peace institute eLearning Platform</h1>
        <p className="hero__tagline">
          learn beyond boundaries .
        </p>
        <Link to="/register" className="btn btn--primary btn--stretched hero__cta">
          Get Started
        </Link>
      </header>

      <div className="hero__media">
        <picture className="hero__picture">
          <img className="hero__image" src={image} alt="Students learning at Peace Institute"/>
        </picture>

        {/* Beginnig of Boxs */}

        <div className="boxs hero__boxes">
          {boxData.map((x) => (
          <Boxs key={x.heading}>
            <span className="icon-containertwo icon--small">{x.icon}</span>
            <h4 className="box__heading">{x.heading}</h4>
          <p className="box__body">{x.body}</p>
          </Boxs>
        ))}
      </div>
      </div>

         {/* End of Boxes */}
    </div>
  </div>
  )
}

export default hero