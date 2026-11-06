// TODO 资源名称修改
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

const CHINESE_NUM_MAP = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

// TODO: id 和 title 修改
WidgetMetadata = {
  id: "vod_muti_site",
  title: "VOD多站聚合",
  icon: "https://rexnow.tv/assets/rex-mark.png",
  version: "1.0.0",
  requiredVersion: "0.0.1",
  description: "获取聚合VOD影片资源",
  author: "ayuan",
  site: "https://github.com/ayuanindex/VOD-TEMP",
  globalParams: [
    {
      name: "multiSource",
      title: "是否启用聚合搜索",
      type: "enumeration",
      enumOptions: [
        { title: "启用", value: "enabled" },
        { title: "禁用", value: "disabled" },
      ],
    },
  ],
  modules: [
    {
      id: "loadResource",
      title: "加载资源",
      functionName: "loadResource",
      type: "stream",
      params: [],
    },
  ],
};

// --- 辅助工具函数 ---

const isM3U8Url = (url) => url?.toLowerCase().includes("m3u8") || false;

function extractSeasonInfo(seriesName) {
  if (!seriesName) return { baseName: seriesName, seasonNumber: 1 };
  const chineseMatch = seriesName.match(/第([一二三四五六七八九十\d]+)[季部]/);
  if (chineseMatch) {
    const val = chineseMatch[1];
    const seasonNum = CHINESE_NUM_MAP[val] || parseInt(val) || 1;
    const baseName = seriesName
      .replace(/第[一二三四五六七八九十\d]+[季部]/, "")
      .trim();
    return { baseName, seasonNumber: seasonNum };
  }
  const digitMatch = seriesName.match(/(.+?)(\d+)$/);
  if (digitMatch) {
    return {
      baseName: digitMatch[1].trim(),
      seasonNumber: parseInt(digitMatch[2]) || 1,
    };
  }
  return { baseName: seriesName.trim(), seasonNumber: 1 };
}

/**
 * 修改后的提取逻辑：不再直接过滤集数，而是返回带标记的所有集数以便缓存
 */
function extractPlayInfoForCache(item, siteTitle, type) {
  const { vod_name, vod_play_url, vod_play_from, vod_remarks = "" } = item;
  if (!vod_name || !vod_play_url) return [];

  const playSources = vod_play_url.replace(/#+$/, "").split("$$$");
  const sourceNames = (vod_play_from || "").split("$$$");

  return playSources.flatMap((playSource, i) => {
    const sourceName = sourceNames[i] || "默认源";
    const isTV = playSource.includes("#");
    const results = [];

    if (type === "tv" && isTV) {
      const episodes = playSource.split("#").filter(Boolean);
      episodes.forEach((ep) => {
        const [epName, url] = ep.split("$");
        if (url && isM3U8Url(url)) {
          // 提取数字集数用于后续精确过滤
          const epMatch = epName.match(/第(\d+)集/);
          results.push({
            name: siteTitle,
            description: `${vod_name} - ${epName}${vod_remarks ? " - " + vod_remarks : ""} - [${sourceName}]`,
            url: url.trim(),
            _ep: epMatch ? parseInt(epMatch[1]) : null, // 内部标记
          });
        }
      });
    } else if (type === "movie" && !isTV) {
      const firstM3U8 = playSource
        .split("#")
        .find((v) => isM3U8Url(v.split("$")[1]));
      if (firstM3U8) {
        const [quality, url] = firstM3U8.split("$");
        const qualityText = quality.toLowerCase().includes("tc")
          ? "抢先版"
          : "正片";
        results.push({
          name: siteTitle,
          description: `${vod_name} - ${qualityText} - [${sourceName}]`,
          url: url.trim(),
        });
      }
    }
    return results;
  });
}

function parseResourceSites(VodData) {
  const parseLine = (line) => {
    const [title, value] = line.split(",").map((s) => s.trim());
    if (title && value?.startsWith("http")) {
      return { title, value: value.endsWith("/") ? value : value + "/" };
    }
    return null;
  };

  try {
    const trimmed = VodData?.trim() || "";
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      return JSON.parse(trimmed)
        .map((s) => ({ title: s.title || s.name, value: s.url || s.value }))
        .filter((s) => s.title && s.value);
    }
    return trimmed.split("\n").map(parseLine).filter(Boolean);
  } catch (e) {
    return [];
  }
}

// --- 主入口函数 ---

async function loadResource(params) {
  const { seriesName, type = "tv", season, episode, multiSource } = params;
  if (multiSource !== "enabled" || !seriesName) return [];

  // 如果 VodData 为空，使用 RESOURCE_SITES 作为默认值
  const resourceSites = parseResourceSites(RESOURCE_SITES);
  const { baseName, seasonNumber } = extractSeasonInfo(seriesName);
  const targetSeason = season ? parseInt(season) : seasonNumber;
  const targetEpisode = episode ? parseInt(episode) : null;

  let allResources = [];

  const fetchTasks = resourceSites.map(async (site) => {
    try {
      const response = await Widget.http.get(site.value, {
        params: { ac: "detail", wd: baseName.trim() },
        timeout: 10000,
      });
      const list = response?.data?.list;
      if (!Array.isArray(list)) return [];

      return list.flatMap((item) => {
        const itemInfo = extractSeasonInfo(item.vod_name);

        // --- 保留你的精确匹配逻辑 ---
        if (
          itemInfo.baseName !== baseName ||
          itemInfo.seasonNumber !== targetSeason
        ) {
          return [];
        }

        return extractPlayInfoForCache(item, site.title, type);
      });
    } catch (error) {
      return [];
    }
  });

  const results = await Promise.all(fetchTasks);
  const merged = results.flat();

  // URL 去重
  const urlSet = new Set();
  allResources = merged.filter((res) => {
    if (urlSet.has(res.url)) return false;
    urlSet.add(res.url);
    return true;
  });

  // 3. 结果返回：根据 targetEpisode 进行最后的精确过滤
  if (type === "tv" && targetEpisode !== null) {
    return allResources.filter((res) => {
      // 优先根据提取时的 _ep 数字匹配，若无则根据描述文字匹配
      if (res._ep !== undefined && res._ep !== null) {
        return res._ep === targetEpisode;
      }
      return res.description.includes(`第${targetEpisode}集`);
    });
  }

  return allResources;
}
