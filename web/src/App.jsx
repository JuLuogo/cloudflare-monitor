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
    // 使用相对路径，通过nginx反向代理访问
    // 添加时间戳防止缓存
    const timestamp = new Date().getTime();
    // 优先尝试读取静态文件，如果失败则尝试调用API
    const dataUrl = process.env.NODE_ENV === 'production' 
        ? `/data/analytics.json?t=${timestamp}` 
        : `/data/analytics.json?t=${timestamp}`;

    axios.get(dataUrl)
      .then((res) => {
        console.log('API Response (JSON File):', res.data);
        if (res.data && res.data.accounts) {
          setAccounts(res.data.accounts);
          setError(null);
        } else {
          throw new Error('Invalid data format');
        }
      })
      .catch((err1) => {
        console.warn('Failed to load static JSON, trying Edge Function API...', err1);
        // 如果静态文件加载失败，尝试直接调用 Edge Function
        axios.get(`/data/api?t=${timestamp}`)
          .then(res => {
             console.log('API Response (Edge Function):', res.data);
             setAccounts(res.data.accounts || []);
             setError(null);
          })
          .catch(err2 => {
            console.error('All data sources failed:', err2);
            setError(t('loadError'));
          })
          .finally(() => setLoading(false));
      })
      .finally(() => {
        // 如果第一个请求成功了，这里也会执行，但 loading 状态由第一个请求控制可能更好
        // 这里为了简单，如果第一个请求成功就不等待第二个了
        if (!error) setLoading(false);
      });
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