import type { ReactNode } from 'react'
import { TiSocialFacebookCircular, TiSocialYoutube } from 'react-icons/ti'
import { Link } from 'react-router-dom'
import './footer.css'
import { IoLogoTiktok } from 'react-icons/io5'
import { FaInstagram } from 'react-icons/fa6'

export type FooterSectionLink = {
  label: string
  to: string
}

export type FooterSection = {
  title: string
  links: FooterSectionLink[]
}

export type FooterSocialLink = {
  label: string
  href: string
  icon: ReactNode
}

type FooterProps = {
  sections?: FooterSection[]
  ownerName?: string
  year?: number
  socialLinks?: FooterSocialLink[]
  className?: string
}

const defaultSections: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { label: 'Courses', to: '/courses' },
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', to: '/help' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Contact Support', to: '/contact' },
    ],
  },
]

const defaultSocialLinks: FooterSocialLink[] = [
  {
    label: 'Facebook',
    href: 'https://facebook.com',
    icon: <TiSocialFacebookCircular size={22} />,
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    icon: <FaInstagram size={19} />,
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com',
    icon: <TiSocialYoutube size={22} />,
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com',
    icon: <IoLogoTiktok size={18} />,
  },
]

const Footer = ({
  sections = defaultSections,
  ownerName = 'sharmarke ali',
  year = new Date().getFullYear(),
  socialLinks = defaultSocialLinks,
  className = '',
}: FooterProps) => {
  const footerClassName = `footer ${className}`.trim()

  return (
    <footer className={footerClassName}>
      <div className="footer__shell">
        <section className="footer__brand">
          <p className="footer__brand-mark">PEACE</p>
          <h2 className="footer__brand-title">Peace Institute</h2>
          <p className="footer__tagline">
            Practical English learning for students, professionals, and teams.
          </p>
          <div className="footer__socials" aria-label="Social media links">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                className="footer__social-link"
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </section>

        <div className="footer__links-grid">
          {sections.map((section) => (
            <section key={section.title} className="footer__column">
              <h3 className="footer__heading">{section.title}</h3>
              <ul className="footer__list">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.to}`} className="footer__item">
                    {link.to.startsWith('http') ? (
                      <a href={link.to} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.to}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <div className="footer__bottom">
        <p className="footer__copyright">
          &copy;{year} {ownerName}
        </p>
        <p className="footer__made-for">Built for modern English learning.</p>
      </div>
    </footer>
  )
}

export default Footer