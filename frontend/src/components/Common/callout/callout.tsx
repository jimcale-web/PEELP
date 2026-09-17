import { Link } from 'react-router-dom'
import './callout.css'

const Callout = () => {
  return (
    <section className="callout callout--primary" aria-labelledby="callout-heading">
      <div className="callout__content">
        <span className="callout__eyebrow">Your next chapter starts here</span>
        <h2 id="callout-heading" className="callout__heading">Ready to get started?</h2>
        <p>
          Join learners building real skills with expert-led courses, flexible learning,
          and a supportive community.
        </p>
      </div>
      <Link to="/register" className="callout__button">Create your account</Link>
    </section>
  )
}

export default Callout