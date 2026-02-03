    // ==================== LOGIN COMPONENT ====================
    function LoginPage({ onLogin, error }) {
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [showPassword, setShowPassword] = useState(false);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onLogin(username, password);
        setLoading(false);
      };

      return (
        <div className="login-page">
          <div className="login-box">
            <div className="text-center mb-4">
              <i className="fas fa-tractor fa-3x text-warning mb-3"></i>
              <h4 className="text-dark">KTM Admin</h4>
              <p className="text-muted small">Đăng nhập để quản lý</p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small">
                <i className="fas fa-exclamation-circle me-2"></i>{error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small">Tên đăng nhập</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="fas fa-user"></i></span>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small">Mật khẩu</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="fas fa-lock"></i></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-warning w-100"
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Đang đăng nhập...</>
                ) : (
                  <><i className="fas fa-sign-in-alt me-2"></i>Đăng nhập</>
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <a href="/" className="text-muted small text-decoration-none">
                <i className="fas fa-arrow-left me-1"></i>Về trang chủ
              </a>
            </div>
          </div>
        </div>
      );
    }

