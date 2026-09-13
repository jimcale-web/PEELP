import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './boxs.css'
// import { FaGraduationCap } from 'react-icons/fa6'

interface Props {
     children: ReactNode;
     to?: string;
}

const box = ({ children, to = '/courses' }: Props) => {
  return (
    <>
     <div className="boxs">
        <Link to={to} className="box__link" aria-label="Go to courses page">
          <div className="box">{children}</div>
        </Link>
     </div>
    </>   
       
  )
}

export default box