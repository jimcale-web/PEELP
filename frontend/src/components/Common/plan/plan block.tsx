
import "./plan.css";

const PlanBlock = () => {
  const plans = [
    {
      header: "Entry",
      body: "A simple starting point for learners.",
      description: "this is for peace students.",
      price: 499,
      billing: "/MONTH",
      type: "primary",
      features: [
        "Access to basic courses",
        "Learning materials",
        "Progress tracking",
      ],
      button: "Get Started",
    },
    {
      header: "Standard",
      body: "Everything you need for structured learning.",
      description: "More features for serious learners.",
      price: 999,
      billing: "/MONTH",
      type: "featured",
      badge: "Most Popular",
      features: [
        "All basic courses",
        "Quizzes and assessments",
        "Progress tracking",
      ],
      button: "Choose Standard",
    },
    {
      header: "Premium",
      body: "All features for advanced learners.",
      description: "The complete learning experience.",
      price: 3900,
      billing: "/YEAR",
      type: "secondary",
      features: [
        "All standard courses",
        "Personalized mentorship",
        "Advanced progress tracking",
      ],
      button: "Go Premium",
    },
  ];

  return (
    <section className="pricing-section">
      <div className="container">
        <div className="pricing-heading">
          <span className="pricing-eyebrow">PRICING</span>
          <h2>Choose Your Plan</h2>
          <p>
            Start learning with a plan designed to match your goals and
            learning journey.
          </p>
        </div>

        <div className="grid grid-cols-3">
          {plans.map((plan) => (
            <article
              className={`plan ${plan.type === "featured" ? "plan--featured" : ""}`}
              key={plan.header}
            >
              {plan.badge && (
                <div className="plan__badge">
                  <span>{plan.badge}</span>
                </div>
              )}

              <div className={`card card--${plan.type}`}>
                <header className="card__header">
                  <div className="plan__top">
                    <h3 className="plan__name">{plan.header}</h3>
                  </div>

                  <div className="plan__price-wrapper">
                    <span className="plan__currency">ETB</span>
                    <span className="plan__price">{plan.price}</span>
                    <span className="plan__billing-cycle">
                      {plan.billing}
                    </span>
                  </div>

                  <p className="plan__description">{plan.description}</p>
                </header>

                <div className="card__body">
                  <p className="plan__body">{plan.body}</p>

                  <div className="plan__divider"></div>

                  <h4 className="features-title">What's included</h4>

                  <ul className="list list--tick">
                    {plan.features.map((feature, index) => (
                      <li className="list__item" key={index}>
                        <span className="feature-icon">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button className="plan__button" type="button">
                    {plan.button}
                    <span className="button-arrow">→</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlanBlock;

