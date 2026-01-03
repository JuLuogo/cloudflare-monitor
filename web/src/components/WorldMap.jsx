import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
// 使用国家名称匹配，无需 ISO 映射

const WorldMap = ({ data }) => {
  const { isDarkMode } = useTheme();
  // eslint-disable-next-line no-unused-vars
  const { t } = useLanguage();
  const [tooltipContent, setTooltipContent] = useState("");

  // 纠正常见名称差异（CF -> Natural Earth）
  const nameFix = useMemo(() => ({
    'United States': 'United States of America',
    'Democratic Republic of the Congo': 'Democratic Republic of the Congo',
    'Republic of the Congo': 'Republic of the Congo',
    'Côte d’Ivoire': "Côte d'Ivoire",
    'Cote d\'Ivoire': "Côte d'Ivoire",
    'Myanmar': 'Myanmar',
    'Czech Republic': 'Czechia',
    'North Korea': 'North Korea',
    'South Korea': 'South Korea',
    'Moldova': 'Moldova',
    'Russia': 'Russia',
    'Viet Nam': 'Vietnam',
    'Lao PDR': 'Laos',
  }), []);

  // 聚合：按国家名称
  const countryData = useMemo(() => {
    const map = {};
    if (!data) return map;

    // data is the array of zones/accounts passed from GeographyStats
    // Structure: Array of accounts -> zones -> geography array
    // Wait, GeographyStats receives aggregated `topCountries`? 
    // No, GeographyStats receives `data` (accounts array).
    
    // We need to aggregate all geography data by Alpha-2
    data.forEach(account => {
      if (account.zones) {
        account.zones.forEach(zone => {
          if (zone.geography) {
            zone.geography.forEach(geo => {
              const name = geo.dimensions.clientCountryName;
              const requests = geo.sum?.requests || geo.count || 0;
              const bytes = geo.sum?.bytes || 0;

              if (name) {
                const key = name.toLowerCase();
                if (!map[key]) {
                  map[key] = { requests: 0, bytes: 0, name };
                }
                map[key].requests += requests;
                map[key].bytes += bytes;
              }
            });
          }
        });
      }
    });
    return map;
  }, [data]);

  // Color scale
  const colorScale = useMemo(() => {
    const maxRequests = Math.max(0, ...Object.values(countryData).map(d => d.requests));
    return scaleLinear()
      .domain([0, maxRequests || 10]) // Avoid 0 division
      .range(isDarkMode ? ["#2d2d2d", "#3b82f6"] : ["#f5f5f5", "#2563eb"]);
  }, [countryData, isDarkMode]);

  const themeColors = {
    default: isDarkMode ? "#333" : "#D6D6DA",
    hover: isDarkMode ? "#4b5563" : "#F53",
    stroke: isDarkMode ? "#000" : "#FFF"
  };

  return (
    <div className="world-map-container" style={{ marginTop: '30px' }}>
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140 }}>
        <ZoomableGroup center={[0, 20]} zoom={1}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const atlasName = geo.properties.name;
                const fixedName = nameFix[atlasName] || atlasName;
                const stats = countryData[(fixedName || '').toLowerCase()];
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => {
                      if (stats) {
                        setTooltipContent(`${stats.name || fixedName}: ${stats.requests.toLocaleString()} requests`);
                      } else {
                        setTooltipContent(`${geo.properties.name}: 0`);
                      }
                    }}
                    onMouseLeave={() => {
                      setTooltipContent("");
                    }}
                    fill={stats ? colorScale(stats.requests) : themeColors.default}
                    stroke={themeColors.stroke}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: themeColors.hover, outline: "none" },
                      pressed: { outline: "none" },
                    }}
                    data-tooltip-id="my-tooltip"
                    data-tooltip-content={tooltipContent}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      <ReactTooltip id="my-tooltip" />
    </div>
  );
};

export default WorldMap;
