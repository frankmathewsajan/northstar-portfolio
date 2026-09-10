import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  tenantId: number;
  tenantName: string;
}

interface AssetClassItem {
  assetClass: string;
  marketValue: number;
  percentage: number;
}

interface HoldingItem {
  date: string;
  ticker: string;
  assetClass: string;
  quantity: number;
  price: number;
  marketValue: number;
}

interface PortfolioSummary {
  startDate: string;
  endDate: string;
  startMarketValue: number;
  endMarketValue: number;
  periodReturn: number;
  periodReturnPercent: number;
  assetClasses: AssetClassItem[];
  holdings: HoldingItem[];
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [hasData, setHasData] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState('');

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const [isolationTestResult, setIsolationTestResult] = useState<string>('');

  useEffect(() => {
    if (token) {
      fetchSummary();
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Login failed');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setIsolationTestResult('');
    } catch {
      setLoginError('Network error connecting to API');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setSummary(null);
    setHasData(false);
    setIsolationTestResult('');
    setUploadSuccess('');
    setUploadErrors([]);
  };

  const fetchSummary = async () => {
    if (!token) return;
    setLoading(true);
    setDashboardError('');
    try {
      const res = await fetch('/api/portfolio/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setDashboardError(data.error || 'Failed to load portfolio summary');
        return;
      }
      setHasData(data.hasData);
      setSummary(data.summary);
    } catch {
      setDashboardError('Failed to fetch summary from server');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !token) return;

    setUploading(true);
    setUploadSuccess('');
    setUploadErrors([]);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch('/api/portfolio/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadErrors(data.details || [data.error || 'Upload failed']);
      } else {
        setUploadSuccess(`${data.message} (${data.count} rows processed)`);
        setUploadFile(null);
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchSummary();
      }
    } catch {
      setUploadErrors(['Network error during upload']);
    } finally {
      setUploading(false);
    }
  };

  const testTenantIsolation = async () => {
    if (!token || !user) return;
    const foreignTenantId = user.tenantId === 1 ? 2 : 1;
    try {
      const res = await fetch(`/api/portfolio/tenant/${foreignTenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 403) {
        setIsolationTestResult(`Success: Access to Tenant ${foreignTenantId} blocked (403 Forbidden - ${data.error})`);
      } else {
        setIsolationTestResult(`Unexpected response (${res.status}): ${JSON.stringify(data)}`);
      }
    } catch {
      setIsolationTestResult('Error sending isolation test request');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">Northstar Portfolio</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Investment Holding & Performance Tracker</p>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password123!"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-sm transition-colors"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Quick Seed Logins</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('tenant_a@example.com');
                  setPassword('Password123!');
                }}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded border border-slate-300"
              >
                Tenant A (Alpha Capital)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('tenant_b@example.com');
                  setPassword('Password123!');
                }}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded border border-slate-300"
              >
                Tenant B (Beacon Advisors)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Northstar Portfolio</h1>
          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
            <span className="font-semibold text-blue-600">{user.tenantName}</span>
            <span>|</span>
            <span>{user.email}</span>
            <span>(Tenant ID: {user.tenantId})</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={testTenantIsolation}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300"
          >
            Test Tenant Isolation
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded border border-red-200"
          >
            Logout
          </button>
        </div>
      </header>

      {isolationTestResult && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded">
            <strong>Isolation Test:</strong> {isolationTestResult}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <section className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Upload Holdings CSV</h2>
          <p className="text-xs text-slate-500 mb-4">
            Upload CSV with columns: date, ticker, asset_class, quantity, price. Duplicate or malformed rows are blocked.
          </p>

          <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-3">
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
            >
              {uploading ? 'Validating & Uploading...' : 'Upload File'}
            </button>
          </form>

          {uploadSuccess && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded">
              {uploadSuccess}
            </div>
          )}

          {uploadErrors.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded">
              <strong className="block mb-1">Upload rejected with validation errors:</strong>
              <ul className="list-disc list-inside space-y-0.5">
                {uploadErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {loading && (
          <div className="p-8 text-center text-slate-500 text-sm">
            Loading portfolio data...
          </div>
        )}

        {dashboardError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
            {dashboardError}
          </div>
        )}

        {!loading && !hasData && (
          <div className="bg-white p-12 rounded-lg border border-slate-200 text-center">
            <h3 className="text-base font-medium text-slate-700">No Holdings Data</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Please upload a clean holdings CSV file (e.g. sample_good.csv) to compute and display your portfolio summary.
            </p>
          </div>
        )}

        {!loading && hasData && summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Market Value</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(summary.endMarketValue)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  As of latest date: {summary.endDate}
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Starting Market Value</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(summary.startMarketValue)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  As of start date: {summary.startDate}
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Period Return</span>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    summary.periodReturn >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {summary.periodReturn >= 0 ? '+' : ''}
                  {summary.periodReturnPercent.toFixed(2)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  From {summary.startDate} to {summary.endDate}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Market Value by Asset Class</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase">
                        <th className="py-2">Asset Class</th>
                        <th className="py-2 text-right">Market Value</th>
                        <th className="py-2 text-right">Portfolio Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.assetClasses.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 font-medium text-slate-700 flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: colors[idx % colors.length] }}
                            />
                            {item.assetClass}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-800">
                            {formatCurrency(item.marketValue)}
                          </td>
                          <td className="py-2.5 text-right text-slate-600">
                            {item.percentage.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Asset Class Distribution</h3>
                  <div className="space-y-4">
                    {summary.assetClasses.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                          <span>{item.assetClass}</span>
                          <span>{item.percentage.toFixed(1)}% ({formatCurrency(item.marketValue)})</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded overflow-hidden">
                          <div
                            className="h-full transition-all duration-300 rounded"
                            style={{
                              width: `${Math.max(item.percentage, 1)}%`,
                              backgroundColor: colors[idx % colors.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400">
                  Holdings calculated based on earliest ({summary.startDate}) and latest ({summary.endDate}) timestamps.
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Current Holdings Detail ({summary.endDate})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase">
                      <th className="py-2">Date</th>
                      <th className="py-2">Ticker</th>
                      <th className="py-2">Asset Class</th>
                      <th className="py-2 text-right">Quantity</th>
                      <th className="py-2 text-right">Price</th>
                      <th className="py-2 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.holdings.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 text-slate-500">{h.date}</td>
                        <td className="py-2 font-semibold text-slate-800">{h.ticker}</td>
                        <td className="py-2 text-slate-600">{h.assetClass}</td>
                        <td className="py-2 text-right text-slate-700">{h.quantity.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-700">{formatCurrency(h.price)}</td>
                        <td className="py-2 text-right font-semibold text-slate-800">{formatCurrency(h.marketValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

