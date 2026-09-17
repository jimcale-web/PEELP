import '../styles/Home.css';
import Hero from '../components/Common/hero/hero';
import Callout from '../components/Common/callout/callout';
import Footer from '../components/Common/footer/footer';

export default function Home() {


  return (
    <div className="home-container">
      <Hero />
      <Callout />
      <Footer />
    </div>
  );
}
