import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const ProtocolChart = ({ sslData, httpData }) => {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  if ((!sslData || sslData.length === 0) && (!httpData || httpData.length === 0)) return null;

  const processData = (data, keyName) => {
    if (!data) return [];
    const aggregated = data.reduce((acc, curr) => {
      const key = curr.dimensions[keyName];
      const count = curr.sum.requests;
      acc[key] = (acc[key] || 0) + count;
      return acc;
    }, {});

    return Object.keys(aggregated)
      .map(key => ({ name: key, value: aggregated[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  };

  const chartDataSSL = processData(sslData, 'clientSSLProtocol');
  const chartDataHTTP = processData(httpData, 'clientHTTPProtocol');

  const themeColors = {
    text: isDarkMode ? '#ffffff' : '#333333',
    grid: isDarkMode ? '#404040' : '#e1e1e1',
    background: isDarkMode ? '#2d2d2d' : '#ffffff',
    border: isDarkMode ? '#404040' : '#e1e1e1',
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: themeColors.background,
          padding: '10px',
          border: `1px solid ${themeColors.border}`,
          borderRadius: '4px'
        }}>
          <p style={{ color: themeColors.text, margin: 0 }}>{label}</p>
          <p style={{ color: themeColors.text, margin: 0 }}>
            {`${t('requests')}: ${new Intl.NumberFormat().format(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = (title, data, color) => (
    <div className="chart-container protocol-chart">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={themeColors.grid} opacity={0.3} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={80} 
            tick={{ fill: themeColors.text, fontSize: 12 }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="protocol-charts-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
      {chartDataSSL.length > 0 && renderChart(t('sslProtocol'), chartDataSSL, '#8b5cf6')}
      {chartDataHTTP.length > 0 && renderChart(t('httpProtocol'), chartDataHTTP, '#3b82f6')}
    </div>
  );
};

export default ProtocolChart;
