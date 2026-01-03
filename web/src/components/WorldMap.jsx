import React, { useEffect, useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const MAPPING_URL = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/slim-2/slim-2.json";

const WorldMap = ({ data }) => {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [mapping, setMapping] = useState({});
  const [tooltipContent, setTooltipContent] = useState("");

  // Fetch ISO mapping
  useEffect(() => {
    fetch(MAPPING_URL)
      .then(res => res.json())
      .then(json => {
        const map = {};
        json.forEach(item => {
          // item['country-code'] is numeric string like "004"
          // item['alpha-2'] is "AF"
          // We map numeric ID (from topojson) to alpha-2
          // TopoJSON IDs often remove leading zeros for some versions, but world-atlas usually keeps them or uses standard numeric.
          // Let's store both padded and unpadded just in case.
          const numeric = item['country-code'];
          const alpha2 = item['alpha-2'];
          map[numeric] = alpha2;
          map[parseInt(numeric, 10).toString()] = alpha2; 
        });
        setMapping(map);
      })
      .catch(err => console.error("Failed to load country mapping", err));
  }, []);

  // Process data into a map: alpha2 -> stats
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
              // geo.dimensions.clientCountryAlpha2
              // geo.sum.requests
              const alpha2 = geo.dimensions.clientCountryAlpha2;
              const name = geo.dimensions.clientCountryName;
              const requests = geo.sum?.requests || geo.count || 0;
              const bytes = geo.sum?.bytes || 0;

              if (alpha2) {
                if (!map[alpha2]) {
                  map[alpha2] = { requests: 0, bytes: 0, name };
                }
                map[alpha2].requests += requests;
                map[alpha2].bytes += bytes;
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
                const numericId = geo.id; // "840"
                const alpha2 = mapping[numericId];
                const stats = countryData[alpha2];
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => {
                      if (stats) {
                        setTooltipContent(`${stats.name || alpha2}: ${stats.requests.toLocaleString()} requests`);
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
