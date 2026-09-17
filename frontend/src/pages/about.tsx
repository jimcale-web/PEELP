import { Link } from "react-router-dom";
import { Target, Compass, Lightbulb, Award } from "lucide-react";
import aboutImg from "../assets/about.jpg";
import teamImg from "../assets/about.jpg";
import "../styles/about.css";

const team = [
    {
        name: "Sharmarke",
        role: "Director",
        bio: "Visionary leader committed to transforming education and empowering learners across communities.",
        img: teamImg,
    },
    {
        name: "Ahmed",
        role: "Curriculum Designer",
        bio: "Crafts engaging, research-backed learning paths that bridge theory with real-world application.",
        img: teamImg,
    },
    {
        name: "Abdi",
        role: "Lead Instructor",
        bio: "Passionate educator with deep expertise in delivering impactful, student-centered learning experiences.",
        img: teamImg,
    },
];

const stats = [
    { number: "500+", label: "Active Students" },
    { number: "40+", label: "Courses" },
    { number: "15+", label: "Expert Instructors" },
    { number: "18+", label: "Years of Excellence" },
];

const pillars = [
    {
        icon: <Target size={22} strokeWidth={2} />,
        colorClass: "pillar-card__icon--blue",
        title: "Our Mission",
        text:
            "To deliver accessible, high-quality education that equips learners with the skills and confidence to thrive in a rapidly changing world.",
    },
    {
        icon: <Compass size={22} strokeWidth={2} />,
        colorClass: "pillar-card__icon--purple",
        title: "Our Vision",
        text:
            "A future where every individual has equal access to transformative learning opportunities that unlock their full potential.",
    },
    {
        icon: <Lightbulb size={22} strokeWidth={2} />,
        colorClass: "pillar-card__icon--green",
        title: "Our Values",
        text:
            "Excellence, integrity, inclusivity and innovation guide everything we do — from curriculum design to student support.",
    },
];

const AboutPage = () => {
    return (
        <main>
            {/* ── Hero ── */}
            <section className="about-hero">
                <div
                    className="about-hero__bg"
                    style={{ backgroundImage: `url(${aboutImg})` }}
                />
                <div className="about-hero__overlay" />
                <div className="about-hero__content">
                    <span className="about-hero__badge">Peace Institute</span>
                    <h1 className="about-hero__title">
                        Empowering Minds,<br />
                        <span>Shaping Futures</span>
                    </h1>
                    <p className="about-hero__subtitle">
                        We believe education is the most powerful force for positive change.
                        Discover the story, values, and people behind Peace institute.
                    </p>
                </div>
            </section>

            {/* ── Mission + Image ── */}
            <section className="about-section">
                <div className="about-mission">
                    <div className="about-mission__intro">
                        <div className="about-mission__text">
                            <span className="section-label">Who We Are</span>
                            <h2 className="section-title">Built on a Passion for Learning</h2>
                            <p className="section-desc">
                                Peace institute was founded with a simple but powerful belief — that
                                quality education should be accessible to everyone. From our
                                first cohort to today, we have helped hundreds of students
                                unlock new skills, careers, and opportunities.
                            </p>
                            <p className="section-desc" style={{ marginTop: "1.6rem" }}>
                                Our team of dedicated educators, designers, and technologists
                                work together to create learning experiences that are engaging,
                                practical, and genuinely life-changing.
                            </p>
                        </div>

                        <div className="about-mission__image-wrap">
                            <img src={aboutImg} alt="Students learning at Peace institute" />
                            <div className="about-mission__image-badge">
                                <span className="badge-icon"><Award size={24} color="#2563eb" strokeWidth={2} /></span>
                                <div className="badge-text">
                                    <strong>Top Rated</strong>
                                    <span>5-star learning experience</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pillars */}
                    <div className="about-pillars">
                        {pillars.map((p) => (
                            <div className="pillar-card" key={p.title}>
                                <div className={`pillar-card__icon ${p.colorClass}`}>
                                    {p.icon}
                                </div>
                                <h3 className="pillar-card__title">{p.title}</h3>
                                <p className="pillar-card__text">{p.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Stats ── */}
            <div className="about-stats">
                <div className="about-stats__grid">
                    {stats.map((s) => (
                        <div key={s.label}>
                            <div className="stat-item__number">{s.number}</div>
                            <div className="stat-item__label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Team ── */}
            <section className="about-section about-section--alt">
                <div className="about-team">
                    <div className="about-team__header">
                        <span className="section-label">The People Behind Peace institute</span>
                        <h2 className="section-title">Meet Our Team</h2>
                        <p className="section-desc" style={{ margin: "0 auto" }}>
                            Passionate professionals united by a shared commitment to
                            excellence in education.
                        </p>
                    </div>

                    <div className="about-team__grid">
                        {team.map((member) => (
                            <div className="team-member-card" key={member.name}>
                                <div className="team-member-card__img-wrap">
                                    <img src={member.img} alt={member.name} />
                                    <span className="team-member-card__role-badge">
                                        {member.role}
                                    </span>
                                </div>
                                <div className="team-member-card__body">
                                    <h3 className="team-member-card__name">{member.name}</h3>
                                    <p className="team-member-card__title">{member.role}</p>
                                    <p className="team-member-card__bio">{member.bio}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="about-cta">
                <h2 className="about-cta__title">Ready to Start Learning?</h2>
                <p className="about-cta__subtitle">
                    Join hundreds of students already growing with Peace institute.
                </p>
                <Link to="/courses" className="about-cta__btn">
                    Explore Courses →
                </Link>
            </section>
        </main>
    );
};

export default AboutPage;