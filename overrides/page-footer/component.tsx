import React from '$veda-ui/react';
import styled from '$veda-ui/styled-components';

const FooterContainer = styled.footer`
  background: #1a1a2e;
  color: #a0a0b8;
  padding: 2rem 1.5rem;
  font-size: 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const FooterRight = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;

  a {
    color: #a0a0b8;
    text-decoration: none;
    &:hover {
      color: #fff;
    }
  }
`;

const Brand = styled.span`
  font-weight: 700;
  color: #e0e0f0;
`;

export default function PageFooter({ appVersion, appUiVersion }) {
  return (
    <FooterContainer>
      <FooterLeft>
        <Brand>cheias.pt</Brand>
        <span>v{appVersion} &middot; Built on VEDA {appUiVersion}</span>
      </FooterLeft>
      <FooterRight>
        <a href="https://github.com/lunasilvestre/cheias-pt-veda-ui" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="https://developmentseed.org/projects/eoapi/" target="_blank" rel="noopener noreferrer">Powered by eoAPI</a>
        <a href="mailto:lunasilvestre@gmail.com">Contact</a>
      </FooterRight>
    </FooterContainer>
  );
}
