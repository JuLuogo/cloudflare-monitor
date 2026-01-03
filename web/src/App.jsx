import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LanguageSwitch from './components/LanguageSwitch';
import ThemeSwitch from './components/ThemeSwitch';
import './App.css';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1day'); // 单日、3天、7天

  useEffect(() => {
    let canceled = false;
    (async () => {
      setLoading(true);
      const timestamp = new Date().getTime();
      const dataUrl = process.env.NODE_ENV === 'production' 
        ? `/data/analytics.json?t=${timestamp}` 
        : `/data/analytics.json?t=${timestamp}`;
      try {
        const res = await axios.get(dataUrl);
        const data = res.data;
        if (data && data.accounts) {
          if (!canceled) {
            setAccounts(data.accounts);
            setError(null);
          }
          // 尝试补充 Workers 用量（即使静态文件成功也进行合并）
          try {
            const res2 = await axios.get(`/data/api?t=${timestamp}`);
            const apiAccounts = res2.data?.accounts || [];
            if (!canceled && Array.isArray(apiAccounts) && apiAccounts.length > 0) {
              const merged = (data.accounts || []).map(acc => {
                // 通过账户名匹配
                let apiAcc = apiAccounts.find(a => a.name === acc.name);
                // 如果账户名不匹配，尝试通过任意一个 zone 的 domain 进行匹配
                if (!apiAcc && acc.zones && acc.zones.length > 0) {
                  const domains = acc.zones.map(z => z.domain);
                  apiAcc = apiAccounts.find(a => (a.zones || []).some(z => domains.includes(z.domain)));
                }
                if (apiAcc?.workers || apiAcc?.workersError) {
                  return { ...acc, workers: apiAcc.workers, workersError: apiAcc.workersError };
                }
                return acc;
              });
              setAccounts(merged);
            }
          } catch (mergeErr) {
            // 合并失败不影响整体显示
            console.warn('Merge workers usage failed:', mergeErr?.message || mergeErr);
          }
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err1) {
        try {
          const res2 = await axios.get(`/data/api?t=${timestamp}`);
          if (!canceled) {
            setAccounts(res2.data.accounts || []);
            setError(null);
          }
        } catch (err2) {
          if (!canceled) {
            setError(t('loadError'));
          }
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="app-container loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="header-controls">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
          <h2>{t('dashboardTitle')}</h2>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container error">
        <div className="error-content">
          <div className="header-controls">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
          <h2>{t('dashboardTitle')}</h2>
          <div className="error-message">
            <p>⚠️ {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-button"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="app-container empty">
        <div className="empty-content">
          <div className="header-controls">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
          <h2>{t('dashboardTitle')}</h2>
          <p>{t('noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Dashboard 
        accounts={accounts}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />
    </div>
  );
}
