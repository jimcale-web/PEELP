import { Link } from 'react-router-dom'
import './callout.css'

const callout = () => {
  return (
    <div className=" callout callout--primary">
  <div className=" container grid grid--1x2">
    <div className="callout__content">
      <h2 className="callout__heading">Ready to Get Started?</h2>
    <p>
      Join hundreds of learners already building real skills with Peace institute.
      Expert-led courses, flexible learning, and a community that grows with you.
    </p>
    </div>
    <div>
      <Link to="/register" className="btn btn--secondary btn--stretched">get started</Link>
    </div>
  </div>
</div>

  )
}

export default callout