import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const StatusChart = ({ data }) => {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  if (!data || data.length === 0) return null;

  // 聚合数据
  const aggregated = data.reduce((acc, curr) => {
    const status = curr.dimensions.responseStatus;
    const count = curr.sum.requests;
    acc[status] = (acc[status] || 0) + count;
    return acc;
  }, {});

  const chartData = Object.keys(aggregated)
    .map(key => ({ name: key, value: aggregated[key] }))
    .sort((a, b) => b.value - a.value);

  const COLORS = {
    '2': '#10b981', // 2xx - Green
    '3': '#3b82f6', // 3xx - Blue
    '4': '#f59e0b', // 4xx - Yellow
    '5': '#ef4444', // 5xx - Red
    'default': '#8b5cf6' // Others - Purple
  };

  const getColor = (status) => {
    const prefix = status.toString().charAt(0);
    return COLORS[prefix] || COLORS.default;
  };

  const themeColors = {
    text: isDarkMode ? '#ffffff' : '#333333',
    background: isDarkMode ? '#2d2d2d' : '#ffffff',
    border: isDarkMode ? '#404040' : '#e1e1e1',
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: themeColors.background,
          padding: '10px',
          border: `1px solid ${themeColors.border}`,
          borderRadius: '4px'
        }}>
          <p style={{ color: themeColors.text, margin: 0 }}>
            {`${t('status')}: ${payload[0].name}`}
          </p>
          <p style={{ color: themeColors.text, margin: 0 }}>
            {`${t('requests')}: ${new Intl.NumberFormat().format(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container status-chart">
      <h3>{t('statusDistribution')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatusChart;
