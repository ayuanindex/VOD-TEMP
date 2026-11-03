
const RESOURCE_SITES = `
新浪资源,http://api.xinlangapi.com/xinlangapi.php/provide/vod/
金鹰资源,http://jinyingzy.com/provide/vod/
叁六资源,https://360zy.com/api.php/provide/vod/
百度云资源,https://api.apibdzy.com/api.php/provide/vod/
光速资源,https://api.guangsuapi.com/api.php/provide/vod/
猫眼资源,https://api.maoyanapi.top/api.php/provide/vod/
牛牛资源,https://api.niuniuzy.me/api.php/provide/vod/
欧客资源,https://api.okzyw.net/api.php/provide/vod/
优酷资源,https://api.ukuapi.com/api.php/provide/vod/
无尽资源,https://api.wujinapi.net/api.php/provide/vod/
新浪资源,https://api.xinlangapi.com/xinlangapi.php/provide/vod/
步步高资源,https://api.yparse.com/api/json
最大资源,https://api.zuidapi.com/api.php/provide/vod/
暴风资源,https://bfzyapi.com/api.php/provide/vod/
天堂资源,https://caiji.dyttzyapi.com/api.php/provide/vod/
快车资源,https://caiji.kuaichezy.org/api.php/provide/vod/
茅台资源,https://caiji.maotaizy.cc/api.php/provide/vod/
非凡资源,https://cj.ffzyapi.com/api.php/provide/vod/
量子资源,https://cj.lziapi.com/api.php/provide/vod/
丫丫资源,https://cj.yayazy.net/api.php/provide/vod/
豆瓣资源,https://dbzy.tv/api.php/provide/vod/
火狐资源,https://hhzyapi.com/api.php/provide/vod/
爱坤资源,https://ikunzyapi.com/api.php/provide/vod/
爱奇艺资源,https://iqiyizyapi.com/api.php/provide/vod/
极速资源,https://jszyapi.com/api.php/provide/vod/
金鹰资源,https://jyzyapi.com/api.php/provide/vod/
艾旦资源,https://lovedan.net/api.php/provide/vod/
樱花资源,https://m3u8.apiyhzy.com/api.php/provide/vod/
飘零资源,https://p2100.net/api.php/provide/vod/
闪电资源,https://sdzyapi.com/api.php/provide/vod/
速播资源,https://subocaiji.com/api.php/provide/vod/
索尼资源,https://suoniapi.com/api.php/provide/vod/
天涯资源,https://tyyszy.com/api.php/provide/vod/
红牛资源,https://www.hongniuzy2.com/api.php/provide/vod/
虎牙资源,https://www.huyaapi.com/api.php/provide/vod/
魔都资源,https://www.mdzyapi.com/api.php/provide/vod/
`;

const REQUEST_TIMEOUT = 8000;
const MIN_MATCH_SCORE = 60;  // 可配置的最低匹配分数
const MAX_SITE_CONCURRENCY = 10;  // 同时请求的资源站数量上限


// ==================== Widget 元数据 ====================
WidgetMetadata = {
  id: "resource_sss",
  title: "资源08",
  icon: "",
  version: "1.5.0",
  requiredVersion: "0.0.1",
  description: "VOD多资源站并发",
  author: "MoYan",
  globalParams: [
    {
      name: "VodData",
      title: "资源站配置（每行一条：名称,接口地址；也支持 JSON 数组）",
      type: "input",
      value: RESOURCE_SITES
    },
    {
      name: "excludeKeywords",
      title: "需要过滤的关键词（用逗号、空格或换行分隔，例如：特辑,加更,集锦）",
      type: "input",
      value: ""
    }
  ],
  modules: [
    {
      id: "loadResource",
      title: "加载荐片资源",
      functionName: "loadResource",
      type: "stream",
      params: []
    }
  ]
};


// ==================== 工具函数 ====================
function logInfo(message, data = null) {
  if (data) {
    console.log(`[荐片] ${message}:`, JSON.stringify(data));
  } else {
    console.log(`[荐片] ${message}`);
  }
}

function logError(message, error = null) {
  if (error) {
    console.error(`[荐片] ${message}:`, error.message || error);
  } else {
    console.error(`[荐片] ${message}`);
  }
}

function cleanTitle(title) {
  if (!title) return '';
  return title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
}

function extractBaseName(title) {
  if (!title) return '';
  let cleaned = title.replace(/[\(\[（【][^\)\]）】]*[\)\]）】]/g, '');
  const separators = /[:：\-—\s]+/;
  const parts = cleaned.split(separators);
  return parts[0]?.trim() || cleaned.trim();
}

function parseExcludeKeywords(input) {
  if (!input || typeof input !== 'string') return [];
  const keywords = input.split(/[,\s\n\t]+/).filter(k => k.trim().length > 0);
  return [...new Set(keywords)];
}

function normalizeSiteUrl(url) {
  return (url || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
}

// 支持 CSV（每行：名称,接口地址）或 JSON 数组（[{title,url}] / [{name,value}]）
function parseResourceSites(VodData) {
  const parseLine = (line) => {
    const [title, value] = line.split(',').map(s => s.trim());
    if (title && value?.startsWith('http')) {
      return { title, value: value.endsWith('/') ? value : value + '/' };
    }
    return null;
  };

  const dedupe = (sites) => {
    const seen = new Set();
    return sites.filter(s => {
      const key = normalizeSiteUrl(s.value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  try {
    const trimmed = VodData?.trim() || '';
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return dedupe(JSON.parse(trimmed).map(s => ({ title: s.title || s.name, value: s.url || s.value })).filter(s => s.title && s.value));
    }
    return dedupe(trimmed.split('\n').map(parseLine).filter(Boolean));
  } catch (e) {
    return dedupe(RESOURCE_SITES.trim().split('\n').map(parseLine).filter(Boolean));
  }
}

// ==================== 请求：多资源站并发 ====================

// 并发请求多个资源站，任一站点失败不影响其他站点
async function runTasks(tasks, limit) {
  const results = [];
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (index < tasks.length) {
      const current = index++;
      try {
        results[current] = await tasks[current]();
      } catch (e) {
        results[current] = null;
      }
    }
  });

  await Promise.all(workers);
  return results;
}

async function searchSites(sites, keyword) {
  const tasks = sites.map(site => async () => {
    try {
      const response = await Widget.http.get(site.value, {
        params: { ac: "detail", wd: keyword },
        timeout: REQUEST_TIMEOUT
      });
      const list = response?.data?.list;
      if (!Array.isArray(list)) return null;
      logInfo(`资源站 ${site.title} 返回 ${list.length} 条`);
      return { site, list };
    } catch (e) {
      logError(`资源站请求失败: ${site.title}`, e);
      return null;
    }
  });

  const results = await runTasks(tasks, MAX_SITE_CONCURRENCY);
  return results.filter(r => r && r.list.length > 0);
}

// ==================== 匹配 ====================

function calculateMatchScore(searchName, itemName) {
  const cleanSearch = cleanTitle(searchName);
  const cleanItem = cleanTitle(itemName);

  if (cleanItem === cleanSearch) return 100;
  if (cleanItem.includes(cleanSearch)) return 70;
  if (cleanSearch.includes(cleanItem)) return 50;

  // 逐字符匹配
  let matchCount = 0;
  for (let i = 0; i < cleanSearch.length; i++) {
    if (cleanItem.includes(cleanSearch[i])) matchCount++;
  }
  return (matchCount / cleanSearch.length) * 30;
}

function parseEpisodeNumber(rawName) {
  if (!rawName) return null;
  const name = rawName.trim();
  const cnMatch = name.match(/第\s*(\d+)\s*[集话期]/);
  if (cnMatch) return parseInt(cnMatch[1]);
  const epMatch = name.match(/^[Ee][Pp]?\s*(\d+)$/);
  if (epMatch) return parseInt(epMatch[1]);
  if (/^\d+$/.test(name)) return parseInt(name);
  return null;
}

function isPlayableUrl(url) {
  return !!url && (url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('.mp4'));
}

function isSkippedSource(sourceName) {
  const lower = (sourceName || '').toLowerCase();
  return lower.includes('vip') || lower.includes('ftp') || sourceName === '常规线路';
}

// ==================== 播放源解析 ====================

function extractPlayInfo(item, vod_name, type, targetEpNum, excludeKeywords) {
  const { vod_play_url, vod_play_from, vod_remarks = '' } = item;
  if (!vod_play_url) return [];

  const playSources = vod_play_url.replace(/#+$/, '').split('$$$');
  const sourceNames = (vod_play_from || '').split('$$$');
  const playResources = [];
  let resourceIndex = 0;

  playSources.forEach((playSource, i) => {
    const sourceName = sourceNames[i]?.trim() || '默认线路';
    if (isSkippedSource(sourceName)) return;

    const episodes = playSource.split('#').filter(Boolean);

    episodes.forEach(ep => {
      const splitIndex = ep.indexOf('$');
      if (splitIndex === -1) return;

      const rawEpName = ep.slice(0, splitIndex).trim();
      let url = ep.slice(splitIndex + 1).trim();
      if (!isPlayableUrl(url)) return;

      try { url = decodeURIComponent(url); } catch (e) { }

      const shouldExclude = excludeKeywords.some(k => rawEpName.includes(k) || vod_remarks.includes(k));
      if (shouldExclude) return;

      const episodeNum = parseEpisodeNumber(rawEpName);

      // 指定集数时只保留匹配项
      if (targetEpNum !== null && targetEpNum !== undefined) {
        if (episodeNum !== targetEpNum) return;
      }

      // 构建描述
      let description = vod_name;
      if (episodeNum) {
        description = `${vod_name} 第${episodeNum}集`;
      } else if (rawEpName && !['正片', '播放'].includes(rawEpName)) {
        const cleanEpName = rawEpName.replace(/[<>"'\\]/g, '').trim();
        if (cleanEpName) description = `${vod_name} - ${cleanEpName}`;
      }

      if (sourceName && !sourceName.includes('默认')) {
        description = `${description} [${sourceName}]`;
      }

      resourceIndex++;
      playResources.push({
        id: `${item.vod_id}_${sourceName}_${episodeNum || resourceIndex}_${Date.now()}_${resourceIndex}`,
        name: sourceName,
        type: type === 'movie' ? 'movie' : 'tv',
        description: description,
        url: url,
        _episode: episodeNum
      });
    });
  });

  return playResources;
}

// ==================== 统一入口 ====================

async function loadResource(params) {
  let seriesName = params?.seriesName || params?.title || params?.name || params?.keyword;
  let type = params?.type === 'movie' ? 'movie' : 'tv';
  let episode = params?.episode ? parseInt(params.episode) : null;

  logInfo(`被动触发 - 搜索: ${seriesName}, 类型: ${type}, 集: ${episode}`);

  if (!seriesName) {
    logError('缺少系列名称');
    return [];
  }

  const resourceSites = parseResourceSites(params?.VodData);
  if (!resourceSites.length) {
    logError('未配置任何资源站');
    return [];
  }
  logInfo(`资源站数量: ${resourceSites.length}`);

  const excludeKeywords = parseExcludeKeywords(params?.excludeKeywords);
  const searchKeyword = extractBaseName(seriesName);
  logInfo(`搜索关键词: ${searchKeyword}`);

  // 并发请求所有资源站
  const siteResults = await searchSites(resourceSites, searchKeyword);
  if (!siteResults.length) {
    logInfo(`所有资源站均无结果: ${searchKeyword}`);
    return [];
  }

  // 各站内按标题打分，保留达标的结果
  const cleanSearchName = cleanTitle(searchKeyword);
  const matchedItems = [];

  siteResults.forEach(({ site, list }) => {
    const candidates = [];
    let best = null;
    let bestScore = 0;

    list.forEach(item => {
      if (!item?.vod_name) return;
      const score = calculateMatchScore(cleanSearchName, item.vod_name);
      candidates.push({ item, score });
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    });

    if (!best || bestScore < MIN_MATCH_SCORE) {
      logInfo(`资源站 ${site.title} 无匹配结果 (最高分=${bestScore})`);
      return;
    }

    // 同一站内精确命中的结果全部保留（可拿到多条线路）
    const hits = candidates.filter(c => c.score === 100).map(c => c.item);
    const finalItems = hits.length > 0 ? hits : [best];
    const seen = new Set();

    finalItems.forEach(item => {
      const key = `${item.vod_name}_${item.vod_id}`;
      if (seen.has(key)) return;
      seen.add(key);
      matchedItems.push({ site, item, score: bestScore });
      logInfo(`命中 [${site.title}]: ${item.vod_name} (${item.vod_id}) 得分: ${bestScore}`);
    });
  });

  if (!matchedItems.length) {
    logInfo(`未找到足够匹配的资源 (需要≥${MIN_MATCH_SCORE})`);
    return [];
  }

  // 提取播放资源
  const targetEpNum = (type === 'tv' && episode) ? episode : null;
  let playResources = matchedItems.flatMap(({ site, item }) =>
    extractPlayInfo(item, item.vod_name, type, targetEpNum, excludeKeywords)
      .map(r => ({ ...r, _siteTitle: site.title }))
  );

  logInfo(`提取到 ${playResources.length} 个播放资源`);

  // 电视剧按集号排序（去重会保留首次出现顺序，因此先排序再去重）
  if (type === 'tv' && targetEpNum === null) {
    playResources.sort((a, b) => (a._episode || 0) - (b._episode || 0));
  }

  // 去重
  const urlSet = new Set();
  const uniqueResources = [];
  playResources.forEach(r => {
    if (urlSet.has(r.url)) return;
    urlSet.add(r.url);
    uniqueResources.push({
      id: r.id,
      name: r._siteTitle,
      type: r.type,
      description: r.description,
      url: r.url
    });
  });

  logInfo(`最终返回 ${uniqueResources.length} 个播放资源`);
  if (uniqueResources.length > 0) {
    logInfo(`返回示例: ${JSON.stringify(uniqueResources[0])}`);
  }

  return uniqueResources;
}