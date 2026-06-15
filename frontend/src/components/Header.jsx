const Header = () => (
  <header className="header-container">
    <div className="header-content">
      <div className="logo">
        <div className="logo-icon">N</div>
        <div className="logo-text">
          <h1>News AI</h1>
          <span className="logo-badge">AI-Powered Live Feed</span>
        </div>
      </div>
      <div className="header-actions">
        <div className="header-status">
          <span className="header-status-dot"></span>
          <span>Connected</span>
        </div>
      </div>
    </div>
  </header>
);

export default Header;