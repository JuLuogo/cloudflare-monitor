export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  return await handleRequest(context);
}

async function handleRequest(context) {
  const { env } = context;

  function loadConfig(env) {
    if (env.CF_CONFIG) {
      try {
        return JSON.parse(env.CF_CONFIG);
      } catch (e) {}
    }
    const config = { accounts: [] };
    if (env.CF_TOKENS && env.CF_ZONES) {
      const tokens = env.CF_TOKENS.split(',').map(t => t.trim());
      const zones = env.CF_ZONES.split(',').map(z => z.trim());
      const domains = env.CF_DOMAINS ? env.CF_DOMAINS.split(',').map(d => d.trim()) : zones;
      if (tokens.length > 0 && zones.length > 0) {
        config.accounts.push({
          name: env.CF_ACCOUNT_NAME || "默认账户",
          token: tokens[0],
          zones: zones.map((zone_id, index) => ({
            zone_id,
            domain: domains[index] || zone_id
          }))
        });
      }
    }
    let accountIndex = 1;
    while (env[`CF_TOKENS_${accountIndex}`]) {
      const tokens = env[`CF_TOKENS_${accountIndex}`].split(',').map(t => t.trim());
      const zones = env[`CF_ZONES_${accountIndex}`].split(',').map(z => z.trim());
      const domains = env[`CF_DOMAINS_${accountIndex}`] ?
        env[`CF_DOMAINS_${accountIndex}`].split(',').map(d => d.trim()) : zones;
      if (tokens.length > 0 && zones.length > 0) {
        config.accounts.push({
          name: env[`CF_ACCOUNT_NAME_${accountIndex}`] || `账户${accountIndex}`,
          token: tokens[0],
          zones: zones.map((zone_id, index) => ({
            zone_id,
            domain: domains[index] || zone_id
          }))
        });
      }
      accountIndex++;
    }
    return config;
  }

  const CFG = loadConfig(env);
  if (!CFG.accounts || CFG.accounts.length === 0) {
    return new Response(JSON.stringify({ 
      error: '未找到配置', 
      message: '请在平台环境变量中配置 CF_TOKENS 和 CF_ZONES' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const payload = { accounts: [] };

  for (const acc of CFG.accounts) {
    const accData = { name: acc.name, zones: [] };
    const zonePromises = acc.zones.map(async (z) => {
      if (!acc.accountId) {
        try {
          const accountQuery = {
            query: `query($zone: String!) { viewer { zones(filter: {zoneTag: $zone}) { account { id } } } }`,
            variables: { zone: z.zone_id }
          };
          const accRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${acc.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(accountQuery)
          }).then(r => r.json());
          if (accRes.data?.viewer?.zones?.[0]?.account?.id) {
            acc.accountId = accRes.data.viewer.zones[0].account.id;
          }
        } catch (e) {}
      }

      const zoneData = { 
        domain: z.domain, 
        raw: [], 
        rawHours: [], 
        geography: [],
        status: [],
        ssl: [],
        http: []
      };

      try {
        const today = new Date();
        const daysSince = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const daysUntil = today.toISOString().slice(0, 10);
        const hoursSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const hoursUntil = today.toISOString();
        const geoSince = today.toISOString().slice(0, 10);
        const geoUntil = today.toISOString().slice(0, 10);

        const daysQuery = {
          query: `
            query($zone: String!, $since: Date!, $until: Date!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequests1dGroups(
                    filter: {date_geq: $since, date_leq: $until}
                    limit: 100
                    orderBy: [date_DESC]
                  ) {
                    dimensions { date }
                    sum { requests bytes threats cachedRequests cachedBytes }
                  }
                }
              }
            }`,
          variables: { zone: z.zone_id, since: daysSince, until: daysUntil }
        };

        const hoursQuery = {
          query: `
            query($zone: String!, $since: Time!, $until: Time!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequests1hGroups(
                    filter: {datetime_geq: $since, datetime_leq: $until}
                    limit: 200
                    orderBy: [datetime_DESC]
                  ) {
                    dimensions { datetime }
                    sum { requests bytes threats cachedRequests cachedBytes }
                  }
                }
              }
            }`,
          variables: { zone: z.zone_id, since: hoursSince, until: hoursUntil }
        };

        const geoQuery = {
          query: `
            query($zone: String!, $since: Date!, $until: Date!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequests1dGroups(
                    filter: {date_geq: $since, date_leq: $until}
                    limit: 100
                    orderBy: [date_DESC]
                  ) {
                    dimensions { date }
                    sum {
                      countryMap { bytes requests threats clientCountryName clientCountryAlpha2 }
                    }
                  }
                }
              }
            }`,
          variables: { zone: z.zone_id, since: geoSince, until: geoUntil }
        };

        const distQuery = {
          query: `
            query($zone: String!, $since: Date!, $until: Date!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  status: httpRequests1dGroups(
                    filter: {date_geq: $since, date_leq: $until}
                    limit: 15
                  ) {
                    dimensions { responseStatus }
                    sum { requests }
                  }
                  ssl: httpRequests1dGroups(
                    filter: {date_geq: $since, date_leq: $until}
                    limit: 10
                  ) {
                    dimensions { clientSSLProtocol }
                    sum { requests }
                  }
                  http: httpRequests1dGroups(
                    filter: {date_geq: $since, date_leq: $until}
                    limit: 10
                  ) {
                    dimensions { clientHTTPProtocol }
                    sum { requests }
                  }
                }
              }
            }`,
          variables: { zone: z.zone_id, since: daysSince, until: daysUntil }
        };

        const fetchCF = async (body) => {
          const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${acc.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });
          return res.json();
        };

        const [daysRes, hoursRes, geoRes, distRes] = await Promise.all([
          fetchCF(daysQuery),
          fetchCF(hoursQuery),
          fetchCF(geoQuery),
          fetchCF(distQuery)
        ]);

        if (daysRes.data?.viewer?.zones?.[0]?.httpRequests1dGroups) {
          zoneData.raw = daysRes.data.viewer.zones[0].httpRequests1dGroups;
        }
        if (hoursRes.data?.viewer?.zones?.[0]?.httpRequests1hGroups) {
          zoneData.rawHours = hoursRes.data.viewer.zones[0].httpRequests1hGroups;
        }
        if (geoRes.data?.viewer?.zones?.[0]?.httpRequests1dGroups) {
          const rawGeoData = geoRes.data.viewer.zones[0].httpRequests1dGroups;
          const countryStats = {};
          rawGeoData.forEach(record => {
            if (record.sum?.countryMap && Array.isArray(record.sum.countryMap)) {
              record.sum.countryMap.forEach(countryData => {
                const country = countryData.clientCountryName;
                const alpha2 = countryData.clientCountryAlpha2;
                if (country && country !== 'Unknown' && country !== '') {
                  if (!countryStats[country]) {
                    countryStats[country] = {
                      dimensions: { clientCountryName: country, clientCountryAlpha2: alpha2 },
                      sum: { requests: 0, bytes: 0, threats: 0 }
                    };
                  }
                  countryStats[country].sum.requests += countryData.requests || 0;
                  countryStats[country].sum.bytes += countryData.bytes || 0;
                  countryStats[country].sum.threats += countryData.threats || 0;
                }
              });
            }
          });
          zoneData.geography = Object.values(countryStats)
            .sort((a, b) => b.sum.requests - a.sum.requests)
            .slice(0, 15);
        }
        if (distRes.data?.viewer?.zones?.[0]) {
          const zData = distRes.data.viewer.zones[0];
          zoneData.status = zData.status || [];
          zoneData.ssl = zData.ssl || [];
          zoneData.http = zData.http || [];
        }
      } catch (error) {
        zoneData.error = error.message;
      }
      return zoneData;
    });

    accData.zones = await Promise.all(zonePromises);

    if (acc.accountId) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const workersQuery = {
          query: `
            query($accountTag: string, $date: Date) {
              viewer {
                accounts(filter: {accountTag: $accountTag}) {
                  workersInvocationsAdaptive(filter: { datetime_geq: $date, datetime_leq: $date }, limit: 100) {
                    sum { requests errors }
                  }
                }
              }
            }`,
          variables: { accountTag: acc.accountId, date: today }
        };

        const wRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${acc.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(workersQuery)
        }).then(r => r.json());

        if (wRes.data?.viewer?.accounts?.[0]) {
          const accountData = wRes.data.viewer.accounts[0];
          const wStats = accountData.workersInvocationsAdaptive?.[0]?.sum || { requests: 0, errors: 0 };
          accData.workers = {
            requests: wStats.requests || 0,
            errors: wStats.errors || 0,
            limit: 100000
          };
        }
      } catch (e) {}
    }

    payload.accounts.push(accData);
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60'
    }
  });
}
