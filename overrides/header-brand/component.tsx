import React from '$veda-ui/react';
import styled from '$veda-ui/styled-components';

const BrandContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
`;

const LogoSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44" width="36" height="40" fill="none">
    <path d="M20 0C20 0 4 18 4 28C4 36.8366 11.1634 44 20 44C28.8366 44 36 36.8366 36 28C36 18 20 0 20 0Z" fill="#2471a3"/>
    <path d="M20 4C20 4 8 19 8 28C8 34.6274 13.3726 40 20 40C26.6274 40 32 34.6274 32 28C32 19 20 4 20 4Z" fill="#2e86c1"/>
    <path d="M14 30C14 30 16 24 20 20C24 24 26 30 26 30" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
  </svg>
);

const Title = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
`;

const Version = styled.span`
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #2471a3;
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  margin-left: 0.25rem;
`;

export default function HeaderBrand() {
  return (
    <BrandContainer>
      <LogoSvg />
      <Title>
        cheias.pt
        <Version>BETA</Version>
      </Title>
    </BrandContainer>
  );
}
