import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const WorkersStats = ({ accounts }) => {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const getStatusColor = (requests, limit) => {
    const percentage = (requests / limit) * 100;
    if (percentage >= 100) return '#ef4444'; // Red
    if (percentage >= 75) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
  };

  const themeColors = {
    bg: isDarkMode ? '#2d2d2d' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#333333',
    subText: isDarkMode ? '#9ca3af' : '#6b7280',
    border: isDarkMode ? '#404040' : '#e5e7eb',
    barBg: isDarkMode ? '#4b5563' : '#e5e7eb'
  };

  const hasWorkersData = accounts.some(acc => acc.workers);

  if (!hasWorkersData) return null;

  return (
    <div className="workers-stats-section" style={{ marginBottom: '30px' }}>
      <h2 className="section-title">{t('workersStats')}</h2>
      <div className="workers-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '20px' 
      }}>
        {accounts.map(account => {
          if (!account.workers) return null;
          
          const { requests, limit } = account.workers;
          const percentage = Math.min(100, (requests / limit) * 100).toFixed(1);
          const statusColor = getStatusColor(requests, limit);

          return (
            <div key={account.name} className="worker-card" style={{
              backgroundColor: themeColors.bg,
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: `1px solid ${themeColors.border}`
            }}>
              <div className="worker-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: themeColors.text }}>{account.name}</h3>
                <span style={{ 
                  backgroundColor: statusColor, 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}>
                  {percentage}%
                </span>
              </div>

              <div className="worker-metrics">
                <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: themeColors.subText }}>{t('requests')}</span>
                  <span style={{ color: themeColors.text, fontWeight: 'bold' }}>
                    {new Intl.NumberFormat().format(requests)} / {new Intl.NumberFormat().format(limit)}
                  </span>
                </div>
                
                <div className="progress-bar-container" style={{
                  height: '8px',
                  backgroundColor: themeColors.barBg,
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div className="progress-bar" style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: statusColor,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: themeColors.subText }}>
                  {t('workersQuotaReset')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkersStats;
